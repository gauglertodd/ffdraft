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
        """Count how many players we have at a position (including FLEX and BENCH)"""
        count = 0

        # Count direct position slots
        count += len(self.get_filled_slots_by_position(position))

        # Count FLEX slots with this position
        flex_slots = self.get_filled_slots_by_position(Position.FLEX)
        for slot in flex_slots:
            if slot.player and Position(slot.player.position) == position:
                count += 1

        # Count BENCH slots with this position
        bench_slots = self.get_filled_slots_by_position(Position.BENCH)
        for slot in bench_slots:
            if slot.player and Position(slot.player.position) == position:
                count += 1

        return count

    def total_filled_slots(self) -> int:
        """Get total number of filled roster slots"""
        return sum(1 for slot in self.roster_slots if slot.is_filled)

    def total_roster_slots(self) -> int:
        """Get total number of roster slots"""
        return len(self.roster_slots)

    def get_round_number(self) -> int:
        """Get current round number (1-indexed)"""
        return self.total_filled_slots() + 1

    def needs_dst_or_k(self) -> bool:
        """Check if we need DST or K and are in final 2 rounds"""
        total_picks = self.total_filled_slots()
        total_slots = self.total_roster_slots()

        # Only consider DST/K in final 2 rounds
        if total_picks < total_slots - 2:
            return False

        dst_count = self.count_position(Position.DST)
        k_count = self.count_position(Position.K)

        return (dst_count == 0 and self.can_fill_position(Position.DST)) or \
               (k_count == 0 and self.can_fill_position(Position.K))

    def must_draft_dst_or_k(self) -> bool:
        """Check if we MUST draft DST or K to complete roster"""
        total_picks = self.total_filled_slots()
        total_slots = self.total_roster_slots()

        dst_count = self.count_position(Position.DST)
        k_count = self.count_position(Position.K)

        # Count how many DST/K we still need
        needed_dst = 1 if (dst_count == 0 and self.can_fill_position(Position.DST)) else 0
        needed_k = 1 if (k_count == 0 and self.can_fill_position(Position.K)) else 0
        total_needed = needed_dst + needed_k

        # Remaining picks
        remaining_picks = total_slots - total_picks

        # Must draft if remaining picks <= needed DST/K
        return total_needed > 0 and remaining_picks <= total_needed

    def get_required_dst_k_position(self) -> Optional[Position]:
        """Get the required DST or K position that must be drafted"""
        if not self.must_draft_dst_or_k():
            return None

        dst_count = self.count_position(Position.DST)
        k_count = self.count_position(Position.K)
        total_picks = self.total_filled_slots()
        total_slots = self.total_roster_slots()
        remaining_picks = total_slots - total_picks

        # If only one pick left, draft whatever we're missing
        if remaining_picks == 1:
            if dst_count == 0 and self.can_fill_position(Position.DST):
                return Position.DST
            elif k_count == 0 and self.can_fill_position(Position.K):
                return Position.K

        # If two picks left and missing both, prioritize DST first
        elif remaining_picks == 2:
            if dst_count == 0 and k_count == 0:
                return Position.DST  # Draft DST first
            elif dst_count == 0 and self.can_fill_position(Position.DST):
                return Position.DST
            elif k_count == 0 and self.can_fill_position(Position.K):
                return Position.K

        return None

    def get_roster_completion_percentage(self) -> float:
        """Get percentage of roster completion"""
        total_picks = self.total_filled_slots()
        total_slots = self.total_roster_slots()
        return total_picks / total_slots if total_slots > 0 else 0.0


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

    def _filter_skill_position_players(self, available_players: List[dict], team_roster: TeamRoster) -> List[dict]:
        """Filter to skill position players (QB, RB, WR, TE) that we can roster"""
        skill_positions = [Position.QB, Position.RB, Position.WR, Position.TE]
        skill_players = []
        for player in available_players:
            player_pos = Position(player['position'])
            if player_pos in skill_positions and team_roster.can_fill_position(player_pos):
                skill_players.append(player)
        return skill_players

    def _get_players_by_position(self, players: List[dict], position: str) -> List[dict]:
        """Filter players by position"""
        return [p for p in players if p['position'] == position]

    def _get_best_player_at_position(self, players: List[dict], position: str) -> Optional[dict]:
        """Get the best available player at a position"""
        position_players = self._get_players_by_position(players, position)
        if not position_players:
            return None
        return min(position_players, key=lambda p: p['rank'])

    def _should_draft_qb(self, team_roster: TeamRoster) -> bool:
        """Check if we should draft a QB based on strict rules"""
        qb_count = team_roster.count_position(Position.QB)
        current_round = team_roster.get_round_number()

        # Never draft more than 2 QBs total
        if qb_count >= 2:
            return False

        # Never draft QB in first 9 rounds if we already have one
        if qb_count >= 1 and current_round <= 9:
            return False

        # Can draft first QB anytime after round 1, second QB after round 10
        return True

    def _handle_dst_k_draft(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        """Handle DST/K drafting logic - FORCE in final rounds when required"""
        # First check if we MUST draft DST/K to complete roster
        if team_roster.must_draft_dst_or_k():
            required_position = team_roster.get_required_dst_k_position()
            if required_position:
                if required_position == Position.DST:
                    dst_player = self._get_best_player_at_position(available_players, 'DST')
                    if dst_player:
                        return dst_player['id']
                elif required_position == Position.K:
                    k_player = self._get_best_player_at_position(available_players, 'K')
                    if k_player:
                        return k_player['id']

        # Otherwise use the normal needs-based logic (only in final 2 rounds)
        if not team_roster.needs_dst_or_k():
            return None

        dst_count = team_roster.count_position(Position.DST)
        k_count = team_roster.count_position(Position.K)

        # Draft DST first if we need it
        if dst_count == 0 and team_roster.can_fill_position(Position.DST):
            dst_player = self._get_best_player_at_position(available_players, 'DST')
            if dst_player:
                return dst_player['id']

        # Then draft K if we need it
        if k_count == 0 and team_roster.can_fill_position(Position.K):
            k_player = self._get_best_player_at_position(available_players, 'K')
            if k_player:
                return k_player['id']

        return None

    def _should_prioritize_dst_k(self, team_roster: TeamRoster) -> bool:
        """Check if we should prioritize DST/K over other positions"""
        return team_roster.needs_dst_or_k() or team_roster.must_draft_dst_or_k()

    def _execute_main_strategy(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        """Override this method in subclasses for main strategy logic"""
        # Default to best available non-QB skill position player
        skill_players = self._filter_skill_position_players(available_players, team_roster)
        non_qb_players = [p for p in skill_players if p['position'] != 'QB']

        if non_qb_players:
            best_player = min(non_qb_players, key=lambda p: p['rank'])
            return best_player['id']

        # Only consider QB if no other options and QB rules allow it
        if self._should_draft_qb(team_roster):
            qb_players = [p for p in skill_players if p['position'] == 'QB']
            if qb_players:
                best_qb = min(qb_players, key=lambda p: p['rank'])
                return best_qb['id']

        return None


class BestPlayerAvailableStrategy(DraftStrategy):
    """Draft the highest-ranked available player that fits roster needs"""

    def __init__(self):
        super().__init__("Best Player Available", "Always draft the highest-ranked available player who can fill a roster spot")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        # Get all skill position players
        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Filter out QBs if we shouldn't draft one
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if not skill_players:
            return None

        best_player = min(skill_players, key=lambda p: p['rank'])
        return best_player['id']


class TierBasedStrategy(DraftStrategy):
    """Draft the best tier available, breaking ties by rank"""

    def __init__(self):
        super().__init__("Tier Based", "Prioritize players from the best available tier, then by rank within tier")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Filter out QBs if we shouldn't draft one
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if not skill_players:
            return None

        # Filter out players without tier data
        tiered_players = [p for p in skill_players if p.get('tier') is not None]

        if not tiered_players:
            # Fall back to BPA if no tier data
            best_player = min(skill_players, key=lambda p: p['rank'])
            return best_player['id']

        # Sort by tier (ascending - lower tier = better), then by rank
        best_player = min(tiered_players, key=lambda p: (p['tier'], p['rank']))
        return best_player['id']


class PositionalNeedStrategy(DraftStrategy):
    """Draft based on roster needs with some positional priority"""

    def __init__(self):
        super().__init__("Positional Need", "Draft based on roster needs and positional scarcity")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Get position priorities (excluding DST/K from main strategy)
        priorities = team_roster.get_position_need_priority()
        skill_priorities = {pos: priority for pos, priority in priorities.items()
                          if pos not in [Position.DST, Position.K]}

        # Sort positions by need (highest priority first)
        sorted_positions = sorted(skill_priorities.items(), key=lambda x: x[1], reverse=True)

        # Try to fill highest priority positions first, but respect QB rules
        for position, priority in sorted_positions:
            if priority > 0:  # Only consider positions we actually need
                if position == Position.QB and not self._should_draft_qb(team_roster):
                    continue

                position_players = [p for p in skill_players if p['position'] == position.value]
                if position_players:
                    best_at_position = min(position_players, key=lambda p: p['rank'])
                    return best_at_position['id']

        # If no specific needs, go BPA for skill positions (excluding QB if needed)
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if skill_players:
            best_player = min(skill_players, key=lambda p: p['rank'])
            return best_player['id']

        return None


class WRHeavyStrategy(DraftStrategy):
    """WR Heavy strategy - prioritize WR early and often"""

    def __init__(self):
        super().__init__("WR Heavy", "Prioritize WR early and often to build receiving corps")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Count current positions
        wr_count = team_roster.count_position(Position.WR)
        qb_count = team_roster.count_position(Position.QB)
        rb_count = team_roster.count_position(Position.RB)
        te_count = team_roster.count_position(Position.TE)
        current_round = team_roster.get_round_number()

        # Early rounds: prioritize WR heavily
        if current_round <= 6 and wr_count < 3:
            wr_player = self._get_best_player_at_position(skill_players, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return wr_player['id']

        # Get QB if we don't have one and it's round 5+ and rules allow
        if qb_count == 0 and current_round >= 5 and self._should_draft_qb(team_roster):
            qb_player = self._get_best_player_at_position(skill_players, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return qb_player['id']

        # Get at least 1 RB if we don't have any and it's getting late
        if rb_count == 0 and current_round >= 4:
            rb_player = self._get_best_player_at_position(skill_players, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return rb_player['id']

        # Continue prioritizing WRs
        if wr_count < 5:
            wr_player = self._get_best_player_at_position(skill_players, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return wr_player['id']

        # Fill other needs by BPA (excluding QB if rules don't allow)
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if skill_players:
            return min(skill_players, key=lambda p: p['rank'])['id']
        return None


class RBHeavyStrategy(DraftStrategy):
    """RB Heavy strategy - load up on RBs early"""

    def __init__(self):
        super().__init__("RB Heavy", "Load up on RBs early to secure backfield depth")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Count current positions
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        qb_count = team_roster.count_position(Position.QB)
        current_round = team_roster.get_round_number()

        # Force RB in first 5 picks if we don't have 3+ RBs yet
        if current_round <= 5 and rb_count < 3:
            rb_player = self._get_best_player_at_position(skill_players, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return rb_player['id']

        # Get QB if we don't have one and it's round 5+ and rules allow
        if qb_count == 0 and current_round >= 5 and self._should_draft_qb(team_roster):
            qb_player = self._get_best_player_at_position(skill_players, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return qb_player['id']

        # Get at least 2 WRs
        if wr_count < 2:
            wr_player = self._get_best_player_at_position(skill_players, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return wr_player['id']

        # Continue prioritizing RBs
        if rb_count < 5:
            rb_player = self._get_best_player_at_position(skill_players, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return rb_player['id']

        # Fill other needs by BPA (excluding QB if rules don't allow)
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if skill_players:
            return min(skill_players, key=lambda p: p['rank'])['id']
        return None


class HeroWRStrategy(DraftStrategy):
    """Hero WR strategy - take elite WR early, then focus on RB/TE"""

    def __init__(self):
        super().__init__("Hero WR", "Take elite WR early, then focus on RB/TE depth")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Count positions
        wr_count = team_roster.count_position(Position.WR)
        rb_count = team_roster.count_position(Position.RB)
        te_count = team_roster.count_position(Position.TE)
        qb_count = team_roster.count_position(Position.QB)
        current_round = team_roster.get_round_number()

        # First pick: take best WR available (the "hero")
        if current_round == 1:
            wr_player = self._get_best_player_at_position(skill_players, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return wr_player['id']

        # Rounds 2-6: focus on RB/TE to build supporting cast
        if current_round <= 6 and wr_count >= 1:
            # Prioritize RB depth first
            if rb_count < 3:
                rb_player = self._get_best_player_at_position(skill_players, 'RB')
                if rb_player and team_roster.can_fill_position(Position.RB):
                    return rb_player['id']

            # Then get TE for receiving depth
            if te_count < 2:
                te_player = self._get_best_player_at_position(skill_players, 'TE')
                if te_player and team_roster.can_fill_position(Position.TE):
                    return te_player['id']

            # Get second WR if great value available
            if wr_count < 2:
                wr_player = self._get_best_player_at_position(skill_players, 'WR')
                if wr_player and team_roster.can_fill_position(Position.WR):
                    return wr_player['id']

        # Get QB if needed (rounds 4-7) and rules allow
        if qb_count == 0 and 4 <= current_round <= 7 and self._should_draft_qb(team_roster):
            qb_player = self._get_best_player_at_position(skill_players, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return qb_player['id']

        # Late rounds: continue building RB depth and add more WRs
        if rb_count < 4:
            rb_player = self._get_best_player_at_position(skill_players, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return rb_player['id']

        if wr_count < 4:
            wr_player = self._get_best_player_at_position(skill_players, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return wr_player['id']

        # Fill remaining needs by BPA (excluding QB if rules don't allow)
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if skill_players:
            return min(skill_players, key=lambda p: p['rank'])['id']
        return None


class HeroRBStrategy(DraftStrategy):
    """Hero RB strategy - take elite RB early, then focus on WR/TE"""

    def __init__(self):
        super().__init__("Hero RB", "Take elite RB early, then focus on WR/TE")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Count positions
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        te_count = team_roster.count_position(Position.TE)
        qb_count = team_roster.count_position(Position.QB)
        current_round = team_roster.get_round_number()

        # First pick: take best RB available (the "hero")
        if current_round == 1:
            rb_player = self._get_best_player_at_position(skill_players, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return rb_player['id']

        # Rounds 2-6: focus on WR/TE
        if current_round <= 6 and rb_count >= 1:
            # Alternate between WR and TE preference
            if wr_count < 3:
                wr_player = self._get_best_player_at_position(skill_players, 'WR')
                if wr_player and team_roster.can_fill_position(Position.WR):
                    return wr_player['id']

            if te_count < 2:
                te_player = self._get_best_player_at_position(skill_players, 'TE')
                if te_player and team_roster.can_fill_position(Position.TE):
                    return te_player['id']

        # Get QB if needed and rules allow
        if qb_count == 0 and current_round >= 4 and self._should_draft_qb(team_roster):
            qb_player = self._get_best_player_at_position(skill_players, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return qb_player['id']

        # Late rounds: fill remaining needs by BPA (excluding QB if rules don't allow)
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if skill_players:
            return min(skill_players, key=lambda p: p['rank'])['id']
        return None


class ZeroRBStrategy(DraftStrategy):
    """Zero RB strategy - wait on RB, draft WR/TE early"""

    def __init__(self):
        super().__init__("Zero RB", "Wait on RB while focusing on WR/TE early")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Count positions
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        te_count = team_roster.count_position(Position.TE)
        qb_count = team_roster.count_position(Position.QB)
        current_round = team_roster.get_round_number()

        # Rounds 1-5: avoid RB, focus on WR/TE
        if current_round <= 5:
            if wr_count < 3:
                wr_player = self._get_best_player_at_position(skill_players, 'WR')
                if wr_player and team_roster.can_fill_position(Position.WR):
                    return wr_player['id']

            if te_count < 2:
                te_player = self._get_best_player_at_position(skill_players, 'TE')
                if te_player and team_roster.can_fill_position(Position.TE):
                    return te_player['id']

        # Get QB if needed (rounds 4-6) and rules allow
        if qb_count == 0 and 4 <= current_round <= 6 and self._should_draft_qb(team_roster):
            qb_player = self._get_best_player_at_position(skill_players, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return qb_player['id']

        # Round 6+: start taking RBs
        if current_round >= 6 and rb_count < 2:
            rb_player = self._get_best_player_at_position(skill_players, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return rb_player['id']

        # Fill remaining needs by BPA (excluding QB if rules don't allow)
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if skill_players:
            return min(skill_players, key=lambda p: p['rank'])['id']
        return None


class LateQBStrategy(DraftStrategy):
    """Late QB strategy - wait on QB until later rounds"""

    def __init__(self):
        super().__init__("Late QB", "Wait on QB until later rounds while building skill positions")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Count positions
        qb_count = team_roster.count_position(Position.QB)
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        te_count = team_roster.count_position(Position.TE)
        current_round = team_roster.get_round_number()

        # Rounds 1-7: avoid QB, build skill positions
        if current_round <= 7 and qb_count == 0:
            # Prioritize RB/WR balance
            if rb_count < 2:
                rb_player = self._get_best_player_at_position(skill_players, 'RB')
                if rb_player and team_roster.can_fill_position(Position.RB):
                    return rb_player['id']

            if wr_count < 3:
                wr_player = self._get_best_player_at_position(skill_players, 'WR')
                if wr_player and team_roster.can_fill_position(Position.WR):
                    return wr_player['id']

            if te_count < 1:
                te_player = self._get_best_player_at_position(skill_players, 'TE')
                if te_player and team_roster.can_fill_position(Position.TE):
                    return te_player['id']

        # Round 8+: get QB if needed and rules allow
        if qb_count == 0 and current_round >= 8 and self._should_draft_qb(team_roster):
            qb_player = self._get_best_player_at_position(skill_players, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return qb_player['id']

        # Fill remaining needs by BPA (excluding QB if rules don't allow)
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if skill_players:
            return min(skill_players, key=lambda p: p['rank'])['id']
        return None


class EarlyQBStrategy(DraftStrategy):
    """Early QB strategy - secure top QB early"""

    def __init__(self):
        super().__init__("Early QB", "Secure elite QB early before building other positions")

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Count positions
        qb_count = team_roster.count_position(Position.QB)
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        current_round = team_roster.get_round_number()

        # Rounds 2-4: get QB if available and needed (never round 1, respect rules)
        if 2 <= current_round <= 4 and qb_count == 0 and self._should_draft_qb(team_roster):
            qb_player = self._get_best_player_at_position(skill_players, 'QB')
            if qb_player and team_roster.can_fill_position(Position.QB):
                return qb_player['id']

        # After securing QB or if we can't draft QB, balance RB/WR
        if rb_count < 2:
            rb_player = self._get_best_player_at_position(skill_players, 'RB')
            if rb_player and team_roster.can_fill_position(Position.RB):
                return rb_player['id']

        if wr_count < 3:
            wr_player = self._get_best_player_at_position(skill_players, 'WR')
            if wr_player and team_roster.can_fill_position(Position.WR):
                return wr_player['id']

        # BPA for remaining picks (excluding QB if rules don't allow)
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if skill_players:
            return min(skill_players, key=lambda p: p['rank'])['id']
        return None


class BalancedStrategy(DraftStrategy):
    """Balanced approach considering both value and need"""

    def __init__(self):
        super().__init__("Balanced", "Balance between best player available and positional need")
        self.value_weight = 0.6
        self.need_weight = 0.4

    def __call__(self, available_players: List[dict], team_roster: TeamRoster) -> Optional[int]:
        # First check if we need DST/K in final rounds
        dst_k_pick = self._handle_dst_k_draft(available_players, team_roster)
        if dst_k_pick:
            return dst_k_pick

        skill_players = self._filter_skill_position_players(available_players, team_roster)
        if not skill_players:
            return None

        # Filter out QBs if we shouldn't draft one
        if not self._should_draft_qb(team_roster):
            skill_players = [p for p in skill_players if p['position'] != 'QB']

        if not skill_players:
            return None

        # Calculate composite scores
        max_rank = max(p['rank'] for p in skill_players)
        priorities = team_roster.get_position_need_priority()

        # Exclude DST/K from main strategy priorities
        skill_priorities = {pos: priority for pos, priority in priorities.items()
                          if pos not in [Position.DST, Position.K]}

        best_player = None
        best_score = -1

        for player in skill_players:
            # Value score (inverse of rank, normalized)
            value_score = (max_rank - player['rank'] + 1) / max_rank

            # Need score based on position priority
            player_pos = Position(player['position'])
            need_score = skill_priorities.get(player_pos, 0) / 100.0

            # Composite score
            composite_score = (
                self.value_weight * value_score +
                self.need_weight * need_score
            )

            if composite_score > best_score:
                best_score = composite_score
                best_player = player

        return best_player['id'] if best_player else None


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
            roster_slots,
            team_data.get('roster_requirements', {})
        )

        # Execute strategy
        selected_player_id = strategy(available_players, team_roster)

        if selected_player_id is None:
            return {"error": "No valid player selection"}

        # Find selected player info
        selected_player = next((p for p in available_players if p['id'] == selected_player_id), None)
        if not selected_player:
            return {"error": "Selected player not found"}

        # Determine reasoning based on whether DST/K was drafted
        reasoning = f"Selected {selected_player['name']} ({selected_player['position']}) using {strategy.strategy_name} strategy"

        if selected_player['position'] in ['DST', 'K']:
            if team_roster.must_draft_dst_or_k():
                reasoning += f" - FORCED {selected_player['position']} selection to complete roster"
            else:
                reasoning += f" - Final rounds priority for {selected_player['position']}"
        elif selected_player['position'] == 'QB':
            qb_count = team_roster.count_position(Position.QB)
            current_round = team_roster.get_round_number()
            reasoning += f" - QB selection (QB #{qb_count + 1}, Round {current_round})"

        return {
            "player_id": selected_player_id,
            "player_name": selected_player['name'],
            "strategy_used": strategy.strategy_name,
            "reasoning": reasoning
        }

    except Exception as e:
        return {"error": f"Strategy execution failed: {str(e)}"}
