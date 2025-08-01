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

    def get_filled_slots_by_position(self, position: Position) -> List[RosterSlot]:
        """Get filled slots for a specific position"""
        return [slot for slot in self.roster_slots
                if slot.position == position and slot.is_filled]

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

    def count_position(self, position: Position) -> int:
        """Count how many players we have at a position (including FLEX)"""
        direct_count = len(self.get_filled_slots_by_position(position))

        # Also count FLEX players of this position
        flex_count = 0
        flex_slots = self.get_filled_slots_by_position(Position.FLEX)
        for slot in flex_slots:
            if slot.player and Position(slot.player.position) == position:
                flex_count += 1

        return direct_count + flex_count


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

    def _get_players_by_position(self, players: List[dict], position: str) -> List[dict]:
        """Filter players by position"""
        return [p for p in players if p['position'] == position]

    def _get_best_player_at_position(self, players: List[dict], position: str) -> Optional[dict]:
        """Get the best available player at a position"""
        position_players = self._get_players_by_position(players, position)
        if not position_players:
            return None
        return min(position_players, key=lambda p: p['rank'])


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


class TierBasedStrategy(DraftStrategy):
    """Draft the best tier available, breaking ties by rank"""

    def __init__(self):
        super().__init__("Tier Based", "Prioritize players from the best available tier, then by rank within tier")

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


class PositionalNeedStrategy(DraftStrategy):
    """Draft based on roster needs with some positional priority"""

    def __init__(self):
        super().__init__("Positional Need", "Draft based on roster needs and positional scarcity")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Get position priorities
        priorities = team_roster.get_position_need_priority()

        # Sort positions by need (highest priority first)
        sorted_positions = sorted(priorities.items(), key=lambda x: x[1], reverse=True)

        # Try to fill highest priority positions first
        for position, priority in sorted_positions:
            if priority > 0:  # Only consider positions we actually need
                position_players = [p for p in draftable if p['position'] == position.value]
                if position_players:
                    best_at_position = min(position_players, key=lambda p: p['rank'])
                    return int(best_at_position['id'])

        # If no specific needs, go BPA
        best_player = min(draftable, key=lambda p: p['rank'])
        return int(best_player['id'])


class WRHeavyStrategy(DraftStrategy):
    """WR Heavy strategy - prioritize WR early and often"""

    def __init__(self):
        super().__init__("WR Heavy", "Prioritize WR early and often to build receiving corps")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Count current WRs
        wr_count = team_roster.count_position(Position.WR)
        qb_count = team_roster.count_position(Position.QB)
        rb_count = team_roster.count_position(Position.RB)
        te_count = team_roster.count_position(Position.TE)

        # Early rounds: prioritize WR heavily
        total_picks = sum(1 for slot in team_roster.roster_slots if slot.is_filled)

        # Force WR in first 6 picks if we don't have 3+ WRs yet
        if total_picks < 6 and wr_count < 3:
            wr_player = self._get_best_player_at_position(draftable, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return int(wr_player['id'])

        # Get QB if we don't have one and it's round 5+
        if qb_count == 0 and total_picks >= 4:
            qb_player = self._get_best_player_at_position(draftable, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return int(qb_player['id'])

        # Get at least 1 RB if we don't have any and it's getting late
        if rb_count == 0 and total_picks >= 3:
            rb_player = self._get_best_player_at_position(draftable, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return int(rb_player['id'])

        # Continue prioritizing WRs
        if wr_count < 5:
            wr_player = self._get_best_player_at_position(draftable, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return int(wr_player['id'])

        # Fill other needs by BPA
        return int(min(draftable, key=lambda p: p['rank'])['id'])


class RBHeavyStrategy(DraftStrategy):
    """RB Heavy strategy - load up on RBs early"""

    def __init__(self):
        super().__init__("RB Heavy", "Load up on RBs early to secure backfield depth")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Count current positions
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        qb_count = team_roster.count_position(Position.QB)
        total_picks = sum(1 for slot in team_roster.roster_slots if slot.is_filled)

        # Force RB in first 5 picks if we don't have 3+ RBs yet
        if total_picks < 5 and rb_count < 3:
            rb_player = self._get_best_player_at_position(draftable, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return int(rb_player['id'])

        # Get QB if we don't have one and it's round 5+
        if qb_count == 0 and total_picks >= 4:
            qb_player = self._get_best_player_at_position(draftable, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return int(qb_player['id'])

        # Get at least 2 WRs
        if wr_count < 2:
            wr_player = self._get_best_player_at_position(draftable, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return int(wr_player['id'])

        # Continue prioritizing RBs
        if rb_count < 5:
            rb_player = self._get_best_player_at_position(draftable, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return int(rb_player['id'])

        # Fill other needs by BPA
        return int(min(draftable, key=lambda p: p['rank'])['id'])


class HeroWRStrategy(DraftStrategy):
    """Hero WR strategy - take elite WR early, then focus on RB/TE"""

    def __init__(self):
        super().__init__("Hero WR", "Take elite WR early, then focus on RB/TE depth")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)
        print("These are draftable: ", draftable)

        if not draftable:
            return None

        # Count positions
        wr_count = team_roster.count_position(Position.WR)
        rb_count = team_roster.count_position(Position.RB)
        te_count = team_roster.count_position(Position.TE)
        qb_count = team_roster.count_position(Position.QB)
        print(f"wb/rb/te/qb counts: {wr_count} / {rb_count} / {te_count} / {qb_count}")
        total_picks = sum(1 for slot in team_roster.roster_slots if slot.is_filled)
        print("total picks: ",total_picks)

        # First pick: take best WR available (the "hero")
        if total_picks == 0:
            wr_player = self._get_best_player_at_position(draftable, 'WR')
            print(wr_player, team_roster.can_fill_position(Position.WR))
            if wr_player and team_roster.can_fill_position(Position.WR):
                return int(wr_player['id'])

        # Rounds 2-6: focus on RB/TE to build supporting cast
        if total_picks < 6 and wr_count >= 1:
            # Prioritize RB depth first
            if rb_count < 3:
                rb_player = self._get_best_player_at_position(draftable, 'RB')
                if rb_player and team_roster.can_fill_position(Position.RB):
                    return int(rb_player['id'])

            # Then get TE for receiving depth
            if te_count < 2:
                te_player = self._get_best_player_at_position(draftable, 'TE')
                if te_player and team_roster.can_fill_position(Position.TE):
                    return int(te_player['id'])

            # Get second WR if great value available
            if wr_count < 2:
                wr_player = self._get_best_player_at_position(draftable, 'WR')
                if wr_player and team_roster.can_fill_position(Position.WR):
                    return int(wr_player['id'])

        # Get QB if needed (rounds 4-7)
        if qb_count == 0 and 3 <= total_picks <= 7:
            qb_player = self._get_best_player_at_position(draftable, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return int(qb_player['id'])

        # Late rounds: continue building RB depth and add more WRs
        if rb_count < 4:
            rb_player = self._get_best_player_at_position(draftable, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return int(rb_player['id'])

        if wr_count < 4:
            wr_player = self._get_best_player_at_position(draftable, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return int(wr_player['id'])

        # Fill remaining needs by BPA
        return int(min(draftable, key=lambda p: p['rank'])['id'])

class HeroRBStrategy(DraftStrategy):
    """Hero RB strategy - take elite RB early, then focus on WR/TE"""

    def __init__(self):
        super().__init__("Hero RB", "Take elite RB early, then focus on WR/TE")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Count positions
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        te_count = team_roster.count_position(Position.TE)
        qb_count = team_roster.count_position(Position.QB)
        total_picks = sum(1 for slot in team_roster.roster_slots if slot.is_filled)

        # First pick: take best RB available (the "hero")
        if total_picks == 0:
            rb_player = self._get_best_player_at_position(draftable, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return int(rb_player['id'])

        # Rounds 2-6: focus on WR/TE
        if total_picks < 6 and rb_count >= 1:
            # Alternate between WR and TE preference
            if wr_count < 3:
                wr_player = self._get_best_player_at_position(draftable, 'WR')
                if wr_player and team_roster.can_fill_position(Position.WR):
                    return int(wr_player['id'])

            if te_count < 2:
                te_player = self._get_best_player_at_position(draftable, 'TE')
                if te_player and team_roster.can_fill_position(Position.TE):
                    return int(te_player['id'])

        # Get QB if needed
        if qb_count == 0 and total_picks >= 4:
            qb_player = self._get_best_player_at_position(draftable, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return int(qb_player['id'])

        # Late rounds: fill remaining needs
        return int(min(draftable, key=lambda p: p['rank'])['id'])


class ZeroRBStrategy(DraftStrategy):
    """Zero RB strategy - wait on RB, draft WR/TE early"""

    def __init__(self):
        super().__init__("Zero RB", "Wait on RB while focusing on WR/TE early")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Count positions
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        te_count = team_roster.count_position(Position.TE)
        qb_count = team_roster.count_position(Position.QB)
        total_picks = sum(1 for slot in team_roster.roster_slots if slot.is_filled)

        # Rounds 1-5: avoid RB, focus on WR/TE
        if total_picks < 5:
            if wr_count < 3:
                wr_player = self._get_best_player_at_position(draftable, 'WR')
                if wr_player and team_roster.can_fill_position(Position.WR):
                    return int(wr_player['id'])

            if te_count < 2:
                te_player = self._get_best_player_at_position(draftable, 'TE')
                if te_player and team_roster.can_fill_position(Position.TE):
                    return int(te_player['id'])

        # Get QB if needed (rounds 4-6)
        if qb_count == 0 and 3 <= total_picks <= 6:
            qb_player = self._get_best_player_at_position(draftable, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return int(qb_player['id'])

        # Round 6+: start taking RBs
        if total_picks >= 5 and rb_count < 2:
            rb_player = self._get_best_player_at_position(draftable, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return int(rb_player['id'])

        # Fill remaining needs
        return int(min(draftable, key=lambda p: p['rank'])['id'])


class LateQBStrategy(DraftStrategy):
    """Late QB strategy - wait on QB until later rounds"""

    def __init__(self):
        super().__init__("Late QB", "Wait on QB until later rounds while building skill positions")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Count positions
        qb_count = team_roster.count_position(Position.QB)
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        te_count = team_roster.count_position(Position.TE)
        total_picks = sum(1 for slot in team_roster.roster_slots if slot.is_filled)

        # Rounds 1-7: avoid QB, build skill positions
        if total_picks < 7 and qb_count == 0:
            # Prioritize RB/WR balance
            if rb_count < 2:
                rb_player = self._get_best_player_at_position(draftable, 'RB')
                if rb_player and team_roster.can_fill_position(Position.RB):
                    return int(rb_player['id'])

            if wr_count < 3:
                wr_player = self._get_best_player_at_position(draftable, 'WR')
                if wr_player and team_roster.can_fill_position(Position.WR):
                    return int(wr_player['id'])

            if te_count < 1:
                te_player = self._get_best_player_at_position(draftable, 'TE')
                if te_player and team_roster.can_fill_position(Position.TE):
                    return int(te_player['id'])

        # Round 8+: get QB if needed
        if qb_count == 0 and total_picks >= 7:
            qb_player = self._get_best_player_at_position(draftable, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return int(qb_player['id'])

        # Fill remaining needs
        return int(min(draftable, key=lambda p: p['rank'])['id'])


class EarlyQBStrategy(DraftStrategy):
    """Early QB strategy - secure top QB early"""

    def __init__(self):
        super().__init__("Early QB", "Secure elite QB early before building other positions")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        draftable = self._filter_draftable_players(available_players, team_roster)

        if not draftable:
            return None

        # Count positions
        qb_count = team_roster.count_position(Position.QB)
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        total_picks = sum(1 for slot in team_roster.roster_slots if slot.is_filled)

        # Rounds 1-3: get QB if available and needed
        if total_picks < 3 and qb_count == 0:
            qb_player = self._get_best_player_at_position(draftable, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return int(qb_player['id'])

        # After securing QB, balance RB/WR
        if rb_count < 2:
            rb_player = self._get_best_player_at_position(draftable, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return int(rb_player['id'])

        if wr_count < 3:
            wr_player = self._get_best_player_at_position(draftable, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return int(wr_player['id'])

        # BPA for remaining picks
        return int(min(draftable, key=lambda p: p['rank'])['id'])


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


# Strategy registry for easy access - updated with all strategies
AVAILABLE_STRATEGIES = {
    "manual": None,  # Manual drafting - no strategy
    "bpa": BestPlayerAvailableStrategy(),
    "positional": PositionalNeedStrategy(),
    "tier": TierBasedStrategy(),
    "balanced": BalancedStrategy(),
    "wr_heavy": WRHeavyStrategy(),
    "rb_heavy": RBHeavyStrategy(),
    "hero_rb": HeroRBStrategy(),
    "hero_wr": HeroWRStrategy(),
    "zero_rb": ZeroRBStrategy(),
    "late_qb": LateQBStrategy(),
    "early_qb": EarlyQBStrategy(),
}


def get_strategy(strategy_name: str) -> Optional[DraftStrategy]:
    """Get a strategy by name"""
    return AVAILABLE_STRATEGIES.get(strategy_name.lower())


def list_strategies() -> Dict[str, str]:
    """Get list of available strategies with descriptions"""
    return {name: strategy.description if strategy else "Manual drafting"
            for name, strategy in AVAILABLE_STRATEGIES.items()}


def execute_draft_strategy(strategy_name: str, available_players_json: str, team_roster_json: str, variability: float = 0.0) -> dict:
    """
    Execute a draft strategy and return the selected player

    Args:
        strategy_name: Name of the strategy to use
        available_players_json: JSON string of available players
        team_roster_json: JSON string of team roster data
        variability: Float 0.0-1.0 for strategy randomness

    Returns:
        Dict with player_id, player_name, strategy_used, and reasoning
    """
    try:
        # Parse inputs
        available_players = json.loads(available_players_json)
        team_data = json.loads(team_roster_json)

        # Get strategy
        strategy = get_strategy(strategy_name)
        if not strategy:
            return {"error": f"Unknown strategy: {strategy_name}"}

        # Convert team data to TeamRoster object
        roster_slots = []
        for slot in team_data.get('roster', []):
            player_obj = None
            is_filled = False
            if slot.get('player'):
                player_obj = Player(**slot['player'])
                is_filled = True
            roster_slots.append(RosterSlot(slot['position'], player_obj, is_filled))

        team_roster = TeamRoster(
            team_data['id'],
            team_data['name'],
            roster_slots
        )

        # Execute strategy
        selected_player_id = strategy(available_players, team_roster)

        if selected_player_id is None:
            return {"error": "No valid player selection"}

        # Find selected player info
        selected_player = next((p for p in available_players if p['id'] == selected_player_id), None)
        if not selected_player:
            return {"error": "Selected player not found"}

        return {
            "player_id": selected_player_id,
            "player_name": selected_player['name'],
            "strategy_used": strategy.strategy_name,
            "reasoning": f"Selected {selected_player['name']} ({selected_player['position']}) using {strategy.strategy_name} strategy"
        }

    except Exception as e:
        return {"error": f"Strategy execution failed: {str(e)}"}
