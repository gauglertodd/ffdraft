// Soft player-name matching for cross-board ranking assignment.
//
// Exact (canonical key) -> fuzzy fallback (edit distance + token-set
// similarity with initial handling), so a player named one way on one
// ranking ("Ja'Marr Chase") can be matched to a differently-spelled entry on
// another ("Jamar Chase", "J. Chase") for the autodraft availability check.
//
// Pure, no React, no I/O. Easy to unit-test in isolation.

const SUFFIX_TOKENS = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

// DST/DEF spelling variants collapse to one canonical position so a defense
// listed as "DST" on one board and "DEF" on another can still be compared.
const POSITION_ALIASES = new Map([
  ['D', 'DST'],
  ['DEF', 'DST'],
  ['D/ST', 'DST'],
]);

// JAC/JAX/JAXSTAR are the same Jacksonville abbreviation spelled differently
// across ranking feeds; canonicalize before the team hint comparison.
const TEAM_ALIASES = new Map([
  ['JAC', 'JAX'],
  ['JA', 'JAX'],
]);

// Lowercase, strip diacritics + name suffixes, turn punctuation into spaces,
// collapse whitespace. Preserves token boundaries (does NOT remove spaces)
// so token-set similarity can still detect word reorder.
export function normalizeName(name) {
  if (name == null) return '';
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks (diacritics)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation -> space (hyphens, apostrophes)
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter((t) => t.length > 0 && !SUFFIX_TOKENS.has(t))
    .join(' ');
}

// Reorder-insensitive canonical key: tokens sorted then concatenated, with
// no spaces. Lets "Smith-Njigba Jaxon" and "Jaxon Smith-Njigba" share a key
// (exact identity) even though the fuzzy path isn't needed for the reorder.
export function nameKey(name) {
  return normalizeName(name)
    .split(' ')
    .filter(Boolean)
    .sort()
    .join('');
}

function canonicalPosition(position) {
  if (!position) return null;
  const p = String(position).toUpperCase().trim();
  return POSITION_ALIASES.get(p) || p;
}

function canonicalTeam(team) {
  if (!team) return null;
  const t = String(team).toUpperCase().trim();
  return TEAM_ALIASES.get(t) || t;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function editSimilarity(a, b) {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Token-set similarity with initial handling: a single-char token ("j") matches
// a multi-char token whose first char agrees ("jamarr"). Greedy one-to-one.
function tokenSimilarity(queryNorm, candidateNorm) {
  const q = queryNorm.split(' ').filter(Boolean);
  const c = candidateNorm.split(' ').filter(Boolean);
  if (!q.length || !c.length) return 0;
  const used = new Array(c.length).fill(false);
  let matched = 0;
  for (const qt of q) {
    for (let i = 0; i < c.length; i++) {
      if (used[i]) continue;
      const ct = c[i];
      const isInitialMatch =
        (qt.length === 1 && ct[0] === qt) ||
        (ct.length === 1 && qt[0] === ct);
      if (qt === ct || isInitialMatch) {
        matched += 1;
        used[i] = true;
        break;
      }
    }
  }
  return matched / Math.max(q.length, c.length);
}

function clamp(x) {
  return Math.max(0, Math.min(1, x));
}

// Score 0..1 for how well `query` matches `candidate`. Candidates that differ
// in position (when both known) are penalized, not rejected, unless
// `requirePositionMatch` is set (use that for strict same-position matching).
export function scoreNameMatch(query, candidate, options = {}) {
  const {
    requirePositionMatch = false,
  } = options;

  const qKey = nameKey(query.name);
  const cKey = nameKey(candidate.name);
  if (!qKey || !cKey) return 0;

  let nameScore;
  if (qKey === cKey) {
    nameScore = 1;
  } else {
    const full = editSimilarity(qKey, cKey);
    const tok = tokenSimilarity(normalizeName(query.name), normalizeName(candidate.name));
    let cont = 0;
    const longer = qKey.length >= cKey.length ? qKey : cKey;
    const shorter = qKey.length >= cKey.length ? cKey : qKey;
    if (longer.includes(shorter)) {
      cont = shorter.length / longer.length >= 0.6 ? 0.95 : 0.4;
    }
    nameScore = Math.max(full, tok, cont);
  }

  const qPos = canonicalPosition(query.position ?? options.queryPosition);
  const cPos = canonicalPosition(candidate.position ?? options.candidatePosition);
  if (qPos && cPos) {
    if (qPos === cPos) nameScore += 0.05;
    else if (requirePositionMatch) return 0;
    else nameScore -= 0.15;
  } else if (requirePositionMatch && (qPos || cPos)) {
    return 0;
  }

  const qTeam = canonicalTeam(query.team ?? options.queryTeam);
  const cTeam = canonicalTeam(candidate.team ?? options.candidateTeam);
  if (qTeam && cTeam) {
    if (qTeam === cTeam) nameScore += 0.03;
    else nameScore -= 0.1;
  }

  return clamp(nameScore);
}

// Resolve `query` against `candidates` (Array<{ name, position?, team?, data? }).
// Returns { match, score, matchedBy } for the best candidate at/above threshold,
// else null. `matchedBy` is 'exact' (canonical keys equal) or 'fuzzy'.
export function bestMatch(query, candidates, options = {}) {
  const { threshold = 0.7, ...scoreOpts } = options;
  let best = null;
  for (const candidate of candidates) {
    const score = scoreNameMatch(query, candidate, scoreOpts);
    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = {
        match: candidate,
        score,
        matchedBy: nameKey(query.name) === nameKey(candidate.name) ? 'exact' : 'fuzzy',
      };
    }
  }
  return best && best.score >= threshold ? best : null;
}
