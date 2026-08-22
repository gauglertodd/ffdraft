# AGENTS.md

Notes for any agent (or human) working on this repo. Read this before
making changes; it captures layout, how to run, conventions, and the
non-obvious gotchas that have already been learned the hard way.

## Overview

`ffdraft` is a **100% client-side** fantasy football draft tracker. The UI
is a Vite + React 18 app; the draft logic is Python, executed in the browser
via PyScript (Pyodide / WASM). There is **no backend server** — the
Makefile/`pyproject.toml`/`setup.sh` Flask+conda paths are vestigial and will
fail (see *Gotchas*).

## Repo layout

```
/
├── Makefile               # see "Running locally" — most targets are dead
├── pyproject.toml         # vestigial (dead Flask/conda backend config)
├── setup.sh               # vestigial (dead conda setup script)
├── AGENTS.md              # this file
└── ff-rankings-app/       # the actual app
    ├── index.html          # loads PyScript (pinned 2024.1.1) + py-config + <py-script src="/auto_draft_logic.py">
    ├── package.json        # scripts: dev / build / lint / preview
    ├── vite.config.js
    ├── tailwind.config.js
    ├── public/             # served verbatim; fetched at runtime (by Pyodide & fetch)
    │   ├── _headers
    │   ├── auto_draft_logic.py     # auto-draft engine (loaded by PyScript)
    │   ├── draft_strategies.py    # strategy definitions (loaded by PyScript)
    │   ├── 2026 Rankings.csv                          # tiered board (250, QB/RB/WR/TE)
    │   └── FantasyPros 2026 Draft ALL Rankings.csv    # comprehensive board (520, incl K/DST/FA)
    └── src/
        ├── main.jsx        # React bootstrap
        ├── App.jsx
        ├── index.css
        ├── rankings/
        │   └── sources.js     # single source of truth for ranking boards
        └── components/
            ├── DraftTracker.jsx          # main board; CSV parser; team mapping; PyScript polling
            ├── PlayerList.jsx             # player grid (uses <TeamVisual> for team indicator)
            ├── TeamVisual.jsx            # team indicators: logo (hotlinked) + colored-chip fallbacks
            ├── FileUpload.jsx             # selectable ranking-source list (one of three to keep in sync)
            ├── UnifiedControlPanel.jsx    # ranking-source list (two of three)
            ├── UnifiedSettingsPanel.jsx
            ├── SettingsPanel.jsx
            ├── TeamBoards.jsx             # drafted-picks grid
            ├── KeeperModePanel.jsx
            └── ThemeContext.jsx           # theme provider (dark/light)
```

## Running locally

```bash
cd ff-rankings-app
npm install
npm run dev          # -> http://localhost:5173
```

- First load pulls **Pyodide (~10MB)** in-browser; subsequent loads are fast.
- Build/preview: `npm run build` then `npm run preview`.
- Lint: `npm run lint` (ESLint, `--max-warnings 0`). For targeted lint on
  changed files: `npx eslint --ext js,jsx <files>`.
- `make ff` / `make frontend` are equivalent to `npm run dev`. **`make ff`
  prints a misleading "Python API:5001" line but starts no backend.**
- Avoid `make setup`, `make backend`, `make quick-setup`, and the
  `create-conda-env`/`install-python-deps` targets — they reference a
  Flask/conda backend that does not exist (no `auto-draft-backend/` dir).
  They will fail.

## Architecture

- `index.html` loads `https://pyscript.net/releases/2024.1.1/core.js`, a
  `<py-config>`, and `<py-script src="/auto_draft_logic.py">`. The `.py`
  files live in `public/` and are fetched by Pyodide at runtime.
- The PyScript bridge exposes `window.pyAutoDraft`, `pyPredictAvailability`,
  and `pyGetStrategies` (built via `create_proxy`); JSON in/out.
- `DraftTracker.jsx` polls `window.pyAutoDraft` (100ms interval, 30s timeout)
  and only enables auto-draft once the Python side is ready.
- Because the Python is loaded from `public/`, edits to the `.py` files need
  no build step — Vite serves them verbatim and Pyodide reloads on refresh.

## Ranking data (CSV)

App-standard schema: `Overall,Player,Position,Tier,Team`, written with a
UTF-8 BOM + CRLF line endings (the parser tolerates BOM, so keeping it is
safest).

Two selectable boards ship in `public/`:

| File | Players | Positions | Source |
| --- | --- | --- | --- |
| `2026 Rankings.csv` | 250 | QB/RB/WR/TE only | `RankingsTiersMarketScore_2026` (tiered draft board) |
| `FantasyPros 2026 Draft ALL Rankings.csv` | 520 | QB/RB/WR/TE/K/DST (+19 FA) | `FantasyPros_2026_Draft_ALL_Rankings` (comprehensive) |

CSV parser (`DraftTracker.jsx`, ~L440+): fuzzy `COLUMN_PATTERNS` matched by
header name, order-independent via `findColumnIndex`. Team column is
**optional** — a missing team yields an empty value and a player id of
`name_pos_team`. BOM in the first header field is tolerated because matching
uses `.includes()` (substring).

Rows are split with a quote-aware helper (`splitCSVLine`) rather than a naive
`split(',')`, so a quoted field may contain commas (e.g. `"watch, sleeper"`).
No existing CSV uses quoting, so this is a safe superset.

**Optional note column.** A trailing `Note` / `Notes` / `Status` / `Remark` /
`Remarks` column (matched by the same fuzzy header logic) is parsed for
watch/avoid tags that auto-set each player's `watchStatus`, turning on the
existing watch/avoid highlight without manual toggling. `watchStatus` round-
trips via the autosave localStorage like any other field. Tags are scanned as
whole words plus a few phrases/emoji (case-insensitive):

- → `watched`: `watch`, `sleeper`, `target`, `must`, `stash`, `breakout`,
  `buy`, `love`, `undervalued`, `gem`, `steal`, `value`, `must have`,
  `must-have`, `must draft`, 🟢, ⭐, ✅
- → `avoided`: `avoid`, `fade`, `bust`, `overvalued`, `overpaid`, `dnd`,
  `do not draft`, `don't draft`, 🔴, ⛔, 🚫

If both a watch and an avoid tag appear, `watched` wins (matches the render
priority). No note column or no recognized tag → `watchStatus` stays `null`,
i.e. the no-note path is byte-for-byte unchanged. Single-letter `W`/`A` are
intentionally **not** matched (`a` collides with the article "a").

### Adding a new ranking source

1. Drop the CSV into `ff-rankings-app/public/` (keep BOM + CRLF).
2. Add one entry to `src/rankings/sources.js`:
   `{ id, file, label, supportsTiers, positions, requiresTeamColumn }`.
   That's it — all three consumers (`FileUpload`, `UnifiedControlPanel`,
   `DraftTracker`) read from this registry.
3. For team mapping to apply, set `requiresTeamColumn: true` and ensure the
   CSV has a `Team` column (the team-mapping loop skips boards without one).

The selector's UI label is the registry entry's `label` (with a fallback to
the filename minus `.csv` for user-uploaded, non-registry files).

### Ranking-source registry

The selectable boards are defined **once** in `src/rankings/sources.js`
(`RANKING_SOURCES`). It also derives:

- `RANKING_FILES` — every board's filename (`FileUpload` and
  `UnifiedControlPanel` scan `public/` with this list).
- `TEAM_MAPPING_FILES` — boards with `requiresTeamColumn: true`, fed to
  `DraftTracker`'s team-mapping reference loop.
- `findSourceByFile` / `rankingLabel` — label resolution (registry `label`,
  falling back to filename minus `.csv` for user-uploaded files).

The old "keep three filename lists in sync" hazard is gone — adding a board
is now a single entry in `sources.js`.

### Player-name matching & cross-board availability

`src/rankings/matchPlayer.js` is a **pure** soft-matching module (no React,
no I/O) so the autodraft flow can resolve a player proposed under one board's
spelling to the same player listed differently on another board. Pipeline:

- `normalizeName` — NFD-strip diacritics, lowercase, punctuation→space, drop
  `Jr`/`Sr`/`II`/`III`/`IV`/`V` suffix tokens, collapse whitespace. Preserves
  token boundaries (unlike the old `normalizePlayerName` which concatenated
  all spaces out).
- `nameKey` — tokens sorted then concatenated: **reorder-insensitive** canonical
  identity key. `Jaxon Smith-Njigba` and `Smith-Njigba Jaxon` share a key → exact.
- `scoreNameMatch` — `max(editSim, tokenSim, containment)` over the keys,
  with single-char token **initial** handling (`j` ↔ `jamarr`). Position/team
  are **soft hints** (+0.05/+0.03 match, −0.15/−0.1 mismatch) by default; pass
  `requirePositionMatch: true` for strict same-position use (team mapping).
  Default threshold `0.7`.
- `bestMatch` — best candidate at/above threshold, with `matchedBy: 'exact' | 'fuzzy'`.

`src/rankings/availability.js` builds the cross-board model on top:

- `buildIdentities(boards)` — union of distinct canonical keys across boards
  (first spelling wins) — the grouping that lets one player be "available
  across all active rankings".
- `resolveIdentity(player, identities, {threshold, requirePositionMatch})` —
  exact canonical key first, fuzzy fallback. Returns a **uniform**
  `{identity, score, matchedBy}` (or `null`). Under `requirePositionMatch`
  the exact-key loop also **skips same-name/different-position** entries
  (so `Mike Williams` WR ≠ `Mike Williams` RB) before falling to fuzzy,
  preventing cross-position collisions.
- `isPlayerTaken(player, draftedIdentities)` — the "already drafted?" check.
- `computeDraftedFlags(boards, draftedIdentities)` — derive each board's
  `drafted` bool from the global drafted-identity set; pure, returns new boards.

### Per-profile autodraft (live in `DraftTracker.jsx`)

The autodraft now drafts **per-team** from each team's assigned ranking profile
(SettingsPanel dropdown → `teamRankingProfile[teamId]`, falling back to
`defaultRankingProfileId`, i.e. the board selected at UI start). The displayed
board never changes.

- On mount, every `RANKING_SOURCES` board is background-loaded into
  `rankingProfileBoards[id]` (array of parsed players); the displayed `players`
  is untouched.
- `draftedIdentities` is derived from `draftedPlayers` (every pick — manual or
  cross-profile — lands in `players` as drafted), so cross-board availability is
  free: just filter `rankingProfileBoards[profile]` by `!isPlayerTaken(...,
  draftedIdentities, { threshold:0.7, requirePositionMatch:true })`.
- The autodraft effect routes on `assignedProfileId`:
  - **default path** (profile = displayed board): unchanged single-board flow —
    `callAutoDraftPyScript(availablePlayers, …)` → `draftPlayer(id)`.
  - **per-profile path**: propose from the filtered profile board, then
    `resolveIdentity(picked, availablePlayers, …)` back to the displayed board →
    `draftPlayer(displayedId)`. If the pick has no displayed-board counterpart
    (e.g. a K/DST only on the fuller board) it is inserted as a cross-profile
    pick via `draftCrossProfilePick` (a new `players` entry, `id =
    xprof_<profile>_<pickedId>`, marked drafted) so it still appears in the
    roster and counts as globally drafted. Position is enforced strictly
    (`requirePositionMatch: true`) on both the availability filter and the
    displayed-board resolution.

### CSV writing (if regenerating from a source)

```python
with open(out, 'w', encoding='utf-8-sig', newline='') as f:
    csv.writer(f, lineterminator='\r\n')...
```
`utf-8-sig` prepends the BOM; `lineterminator='\r\n'` writes CRLF. **Do not**
use BSD `sed 's/$/\r/'` on macOS — it appends a literal `r`. Use `awk` or
Python for CRLF rewrites.

## Team indicators (logos)

`TeamVisual.jsx` renders a team indicator. Styles:

- `style="logo"` (used by `PlayerList.jsx`, 4 call sites, `size="small"`):
  hotlinks a **real NFL logo** from ESPN's public CDN —
  `https://a.espncdn.com/i/teamlogos/nfl/500/<abbr>.png` (lowercased team
  abbreviation). The image floats on a transparent background (ESPN's PNGs are
  RGBA / transparent), no chip/frame.
- `helmet` / `shield` / `badge` / default: generic colored chips built from
  team colors (no logos). `badge` is also the **fallback** for `logo` when the
  team isn't logo-eligible (free agents/unknowns) or the CDN image fails to
  load (`onError → imgError` state), so a broken image never renders.

Key implementation details:

- `NFL_TEAMS` allowlist gates eligibility (the 32 + both `JAX`/`JAC`).
- `ESPN_KEY_OVERRIDES` remaps `JAC → 'jax'` and `JAX → 'jax'` (ESPN serves
  Jacksonville's current logo under `jax`; our data uses `JAC`).
- `TEAM_COLORS` and the `PlayerAvatar`/`FootballIcon`/`HelmetIcon` helpers are
  original/generic (no trademarked artwork bundled in the repo). The logos are
  **hotlinked at runtime only**, never copied in — this is deliberate to avoid
  redistributing trademarked NFL artwork.

## Commit message convention

- Short subject, gerund/verb-ing first word, no trailing period, **no**
  conventional-commit prefix. Examples from history: `Updating rankings`,
  `Cleaning up rankings`, `Adding team logos`, `Fixing fuzzy name matching`,
  `Improving upload`, `Addressing hiding keeper ui`.
- Append the trailer (unless told otherwise):
  ```
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```

## Gotchas

- **Dead backend path:** `Makefile`/`setup.sh`/`pyproject.toml` reference a
  Flask + conda backend that does not exist. Don't rely on `make setup`,
  `make backend`, `make quick-setup`, or the conda targets.
- **Slow first load** (Pyodide ~10MB). Expected, not a bug.
- **CSV filenames with spaces** (e.g. `2026 Rankings.csv`) work fine in
  `public/`, but mind shell quoting when scripting.
- **BOM + CRLF** in the ranking CSVs: the parser tolerates a BOM in the first
  header field (substring matching). If you regenerate a feed, keep both.
- **K/DST at runtime is untested:** the tiered `2026 Rankings.csv` has only
  QB/RB/WR/TE; the `FantasyPros 2026 Draft ALL Rankings.csv` includes K/DST.
  If a K/DST-heavy board misbehaves, the position/board logic may need tweaks.
- **Commits are local** unless explicitly pushed — confirm before assuming a
  change is remote.
