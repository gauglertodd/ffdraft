#!/usr/bin/env python3
"""Import ffdraft draft results into an ESPN Fantasy Football offline draft.

Reads the JSON export from the ffdraft app (Export -> ESPN button), matches
each pick to an ESPN player ID, then POSTs one DRAFT transaction per team so
every player lands on the correct ESPN roster automatically.

Requirements:
  - You are the ESPN league manager.
  - League draft type is set to Offline (LM Tools -> Draft Tools).
  - The scheduled offline draft time has passed and you clicked
    "Begin Offline Draft".
  - Your ffdraft team numbering matches ESPN draft-slot order
    (ffdraft team 1 = ESPN slot 1). The script shows the mapping and lets
    you remap before posting.

Usage:
  python3 import_to_espn.py ffdraft-export-2026-09-04.json \
      --league-id 123456 --year 2026

  ESPN_S2 and SWID environment variables, or --espn-s2 / --swid flags.
  Both are required for private leagues; copy them from your browser
  cookies while logged into espn.com. Add --dry-run to preview without
  posting. Add --yes to skip the confirmation prompt.
"""

import argparse
import json
import re
import sys
import time
import unicodedata
import urllib.request
import urllib.error

READ_BASE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}"
WRITE_TRANSACTIONS = "https://lm-api-writes.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leagues/{league_id}/transactions/"
PLAYER_UNIVERSE = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/players?view=players_wl&limit=2000"

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://fantasy.espn.com/",
    "Content-Type": "application/json",
}

DST_ALIASES = {
    "cardinals": "ari", "falcons": "atl", "ravens": "bal", "bills": "buf",
    "panthers": "car", "bears": "chi", "bengals": "cin", "browns": "cle",
    "cowboys": "dal", "broncos": "den", "lions": "det", "packers": "gb",
    "texans": "hou", "colts": "ind", "jaguars": "jac", "chiefs": "kc",
    "raiders": "lv", "chargers": "lac", "rams": "lar", "dolphins": "mia",
    "vikings": "min", "patriots": "ne", "saints": "no", "giants": "nyg",
    "jets": "nyj", "eagles": "phi", "steelers": "pit", "49ers": "sf",
    "seahawks": "sea", "buccaneers": "tb", "titans": "ten",
    "commanders": "wsh",
}


def norm(name):
    """Canonical name key: NFD-strip, lowercase, punctuation->space, drop suffixes."""
    s = unicodedata.normalize("NFD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def name_key(name):
    """Token-order-insensitive key (matches ffdraft's nameKey behavior)."""
    return "".join(sorted(norm(name).split()))


def http_json(url, cookies=None, payload=None, timeout=30):
    headers = dict(BROWSER_HEADERS)
    if cookies:
        headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in cookies.items())
    data = json.dumps(payload).encode() if payload is not None else None
    if data is not None:
        headers["Content-Length"] = str(len(data))
    req = urllib.request.Request(url, data=data, headers=headers, method="POST" if data else "GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return json.loads(body) if body.strip() else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"HTTP {e.code} from ESPN: {detail}") from e


def load_export(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if data.get("source") != "ffdraft" or "picks" not in data:
        sys.exit("Not a ffdraft export file (missing source/picks).")
    return data


def fetch_espn_players(year, cookies):
    print(f"Fetching ESPN player universe for {year}...")
    players = []
    url = PLAYER_UNIVERSE.format(year=year)
    while url:
        chunk = http_json(url, cookies=cookies)
        players.extend(chunk.get("players", []))
        url = None  # players_wl with limit=2000 covers the full fantasy universe
    print(f"  {len(players)} ESPN players loaded.")
    return players


def build_espn_index(espn_players):
    """Index ESPN players by exact and fuzzy keys. Returns (exact, bypos, list).

    exact: name_key -> [(player,)]
    bypos: (name_key, pos) -> player  for position-strict lookup
    """
    exact = {}
    bypos = {}
    for p in espn_players:
        full = p.get("fullName", "")
        pos = p.get("position", "").replace("D/ST", "DST")
        key = name_key(full)
        exact.setdefault(key, []).append(p)
        bypos.setdefault((key, pos), p)
    return exact, bypos


def match_pick(pick, bypos, exact):
    """Resolve a ffdraft pick to an ESPN player dict, or None. DST handled
    separately via dst_index (ESPN identifies D/ST by team abbreviation)."""
    key = name_key(pick["name"])
    pos = pick.get("position", "").upper()

    if pos == "DST":
        return None

    hit = bypos.get((key, pos))
    if hit:
        return hit
    # Same key, any position (position labels sometimes differ, e.g. RB vs FB)
    cands = exact.get(key, [])
    if len(cands) == 1:
        return cands[0]
    return None


def build_dst_index(espn_players):
    """Map ESPN team abbreviation -> D/ST player."""
    dst = {}
    for p in espn_players:
        if p.get("position") == "D/ST":
            pro_team = p.get("proTeamAbbreviation") or p.get("proTeamId")
            dst[str(pro_team).lower()] = p
    return dst


def similarity(a, b):
    import difflib
    return difflib.SequenceMatcher(None, a, b).ratio()


def fuzzy_match(pick, espn_players, threshold=0.75):
    key = name_key(pick["name"])
    pos = pick.get("position", "").upper()
    best, score = None, 0.0
    for p in espn_players:
        if p.get("position", "").replace("D/ST", "DST") != pos:
            continue
        s = similarity(key, name_key(p.get("fullName", "")))
        if s > score:
            best, score = p, s
    return (best, score) if score >= threshold else (None, score)


def resolve_picks(export, espn_players, bypos, exact, dst_index):
    """Return list of (pick, espn_player_id, how). Unresolved picks flagged."""
    resolved, unresolved = [], []
    for pick in export["picks"]:
        player = None
        pos = pick.get("position", "").upper()
        if pos == "DST":
            last_word = norm(pick["name"]).split()[-1]
            abbr = DST_ALIASES.get(last_word)
            if abbr:
                player = dst_index.get(abbr)
            if not player:
                player = dst_index.get(last_word)
            how = "dst-abbr" if player else None
        else:
            player = match_pick(pick, bypos, exact)
            how = "exact" if player else None
        if not player:
            cand, score = fuzzy_match(pick, espn_players)
            if cand:
                player, how = cand, f"fuzzy({score:.2f})"
        if player:
            resolved.append((pick, player["id"], how))
        else:
            unresolved.append(pick)
    return resolved, unresolved


def fetch_draft_detail(year, league_id, cookies):
    url = READ_BASE.format(year=year, league_id=league_id) + "?view=mDraftDetail"
    data = http_json(url, cookies=cookies)
    detail = data.get("draftDetail") or {}
    if not detail.get("picks"):
        sys.exit(
            "ESPN draftDetail has no picks/slots. Make sure the league draft type is\n"
            "Offline, the draft date has passed, and you clicked 'Begin Offline Draft'\n"
            "in LM Tools. Draft order must be set before starting."
        )
    return detail


def slot_to_team_map(draft_detail, num_teams):
    """overallPickNumber -> ESPN teamId, from the slot order in round 1."""
    slot_map = {}
    for pick in draft_detail.get("picks", []):
        slot_map[pick["overallPickNumber"]] = pick.get("teamId")
    return slot_map


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("export", help="ffdraft export JSON file")
    ap.add_argument("--league-id", type=int, required=True)
    ap.add_argument("--year", type=int, default=2026)
    ap.add_argument("--espn-s2", default=None)
    ap.add_argument("--swid", default=None)
    ap.add_argument("--dry-run", action="store_true", help="Resolve and show rosters, but do not POST")
    ap.add_argument("--yes", action="store_true", help="Skip confirmation prompt")
    ap.add_argument("--delay", type=float, default=0.3, help="Seconds between team POSTs")
    args = ap.parse_args()

    import os
    espn_s2 = args.espn_s2 or os.environ.get("ESPN_S2")
    swid = args.swid or os.environ.get("SWID")
    if not (espn_s2 and swid):
        sys.exit("Need ESPN_S2 and SWID cookies (env vars or --espn-s2/--swid). "
                 "Copy them from browser devtools while logged into espn.com.")
    cookies = {"espn_s2": espn_s2, "SWID": swid}

    export = load_export(args.export)
    num_teams = export.get("numTeams") or max(p["teamId"] for p in export["picks"])
    print(f"Loaded {len(export['picks'])} picks across {num_teams} teams "
          f"({export.get('draftStyle', '?')} style).")

    espn_players = fetch_espn_players(args.year, cookies)
    exact, bypos = build_espn_index(espn_players)
    dst_index = build_dst_index(espn_players)

    resolved, unresolved = resolve_picks(export, espn_players, bypos, exact, dst_index)
    print(f"\nMatched {len(resolved)}/{len(export['picks'])} picks to ESPN players.")
    if unresolved:
        print("\nUNRESOLVED (skipped - fix names in ffdraft or import manually):")
        for p in sorted(unresolved, key=lambda x: x["overallPickNumber"]):
            print(f"  #{p['overallPickNumber']:>3}  {p['name']} ({p.get('position','?')})")

    # Slot mapping: ESPN teamId for each overall pick number.
    if not args.dry_run or True:
        print("\nFetching ESPN draft state...")
        draft_detail = fetch_draft_detail(args.year, args.league_id, cookies)
        slot_map = slot_to_team_map(draft_detail, num_teams)

    # Group picks per ffdraft team, resolve to ESPN teamId via pick slots.
    teams = {}
    for pick, player_id, how in resolved:
        espn_team = slot_map.get(pick["overallPickNumber"])
        teams.setdefault(pick["teamId"], []).append(
            {"overallPickNumber": pick["overallPickNumber"],
             "type": "DRAFT",
             "playerId": player_id,
             "_espnTeam": espn_team,
             "_name": pick["name"]}
        )

    # Team mapping report + optional remap.
    print("\nTeam mapping (ffdraft team -> ESPN roster these picks land on):")
    for tid in sorted(teams):
        espn_teams = {item["_espnTeam"] for item in teams[tid]}
        names = ", ".join(item["_name"] for item in sorted(teams[tid], key=lambda x: x["overallPickNumber"])[:3])
        more = f" (+{len(teams[tid]) - 3} more)" if len(teams[tid]) > 3 else ""
        print(f"  ffdraft team {tid:>2} -> ESPN team(s) {sorted(espn_teams)}: {names}{more}")
    mismatch = [tid for tid in teams
                if len({item["_espnTeam"] for item in teams[tid]}) > 1]
    if mismatch:
        print(f"\nWARNING: ffdraft teams {mismatch} map to multiple ESPN teams - "
              "your pick order may not line up with ESPN slots.")

    if args.dry_run:
        print("\nDry run - nothing posted. Re-run without --dry-run to import.")
        return

    if not args.yes:
        answer = input(f"\nPost {sum(len(v) for v in teams.values())} picks to ESPN league "
                       f"{args.league_id}? This OVERWRITES existing draft data. [y/N] ")
        if answer.strip().lower() != "y":
            sys.exit("Aborted.")

    print()
    for tid in sorted(teams):
        items = [{k: v for k, v in item.items() if not k.startswith("_")} for item in teams[tid]]
        team_id = next((item["_espnTeam"] for item in teams[tid] if item["_espnTeam"]), tid)
        payload = {
            "isLeagueManager": True,
            "teamId": team_id,
            "type": "DRAFT",
            "scoringPeriodId": 1,
            "executionType": "EXECUTE",
            "items": items,
        }
        url = WRITE_TRANSACTIONS.format(year=args.year, league_id=args.league_id)
        try:
            resp = http_json(url, cookies=cookies, payload=payload)
            print(f"  ffdraft team {tid:>2} -> ESPN team {team_id}: {len(items)} picks OK")
        except RuntimeError as e:
            print(f"  ffdraft team {tid:>2} -> ESPN team {team_id}: FAILED - {e}")
        time.sleep(args.delay)

    print("\nDone. Verify rosters in ESPN LM Tools -> Input Offline Draft Results,")
    print("then click 'Make Rosters Available' to publish to the league.")


if __name__ == "__main__":
    main()
