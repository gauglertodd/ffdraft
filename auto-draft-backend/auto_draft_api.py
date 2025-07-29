"""
Flask API for Fantasy Football Auto-Draft Integration

This provides a REST API endpoint that the React app can call to get
auto-draft recommendations from Python strategies.

Run with: python auto_draft_api.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from typing import Dict, List, Any
import json
import random
import copy

# Import our draft strategies
from draft_strategies import (
    AVAILABLE_STRATEGIES,
    TeamRoster,
    RosterSlot,
    Position,
    Player
)

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",  # Development
    "https://*.onrender.com"  # Allow all Render domains
    "https://ffdraft-1.onrender.com",  # Your frontend domain
])


def apply_strategy_variability(available_players_df: pd.DataFrame, strategy_result_id: int, variability: float = 0.0) -> int:
    """
    Apply variability to strategy selection

    Args:
        available_players_df: DataFrame of available players
        strategy_result_id: The "optimal" player ID selected by the strategy
        variability: 0.0-1.0, where 0 = always pick optimal, 1 = maximum randomness

    Returns:
        Final player ID after applying variability
    """
    if variability <= 0.0 or available_players_df.empty:
        return strategy_result_id

    # Find the optimal player's rank in the available list
    available_sorted = available_players_df.sort_values('rank')
    optimal_player_rank_in_list = None

    for idx, (_, player) in enumerate(available_sorted.iterrows()):
        if player['id'] == strategy_result_id:
            optimal_player_rank_in_list = idx
            break

    if optimal_player_rank_in_list is None:
        return strategy_result_id

    # Define probability distribution based on variability
    # Lower variability = more concentrated on top picks
    # Higher variability = more spread out

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
        # Check if numpy is available directly since HAS_NUMPY might not be in scope
        try:
            import numpy as np
            selected_index = np.random.choice(range(num_players), p=weights)
        except ImportError:
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

        selected_player = available_sorted.iloc[selected_index]
        print(f"    Variability applied: selected rank {selected_index + 1} instead of rank 1 (variability: {variability:.1f})")
        return int(selected_player['id'])
    except Exception as e:
        print(f"Error in variability selection: {e}")
        # Fallback to original choice if something goes wrong
        return strategy_result_id


def create_team_roster_from_data(team_data: Dict[str, Any]) -> TeamRoster:
    """Convert team data from React to TeamRoster object"""
    roster_slots = []

    for slot_data in team_data['roster']:
        player = None
        if slot_data.get('player'):
            player_data = slot_data['player']
            player = Player(
                id=player_data['id'],
                name=player_data['name'],
                position=Position(player_data['position']),
                team=player_data['team'],
                rank=player_data['rank'],
                tier=player_data.get('tier'),
                is_drafted=True
            )

        slot = RosterSlot(
            position=Position(slot_data['position']),
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


def execute_strategy_with_variability(strategy, available_players_df: pd.DataFrame, team_roster, variability: float = 0.0) -> int:
    """
    Execute a strategy with applied variability

    Args:
        strategy: The draft strategy function
        available_players_df: Available players
        team_roster: Team roster state
        variability: 0.0-1.0 variability level

    Returns:
        Selected player ID
    """
    # Get the "optimal" pick from the strategy
    optimal_pick = strategy(available_players_df, team_roster)

    if optimal_pick is None:
        return None

    # Apply variability to potentially select a different player
    final_pick = apply_strategy_variability(available_players_df, optimal_pick, variability)

    return final_pick


def simulate_draft_until_my_turn(
    available_players_df: pd.DataFrame,
    teams_data: List[Dict],
    current_pick: int,
    my_team_id: int,
    num_teams: int,
    draft_style: str,
    team_variability: Dict[int, float] = None
) -> pd.DataFrame:
    """
    Simulate draft picks until it's my turn again
    Returns the updated available_players_df after simulation
    """
    # Create a copy of available players for simulation
    sim_players = available_players_df.copy()
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
    print(f"  Starting simulation from pick {pick} (after current pick {current_pick})")

    while picks_simulated < 20:  # Limit to avoid infinite loops
        current_team_id = get_current_team(pick)

        print(f"  Pick {pick}: Team {current_team_id} vs My Team {my_team_id}")

        # If it's my turn, stop simulation
        if current_team_id == my_team_id:
            print(f"  Simulation stopped - my turn again (Team {my_team_id})")
            break

        # If no more players available, stop
        if sim_players.empty:
            print(f"  Simulation stopped - no players available")
            break

        print(f"  Pick {pick}: Team {current_team_id} selecting...")

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
            # Get player info for debugging
            selected_player = sim_players[sim_players['id'] == selected_player_id].iloc[0]
            print(f"    Selected: {selected_player['name']} (ID: {selected_player_id}) with {random_strategy_name} strategy (variability: {team_var:.1f})")
            players_drafted.append(selected_player['name'])

            # Remove the selected player from available players
            sim_players = sim_players[sim_players['id'] != selected_player_id]

            # Update the team roster with the drafted player
            # This ensures future picks by this team consider their updated roster
            player_obj = Player(
                id=selected_player['id'],
                name=selected_player['name'],
                position=Position(selected_player['position']),
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
            print(f"    No player selected by Team {current_team_id} using {random_strategy_name}")
            break

        pick += 1

    print(f"  Total picks simulated: {picks_simulated}")
    print(f"  Players drafted: {players_drafted}")
    print(f"  Remaining players: {len(sim_players)}")

    return sim_players


@app.route('/predict-availability', methods=['POST'])
def predict_availability():
    """
    Predict availability of players for next pick

    Expects JSON payload:
    {
        "available_players": [...],
        "teams": [...],
        "current_pick": 5,
        "my_team_id": 3,
        "num_teams": 12,
        "draft_style": "snake",
        "trials": 100,
        "team_variability": {1: 0.3, 2: 0.5, ...}  # Optional
    }

    Returns:
    {
        "availability_predictions": {
            "player_id": availability_probability,
            ...
        }
    }
    """
    try:
        data = request.get_json()

        # Validate input
        required_fields = ['available_players', 'teams', 'current_pick', 'my_team_id', 'num_teams', 'draft_style']
        if not data or not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        available_players_df = pd.DataFrame(data['available_players'])
        teams = data['teams']
        current_pick = data['current_pick']
        my_team_id = data['my_team_id']
        num_teams = data['num_teams']
        draft_style = data['draft_style']
        trials = data.get('trials', 100)
        team_variability = data.get('team_variability', {})  # Get team variability from request

        # Convert string keys to integers for team_variability
        if team_variability:
            team_variability = {int(k): float(v) for k, v in team_variability.items()}

        # Track how many times each player is taken
        player_taken_count = {}

        # Initialize counts for all available players
        for _, player in available_players_df.iterrows():
            player_taken_count[player['id']] = 0

        # Run simulation trials
        print(f"Running {trials} simulation trials...")
        for trial in range(trials):
            if trial % 20 == 0:  # Log every 20th trial
                print(f"  Trial {trial + 1}/{trials}")

            # Simulate draft until my next turn
            remaining_players = simulate_draft_until_my_turn(
                available_players_df,
                teams,
                current_pick,
                my_team_id,
                num_teams,
                draft_style,
                team_variability  # Pass team variability to simulation
            )

            # Track which players were taken (not in remaining players)
            remaining_player_ids = set(remaining_players['id'].tolist())

            for player_id in player_taken_count.keys():
                if player_id not in remaining_player_ids:
                    player_taken_count[player_id] += 1

        print(f"Simulation complete. Sample taken counts: {dict(list(player_taken_count.items())[:5])}")

        # Calculate availability probabilities
        availability_predictions = {}
        for player_id, taken_count in player_taken_count.items():
            # Force floating point division to avoid integer truncation
            availability_probability = 1.0 - (float(taken_count) / float(trials))
            availability_predictions[player_id] = round(availability_probability, 3)

        return jsonify({
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
        print(f"Prediction error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/auto-draft', methods=['POST'])
def auto_draft():
    """
    Auto-draft endpoint

    Expects JSON payload:
    {
        "available_players": [
            {"id": 1, "name": "Player", "position": "QB", "team": "BUF", "rank": 1, "tier": 1},
            ...
        ],
        "team_roster": {
            "id": 1,
            "name": "Team 1",
            "roster": [
                {"position": "QB", "player": null},
                {"position": "RB", "player": {"id": 2, "name": "RB1", ...}},
                ...
            ]
        },
        "strategy": "bpa",
        "variability": 0.3  # Optional: 0.0-1.0 variability level
    }

    Returns:
    {
        "player_id": 123,
        "player_name": "Selected Player",
        "reasoning": "Explanation of why this player was selected"
    }
    """
    try:
        data = request.get_json()

        # Validate input
        if not data or 'available_players' not in data or 'team_roster' not in data or 'strategy' not in data:
            return jsonify({"error": "Missing required fields"}), 400

        # Convert available players to DataFrame
        available_players_df = pd.DataFrame(data['available_players'])

        # Convert team roster data
        team_roster = create_team_roster_from_data(data['team_roster'])

        # Get strategy
        strategy_name = data['strategy'].lower()
        if strategy_name not in AVAILABLE_STRATEGIES:
            return jsonify({"error": f"Unknown strategy: {strategy_name}"}), 400

        strategy = AVAILABLE_STRATEGIES[strategy_name]

        # Get variability (optional, defaults to 0.0 for backward compatibility)
        variability = data.get('variability', 0.0)

        # Execute strategy with variability
        if variability > 0.0:
            selected_player_id = execute_strategy_with_variability(
                strategy, available_players_df, team_roster, variability
            )
        else:
            selected_player_id = strategy(available_players_df, team_roster)

        if selected_player_id is None:
            return jsonify({
                "player_id": None,
                "player_name": None,
                "reasoning": "No valid players available for selection"
            })

        # Get selected player info
        selected_player = available_players_df[available_players_df['id'] == selected_player_id].iloc[0]

        # Generate reasoning
        reasoning = f"{strategy.strategy_name}: Selected {selected_player['name']} " \
                   f"({selected_player['position']}, Rank #{selected_player['rank']})"

        if pd.notna(selected_player.get('tier')):
            reasoning += f", Tier {selected_player['tier']}"

        if variability > 0.0:
            reasoning += f" (Variability: {int(variability * 100)}%)"

        return jsonify({
            "player_id": int(selected_player_id),
            "player_name": selected_player['name'],
            "reasoning": reasoning,
            "strategy_used": strategy.strategy_name,
            "variability_applied": variability
        })

    except Exception as e:
        print(f"Auto-draft error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/strategies', methods=['GET'])
def list_strategies():
    """Get list of available draft strategies"""
    try:
        strategies = {}
        for name, strategy in AVAILABLE_STRATEGIES.items():
            strategies[name] = {
                "name": strategy.strategy_name,
                "description": strategy.description
            }
        return jsonify(strategies)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "strategies_available": len(AVAILABLE_STRATEGIES)})


@app.route('/test-variability', methods=['POST'])
def test_variability():
    """Test variability function"""
    try:
        # Simple test data
        test_players = pd.DataFrame([
            {"id": 1, "name": "Player 1", "rank": 1},
            {"id": 2, "name": "Player 2", "rank": 2},
            {"id": 3, "name": "Player 3", "rank": 3},
            {"id": 4, "name": "Player 4", "rank": 4},
            {"id": 5, "name": "Player 5", "rank": 5}
        ])

        # Test variability function
        original_pick = 1  # Player 1 (best)
        variability = 0.5

        results = []
        for i in range(10):
            final_pick = apply_strategy_variability(test_players, original_pick, variability)
            selected_player = test_players[test_players['id'] == final_pick].iloc[0]
            results.append({
                "trial": i + 1,
                "original": "Player 1",
                "selected": selected_player['name'],
                "rank": int(selected_player['rank'])
            })

        return jsonify({
            "success": True,
            "variability_tested": variability,
            "results": results
        })

    except Exception as e:
        print(f"Variability test error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/test-draft', methods=['POST'])
def test_draft():
    """
    Test endpoint with sample data for debugging
    """
    try:
        # Sample test data
        sample_players = [
            {"id": 1, "name": "Josh Allen", "position": "QB", "team": "BUF", "rank": 1, "tier": 1},
            {"id": 2, "name": "Christian McCaffrey", "position": "RB", "team": "SF", "rank": 2, "tier": 1},
            {"id": 3, "name": "Tyreek Hill", "position": "WR", "team": "MIA", "rank": 3, "tier": 1},
            {"id": 4, "name": "Travis Kelce", "position": "TE", "team": "KC", "rank": 4, "tier": 1},
            {"id": 5, "name": "Lamar Jackson", "position": "QB", "team": "BAL", "rank": 5, "tier": 1},
        ]

        sample_roster = {
            "id": 1,
            "name": "Test Team",
            "roster": [
                {"position": "QB", "player": None},
                {"position": "RB", "player": None},
                {"position": "RB", "player": None},
                {"position": "WR", "player": None},
                {"position": "WR", "player": None},
                {"position": "TE", "player": None},
                {"position": "FLEX", "player": None},
                {"position": "DST", "player": None},
                {"position": "K", "player": None},
                {"position": "BENCH", "player": None},
                {"position": "BENCH", "player": None},
                {"position": "BENCH", "player": None},
                {"position": "BENCH", "player": None},
                {"position": "BENCH", "player": None},
                {"position": "BENCH", "player": None}
            ]
        }

        strategy = request.get_json().get('strategy', 'bpa') if request.get_json() else 'bpa'

        test_request = {
            "available_players": sample_players,
            "team_roster": sample_roster,
            "strategy": strategy
        }

        # Process the test request
        available_players_df = pd.DataFrame(test_request['available_players'])
        team_roster = create_team_roster_from_data(test_request['team_roster'])

        strategy_obj = AVAILABLE_STRATEGIES[strategy.lower()]
        selected_player_id = strategy_obj(available_players_df, team_roster)

        if selected_player_id:
            selected_player = available_players_df[available_players_df['id'] == selected_player_id].iloc[0]
            return jsonify({
                "success": True,
                "player_id": int(selected_player_id),
                "player_name": selected_player['name'],
                "strategy_used": strategy_obj.strategy_name,
                "test_data": test_request
            })
        else:
            return jsonify({
                "success": False,
                "message": "No player selected",
                "test_data": test_request
            })

    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


def main():
    """Main entry point for the application"""
    print("🏈 Starting Fantasy Football Auto-Draft API...")
    print("📊 Available strategies:")
    for name, strategy in AVAILABLE_STRATEGIES.items():
        print(f"  - {name}: {strategy.strategy_name}")
    print("\n🌐 Endpoints:")
    print("  POST /auto-draft - Get draft recommendation")
    print("  POST /predict-availability - Predict player availability")
    print("  GET /strategies - List available strategies")
    print("  GET /health - Health check")
    print("  POST /test-draft - Test with sample data")
    print(f"\n🚀 Starting server on http://localhost:5001")
    print("💡 Press Ctrl+C to stop the server")

    # Check dependencies
    print("\n🔍 Checking dependencies...")
    try:
        import pandas as pd
        print("  ✅ pandas available")
    except ImportError:
        print("  ❌ pandas missing - install with: pip install pandas")

    try:
        import numpy as np
        print("  ✅ numpy available")
    except ImportError:
        print("  ⚠️  numpy missing - using fallback random selection")
        print("     Install with: pip install numpy")

    try:
        from pydantic import BaseModel
        print("  ✅ pydantic available")
    except ImportError:
        print("  ❌ pydantic missing - install with: pip install pydantic")

    app.run(debug=True, host='0.0.0.0', port=5001)


if __name__ == '__main__':
    main()
