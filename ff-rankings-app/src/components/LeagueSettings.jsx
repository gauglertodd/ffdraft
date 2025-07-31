import React, { useState } from 'react';
import { Settings } from 'lucide-react';

const LeagueSettings = ({
  numTeams,
  setNumTeams,
  rosterSettings,
  setRosterSettings,
  positionColors,
  setPositionColors,
  themeStyles,
  isEmbedded = false // New prop to determine if this is embedded in UnifiedSettingsPanel
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const cardStyles = {
    card: isEmbedded ? {} : {
      ...themeStyles.card,
      borderRadius: '8px',
      marginBottom: '32px'
    },
    header: isEmbedded ? {} : {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      cursor: 'pointer',
      borderBottom: isExpanded ? `1px solid ${themeStyles.border}` : 'none'
    },
    title: isEmbedded ? {} : {
      fontSize: '18px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: themeStyles.text.primary
    },
    expandButton: isEmbedded ? {} : {
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: themeStyles.button.secondary.backgroundColor,
      color: themeStyles.button.secondary.color,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    content: isEmbedded ? {} : {
      padding: isExpanded ? '24px' : '0',
      maxHeight: isExpanded ? '500px' : '0',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }
  };

  const styles = {
    ...cardStyles,
    settingsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '16px'
    },
    settingsItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    settingsLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: themeStyles.text.secondary
    },
    select: {
      ...themeStyles.input,
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none'
    },
    colorInputContainer: {
      display: 'flex',
      gap: '4px',
      alignItems: 'center'
    },
    colorPicker: {
      width: '24px',
      height: '24px',
      border: 'none',
      borderRadius: '3px',
      cursor: 'pointer'
    }
  };

  const ComponentContent = () => (
    <div style={styles.settingsGrid}>
      <div style={styles.settingsItem}>
        <label style={styles.settingsLabel}>Teams</label>
        <select
          value={numTeams}
          onChange={(e) => setNumTeams(parseInt(e.target.value))}
          style={styles.select}
        >
          {[8, 10, 12, 14, 16].map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>

      {Object.entries(rosterSettings).map(([position, count]) => (
        <div key={position} style={styles.settingsItem}>
          <label style={styles.settingsLabel}>{position}</label>
          <div style={styles.colorInputContainer}>
            <select
              value={count}
              onChange={(e) => setRosterSettings({
                ...rosterSettings,
                [position]: parseInt(e.target.value)
              })}
              style={{ ...styles.select, flex: '1' }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
            <input
              type="color"
              value={positionColors[position]}
              onChange={(e) => setPositionColors({
                ...positionColors,
                [position]: e.target.value
              })}
              style={styles.colorPicker}
              title={`${position} color`}
            />
          </div>
        </div>
      ))}
    </div>
  );

  if (isEmbedded) {
    return <ComponentContent />;
  }

  return (
    <div style={styles.card}>
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={styles.title}>
          <Settings size={20} />
          League Settings
        </div>
        <button style={styles.expandButton}>
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div style={styles.content}>
        <ComponentContent />
      </div>
    </div>
  );
};

export default LeagueSettings;
