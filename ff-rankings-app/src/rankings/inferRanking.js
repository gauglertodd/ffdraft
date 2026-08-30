// Ranking-board inference: which selectable board best explains a team's
// actual picks?
//
// For each registry board, replay the team's picks against that board and
// measure how far down the board the team reached for each pick: a pick that
// matches that board's best available player scores 0; a pick that was
// ranked 30 spots below the board's top available player scores ~30. The
// board with the smallest mean "reach" is the one this team is most likely
// drafting from (e.g. their K/DST picks land where only a K/DST-inclusive
// board has plausible values).
//
// Pure, no React, no I/O. Consumes parseCSV-shaped players
// ({name, position, team, rank, tier}) and drafted players
// ({name, position, draftInfo: {teamId, pickNumber}}).

import { nameKey, canonicalPosition } from './matchPlayer.js';

// Picks worse than this relative to the board's best available are treated
// as "off the board" (weak evidence): the board cannot explain the pick.
const OFF_BOARD_PENALTY = 60;

// Boards with fewer than this many players are skipped as candidates.
const MIN_BOARD_SIZE = 50;

function boardIndexOf(players) {
  const idx = new Map();
  players.forEach((p, i) => {
    const k = `${nameKey(p.name)}|${canonicalPosition(p.position) || ''}`;
    if (!idx.has(k)) idx.set(k, { player: p, order: i });
  });
  return idx;
}

// Mean "reach" of the team's picks on one board, plus coverage.
function scoreBoard(boardPlayers, teamPicks) {
  const index = boardIndexOf(boardPlayers);
  // Best available at the time of each pick = the minimum board order of
  // any undrafted player at the time; approximated by walking picks in
  // order and removing each pick's identity from the board's remaining set.
  const remaining = new Set(index.keys());
  let total = 0;
  let counted = 0;

  for (const pick of teamPicks) {
    const key = `${nameKey(pick.name)}|${canonicalPosition(pick.position) || ''}`;
    const entry = index.get(key);
    let gap;
    if (entry && remaining.has(key)) {
      // How far into the remaining board was this pick?
      let bestOrder = Infinity;
      for (const k of remaining) {
        const o = index.get(k).order;
        if (o < bestOrder) bestOrder = o;
      }
      gap = entry.order - bestOrder;
      if (gap < 0) gap = 0;
    } else {
      // Pick not on this board (or already consumed via duplicate key):
      // this board does not cover the team's behavior.
      gap = OFF_BOARD_PENALTY;
    }

    total += Math.min(gap, OFF_BOARD_PENALTY);
    counted += 1;

    if (entry) remaining.delete(key);
  }

  if (!counted) return null;
  return { meanReach: total / counted, coverage: counted / teamPicks.length };
}

// Infer the best board per team. Returns
// { [teamId]: { boardId, meanReach, coverage, picksAnalyzed } } or {} when
// there is not enough evidence.
export function inferTeamBoards(draftedPlayers, boards) {
  // boards: [{ id, label, players: [...] }] - already loaded profile boards
  const byTeam = new Map();
  for (const p of draftedPlayers) {
    const teamId = p.draftInfo?.teamId;
    if (teamId == null) continue;
    if (!byTeam.has(teamId)) byTeam.set(teamId, []);
    byTeam.get(teamId).push(p);
  }

  const results = {};
  for (const [teamId, picks] of byTeam) {
    if (picks.length < 3) continue; // not enough evidence
    picks.sort((a, b) => (a.draftInfo?.pickNumber || 0) - (b.draftInfo?.pickNumber || 0));

    let best = null;
    for (const board of boards) {
      if (!board?.players || board.players.length < MIN_BOARD_SIZE) continue;
      const s = scoreBoard(board.players, picks);
      if (!s) continue;
      if (!best || s.meanReach < best.meanReach) {
        best = { boardId: board.id, label: board.label, ...s, picksAnalyzed: picks.length };
      }
    }
    if (best) results[teamId] = best;
  }
  return results;
}
