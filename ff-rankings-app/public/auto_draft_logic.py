"""
Fantasy Football Auto-Draft Logic for PyScript

This module provides the core auto-draft functionality that runs in the browser.
"""

import json
import random
import copy
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
        weights = [0.6, 0.25, 0.10, 0.05] + [0.0] * (num_players - 4)
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
        return int(selected_player['id'])
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


def simulate_draft_until_my_turn(
    available_players: List[dict],
    teams_data: List[dict],
    current_pick: int,
    my_team_id: int,
    num_teams: int,
    draft_style: str,
    team_variability: Dict[int, float] = None
) -> List[dict]:
    """
    Simulate draft picks until it's my turn again
    Returns the updated available_players after simulation
    """
    # Create a copy of available players for simulation
    sim_players = copy.deepcopy(available_players)
    sim_teams = copy.deepcopy(teams_data)

    # Default team variability if not provided
    if team_variability is None:
        team_variability = {}

    # Convert teams to TeamRoster objects
    team_rosters = {}
    for team_data in sim_teams:
        team_rosters[team_data['id']] = create_team_roster_from_data(team_data)

    # Calculate which team is drafting based on pick number and draft style
    def get_current_team(pick_number):
        round_num = (pick_number - 1) // num_teams
        position = (pick_number - 1) % num_teams

        if draft_style == 'snake':
            if round_num % 2 == 0:
                return position + 1
            else:
                return num_teams - position
        else:
            return position + 1

    # Debug info
    picks_simulated = 0
    players_drafted = []

    # Start simulating from the NEXT pick (not current pick)
    pick = current_pick + 1
    console.log(f"  Starting simulation from pick {pick} (after current pick {current_pick})")

    while picks_simulated < 20:  # Limit to avoid infinite loops
        current_team_id = get_current_team(pick)

        console.log(f"  Pick {pick}: Team {current_team_id} vs My Team {my_team_id}")

        # If it's my turn, stop simulation
        if current_team_id == my_team_id:
            console.log(f"  Simulation stopped - my turn again (Team {my_team_id})")
            break

        # If no more players available, stop
        if not sim_players:
            console.log(f"  Simulation stopped - no players available")
            break

        console.log(f"  Pick {pick}: Team {current_team_id} selecting...")

        # Randomly select a strategy for this team
        strategy_names = list(AVAILABLE_STRATEGIES.keys())
        random_strategy_name = random.choice(strategy_names)
        strategy = AVAILABLE_STRATEGIES[random_strategy_name]

        # Get the team roster
        current_team = team_rosters[current_team_id]

        # Get team variability (default to 0.3 if not specified)
        team_var = team_variability.get(current_team_id, 0.3)

        # Have the strategy pick a player with variability
        selected_player_id = execute_strategy_with_variability(
            strategy, sim_players, current_team, team_var
        )

        if selected_player_id is not None:
            # Find and remove the selected player
            selected_player = None
            for i, player in enumerate(sim_players):
                if player['id'] == selected_player_id:
                    selected_player = sim_players.pop(i)
                    break

            if selected_player:
                console.log(f"    Selected: {selected_player['name']} (ID: {selected_player_id}) with {random_strategy_name} strategy (variability: {team_var:.1f})")
                players_drafted.append(selected_player['name'])

                # Update the team roster with the drafted player
                player_obj = Player(
                    id=selected_player['id'],
                    name=selected_player['name'],
                    position=selected_player['position'],
                    team=selected_player['team'],
                    rank=selected_player['rank'],
                    tier=selected_player.get('tier'),
                    is_drafted=True
                )

                # Try to add player to appropriate roster slot
                team_roster = team_rosters[current_team_id]
                for slot in team_roster.roster_slots:
                    if not slot.is_filled:
                        if (slot.position.value == player_obj.position.value or
                            (slot.position == Position.FLEX and player_obj.position in [Position.RB, Position.WR, Position.TE]) or
                            slot.position == Position.BENCH):
                            slot.player = player_obj
                            slot.is_filled = True
                            break

                picks_simulated += 1
        else:
            console.log(f"    No player selected by Team {current_team_id} using {random_strategy_name}")
            break

        pick += 1

    console.log(f"  Total picks simulated: {picks_simulated}")
    console.log(f"  Players drafted: {players_drafted}")
    console.log(f"  Remaining players: {len(sim_players)}")

    return sim_players


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
                "reasoning": "No valid players available for selection"
            })

        # Get selected player info
        selected_player = None
        for player in available_players:
            if player['id'] == selected_player_id:
                selected_player = player
                break

        if not selected_player:
            return json.dumps({"error": "Selected player not found"})

        # Generate reasoning
        reasoning = f"{strategy_obj.strategy_name}: Selected {selected_player['name']} " \
                   f"({selected_player['position']}, Rank #{selected_player['rank']})"

        if selected_player.get('tier'):
            reasoning += f", Tier {selected_player['tier']}"

        if variability > 0.0:
            reasoning += f" (Variability: {int(variability * 100)}%)"

        return json.dumps({
            "player_id": int(selected_player_id),
            "player_name": selected_player['name'],
            "reasoning": reasoning,
            "strategy_used": strategy_obj.strategy_name,
            "variability_applied": variability
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
    team_variability_json: str = "{}"
) -> str:
    """
    Predict availability of players for next pick

    Returns:
    JSON string with availability predictions
    """
    try:
        # Parse JSON inputs
        available_players = json.loads(available_players_json)
        teams = json.loads(teams_json)
        team_variability = json.loads(team_variability_json)

        # Convert string keys to integers for team_variability
        if team_variability:
            team_variability = {int(k): float(v) for k, v in team_variability.items()}

        # Track how many times each player is taken
        player_taken_count = {}

        # Initialize counts for all available players
        for player in available_players:
            player_taken_count[player['id']] = 0

        # Run simulation trials
        console.log(f"Running {trials} simulation trials...")
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
                team_variability
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
    """Get list of available draft strategies"""
    try:
        strategies = {}
        for name, strategy in AVAILABLE_STRATEGIES.items():
            strategies[name] = {
                "name": strategy.strategy_name,
                "description": strategy.description
            }
        return json.dumps(strategies)
    except Exception as e:
        return json.dumps({"error": str(e)})


# Expose functions to JavaScript
window.pyAutoDraft = create_proxy(auto_draft_player)
window.pyPredictAvailability = create_proxy(predict_availability)
window.pyGetStrategies = create_proxy(get_available_strategies)

console.log("🐍 PyScript auto-draft system loaded successfully!")
