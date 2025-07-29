"""
Fantasy Football Auto-Draft Strategies

This module contains various draft strategies that can be applied to teams
for automated drafting. Each strategy implements a __call__ method that
takes the current available players DataFrame and team roster state.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
import pandas as pd
from pydantic import BaseModel, Field
from enum import Enum


class Position(str, Enum):
    QB = "QB"
    RB = "RB"
    WR = "WR"
    TE = "TE"
    FLEX = "FLEX"
    DST = "DST"
    K = "K"
    BENCH = "BENCH"


class Player(BaseModel):
    """Individual player data model"""
    id: int
    name: str
    position: Position
    team: str
    rank: int
    tier: Optional[int] = None
    is_drafted: bool = False


class RosterSlot(BaseModel):
    """Individual roster slot"""
    position: Position
    player: Optional[Player] = None
    is_filled: bool = False


class TeamRoster(BaseModel):
    """Team roster configuration and current state"""
    team_id: int
    team_name: str
    roster_slots: List[RosterSlot]
    roster_requirements: Dict[Position, int]

    def get_empty_slots(self) -> List[RosterSlot]:
        """Get all empty roster slots"""
        return [slot for slot in self.roster_slots if not slot.is_filled]

    def get_empty_slots_by_position(self, position: Position) -> List[RosterSlot]:
        """Get empty slots for a specific position"""
        return [slot for slot in self.roster_slots
                if slot.position == position and not slot.is_filled]

    def can_fill_position(self, position: Position) -> bool:
        """Check if we can still draft a player for this position"""
        # Direct position match
        if self.get_empty_slots_by_position(position):
            return True

        # FLEX can take RB, WR, TE
        if position in [Position.RB, Position.WR, Position.TE]:
            return bool(self.get_empty_slots_by_position(Position.FLEX))

        # BENCH can take anyone
        return bool(self.get_empty_slots_by_position(Position.BENCH))

    def get_position_need_priority(self) -> Dict[Position, int]:
        """Get priority scoring for each position based on remaining needs"""
        priorities = {}
        for pos in [Position.QB, Position.RB, Position.WR, Position.TE, Position.DST, Position.K]:
            empty_slots = len(self.get_empty_slots_by_position(pos))
            # Higher priority for positions with more empty slots
            priorities[pos] = empty_slots * 10

            # Bonus priority for zero RB/WR/TE if FLEX is available
            if pos in [Position.RB, Position.WR, Position.TE] and empty_slots == 0:
                flex_slots = len(self.get_empty_slots_by_position(Position.FLEX))
                priorities[pos] = flex_slots * 5

        return priorities


class DraftStrategy(BaseModel, ABC):
    """Base class for all draft strategies"""
    strategy_name: str
    description: str

    @abstractmethod
    def __call__(self, available_players_df: pd.DataFrame, team_roster: TeamRoster) -> Optional[int]:
        """
        Select the next player to draft

        Args:
            available_players_df: DataFrame of available (undrafted) players
            team_roster: Current team roster state

        Returns:
            player_id of selected player, or None if no valid selection
        """
        pass

    def _filter_draftable_players(self, available_players_df: pd.DataFrame, team_roster: TeamRoster) -> pd.DataFrame:
        """Filter players to only those we can actually roster"""
        draftable = available_players_df[
            available_players_df['position'].apply(
                lambda pos: team_roster.can_fill_position(Position(pos))
            )
        ].copy()
        return draftable


class BestPlayerAvailableStrategy(DraftStrategy):
    """Draft the highest-ranked available player that fits roster needs"""

    strategy_name: str = "Best Player Available"
    description: str = "Always draft the highest-ranked available player who can fill a roster spot"

    def __call__(self, available_players_df: pd.DataFrame, team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players_df, team_roster)

        if draftable.empty:
            return None

        # Sort by rank (ascending - lower rank number = better)
        best_player = draftable.sort_values('rank').iloc[0]
        return int(best_player['id'])


class BestTierAvailableStrategy(DraftStrategy):
    """Draft the best tier available, breaking ties by rank"""

    strategy_name: str = "Best Tier Available"
    description: str = "Prioritize players from the best available tier, then by rank within tier"

    def __call__(self, available_players_df: pd.DataFrame, team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players_df, team_roster)

        if draftable.empty:
            return None

        # Filter out players without tier data
        tiered_players = draftable[draftable['tier'].notna()].copy()

        if tiered_players.empty:
            # Fall back to BPA if no tier data
            best_player = draftable.sort_values('rank').iloc[0]
            return int(best_player['id'])

        # Sort by tier (ascending - lower tier = better), then by rank
        best_player = tiered_players.sort_values(['tier', 'rank']).iloc[0]
        return int(best_player['id'])


class PositionalDraftStrategy(DraftStrategy):
    """Draft following a specific positional sequence"""

    strategy_name: str = "Positional Strategy"
    description: str = "Follow a predetermined position sequence (e.g., WR-RB-WR-RB-QB-TE)"

    draft_sequence: List[Position] = Field(default_factory=lambda: [
        Position.WR, Position.RB, Position.WR, Position.RB,
        Position.QB, Position.TE, Position.RB, Position.WR,
        Position.QB, Position.TE, Position.DST, Position.K
    ])

    def __call__(self, available_players_df: pd.DataFrame, team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players_df, team_roster)

        if draftable.empty:
            return None

        # Determine how many picks we've made
        filled_slots = len([slot for slot in team_roster.roster_slots if slot.is_filled])

        # Get target position from sequence (cycle if we exceed sequence length)
        if filled_slots < len(self.draft_sequence):
            target_position = self.draft_sequence[filled_slots]
        else:
            # Fill remaining needs by priority
            return self._draft_by_need(draftable, team_roster)

        # Try to draft the target position
        position_players = draftable[draftable['position'] == target_position.value]

        if not position_players.empty and team_roster.can_fill_position(target_position):
            best_at_position = position_players.sort_values('rank').iloc[0]
            return int(best_at_position['id'])

        # If target position not available or can't be filled, fall back to BPA
        best_player = draftable.sort_values('rank').iloc[0]
        return int(best_player['id'])

    def _draft_by_need(self, draftable: pd.DataFrame, team_roster: TeamRoster) -> Optional[int]:
        """Fill remaining roster spots by greatest need"""
        priorities = team_roster.get_position_need_priority()

        # Sort positions by priority (descending)
        sorted_positions = sorted(priorities.items(), key=lambda x: x[1], reverse=True)

        for position, priority in sorted_positions:
            if priority > 0:  # Only consider positions we actually need
                position_players = draftable[draftable['position'] == position.value]
                if not position_players.empty:
                    best_at_position = position_players.sort_values('rank').iloc[0]
                    return int(best_at_position['id'])

        # If no specific needs, go BPA
        if not draftable.empty:
            best_player = draftable.sort_values('rank').iloc[0]
            return int(best_player['id'])

        return None


class ZeroRBStrategy(PositionalDraftStrategy):
    """Zero RB strategy - prioritize WR/TE early, RB late"""

    strategy_name: str = "Zero RB"
    description: str = "Delay drafting RBs while focusing on WR/TE early"

    draft_sequence: List[Position] = Field(default_factory=lambda: [
        Position.WR, Position.WR, Position.TE, Position.WR,
        Position.QB, Position.WR, Position.RB, Position.RB,
        Position.TE, Position.RB, Position.DST, Position.K
    ])


class RobustRBStrategy(PositionalDraftStrategy):
    """Robust RB strategy - prioritize RBs early and often"""

    strategy_name: str = "Robust RB"
    description: str = "Heavy focus on RB early to secure backfield"

    draft_sequence: List[Position] = Field(default_factory=lambda: [
        Position.RB, Position.RB, Position.WR, Position.RB,
        Position.WR, Position.TE, Position.QB, Position.RB,
        Position.WR, Position.TE, Position.DST, Position.K
    ])


class BalancedStrategy(DraftStrategy):
    """Balanced approach considering both value and need"""

    strategy_name: str = "Balanced"
    description: str = "Balance between best player available and positional need"

    value_weight: float = Field(default=0.6, ge=0.0, le=1.0)
    need_weight: float = Field(default=0.4, ge=0.0, le=1.0)

    def __call__(self, available_players_df: pd.DataFrame, team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players_df, team_roster)

        if draftable.empty:
            return None

        # Calculate composite scores
        draftable = draftable.copy()

        # Value score (inverse of rank, normalized)
        max_rank = draftable['rank'].max()
        draftable['value_score'] = (max_rank - draftable['rank'] + 1) / max_rank

        # Need score based on position priority
        priorities = team_roster.get_position_need_priority()
        draftable['need_score'] = draftable['position'].map(
            lambda pos: priorities.get(Position(pos), 0) / 100.0
        )

        # Composite score
        draftable['composite_score'] = (
            self.value_weight * draftable['value_score'] +
            self.need_weight * draftable['need_score']
        )

        # Select player with highest composite score
        best_player = draftable.sort_values('composite_score', ascending=False).iloc[0]
        return int(best_player['id'])


# Strategy registry for easy access
AVAILABLE_STRATEGIES = {
    "bpa": BestPlayerAvailableStrategy(),
    "tier": BestTierAvailableStrategy(),
    "positional": PositionalDraftStrategy(),
    "zero_rb": ZeroRBStrategy(),
    "robust_rb": RobustRBStrategy(),
    "balanced": BalancedStrategy()
}


def get_strategy(strategy_name: str) -> Optional[DraftStrategy]:
    """Get a strategy by name"""
    return AVAILABLE_STRATEGIES.get(strategy_name.lower())


def list_strategies() -> Dict[str, str]:
    """Get list of available strategies with descriptions"""
    return {name: strategy.description for name, strategy in AVAILABLE_STRATEGIES.items()}


# Example usage and testing
if __name__ == "__main__":
    # Sample data for testing
    sample_players = pd.DataFrame([
        {"id": 1, "name": "Josh Allen", "position": "QB", "team": "BUF", "rank": 1, "tier": 1},
        {"id": 2, "name": "CMC", "position": "RB", "team": "SF", "rank": 2, "tier": 1},
        {"id": 3, "name": "Tyreek Hill", "position": "WR", "team": "MIA", "rank": 3, "tier": 1},
        {"id": 4, "name": "Travis Kelce", "position": "TE", "team": "KC", "rank": 4, "tier": 1},
        {"id": 5, "name": "Lamar Jackson", "position": "QB", "team": "BAL", "rank": 5, "tier": 1},
    ])

    # Sample roster configuration
    roster_slots = []
    roster_reqs = {Position.QB: 1, Position.RB: 2, Position.WR: 2, Position.TE: 1,
                   Position.FLEX: 1, Position.DST: 1, Position.K: 1, Position.BENCH: 6}

    for pos, count in roster_reqs.items():
        for i in range(count):
            roster_slots.append(RosterSlot(position=pos))

    sample_roster = TeamRoster(
        team_id=1,
        team_name="Team 1",
        roster_slots=roster_slots,
        roster_requirements=roster_reqs
    )

    # Test each strategy
    for name, strategy in AVAILABLE_STRATEGIES.items():
        pick = strategy(sample_players, sample_roster)
        selected_player = sample_players[sample_players['id'] == pick].iloc[0] if pick else None
        print(f"{strategy.strategy_name}: {selected_player['name'] if selected_player is not None else 'No pick'}")
