// Pure cross-board availability helpers built on the soft matcher.
//
// Models "track player availability across all active rankings": a single
// global drafted-identity set, and per-board drafted flags derived from it by
// exact identity first, fuzzy fallback only when exact fails.
//
// No React, no I/O, no mutation: everything returns new structures so the
// live draft wiring can call these from a reducer/hook later.

import { bestMatch, nameKey } from './matchPlayer.js';

// Re-exported under the availability-flavored name for callers that think in
// terms of "player identity" rather than "name match".
export const canonicalKey = nameKey;

// Resolve `player` to one of `identities` (Array<{ name, position?, team?, id? }>).
// Exact canonical key first; fuzzy bestMatch fallback. Returns
// { identity, score, matchedBy } or null.
export function resolveIdentity(player, identities, options = {}) {
  const { threshold = 0.7 } = options;
  const pKey = nameKey(player.name);

  for (const id of identities) {
    if (nameKey(id.name) === pKey) {
      return { identity: id, score: 1, matchedBy: 'exact' };
    }
  }

  const matched = bestMatch(player, identities, { threshold });
  return matched
    ? { identity: matched.match, score: matched.score, matchedBy: matched.matchedBy }
    : null;
}

// Has this player already been drafted (present in `draftedIdentities`)?
export function isPlayerTaken(player, draftedIdentities, options = {}) {
  return resolveIdentity(player, draftedIdentities, options) !== null;
}

// Union of distinct player identities across boards, keyed by canonical key.
// Two board entries that share a key collapse to one identity (first wins) -
// that is how "same player, differently spelled, across two boards" groups.
export function buildIdentities(boards) {
  const map = new Map();
  for (const board of boards) {
    for (const p of board) {
      const k = nameKey(p.name);
      if (!map.has(k)) {
        map.set(k, { name: p.name, position: p.position, team: p.team, id: p.id ?? k });
      }
    }
  }
  return [...map.values()];
}

// Derive each board's drafted flags from the global drafted-identity set.
// Returns new boards (same shape, each player copied with a `drafted` bool);
// never mutates inputs.
export function computeDraftedFlags(boards, draftedIdentities, options = {}) {
  return boards.map((board) =>
    board.map((player) => ({
      ...player,
      drafted: isPlayerTaken(player, draftedIdentities, options),
    }))
  );
}
