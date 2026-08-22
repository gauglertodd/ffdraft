import React, { useState } from 'react';

// Safe team colors (these are widely known and not trademarked)
const TEAM_COLORS = {
  'ARI': { primary: '#97233F', secondary: '#000000' },
  'ATL': { primary: '#A71930', secondary: '#000000' },
  'BAL': { primary: '#241773', secondary: '#000000' },
  'BUF': { primary: '#00338D', secondary: '#C60C30' },
  'CAR': { primary: '#0085CA', secondary: '#000000' },
  'CHI': { primary: '#0B162A', secondary: '#C83803' },
  'CIN': { primary: '#FB4F14', secondary: '#000000' },
  'CLE': { primary: '#311D00', secondary: '#FF3C00' },
  'DAL': { primary: '#003594', secondary: '#869397' },
  'DEN': { primary: '#FB4F14', secondary: '#002244' },
  'DET': { primary: '#0076B6', secondary: '#B0B7BC' },
  'GB': { primary: '#203731', secondary: '#FFB612' },
  'HOU': { primary: '#03202F', secondary: '#A71930' },
  'IND': { primary: '#002C5F', secondary: '#A2AAAD' },
  'JAX': { primary: '#006778', secondary: '#9F792C' },
  'KC': { primary: '#E31837', secondary: '#FFB81C' },
  'LV': { primary: '#000000', secondary: '#A5ACAF' },
  'LAC': { primary: '#0080C6', secondary: '#FFC20E' },
  'LAR': { primary: '#003594', secondary: '#FFA300' },
  'MIA': { primary: '#008E97', secondary: '#FC4C02' },
  'MIN': { primary: '#4F2683', secondary: '#FFC62F' },
  'NE': { primary: '#002244', secondary: '#C60C30' },
  'NO': { primary: '#D3BC8D', secondary: '#000000' },
  'NYG': { primary: '#0B2265', secondary: '#A71930' },
  'NYJ': { primary: '#125740', secondary: '#000000' },
  'PHI': { primary: '#004C54', secondary: '#A5ACAF' },
  'PIT': { primary: '#FFB612', secondary: '#000000' },
  'SF': { primary: '#AA0000', secondary: '#B3995D' },
  'SEA': { primary: '#002244', secondary: '#69BE28' },
  'TB': { primary: '#D50A0A', secondary: '#FF7900' },
  'TEN': { primary: '#0C2340', secondary: '#4B92DB' },
  'WAS': { primary: '#5A1414', secondary: '#FFB612' }
};

// NFL team abbreviations eligible for a logo indicator. Logos are loaded at
// runtime from ESPN's public CDN (https://a.espncdn.com) — never bundled — so
// the repo doesn't redistribute trademarked artwork. See `style="logo"`.
const NFL_TEAMS = new Set([
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
  'DET', 'GB', 'HOU', 'IND', 'JAX', 'JAC', 'KC', 'LAC', 'LAR', 'LV',
  'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF',
  'TB', 'TEN', 'WAS'
]);

// ESPN's CDN keys are lowercased team abbreviations, but Jacksonville's
// current logo is served under `jax` (our data uses JAC); map both to jax.
const ESPN_KEY_OVERRIDES = { JAC: 'jax', JAX: 'jax' };

const teamLogoUrl = (abbr) => {
  const up = abbr.toUpperCase();
  const key = ESPN_KEY_OVERRIDES[up] || up.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${key}.png`;
};

const TeamVisual = ({ teamAbbr, size = 'medium', style = 'helmet' }) => {
  const colors = TEAM_COLORS[teamAbbr?.toUpperCase()] || { primary: '#6B7280', secondary: '#9CA3AF' };

  const [imgError, setImgError] = useState(false);

  const sizes = {
    small: 24,
    medium: 32,
    large: 48,
    xlarge: 64
  };

  const dimension = sizes[size] || sizes.medium;

  if (style === 'helmet') {
    return (
      <div
        style={{
          width: dimension,
          height: dimension,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: `${dimension * 0.35}px`,
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          border: '2px solid rgba(255,255,255,0.2)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      >
        {teamAbbr?.toUpperCase() || '?'}
      </div>
    );
  }

  if (style === 'shield') {
    return (
      <div
        style={{
          width: dimension,
          height: dimension * 1.2,
          background: colors.primary,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: `${dimension * 0.3}px`,
          fontWeight: 'bold',
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          border: `2px solid ${colors.secondary}`,
          position: 'relative'
        }}
      >
        {teamAbbr?.toUpperCase() || '?'}
      </div>
    );
  }

  // Colored chip; reused as the logo fallback (free agents, unknowns, or
  // CDN load errors) and by `style="badge"`.
  const renderBadge = () => (
    <div
      style={{
        width: dimension,
        height: dimension,
        borderRadius: '8px',
        background: colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: `${dimension * 0.35}px`,
        fontWeight: 'bold',
        textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
        border: `2px solid ${colors.secondary}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      {teamAbbr?.toUpperCase() || '?'}
    </div>
  );

  if (style === 'logo') {
    const eligible = !imgError && teamAbbr && NFL_TEAMS.has(teamAbbr.toUpperCase());
    if (eligible) {
      return (
        <div
          style={{
            width: dimension,
            height: dimension,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <img
            src={teamLogoUrl(teamAbbr)}
            alt={teamAbbr}
            title={teamAbbr}
            loading="lazy"
            onError={() => setImgError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      );
    }
    return renderBadge();
  }

  if (style === 'badge') {
    return renderBadge();
  }

  // Default: simple circle
  return (
    <div
      style={{
        width: dimension,
        height: dimension,
        borderRadius: '50%',
        backgroundColor: colors.primary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: `${dimension * 0.4}px`,
        fontWeight: 'bold'
      }}
    >
      {teamAbbr?.toUpperCase() || '?'}
    </div>
  );
};

const PlayerAvatar = ({ playerName, position, size = 'medium' }) => {
  const sizes = {
    small: 24,
    medium: 32,
    large: 48,
    xlarge: 64
  };

  const dimension = sizes[size] || sizes.medium;

  // Position colors (generic, not team-specific)
  const positionColors = {
    'QB': '#DC2626',
    'RB': '#16A34A',
    'WR': '#2563EB',
    'TE': '#CA8A04',
    'K': '#EA580C',
    'DST': '#374151',
    'DEF': '#374151'
  };

  const color = positionColors[position] || '#6B7280';
  const initials = playerName ? playerName.split(' ').map(n => n[0]).join('').slice(0, 2) : '?';

  return (
    <div
      style={{
        width: dimension,
        height: dimension,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: `${dimension * 0.35}px`,
        fontWeight: 'bold',
        textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
        border: '2px solid rgba(255,255,255,0.2)'
      }}
    >
      {initials}
    </div>
  );
};

// Generic football icons using SVG (completely original)
const FootballIcon = ({ size = 24, color = '#8B4513' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <ellipse cx="12" cy="12" rx="6" ry="10" fill={color} stroke="#654321" strokeWidth="1"/>
    <path d="M12 6v12" stroke="#ffffff" strokeWidth="1"/>
    <path d="M9 9h6" stroke="#ffffff" strokeWidth="0.5"/>
    <path d="M9 12h6" stroke="#ffffff" strokeWidth="0.5"/>
    <path d="M9 15h6" stroke="#ffffff" strokeWidth="0.5"/>
  </svg>
);

const HelmetIcon = ({ size = 24, color = '#374151' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 3C8.5 3 6 6 6 10c0 2 0.5 4 1 5.5L8 18h8l1-2.5c0.5-1.5 1-3.5 1-5.5 0-4-2.5-7-6-7z" fill={color}/>
    <path d="M9 12h6v2H9z" fill="#ffffff" opacity="0.3"/>
    <circle cx="12" cy="9" r="1" fill="#ffffff" opacity="0.5"/>
  </svg>
);

export { TeamVisual, PlayerAvatar, FootballIcon, HelmetIcon };
export default TeamVisual;
