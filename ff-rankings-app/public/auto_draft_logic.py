"""
Fantasy Football Auto-Draft Logic for PyScript

This module provides the core auto-draft functionality that runs in the browser.
"""

import json
import random
from typing import Dict, List, Any, Optional
from js import window, console, Object
from pyodide.ffi import create_proxy
from draft_strategies import (
    AVAILABLE_STRATEGIES,
    TeamRoster,
    RosterSlot,
    Position,
    Player
)


def apply_strategy_variability(available_players: List[dict], strategy_result_id: int, variability: float = 0.0) -> int:
    """
    Apply variability to strategy selection

    Args:
        available_players: List of available players
        strategy_result_id: The "optimal" player ID selected by the strategy
        variability: 0.0-1.0, where 0 = always pick optimal, 1 = maximum randomness

    Returns:
        Final player ID after applying variability
    """
    if random.random() > variability:
        return strategy_result_id

    if variability <= 0.0 or not available_players:
        return strategy_result_id

    # Sort players by rank to find optimal player's position
    available_sorted = sorted(available_players, key=lambda p: p['rank'])
    optimal_player_rank_in_list = None

    for idx, player in enumerate(available_sorted):
        if player['id'] == strategy_result_id:
            optimal_player_rank_in_list = idx
            break

    if optimal_player_rank_in_list is None:
        return strategy_result_id

    # Define probability distribution based on variability
    num_players = min(len(available_sorted), 10)  # Consider top 10 players max

    if variability <= 0.3:  # Low variability - focused on top picks
        weights = [0.85, 0.15, 0.00, 0.00] + [0.0] * (num_players - 4)
    elif variability <= 0.6:  # Medium variability - some deviation
        weights = [0.4, 0.3, 0.15, 0.10, 0.05] + [0.0] * (num_players - 5)
    else:  # High variability - more unpredictable
        weights = [0.3, 0.2, 0.15, 0.12, 0.08, 0.06, 0.04, 0.03, 0.02] + [0.0] * (num_players - 9)

    # Adjust weights based on variability level
    variability_factor = variability * 2  # Scale 0-1 to 0-2

    # Flatten the distribution more as variability increases
    if variability > 0.7:
        # High variability - more even distribution
        weights = [(1.0 - variability_factor * 0.3) * w + (variability_factor * 0.3) / num_players for w in weights[:num_players]]

    # Ensure we have enough weights
    weights = weights[:num_players]
    if len(weights) < num_players:
        weights.extend([0.01] * (num_players - len(weights)))

    # Normalize weights
    total_weight = sum(weights)
    if total_weight > 0:
        weights = [w / total_weight for w in weights]
    else:
        weights = [1.0 / num_players] * num_players

    # Select player based on weighted random choice
    try:
        # Fallback: create cumulative weights and use random.random()
        cumulative = []
        total = 0
        for w in weights:
            total += w
            cumulative.append(total)

        rand_val = random.random()
        selected_index = 0
        for i, cum_weight in enumerate(cumulative):
            if rand_val <= cum_weight:
                selected_index = i
                break

        selected_player = available_sorted[selected_index]
        console.log(f"    Variability applied: selected rank {selected_index + 1} instead of rank 1 (variability: {variability:.1f})")
        return selected_player['id']
    except Exception as e:
        console.log(f"Error in variability selection: {e}")
        # Fallback to original choice if something goes wrong
        return strategy_result_id


def create_team_roster_from_data(team_data: dict) -> TeamRoster:
    """Convert team data from JavaScript to TeamRoster object"""
    roster_slots = []

    for slot_data in team_data['roster']:
        player = None
        if slot_data.get('player'):
            player_data = slot_data['player']
            player = Player(
                id=player_data['id'],
                name=player_data['name'],
                position=player_data['position'],
                team=player_data['team'],
                rank=player_data['rank'],
                tier=player_data.get('tier'),
                is_drafted=True
            )

        slot = RosterSlot(
            position=slot_data['position'],
            player=player,
            is_filled=slot_data['player'] is not None
        )
        roster_slots.append(slot)

    return TeamRoster(
        team_id=team_data['id'],
        team_name=team_data['name'],
        roster_slots=roster_slots,
        roster_requirements=team_data.get('roster_requirements', {})
    )


def execute_strategy_with_variability(strategy, available_players: List[dict], team_roster: TeamRoster, variability: float = 0.0) -> int:
    """
    Execute a strategy with applied variability

    Args:
        strategy: The draft strategy function
        available_players: Available players
        team_roster: Team roster state
        variability: 0.0-1.0 variability level

    Returns:
        Selected player ID
    """
    # Get the "optimal" pick from the strategy
    optimal_pick = strategy(available_players, team_roster)

    if optimal_pick is None:
        return None

    # Apply variability to potentially select a different player
    final_pick = apply_strategy_variability(available_players, optimal_pick, variability)

    return final_pick


# Debug logging for the availability simulator. The per-pick logs cross the
# Pyodide->JS bridge for every simulated pick and dominate runtime when
# running hundreds of trials, so they are off by default.
SIMULATION_DEBUG_LOGGING = False


class SimTeamRoster:
    """Lightweight roster view for the availability simulator.

    Strategies only read the round number and per-position counts through
    TeamRoster, so the simulator serves those from counters instead of
    materializing RosterSlot objects for every simulated pick.
    """

    def __init__(self, stub: dict):
        self.team_id = stub['id']
        self.team_name = stub['name']
        self._round = stub['_sim_round']
        self._counts = stub['_sim_counts']
        self.roster_slots = []
        self.roster_requirements = {}

    def get_empty_slots(self):
        return []

    def get_empty_slots_by_position(self, position):
        return []

    def get_filled_slots_by_position(self, position):
        return []

    def can_fill_position(self, position) -> bool:
        # During simulation every candidate is rosterable: bench demand is
        # open for the whole draft window the simulator covers.
        return True

    def get_position_need_priority(self):
        priorities = {}
        for pos in [Position.QB, Position.RB, Position.WR, Position.TE, Position.DST, Position.K]:
            priorities[pos] = max(0, 1 - self._counts.get(pos.value, 0)) * 10
        return priorities

    def count_position(self, position) -> int:
        if isinstance(position, Position):
            position = position.value
        return self._counts.get(position, 0)

    def total_filled_slots(self) -> int:
        return sum(self._counts.values())

    def total_roster_slots(self) -> int:
        return self.total_filled_slots() + 15

    def get_round_number(self) -> int:
        return self._round

    def needs_dst_or_k(self) -> bool:
        # Mirror the real heuristic cheaply: final two rounds of a 15-slot
        # roster with the position still empty.
        filled = self.total_filled_slots()
        if filled < 13:
            return False
        return (self._counts.get('DST', 0) == 0) or (self._counts.get('K', 0) == 0)

    def must_draft_dst_or_k(self) -> bool:
        filled = self.total_filled_slots()
        needed = (1 if self._counts.get('DST', 0) == 0 else 0) +                  (1 if self._counts.get('K', 0) == 0 else 0)
        return needed > 0 and (15 - filled) <= needed

    def get_required_dst_k_position(self):
        if not self.must_draft_dst_or_k():
            return None
        remaining = 15 - self.total_filled_slots()
        if remaining == 1:
            if self._counts.get('DST', 0) == 0:
                return Position.DST
            if self._counts.get('K', 0) == 0:
                return Position.K
        if remaining == 2:
            if self._counts.get('DST', 0) == 0:
                return Position.DST
            if self._counts.get('K', 0) == 0:
                return Position.K
        return None

    def get_roster_completion_percentage(self) -> float:
        return self.total_filled_slots() / 15.0


def simulate_draft_until_my_turn(
    available_players: List[dict],
    teams_data: List[dict],
    current_pick: int,
    my_team_id: int,
    num_teams: int,
    draft_style: str,
    team_variability: Dict[int, float] = None,
    team_strategies: Dict[int, str] = None
) -> List[dict]:
    """
    Simulate draft picks until it's my turn again.
    Mutates available_players in place (removes simulated picks) and returns it.

    Performance notes: no deepcopy, no per-pick logging (see
    SIMULATION_DEBUG_LOGGING), and roster state is tracked as counters in a
    SimTeamRoster instead of full RosterSlot lists.
    """
    if team_variability is None:
        team_variability = {}
    if team_strategies is None:
        team_strategies = {}

    # Work on a copy: the trial loop in predict_availability reuses the
    # caller's list for every trial, so simulated picks must never leak out.
    # (Dicts are shared but never mutated - picks are removed, not edited.)
    available_players = list(available_players)

    taken_counts: Dict[int, Dict[str, int]] = {}
    for team_data in teams_data:
        counts = {}
        for slot in team_data.get('roster', []):
            if slot.get('player'):
                pos = slot['player']['position']
                counts[pos] = counts.get(pos, 0) + 1
        taken_counts[team_data['id']] = counts

    strategy_names = [name for name in AVAILABLE_STRATEGIES.keys()
                      if name != 'manual' and AVAILABLE_STRATEGIES[name] is not None]

    def team_pick_count(team_id: int) -> int:
        return sum(taken_counts[team_id].values())

    def pick_team(pick_number: int) -> int:
        round_num = (pick_number - 1) // num_teams
        pos_in_round = (pick_number - 1) % num_teams
        if draft_style == 'snake':
            return pos_in_round + 1 if round_num % 2 == 0 else num_teams - pos_in_round
        return pos_in_round + 1

    # Start simulating from the NEXT pick (not current pick). If my team
    # owns that one too (consecutive picks: end of snake round / start of
    # the next, the 1.12 -> 2.01 turn, etc.), those picks are OUR own
    # opportunities - skip them. Otherwise every player would read 100%
    # available when we already control the very next pick. Simulating then
    # runs to the pick after our streak, so odds answer: "will he still be
    # there if I pass on my current opportunity(ies)?" Any streak length
    # is handled (e.g. 1.12, 2.01, 2.02 for a 2-team league).
    pick = current_pick + 1
    while pick_team(pick) == my_team_id:
        pick += 1

    picks_simulated = 0

    while picks_simulated < 20:  # Limit to avoid infinite loops
        current_team_id = pick_team(pick)

        if current_team_id == my_team_id:
            break

        if not available_players or not strategy_names:
            break

        # Known strategy for this team (e.g. inferred from their actual
        # picks) takes priority; otherwise rotate through the full mix.
        assigned = team_strategies.get(current_team_id)
        if assigned is not None:
            strategy = AVAILABLE_STRATEGIES[assigned]
        else:
            strategy = AVAILABLE_STRATEGIES[strategy_names[picks_simulated % len(strategy_names)]]

        current_counts = taken_counts[current_team_id]
        sim_roster = SimTeamRoster({
            'id': current_team_id,
            'name': f'Team {current_team_id}',
            '_sim_round': team_pick_count(current_team_id) + 1,
            '_sim_counts': current_counts,
        })

        team_var = team_variability.get(current_team_id, 0.3)
        selected_player_id = execute_strategy_with_variability(
            strategy, available_players, sim_roster, team_var
        )

        if selected_player_id is None:
            break

        for i, player in enumerate(available_players):
            if player['id'] == selected_player_id:
                available_players.pop(i)
                pos = player['position']
                current_counts[pos] = current_counts.get(pos, 0) + 1
                break

        picks_simulated += 1
        pick += 1

    if SIMULATION_DEBUG_LOGGING:
        console.log(f"  Simulated {picks_simulated} picks ending before pick {pick}")

    return available_players


# ---------------------------------------------------------------------------
# Strategy inference from observed picks
# ---------------------------------------------------------------------------

def infer_strategies(
    draft_picks_json: str,
    board_json: str,
    roster_requirements_json: str = "{}"
) -> str:
    """
    PyScript entry: infer the strategy of every team that has picks.

    Single-pass replay of the whole draft in pick-number order: the pool
    starts as the full board and shrinks with EVERY pick (all teams), so
    each strategy is scored against the true pre-pick state of the draft.
    For each pick, the target team's candidate strategies state what they
    would have done; the gap to the actual player is recorded.

    Args:
        draft_picks_json: JSON array of picks:
            [{teamId, pickNumber, id, name, position, rank, tier}]
        board_json: JSON array of the full starting board (same shape).
        roster_requirements_json: reserved for future use.

    Returns:
        JSON: {teamId: {inferred_strategy, confidence, mean_gap,
                        picks_analyzed, per_strategy}}
    """
    try:
        picks = json.loads(draft_picks_json)
        board = json.loads(board_json)
        if not board or not picks:
            return json.dumps({"error": "Need picks and a non-empty board"})

        strategy_names = [name for name in AVAILABLE_STRATEGIES.keys()
                          if name != 'manual' and AVAILABLE_STRATEGIES[name] is not None]

        picks = sorted(picks, key=lambda p: p.get('pickNumber', 0))
        by_id = {p['id']: p for p in board}
        pool = list(board)
        counts: Dict[int, Dict[str, int]] = {}
        gaps: Dict[int, Dict[str, List[float]]] = {}
        pick_totals: Dict[int, int] = {}

        for actual in picks:
            team_id = int(actual['teamId'])
            player = by_id.get(actual['id'])
            if player is None:
                continue

            if team_id not in gaps:
                counts[team_id] = {}
                gaps[team_id] = {name: [] for name in strategy_names}
            pick_totals[team_id] = pick_totals.get(team_id, 0) + 1

            sim_roster = SimTeamRoster({
                'id': team_id,
                'name': f'Team {team_id}',
                '_sim_round': sum(counts[team_id].values()) + 1,
                '_sim_counts': counts[team_id],
            })

            for name in strategy_names:
                strategy = AVAILABLE_STRATEGIES[name]
                # Optimal pick (no variability): what THIS strategy would
                # have done for this team right here
                optimal_id = strategy(pool, sim_roster)
                if optimal_id is None:
                    gaps[team_id][name].append(12.0)
                elif optimal_id == actual['id']:
                    gaps[team_id][name].append(0.0)
                else:
                    optimal = by_id[optimal_id]
                    gaps[team_id][name].append(float(abs(optimal['rank'] - player['rank'])))

            # Advance the draft: remove the actual pick and update that
            # team's roster counts
            for i, p in enumerate(pool):
                if p['id'] == actual['id']:
                    pool.pop(i)
                    break
            counts[team_id][player['position']] = counts[team_id].get(player['position'], 0) + 1

        results = {}
        for team_id, team_gaps in gaps.items():
            n_picks = pick_totals[team_id]
            per_strategy = {}
            for name, g in team_gaps.items():
                if not g:
                    continue
                mean_gap = sum(g) / len(g)
                exact = sum(1 for x in g if x == 0) / len(g)
                # Exact matches weigh far more than near misses: a strategy
                # that nails every pick dominates one that is merely close.
                score = (1.0 / (1.0 + mean_gap)) * (0.5 + 0.5 * exact)
                per_strategy[name] = {"mean_gap": round(mean_gap, 2),
                                      "exact_rate": round(exact, 3),
                                      "score": round(score, 4)}
            if not per_strategy:
                continue
            ranked = sorted(per_strategy.items(), key=lambda kv: kv[1]['score'], reverse=True)
            best_name, best_stats = ranked[0]
            runner_up = ranked[1][1]['score'] if len(ranked) > 1 else 0.0
            separation = best_stats['score'] - runner_up
            sample_factor = min(1.0, n_picks / 5.0)
            confidence = round(max(0.0, min(1.0, best_stats['score'] * (0.6 + 0.4 * min(1.0, separation * 4)))) * sample_factor, 3)
            results[str(team_id)] = {
                "inferred_strategy": best_name,
                "confidence": confidence,
                "mean_gap": best_stats['mean_gap'],
                "picks_analyzed": len(team_gaps[best_name]),
                "per_strategy": {name: stats for name, stats in ranked},
            }
        return json.dumps(results)
    except Exception as e:
        console.log(f"infer_strategies error: {str(e)}")
        return json.dumps({"error": str(e)})


# PyScript API Functions - these will be exposed to JavaScript
def auto_draft_player(available_players_json: str, team_roster_json: str, strategy: str, variability: float = 0.0) -> str:
    """
    Auto-draft endpoint for PyScript

    Args:
        available_players_json: JSON string of available players
        team_roster_json: JSON string of team roster data
        strategy: Strategy name
        variability: Variability level (0.0-1.0)

    Returns:
        JSON string with draft result
    """
    try:
        # Parse JSON inputs
        available_players = json.loads(available_players_json)
        team_roster_data = json.loads(team_roster_json)

        # Convert team roster data
        team_roster = create_team_roster_from_data(team_roster_data)

        # Get strategy
        if strategy.lower() not in AVAILABLE_STRATEGIES:
            return json.dumps({"error": f"Unknown strategy: {strategy}"})

        strategy_obj = AVAILABLE_STRATEGIES[strategy.lower()]

        if strategy_obj is None:  # Manual strategy
            return json.dumps({"error": "Manual strategy cannot be executed automatically"})

        # Execute strategy with variability
        if variability > 0.0:
            selected_player_id = execute_strategy_with_variability(
                strategy_obj, available_players, team_roster, variability
            )
        else:
            selected_player_id = strategy_obj(available_players, team_roster)

        if selected_player_id is None:
            return json.dumps({
                "player_id": None,
                "player_name": None,
                "reasoning": "No valid players available for selection",
                "strategy_used": strategy_obj.strategy_name
            })

        # Get selected player info
        selected_player = None
        for player in available_players:
            if player['id'] == selected_player_id:
                selected_player = player
                break

        if not selected_player:
            return json.dumps({"error": "Selected player not found"})

        # Debug logging for strategy behavior
        team_picks = sum(1 for slot in team_roster.roster_slots if slot.is_filled)
        console.log(f"🎯 {strategy_obj.strategy_name} (Team {team_roster.team_id}): Pick #{team_picks + 1} - Selected {selected_player['name']} ({selected_player['position']}, Rank #{selected_player['rank']})")

        # Log current roster state for debugging
        rb_count = team_roster.count_position(Position.RB)
        wr_count = team_roster.count_position(Position.WR)
        qb_count = team_roster.count_position(Position.QB)
        te_count = team_roster.count_position(Position.TE)
        console.log(f"    Roster before pick: QB:{qb_count}, RB:{rb_count}, WR:{wr_count}, TE:{te_count}")

        # Generate reasoning
        reasoning = f"{strategy_obj.strategy_name}: Selected {selected_player['name']} " \
                   f"({selected_player['position']}, Rank #{selected_player['rank']})"

        if selected_player.get('tier'):
            reasoning += f", Tier {selected_player['tier']}"

        if variability > 0.0:
            reasoning += f" (Variability: {int(variability * 100)}%)"

        return json.dumps({
            "player_id": selected_player_id,
            "player_name": selected_player['name'],
            "reasoning": reasoning,
            "strategy_used": strategy_obj.strategy_name,
            "variability_applied": variability,
            "debug_info": {
                "team_pick_number": team_picks + 1,
                "roster_before": {
                    "QB": qb_count,
                    "RB": rb_count,
                    "WR": wr_count,
                    "TE": te_count
                }
            }
        })

    except Exception as e:
        console.log(f"Auto-draft error: {str(e)}")
        return json.dumps({"error": str(e)})


def predict_availability(
    available_players_json: str,
    teams_json: str,
    current_pick: int,
    my_team_id: int,
    num_teams: int,
    draft_style: str,
    trials: int = 100,
    team_variability_json: str = "{}",
    team_strategies_json: str = "{}"
) -> str:
    """
    Predict availability of players for next pick using all available strategies

    team_strategies_json maps teamId -> strategy name (e.g. from inference);
    when a team has a known strategy, simulated picks use it instead of the
    random strategy rotation, making the predictions reflect that team's
    actual behavior.

    Returns:
    JSON string with availability predictions
    """
    try:
        # Parse JSON inputs
        available_players = json.loads(available_players_json)
        teams = json.loads(teams_json)
        team_variability = json.loads(team_variability_json)
        team_strategies = json.loads(team_strategies_json) if team_strategies_json else {}

        # Convert string keys to integers for team_variability
        if team_variability:
            team_variability = {int(k): float(v) for k, v in team_variability.items()}

        # Normalize per-team strategy assignments ("teamId" -> strategy name);
        # unknown strategy names and 'manual' fall back to the rotation.
        if team_strategies:
            team_strategies = {int(k): v for k, v in team_strategies.items()
                               if v and v != 'manual' and v in AVAILABLE_STRATEGIES
                               and AVAILABLE_STRATEGIES[v] is not None}

        # Track how many times each player is taken
        player_taken_count = {}

        # Initialize counts for all available players
        for player in available_players:
            player_taken_count[player['id']] = 0

        # Run simulation trials
        console.log(f"Running {trials} simulation trials with all {len([s for s in AVAILABLE_STRATEGIES.keys() if s != 'manual'])} strategies...")
        for trial in range(trials):
            if trial % 20 == 0:  # Log every 20th trial
                console.log(f"  Trial {trial + 1}/{trials}")

            # Simulate draft until my next turn
            remaining_players = simulate_draft_until_my_turn(
                available_players,
                teams,
                current_pick,
                my_team_id,
                num_teams,
                draft_style,
                team_variability,
                team_strategies
            )

            # Track which players were taken (not in remaining players)
            remaining_player_ids = set(p['id'] for p in remaining_players)

            for player_id in player_taken_count.keys():
                if player_id not in remaining_player_ids:
                    player_taken_count[player_id] += 1

        console.log(f"Simulation complete. Sample taken counts: {dict(list(player_taken_count.items())[:5])}")

        # Calculate availability probabilities
        availability_predictions = {}
        for player_id, taken_count in player_taken_count.items():
            # Force floating point division to avoid integer truncation
            availability_probability = 1.0 - (float(taken_count) / float(trials))
            availability_predictions[player_id] = round(availability_probability, 3)

        return json.dumps({
            "availability_predictions": availability_predictions,
            "trials_completed": trials,
            "strategies_used": len([s for s in AVAILABLE_STRATEGIES.keys() if s != 'manual']),
            "debug_info": {
                "sample_player_counts": dict(list(player_taken_count.items())[:5]),
                "total_players": len(player_taken_count),
                "current_pick": current_pick,
                "my_team_id": my_team_id,
                "num_teams": num_teams,
                "team_variability_used": team_variability
            }
        })

    except Exception as e:
        console.log(f"Prediction error: {str(e)}")
        return json.dumps({"error": str(e)})


def get_available_strategies() -> str:
    """Get list of available draft strategies with descriptions"""
    try:
        strategies = {}
        for name, strategy in AVAILABLE_STRATEGIES.items():
            if strategy is not None:  # Skip manual
                strategies[name] = {
                    "name": strategy.strategy_name,
                    "description": strategy.description
                }
            else:
                strategies[name] = {
                    "name": "Manual",
                    "description": "Manual drafting - user selects players"
                }
        return json.dumps(strategies)
    except Exception as e:
        return json.dumps({"error": str(e)})


# Expose functions to JavaScript
window.pyAutoDraft = create_proxy(auto_draft_player)
window.pyPredictAvailability = create_proxy(predict_availability)
window.pyGetStrategies = create_proxy(get_available_strategies)
window.pyInferStrategies = create_proxy(infer_strategies)

console.log("🐍 PyScript auto-draft system loaded successfully!")
console.log(f"📋 Available strategies: {', '.join([name for name in AVAILABLE_STRATEGIES.keys() if name != 'manual'])}")
console.log(f"🎯 Total strategies loaded: {len([s for s in AVAILABLE_STRATEGIES.values() if s is not None])}")
