import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, AlertTriangle, CheckCircle2, RefreshCw, Eye, EyeOff, X, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { bestMatch } from '../rankings/matchPlayer';

// Dev-only bridge: Vite proxies /espn/reads + /espn/writes to ESPN, attaching
// espn_s2/SWID cookies from X-ESPN-Cookies (the browser cannot attach them
// itself for a cross-site call). Outside `npm run dev` these paths 404 and
// the wizard tells the user to start the dev server.
const READ_BASE = '/espn/reads/apis/v3/games/ffl/seasons';
const WRITE_TRANSACTIONS = '/espn/writes/apis/v3/games/ffl/seasons';

const STEPS = ['File', 'League & Cookies', 'Review Teams', 'Import'];

// If cookies are blank, omit the header entirely - the Vite dev proxy then
// falls back to tools/.espn-cookies.json (written by tools/espn_login.py).
const espnFetch = async (path, cookies, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (cookies?.espnS2 && cookies?.swid) {
    headers['X-ESPN-Cookies'] = `espn_s2=${cookies.espnS2}; SWID=${cookies.swid}`;
  }
  const res = await fetch(path, { ...options, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ESPN returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
};

// Ask the dev proxy whether its cookie file exists + when it was saved.
// The proxy forwards this to ESPN; a 401 here means "no valid cookies"
// which the wizard surfaces as "run tools/espn_login.py".
const espnCookieStatus = async () => {
  try {
    const res = await fetch('/espn/reads/apis/v3/games/ffl/seasons/' + new Date().getFullYear() + '?view=fTeamList');
    return res.ok ? 'available' : 'missing';
  } catch {
    return 'missing';
  }
};

// Player universe via the league-scoped kona_player_info view (the
// season-level players endpoint 404s). X-Fantasy-Filter selects the fields
// we need; without it ESPN returns bare player ids. Paged ~1000 at a time.
const fetchAllPlayers = async (year, leagueId, cookies) => {
  const filter = JSON.stringify({
    players: {
      limit: 1000,
      sortPercOwned: { sortPriority: 1, sortAsc: false },
    },
  });
  const players = [];
  let offset = 0;
  for (let page = 0; page < 8; page++) {
    const data = await espnFetch(
      `${READ_BASE}/${year}/segments/0/leagues/${leagueId}?view=kona_player_info`,
      cookies,
      { headers: { 'X-Fantasy-Filter': filter.replace('"limit":1000', `"limit":1000,"offset":${offset}`) } }
    );
    const batch = data.players || [];
    players.push(...batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }
  // kona_player_info wraps each player in a pool entry: the real player
  // (id, fullName, position, proTeamAbbreviation) lives at .player.
  return players.map((entry) => entry.player || entry).filter(Boolean);
};

// Extract the mascot from a defense name on either side:
// ESPN: "Texans D/ST"  -> "texans"   (drop the D/ST suffix word, take last)
// ours: "Houston Texans" -> "texans" (already a plain name, take last)
const mascotFromDstName = (name) => {
  const cleaned = String(name || '').replace(/d\/?st/gi, ' ');
  const words = cleaned.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return words[words.length - 1] || '';
};

// ESPN kona_player_info returns position as defaultPositionId (slot id), not
// a string. Map the ids we care about; D/ST is 16.
const ESPN_POS_IDS = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DST' };
const espnPos = (p) =>
  ESPN_POS_IDS[p.defaultPositionId]
  || String(p.position || '').toUpperCase().replace('D/ST', 'DST');

// SUFFIX_TOKENS mirror of matchPlayer's, used for the wizard's own keys.
const SUFFIX_TOKENS = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

// Token-set keys for a name, with variants that make initials match across
// punctuation conventions: ESPN writes "A.J. Brown" / "T.J. Hockenson",
// our boards write "AJ Brown" / "TJ Hockenson". Punctuation becomes spaces,
// so ESPN yields single-letter tokens and we yield a 2-letter token; the
// split variant ("aj" -> "a","j") makes both sides produce a shared key.
const keysFor = (name) => {
  const tokens = String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t && !SUFFIX_TOKENS.has(t));
  const variants = [tokens];
  const split = [];
  for (const t of tokens) {
    if (t.length === 2 && /^[a-z]{2}$/.test(t)) split.push(t[0], t[1]);
    else split.push(t);
  }
  if (split.length !== tokens.length) variants.push(split);
  const keys = new Set();
  for (const v of variants) keys.add([...v].sort().join(''));
  return keys;
};

// Common nickname aliases: ffdraft boards say Kenneth, ESPN says Kenny.
// Expands a pick's key set with one substitution per known nickname token.
const NICKNAMES = {
  kenneth: ['kenny'], michael: ['mike', 'mikey'], william: ['will', 'bill'],
  robert: ['rob'], joshua: ['josh'], daniel: ['danny', 'dan'], james: ['jimmy'],
  christopher: ['chris'], stephen: ['steve'], matthew: ['matt'],
};
const keysWithNicknames = (name) => {
  const keys = keysFor(name);
  const tokens = String(name || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  tokens.forEach((t, i) => {
    const alts = NICKNAMES[t];
    if (!alts) return;
    for (const alt of alts) {
      const candidate = [...tokens.slice(0, i), alt, ...tokens.slice(i + 1)].join(' ');
      keysFor(candidate).forEach((k) => keys.add(k));
    }
  });
  return keys;
};

const EspnUploadWizard = ({ themeStyles, onClose }) => {
  const [step, setStep] = useState(0);
  const [exportData, setExportData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [espnS2, setEspnS2] = useState('');
  const [swid, setSwid] = useState('');
  const [showCookies, setShowCookies] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  // 'available' = dev proxy found tools/.espn-cookies.json; 'missing' otherwise.
  const [cookieStatus, setCookieStatus] = useState('checking');
  const [loginLaunched, setLoginLaunched] = useState(false);

  // Match results: pickIndex -> { espnPlayer, matchedBy }
  const [matches, setMatches] = useState({});;
  // ffdraft teamId -> ESPN teamId (editable reassignment)
  const [teamMap, setTeamMap] = useState({});
  // ffdraft teamId -> { name, picks: [...] } for review
  const [espnTeams, setEspnTeams] = useState([]);
  const [importProgress, setImportProgress] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.source !== 'ffdraft' || !Array.isArray(data.picks)) {
          throw new Error('not a ffdraft export');
        }
        setExportData(data);
        setFileName(file.name);
        setError('');
      } catch {
        setError('That does not look like a ffdraft export file.');
      }
    };
    reader.readAsText(file);
  };

  // Ask the dev server whether saved ESPN cookies exist (checked when the
  // wizard opens and again after a login window closes).
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/espn/login-status');
        const data = await res.json();
        if (!cancelled) setCookieStatus(data.cookieFile ? 'available' : 'missing');
      } catch {
        if (!cancelled) setCookieStatus('missing');
      }
    };
    check();
    return () => { cancelled = true; };
  }, []);

  // One-click login: the dev server spawns tools/espn_login.py, which opens
  // a real browser window on this machine. Poll until the cookie file lands.
  const launchEspnLogin = async () => {
    try {
      const res = await fetch('/espn/login', { method: 'POST' });
      if (res.status === 409) {
        setLoginLaunched(true);
        return;
      }
      if (!res.ok) {
        setError('Could not start the login helper. Is the dev server running with the latest vite.config.js?');
        return;
      }
      setLoginLaunched(true);
      const deadline = Date.now() + 300000; // login script times out after 5 min
      const poll = setInterval(async () => {
        try {
          const s = await fetch('/espn/login-status');
          const d = await s.json();
          if (d.cookieFile) {
            clearInterval(poll);
            setLoginLaunched(false);
            setCookieStatus('available');
            toast.success('ESPN session saved - connecting is ready.');
          } else if (Date.now() > deadline) {
            clearInterval(poll);
            setLoginLaunched(false);
          }
        } catch { /* dev server hiccup; keep polling */ }
      }, 2000);
    } catch {
      setError('Could not reach the dev-server login launcher.');
    }
  };

  const connectAndMatch = async () => {
    setError('');
    if (!leagueId.trim()) {
      setError('League ID is required.');
      return;
    }
    setFetching(true);
    try {
      // Pasted cookies win; otherwise the dev proxy falls back to the
      // tools/.espn-cookies.json written by tools/espn_login.py.
      const cookies = { espnS2: espnS2.trim(), swid: swid.trim() };

      // 1) League + draft state: validates cookies/ID, gets team names + slots.
      const league = await espnFetch(
        `${READ_BASE}/${year}/segments/0/leagues/${leagueId.trim()}?view=mDraftDetail&view=mTeam`,
        cookies
      );
      const draftDetail = league.draftDetail || {};
      if (!Array.isArray(draftDetail.picks) || draftDetail.picks.length === 0) {
        throw new Error(
          'ESPN has no draft slots yet. In LM Tools set the league to an Offline draft, '
          + 'make sure the scheduled time has passed, and click "Begin Offline Draft".'
        );
      }

      // 2) Player universe for matching (league-scoped).
      const espnPlayers = await fetchAllPlayers(year, leagueId.trim(), cookies);

      // 3) Index ESPN players. D/ST: ESPN names are mascot-only
      // ("Texans D/ST"); index by mascot so "Houston Texans" matches.
      // Everyone else: indexed under every initials key variant.
      const exactIndex = new Map(); // key -> [players]
      const dstByMascot = new Map(); // mascot -> player
      for (const p of espnPlayers) {
        const pos = espnPos(p);
        if (pos === 'DST') {
          dstByMascot.set(mascotFromDstName(p.fullName || ''), p);
          continue;
        }
        for (const k of keysFor(p.fullName || '')) {
          if (!exactIndex.has(k)) exactIndex.set(k, []);
          exactIndex.get(k).push(p);
        }
      }

      // 4) Match each pick: DST via mascot, others via key-variant
      // intersection (handles AJ/A.J. style), then fuzzy fallback.
      const candidates = espnPlayers
        .filter((p) => espnPos(p) !== 'DST')
        .map((p) => ({ name: p.fullName || '', position: espnPos(p), team: p.proTeamAbbreviation, data: p }));
      const nextMatches = {};
      exportData.picks.forEach((pick, i) => {
        const pos = (pick.position || '').toUpperCase();
        if (pos === 'DST') {
          const hit = dstByMascot.get(mascotFromDstName(pick.name));
          if (hit) nextMatches[i] = { espnPlayer: hit, matchedBy: 'exact' };
          return;
        }
        const exact = [];
        for (const k of keysWithNicknames(pick.name)) {
          for (const p of exactIndex.get(k) || []) {
            if (!exact.includes(p)) exact.push(p);
          }
        }
        const samePos = exact.find((p) => espnPos(p) === pos);
        if (samePos) {
          nextMatches[i] = { espnPlayer: samePos, matchedBy: 'exact' };
          return;
        }
        if (exact.length === 1) {
          nextMatches[i] = { espnPlayer: exact[0], matchedBy: 'exact-key' };
          return;
        }
        const fuzzy = bestMatch(pick, candidates, { threshold: 0.78, requirePositionMatch: true });
        if (fuzzy) nextMatches[i] = { espnPlayer: fuzzy.match.data, matchedBy: `fuzzy ${Math.round(fuzzy.score * 100)}%` };
      });

      // 5) ESPN team list + slot mapping (overall pick -> ESPN teamId).
      const espnTeamList = (league.teams || []).map((t) => ({
        id: t.id,
        name: t.name || [t.location, t.nickname].filter(Boolean).join(' ') || `Team ${t.id}`,
      }));
      const slotMap = new Map();
      draftDetail.picks.forEach((p) => slotMap.set(p.overallPickNumber, p.teamId));

      // 6) Group picks by ffdraft team. Default ESPN assignment follows the
      // slot order: the ESPN team that owns pick 1 gets ffdraft team 1, etc.
      // The review screen lets the user change any assignment by name.
      const byTeam = new Map();
      exportData.picks.forEach((pick, i) => {
        if (!byTeam.has(pick.teamId)) byTeam.set(pick.teamId, []);
        byTeam.get(pick.teamId).push({ ...pick, _idx: i, _espnSlotTeam: slotMap.get(pick.overallPickNumber) });
      });
      const sortedFfTeams = [...byTeam.keys()].sort((a, b) => a - b);
      const slotOrder = [...slotMap.values()];
      const espnTeamsBySlot = new Map();
      slotOrder.forEach((tid) => { if (!espnTeamsBySlot.has(tid)) espnTeamsBySlot.set(tid, true); });
      const espnSlotOrder = [...espnTeamsBySlot.keys()];
      const defaultMap = {};
      sortedFfTeams.forEach((tid, i) => {
        defaultMap[tid] = espnSlotOrder[i] ?? espnTeamList[i]?.id ?? tid;
      });
      setTeamMap(defaultMap);
      setEspnTeams(espnTeamList);
      setMatches(nextMatches);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  };

  const matchedCount = useMemo(
    () => (exportData ? exportData.picks.filter((_, i) => matches[i]).length : 0),
    [exportData, matches]
  );

  const teamsOverview = useMemo(() => {
    if (!exportData || !espnTeams.length) return [];
    const byTeam = new Map();
    exportData.picks.forEach((pick, i) => {
      if (!byTeam.has(pick.teamId)) byTeam.set(pick.teamId, []);
      byTeam.get(pick.teamId).push({ pick, match: matches[i] });
    });
    return [...byTeam.keys()].sort((a, b) => a - b).map((tid) => ({
      ffTeamId: tid,
      ffLabel: exportData.teamNames?.[tid] || `Team ${tid}`,
      espnTeamId: teamMap[tid],
      espnLabel: espnTeams.find((t) => t.id === teamMap[tid])?.name || `ESPN Team ${teamMap[tid]}`,
      picks: byTeam.get(tid),
    }));
  }, [exportData, matches, teamMap, espnTeams]);

  const runImport = async () => {
    setError('');
    setImportResults(null);
    const cookies = { espnS2: espnS2.trim(), swid: swid.trim() };
    // One POST per ffdraft team, all items in a single transaction.
    const plan = teamsOverview.map((t) => ({
      ffTeamId: t.ffTeamId,
      espnTeamId: t.espnTeamId,
      items: t.picks
        .filter((p) => p.match)
        .map((p) => ({
          overallPickNumber: p.pick.overallPickNumber,
          type: 'DRAFT',
          playerId: p.match.espnPlayer.id,
        })),
    })).filter((t) => t.items.length > 0);

    const results = [];
    for (const t of plan) {
      setImportProgress({ team: t.ffTeamId, of: plan.length, picks: t.items.length });
      try {
        await espnFetch(
          `${WRITE_TRANSACTIONS}/${year}/segments/0/leagues/${leagueId.trim()}/transactions/`,
          cookies,
          {
            method: 'POST',
            body: JSON.stringify({
              isLeagueManager: true,
              teamId: t.espnTeamId,
              type: 'DRAFT',
              scoringPeriodId: 1,
              executionType: 'EXECUTE',
              items: t.items,
            }),
          }
        );
        results.push({ ffTeamId: t.ffTeamId, espnTeamId: t.espnTeamId, picks: t.items.length, ok: true });
      } catch (e) {
        results.push({ ffTeamId: t.ffTeamId, espnTeamId: t.espnTeamId, picks: t.items.length, ok: false, error: e.message });
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    setImportProgress(null);
    setImportResults(results);
    const ok = results.filter((r) => r.ok).length;
    const totalPicks = results.reduce((s, r) => s + (r.ok ? r.picks : 0), 0);
    if (ok === plan.length) {
      toast.success(`Imported ${totalPicks} picks across ${ok} teams.`);
    } else {
      toast.warning(`${ok}/${plan.length} teams imported - check the results panel.`);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: `1px solid ${themeStyles.border}`,
    background: themeStyles.input?.background || 'transparent',
    color: themeStyles.text.primary,
    fontSize: 13,
  };
  const cardStyle = {
    border: `1px solid ${themeStyles.border}`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    background: themeStyles.surface || 'transparent',
  };

  const renderFileStep = () => (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: themeStyles.text.secondary }}>
        Upload the JSON file from the ESPN export button. Then verify the league connection
        and review which ESPN team receives each ffdraft team's picks before anything is posted.
      </p>
      <button
        onClick={() => fileInputRef.current?.click()}
        style={{
          ...cardStyle, width: '100%', cursor: 'pointer', textAlign: 'left',
          display: 'flex', alignItems: 'center', gap: 10,
          borderStyle: 'dashed',
        }}
      >
        <Upload size={18} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>
            {fileName || 'Choose ffdraft export .json'}
          </div>
          {exportData && (
            <div style={{ fontSize: 11, color: themeStyles.text.muted }}>
              {exportData.picks.length} picks · {exportData.numTeams} teams · exported {new Date(exportData.exportedAt).toLocaleString()}
            </div>
          )}
        </div>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
      />
    </div>
  );

  const renderLeagueStep = () => (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: themeStyles.text.muted }}>
        {cookieStatus === 'available'
          ? 'ESPN session found on this machine - cookie fields not needed.'
          : 'Log in to ESPN once and the session is saved for the whole season. Click the button below: a browser window opens, you log in normally (2FA works), and this wizard picks it up automatically. The cookie fields below are only a manual fallback.'}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button
          onClick={launchEspnLogin}
          disabled={loginLaunched}
          style={{
            padding: '8px 14px', borderRadius: 6, cursor: loginLaunched ? 'wait' : 'pointer',
            border: `1px solid ${cookieStatus === 'available' ? themeStyles.border : 'transparent'}`,
            background: cookieStatus === 'available' ? 'transparent' : '#16a34a',
            color: cookieStatus === 'available' ? themeStyles.text.primary : '#fff',
            fontWeight: 600, fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <RefreshCw size={13} />
          {loginLaunched
            ? 'Waiting for login...'
            : cookieStatus === 'available'
              ? 'Re-login to ESPN'
              : 'Log in to ESPN'}
        </button>
        {cookieStatus === 'available' && (
          <span style={{ fontSize: 11, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} /> session saved
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: themeStyles.text.muted }}>League ID</label>
          <input style={inputStyle} value={leagueId} onChange={(e) => setLeagueId(e.target.value)} placeholder="e.g. 1234567" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: themeStyles.text.muted }}>Season</label>
          <input style={inputStyle} value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)} />
        </div>
      </div>
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: themeStyles.text.muted }}>espn_s2</label>
        <input
          style={{ ...inputStyle, paddingRight: 34 }}
          type={showCookies ? 'text' : 'password'}
          value={espnS2}
          onChange={(e) => setEspnS2(e.target.value)}
          placeholder="long session token"
        />
        <button
          onClick={() => setShowCookies(!showCookies)}
          style={{ position: 'absolute', right: 8, top: 24, background: 'none', border: 'none', cursor: 'pointer', color: themeStyles.text.muted }}
          title={showCookies ? 'Hide' : 'Show'}
        >
          {showCookies ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: themeStyles.text.muted }}>SWID</label>
        <input
          style={inputStyle}
          type={showCookies ? 'text' : 'password'}
          value={swid}
          onChange={(e) => setSwid(e.target.value)}
          placeholder="{XXXXXXXX-XXXX-...}"
        />
      </div>
      <div style={{ fontSize: 11, color: themeStyles.text.muted, marginBottom: 10 }}>
        Requires <code>npm run dev</code> (the /espn proxy is dev-only). League must be an
        Offline draft with "Begin Offline Draft" already clicked.
      </div>
      <button
        onClick={connectAndMatch}
        disabled={fetching}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 6, cursor: fetching ? 'wait' : 'pointer',
          border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {fetching ? <RefreshCw size={14} className="spin" /> : <ArrowRightLeft size={14} />}
        {fetching ? 'Connecting to ESPN...' : 'Connect & Match Players'}
      </button>
    </div>
  );

  const renderReviewStep = () => (
    <div>
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {matchedCount === exportData.picks.length
          ? <CheckCircle2 size={16} color="#16a34a" />
          : <AlertTriangle size={16} color="#f59e0b" />}
        <div style={{ fontSize: 13 }}>
          {matchedCount} of {exportData.picks.length} picks matched to ESPN players.
          {matchedCount < exportData.picks.length && ' Unmatched picks are skipped.'}
        </div>
      </div>

      {teamsOverview.map((t) => (
        <div key={t.ffTeamId} style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {t.ffLabel} <span style={{ color: themeStyles.text.muted }}>({t.picks.length} picks)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowRightLeft size={13} color={themeStyles.text.muted} />
              <select
                value={t.espnTeamId ?? ''}
                onChange={(e) => setTeamMap({ ...teamMap, [t.ffTeamId]: parseInt(e.target.value) })}
                style={{ ...inputStyle, width: 180, padding: '5px 8px' }}
              >
                {espnTeams.map((et) => (
                  <option key={et.id} value={et.id}>{et.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 11, color: themeStyles.text.muted, lineHeight: 1.6 }}>
            {t.picks.map((p) => {
              const name = p.match?.espnPlayer?.fullName || p.pick.name;
              const flagged = !p.match;
              return (
                <span key={p.pick.overallPickNumber} style={{
                  display: 'inline-block',
                  margin: '1px 4px 1px 0',
                  padding: '1px 6px',
                  borderRadius: 4,
                  border: `1px solid ${flagged ? '#f59e0b' : themeStyles.border}`,
                  color: flagged ? '#f59e0b' : themeStyles.text.secondary,
                  textDecoration: p.match?.matchedBy?.startsWith('fuzzy') ? 'underline dotted' : 'none',
                }}>
                  #{p.pick.overallPickNumber} {name}{p.match?.matchedBy?.startsWith('fuzzy') ? ` (${p.match.matchedBy})` : ''}
                </span>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setStep(1)}
          style={{ flex: 1, padding: '9px 0', borderRadius: 6, cursor: 'pointer', border: `1px solid ${themeStyles.border}`, background: 'transparent', color: themeStyles.text.primary }}
        >
          Back
        </button>
        <button
          onClick={runImport}
          disabled={importProgress !== null}
          style={{
            flex: 2, padding: '9px 0', borderRadius: 6, cursor: importProgress ? 'wait' : 'pointer',
            border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700,
          }}
        >
          {importProgress
            ? `Importing team ${importProgress.team} (${importProgress.picks} picks)...`
            : `Import ${matchedCount} picks to ESPN`}
        </button>
      </div>
    </div>
  );

  const renderResults = () => (
    <div>
      {importResults.map((r) => (
        <div key={r.ffTeamId} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
          {r.ok ? <CheckCircle2 size={15} color="#16a34a" /> : <AlertTriangle size={15} color="#dc2626" />}
          <div style={{ fontSize: 12 }}>
            Team {r.ffTeamId} → ESPN "{espnTeams.find((t) => t.id === r.espnTeamId)?.name || r.espnTeamId}"
            : {r.picks} picks {r.ok ? 'imported' : `FAILED - ${r.error}`}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 12, color: themeStyles.text.muted, marginBottom: 10 }}>
        Verify rosters in ESPN LM Tools → Input Offline Draft Results, then click
        "Make Rosters Available" to publish them to the league.
      </div>
      <button
        onClick={onClose}
        style={{ width: '100%', padding: '9px 0', borderRadius: 6, border: `1px solid ${themeStyles.border}`, background: 'transparent', color: themeStyles.text.primary, cursor: 'pointer' }}
      >
        Done
      </button>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        style={{
          width: 560, maxWidth: '94vw', maxHeight: '86vh', overflowY: 'auto',
          background: themeStyles.container.backgroundColor,
          color: themeStyles.text.primary,
          border: `1px solid ${themeStyles.border}`,
          borderRadius: 12, padding: 18,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Import Draft to ESPN</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: themeStyles.text.muted }}>
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {STEPS.map((label, i) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center', fontSize: 11, padding: '3px 0', borderRadius: 4,
              background: i === step ? '#2563eb' : i < step ? 'rgba(22,163,74,0.25)' : 'transparent',
              color: i === step ? '#fff' : i < step ? '#16a34a' : themeStyles.text.muted,
              border: `1px solid ${i === step ? '#2563eb' : themeStyles.border}`,
            }}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ ...cardStyle, borderColor: '#dc2626', color: '#dc2626', fontSize: 12 }}>
            <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            {error}
          </div>
        )}

        {step === 0 && (
          <>
            {renderFileStep()}
            <button
              onClick={() => setStep(1)}
              disabled={!exportData}
              style={{ width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 6, border: 'none', background: exportData ? '#2563eb' : themeStyles.border, color: '#fff', fontWeight: 600, cursor: exportData ? 'pointer' : 'not-allowed' }}
            >
              Next: League Setup
            </button>
          </>
        )}
        {step === 1 && (
          <>
            {renderLeagueStep()}
            <button
              onClick={() => setStep(0)}
              style={{ width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 6, border: `1px solid ${themeStyles.border}`, background: 'transparent', color: themeStyles.text.primary, cursor: 'pointer' }}
            >
              Back
            </button>
          </>
        )}
        {step === 2 && renderReviewStep()}
        {step === 3 && importResults && renderResults()}
      </div>
    </div>
  );
};

export default EspnUploadWizard;
