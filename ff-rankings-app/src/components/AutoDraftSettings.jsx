import React, { useState } from 'react';
import { Bot, Settings, Play, Pause, RotateCcw, Shuffle } from 'lucide-react';

const AutoDraftSettings = ({
  numTeams,
  autoDraftSettings,
  setAutoDraftSettings,
  isAutoDrafting,
  setIsAutoDrafting,
  themeStyles,
  isDraftRunning,
  startDraftSequence,
  draftSpeed,
  setDraftSpeed,
  draftStyle,
  setDraftStyle,
  teamNames,
  setTeamNames,
  teamVariability,
  setTeamVariability
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const strategies = {
    'manual': 'Manual Draft',
    'bpa': 'Best Player Available',
    'tier': 'Best Tier Available',
    'positional': 'Positional Strategy',
    'zero_rb': 'Zero RB Strategy',
    'robust_rb': 'Robust RB Strategy',
    'balanced': 'Balanced (Value + Need)'
  };

  const handleStrategyChange = (teamId, strategy) => {
    setAutoDraftSettings(prev => ({
      ...prev,
      [teamId]: strategy
    }));
  };

  const setAllTeamsStrategy = (strategy) => {
    const newSettings = {};
    for (let i = 1; i <= numTeams; i++) {
      newSettings[i] = strategy;
    }
    setAutoDraftSettings(newSettings);
  };

  const setAllTeamsVariability = (variability) => {
    const newVariability = {};
    for (let i = 1; i <= numTeams; i++) {
      // Only set variability for teams that have non-manual strategies
      const teamStrategy = autoDraftSettings[i];
      if (teamStrategy && teamStrategy !== 'manual') {
        newVariability[i] = variability;
      } else {
        // Keep existing variability for manual teams
        newVariability[i] = teamVariability[i] || 0.3;
      }
    }
    setTeamVariability(newVariability);
  };

  const getVariabilityLabel = (value) => {
    if (value <= 0.2) return 'Very Low';
    if (value <= 0.4) return 'Low';
    if (value <= 0.6) return 'Medium';
    if (value <= 0.8) return 'High';
    return 'Very High';
  };

  const randomizeStrategies = () => {
    const strategyKeys = Object.keys(strategies).filter(key => key !== 'manual');
    const newSettings = {};

    for (let i = 1; i <= numTeams; i++) {
      // Randomly select a strategy (excluding manual)
      const randomStrategy = strategyKeys[Math.floor(Math.random() * strategyKeys.length)];
      newSettings[i] = randomStrategy;
    }

    setAutoDraftSettings(newSettings);
  };

  const styles = {
    card: {
      ...themeStyles.card,
      borderRadius: '8px',
      marginBottom: '32px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      cursor: 'pointer',
      borderBottom: isExpanded ? `1px solid ${themeStyles.border}` : 'none'
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    expandButton: {
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
    content: {
      padding: isExpanded ? '24px' : '0',
      maxHeight: isExpanded ? '800px' : '0',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    },
    controlsRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px',
      flexWrap: 'wrap'
    },
    toggleButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s'
    },
    controlGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    label: {
      fontSize: '12px',
      fontWeight: '500',
      color: themeStyles.text.secondary,
      whiteSpace: 'nowrap'
    },
    select: {
      backgroundColor: themeStyles.input.backgroundColor,
      borderWidth: themeStyles.input.borderWidth,
      borderStyle: themeStyles.input.borderStyle,
      borderColor: themeStyles.input.borderColor,
      color: themeStyles.input.color,
      padding: '6px 8px',
      fontSize: '12px',
      borderRadius: '4px',
      minWidth: '120px'
    },
    teamsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginTop: '16px'
    },
    teamCard: {
      padding: '12px',
      borderRadius: '6px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: themeStyles.border,
      backgroundColor: themeStyles.hover.background,
      // Ensure the card contains its children properly
      overflow: 'hidden',
      boxSizing: 'border-box'
    },
    teamHeader: {
      fontSize: '14px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '8px',
      // Ensure header contains the input properly
      width: '100%',
      boxSizing: 'border-box'
    },
    teamNameInput: {
      backgroundColor: themeStyles.input.backgroundColor,
      borderWidth: themeStyles.input.borderWidth,
      borderStyle: themeStyles.input.borderStyle,
      borderColor: themeStyles.input.borderColor,
      color: themeStyles.input.color,
      padding: '6px 8px',
      fontSize: '12px',
      borderRadius: '4px',
      width: '100%', // Full width of container
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: '8px',
      boxSizing: 'border-box', // Include padding/border in width
      minWidth: 0, // Allow shrinking
      maxWidth: '100%' // Don't exceed container
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={styles.title}>
          <Bot size={20} />
          Auto-Draft Settings
        </div>
        <button style={styles.expandButton}>
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.controlsRow}>
          <button
            onClick={() => setIsAutoDrafting(!isAutoDrafting)}
            style={{
              ...styles.toggleButton,
              backgroundColor: isAutoDrafting ? '#dc2626' : '#16a34a',
              color: '#ffffff'
            }}
          >
            {isAutoDrafting ? <Pause size={16} /> : <Play size={16} />}
            {isAutoDrafting ? 'Pause Auto-Draft' : 'Start Auto-Draft'}
          </button>

          <button
            onClick={() => setAllTeamsStrategy('manual')}
            style={{
              ...styles.toggleButton,
              backgroundColor: themeStyles.button.secondary.backgroundColor,
              color: themeStyles.button.secondary.color
            }}
          >
            <RotateCcw size={16} />
            Reset All to Manual
          </button>

          <button
            onClick={randomizeStrategies}
            style={{
              ...styles.toggleButton,
              backgroundColor: '#7c3aed',
              color: '#ffffff'
            }}
            title="Randomly assign draft strategies to all teams"
          >
            <Shuffle size={16} />
            Randomize Strategies
          </button>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Speed:</label>
            <select
              value={draftSpeed}
              onChange={(e) => setDraftSpeed(e.target.value)}
              style={styles.select}
            >
              <option value="instant">Instant</option>
              <option value="fast">Fast (200ms)</option>
              <option value="normal">Normal (800ms)</option>
              <option value="slow">Slow (2s)</option>
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Style:</label>
            <select
              value={draftStyle}
              onChange={(e) => setDraftStyle(e.target.value)}
              style={styles.select}
            >
              <option value="snake">Snake Draft</option>
              <option value="linear">Linear Draft</option>
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Set All:</label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setAllTeamsStrategy(e.target.value);
                  e.target.value = "";
                }
              }}
              style={styles.select}
            >
              <option value="">Choose...</option>
              {Object.entries(strategies).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Set All Variability:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue="0.3"
              onChange={(e) => setAllTeamsVariability(parseFloat(e.target.value))}
              style={{
                width: '100px',
                height: '4px',
                borderRadius: '2px',
                outline: 'none',
                cursor: 'pointer',
                background: `linear-gradient(90deg, #16a34a 0%, #eab308 50%, #dc2626 100%)`
              }}
              title="Set variability for all non-manual teams"
            />
            <span style={{ fontSize: '10px', color: themeStyles.text.muted, minWidth: '60px' }}>
              For auto teams
            </span>
          </div>
        </div>

        <div style={styles.teamsGrid}>
          {Array.from({ length: numTeams }, (_, i) => i + 1).map(teamId => {
            const currentStrategy = autoDraftSettings[teamId] || 'manual';
            const currentVariability = teamVariability[teamId] || 0.3;
            const teamName = teamNames[teamId] || `Team ${teamId}`;

            return (
              <div key={teamId} style={styles.teamCard}>
                <div style={styles.teamHeader}>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setTeamNames({ ...teamNames, [teamId]: newName });
                    }}
                    onBlur={(e) => {
                      // Only reset to default if the field is completely empty after losing focus
                      // and user isn't actively editing another field
                      if (!e.target.value.trim()) {
                        setTimeout(() => {
                          // Check if user has moved focus to another input
                          const activeElement = document.activeElement;
                          const isEditingAnotherTeamName = activeElement &&
                            activeElement.type === 'text' &&
                            activeElement !== e.target;

                          // Only reset if user isn't editing another team name
                          if (!isEditingAnotherTeamName) {
                            setTeamNames(prev => ({ ...prev, [teamId]: `Team ${teamId}` }));
                          }
                        }, 150);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.target.blur();
                      }
                      // Allow users to clear the field completely without immediate reset
                      if (e.key === 'Escape') {
                        e.target.value = `Team ${teamId}`;
                        e.target.blur();
                      }
                    }}
                    placeholder={`Team ${teamId}`}
                    style={styles.teamNameInput}
                  />
                </div>

                <select
                  value={currentStrategy}
                  onChange={(e) => handleStrategyChange(teamId, e.target.value)}
                  style={{ ...styles.select, marginBottom: '8px' }}
                >
                  {Object.entries(strategies).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>

                {/* Only show variability for non-manual teams */}
                {currentStrategy !== 'manual' && (
                  <>
                    <div style={{ marginBottom: '4px' }}>
                      <label style={{ ...styles.label, fontSize: '11px' }}>
                        Variability: {getVariabilityLabel(currentVariability)} ({Math.round(currentVariability * 100)}%)
                      </label>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={currentVariability}
                      onChange={(e) => {
                        const newVariability = { ...teamVariability };
                        newVariability[teamId] = parseFloat(e.target.value);
                        setTeamVariability(newVariability);
                      }}
                      style={{
                        width: '100%',
                        height: '4px',
                        borderRadius: '2px',
                        outline: 'none',
                        cursor: 'pointer',
                        background: `linear-gradient(90deg, #16a34a 0%, #eab308 50%, #dc2626 100%)`
                      }}
                    />
                  </>
                )}

                {/* Show message for manual teams */}
                {currentStrategy === 'manual' && (
                  <div style={{
                    fontSize: '11px',
                    color: themeStyles.text.muted,
                    fontStyle: 'italic',
                    textAlign: 'center',
                    padding: '8px 4px',
                    backgroundColor: themeStyles.hover.background,
                    borderRadius: '4px',
                    marginTop: '4px'
                  }}>
                    Manual draft - no variability
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AutoDraftSettings;
