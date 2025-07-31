"""
Fantasy Football Auto-Draft Strategies for PyScript

This module contains various draft strategies that can be applied to teams
for automated drafting. Adapted for browser execution via PyScript.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
import json
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


class Player:
    """Individual player data model"""
    def __init__(self, id: int, name: str, position: str, team: str, rank: int, tier: Optional[int] = None, is_drafted: bool = False):
        self.id = id
        self.name = name
        self.position = Position(position)
        self.team = team
        self.rank = rank
        self.tier = tier
        self.is_drafted = is_drafted


class RosterSlot:
    """Individual roster slot"""
    def __init__(self, position: str, player: Optional[Player] = None, is_filled: bool = False):
        self.position = Position(position)
        self.player = player
        self.is_filled = is_filled


class TeamRoster:
    """Team roster configuration and current state"""
    def __init__(self, team_id: int, team_name: str, roster_slots: List[RosterSlot], roster_requirements: Dict = None):
        self.team_id = team_id
        self.team_name = team_name
        self.roster_slots = roster_slots
        self.roster_requirements = roster_requirements or {}

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


class DraftStrategy(ABC):
    """Base class for all draft strategies"""
    def __init__(self, strategy_name: str, description: str):
        self.strategy_name = strategy_name
        self.description = description

    @abstractmethod
    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        """
        Select the next player to draft

        Args:
            available_players: List of available (undrafted) players
            team_roster: Current team roster state

        Returns:
            player_id of selected player, or None if no valid selection
        """
        pass

    def _filter_draftable_players(self, available_players: List[dict], team_roster: TeamRoster) -> List[dict]:
        """Filter players to only those we can actually roster"""
        draftable = []
        for player in available_players:
            player_pos = Position(player['position'])
            if team_roster.can_fill_position(player_pos):
                draftable.append(player)
        return draftable


class BestPlayerAvailableStrategy(DraftStrategy):
    """Draft the highest-ranked available player that fits roster needs"""

    def __init__(self):
        super().__init__("Best Player Available", "Always draft the highest-ranked available player who can fill a roster spot")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Sort by rank (ascending - lower rank number = better)
        best_player = min(draftable, key=lambda p: p['rank'])
        return int(best_player['id'])


class BestTierAvailableStrategy(DraftStrategy):
    """Draft the best tier available, breaking ties by rank"""

    def __init__(self):
        super().__init__("Best Tier Available", "Prioritize players from the best available tier, then by rank within tier")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Filter out players without tier data
        tiered_players = [p for p in draftable if p.get('tier') is not None]

        if not tiered_players:
            # Fall back to BPA if no tier data
            best_player = min(draftable, key=lambda p: p['rank'])
            return int(best_player['id'])

        # Sort by tier (ascending - lower tier = better), then by rank
        best_player = min(tiered_players, key=lambda p: (p['tier'], p['rank']))
        return int(best_player['id'])


class PositionalDraftStrategy(DraftStrategy):
    """Draft following a specific positional sequence"""

    def __init__(self):
        super().__init__("Positional Strategy", "Follow a predetermined position sequence (e.g., WR-RB-WR-RB-QB-TE)")
        self.draft_sequence = [
            Position.WR, Position.RB, Position.WR, Position.RB,
            Position.QB, Position.TE, Position.RB, Position.WR,
            Position.QB, Position.TE, Position.DST, Position.K
        ]

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
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
        position_players = [p for p in draftable if p['position'] == target_position.value]

        if position_players and team_roster.can_fill_position(target_position):
            best_at_position = min(position_players, key=lambda p: p['rank'])
            return int(best_at_position['id'])

        # If target position not available or can't be filled, fall back to BPA
        best_player = min(draftable, key=lambda p: p['rank'])
        return int(best_player['id'])

    def _draft_by_need(self, draftable: List[dict], team_roster: TeamRoster) -> Optional[int]:
        """Fill remaining roster spots by greatest need"""
        priorities = team_roster.get_position_need_priority()

        # Sort positions by priority (descending)
        sorted_positions = sorted(priorities.items(), key=lambda x: x[1], reverse=True)

        for position, priority in sorted_positions:
            if priority > 0:  # Only consider positions we actually need
                position_players = [p for p in draftable if p['position'] == position.value]
                if position_players:
                    best_at_position = min(position_players, key=lambda p: p['rank'])
                    return int(best_at_position['id'])

        # If no specific needs, go BPA
        if draftable:
            best_player = min(draftable, key=lambda p: p['rank'])
            return int(best_player['id'])

        return None


class ZeroRBStrategy(PositionalDraftStrategy):
    """Zero RB strategy - prioritize WR/TE early, RB late"""

    def __init__(self):
        super().__init__()
        self.strategy_name = "Zero RB"
        self.description = "Delay drafting RBs while focusing on WR/TE early"
        self.draft_sequence = [
            Position.WR, Position.WR, Position.TE, Position.WR,
            Position.QB, Position.WR, Position.RB, Position.RB,
            Position.TE, Position.RB, Position.DST, Position.K
        ]


class RobustRBStrategy(PositionalDraftStrategy):
    """Robust RB strategy - prioritize RBs early and often"""

    def __init__(self):
        super().__init__()
        self.strategy_name = "Robust RB"
        self.description = "Heavy focus on RB early to secure backfield"
        self.draft_sequence = [
            Position.RB, Position.RB, Position.WR, Position.RB,
            Position.WR, Position.TE, Position.QB, Position.RB,
            Position.WR, Position.TE, Position.DST, Position.K
        ]


class BalancedStrategy(DraftStrategy):
    """Balanced approach considering both value and need"""

    def __init__(self):
        super().__init__("Balanced", "Balance between best player available and positional need")
        self.value_weight = 0.6
        self.need_weight = 0.4

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Calculate composite scores
        max_rank = max(p['rank'] for p in draftable)
        priorities = team_roster.get_position_need_priority()

        best_player = None
        best_score = -1

        for player in draftable:
            # Value score (inverse of rank, normalized)
            value_score = (max_rank - player['rank'] + 1) / max_rank

            # Need score based on position priority
            player_pos = Position(player['position'])
            need_score = priorities.get(player_pos, 0) / 100.0

            # Composite score
            composite_score = (
                self.value_weight * value_score +
                self.need_weight * need_score
            )

            if composite_score > best_score:
                best_score = composite_score
                best_player = player

        return int(best_player['id']) if best_player else None


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
