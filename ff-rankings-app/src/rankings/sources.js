// Single source of truth for the selectable ranking boards.
//
// Every component that lists/loads/switches boards reads from here instead
// of hardcoding filenames — adding a board is now a one-line change and the
// three consumer lists can no longer drift out of sync.
//
// Schema (from public/*.csv): Overall,Player,Position,[Tier],Team
// (UTF-8 BOM + CRLF; see AGENTS.md "Ranking data".)

export const RANKING_SOURCES = [
  {
    id: 'rankings-tiers-2026',
    file: '2026 Rankings.csv',
    label: '2026 Rankings',
    supportsTiers: true,
    positions: ['QB', 'RB', 'WR', 'TE'],
    requiresTeamColumn: true,
  },
  {
    id: 'fantasypros-2026-all',
    file: 'FantasyPros 2026 Draft ALL Rankings.csv',
    label: 'FantasyPros 2026 Draft ALL Rankings',
    supportsTiers: true,
    positions: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
    requiresTeamColumn: true,
  },
  {
    id: 'fantasypros-2026-all-top-10-draft-accuracy',
    file: 'FantasyPros 2026 Top10 Draft.csv',
    label: 'FantasyPros 2026 Top 10 Accurate Draft Experts',
    supportsTiers: true,
    positions: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
    requiresTeamColumn: true,
  },
  {
    id: 'fantasypros-2026-all-top-10-in-season-accuracy',
    file: 'FantasyPros 2026 Top10 InSeason.csv',
    label: 'FantasyPros 2026 Top 10 Accurate InSeason Experts',
    supportsTiers: true,
    positions: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
    requiresTeamColumn: true,
  },
  {
    id: 'Yahoo Experts',
    file: 'Yahoo PPR Rankings.csv',
    label: 'Yahoo Expert PPR Ranking',
    supportsTiers: true,
    positions: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
    requiresTeamColumn: true,
  },
  {
    id: 'espn-2026-ppr-top-300',
    file: 'ESPN 2026 PPR Top 300.csv',
    label: 'ESPN 2026 PPR Top 300',
    supportsTiers: false,
    positions: ['QB', 'RB', 'WR', 'TE', 'K', 'DST'],
    requiresTeamColumn: true,
  },
];

// Filename list, for code that just iterates every selectable board.
export const RANKING_FILES = RANKING_SOURCES.map((s) => s.file);

// Filename list for the team-mapping reference loop: only boards that carry a
// Team column can contribute to the normalizedName -> team map.
export const TEAM_MAPPING_FILES = RANKING_SOURCES
  .filter((s) => s.requiresTeamColumn)
  .map((s) => s.file);

// Resolve a registry entry by its filename (case-sensitive). Returns
// undefined for user-uploaded files that aren't in the registry.
export const findSourceByFile = (file) =>
  RANKING_SOURCES.find((s) => s.file === file);

// Display label for a filename, falling back to "name without .csv" so
// user-uploaded (non-registry) files still render a sane name.
export const rankingLabel = (file) =>
  findSourceByFile(file)?.label ?? file.replace(/\.csv$/, '');
