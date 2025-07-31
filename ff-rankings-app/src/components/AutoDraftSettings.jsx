import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Bot, Play, Pause, Settings } from 'lucide-react';

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
  setTeamVariability,
  isEmbedded = false
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const inputRefs = useRef({});

  const strategies = [
    { value: 'manual', label: 'Manual', description: 'User drafts manually' },
    { value: 'bpa', label: 'Best Player Available', description: 'Always draft highest ranked player' },
    { value: 'positional', label: 'Positional Need', description: 'Draft based on roster needs' },
    { value: 'tier', label: 'Tier-Based', description: 'Draft best player in highest tier' },
    { value: 'balanced', label: 'Balanced', description: 'Mix of BPA and positional need' },
    { value: 'aggressive', label: 'Aggressive', description: 'Target high-upside players early' },
    { value: 'conservative', label: 'Conservative', description: 'Prioritize safe, consistent players' }
  ];

  // Initialize input refs
  useEffect(() => {
    for (let i = 1; i <= numTeams; i++) {
      if (!inputRefs.current[i]) {
        inputRefs.current[i] = React.createRef();
      }
    }
  }, [numTeams]);

  // Set initial values for inputs when they're created
  useEffect(() => {
    Object.keys(inputRefs.current).forEach(teamId => {
      const input = inputRefs.current[teamId]?.current;
      if (input && !input.value) {
        input.value = teamNames[teamId] || `Team ${teamId}`;
      }
    });
  }, [numTeams, teamNames]);

  const getStrategyStats = () => {
    const autoTeams = Object.values(autoDraftSettings).filter(s => s && s !== 'manual').length;
    const manualTeams = numTeams - autoTeams;
    return { autoTeams, manualTeams };
  };

  const { autoTeams, manualTeams } = getStrategyStats();

  // Handle team name changes using uncontrolled inputs
  const handleTeamNameChange = useCallback((teamId, newName) => {
    setTeamNames(prev => ({
      ...prev,
      [teamId]: newName
    }));
  }, [setTeamNames]);

  const handleTeamNameBlur = useCallback((teamId) => {
    const input = inputRefs.current[teamId]?.current;
    if (input) {
      const cleanName = input.value.trim() || `Team ${teamId}`;
      input.value = cleanName;
      handleTeamNameChange(teamId, cleanName);
    }
  }, [handleTeamNameChange]);

  const handleStrategyChange = useCallback((teamId, strategy) => {
    setAutoDraftSettings(prev => ({
      ...prev,
      [teamId]: strategy
    }));
  }, [setAutoDraftSettings]);

  const handleVariabilityChange = useCallback((teamId, variability) => {
    setTeamVariability(prev => ({
      ...prev,
      [teamId]: variability / 100
    }));
  }, [setTeamVariability]);

  const setAllTeamsStrategy = useCallback((strategy) => {
    const newSettings = {};
    for (let i = 1; i <= numTeams; i++) {
      newSettings[i] = strategy;
    }
    setAutoDraftSettings(newSettings);
  }, [numTeams, setAutoDraftSettings]);

  const setAllTeamsVariability = useCallback((variability) => {
    const newVariability = {};
    for (let i = 1; i <= numTeams; i++) {
      newVariability[i] = variability / 100;
    }
    setTeamVariability(newVariability);
  }, [numTeams, setTeamVariability]);

  const randomizeAllStrategies = useCallback(() => {
    const availableStrategies = strategies.filter(s => s.value !== 'manual').map(s => s.value);
    const newSettings = {};
    for (let i = 1; i <= numTeams; i++) {
      const randomStrategy = availableStrategies[Math.floor(Math.random() * availableStrategies.length)];
      newSettings[i] = randomStrategy;
    }
    setAutoDraftSettings(newSettings);
  }, [numTeams, setAutoDraftSettings, strategies]);

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
      borderBottom: `1px solid ${themeStyles.border}`
    },
    title: isEmbedded ? {} : {
      fontSize: '18px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: themeStyles.text.primary
    },
    content: isEmbedded ? {} : {
      padding: '24px'
    }
  };

  const styles = {
    ...cardStyles,
    mainControls: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: themeStyles.hover.background,
      borderRadius: '8px',
      border: `1px solid ${themeStyles.border}`
    },
    statusSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    statusItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px'
    },
    statusNumber: {
      fontSize: '20px',
      fontWeight: '700',
      color: themeStyles.text.primary
    },
    statusLabel: {
      fontSize: '11px',
      color: themeStyles.text.secondary,
      textAlign: 'center'
    },
    controlSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '10px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s'
    },
    buttonPrimary: {
      backgroundColor: '#2563eb',
      color: '#ffffff'
    },
    buttonSuccess: {
      backgroundColor: '#16a34a',
      color: '#ffffff'
    },
    buttonDanger: {
      backgroundColor: '#dc2626',
      color: '#ffffff'
    },
    buttonSecondary: {
      ...themeStyles.button.secondary
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    settingsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '12px',
      marginBottom: '24px'
    },
    settingItem: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    },
    settingLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: themeStyles.text.secondary
    },
    select: {
      ...themeStyles.input,
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      outline: 'none'
    },
    teamGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    teamCard: {
      backgroundColor: themeStyles.hover.background,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '8px',
      padding: '16px'
    },
    teamHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    teamName: {
      fontSize: '14px',
      fontWeight: '600',
      color: themeStyles.text.primary
    },
    teamNameInput: {
      ...themeStyles.input,
      padding: '6px 10px',
      borderRadius: '4px',
      fontSize: '13px',
      outline: 'none',
      width: '120px',
      fontWeight: '500'
    },
    strategySelect: {
      ...themeStyles.input,
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      outline: 'none',
      marginBottom: '8px'
    },
    variabilitySection: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '8px'
    },
    variabilitySlider: {
      flex: 1,
      height: '4px',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer'
    },
    variabilityLabel: {
      fontSize: '11px',
      color: themeStyles.text.muted,
      minWidth: '25px',
      textAlign: 'center'
    },
    advancedToggle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s',
      backgroundColor: themeStyles.button.secondary.backgroundColor,
      color: themeStyles.button.secondary.color,
      marginBottom: '16px'
    },
    helpText: {
      fontSize: '12px',
      color: themeStyles.text.muted,
      fontStyle: 'italic',
      marginTop: '8px',
      padding: '8px 12px',
      backgroundColor: themeStyles.card.backgroundColor,
      borderRadius: '6px',
      border: `1px solid ${themeStyles.border}`
    }
  };

  const ComponentWrapper = ({ children }) => {
    if (isEmbedded) {
      return <div>{children}</div>;
    }
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.title}>
            <Bot size={20} />
            Auto-Draft Settings
          </div>
        </div>
        <div style={styles.content}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <ComponentWrapper>
      {/* Main Controls */}
      <div style={styles.mainControls}>
        <div style={styles.statusSection}>
          <div style={styles.statusItem}>
            <div style={styles.statusNumber}>{autoTeams}</div>
            <div style={styles.statusLabel}>Auto Teams</div>
          </div>
          <div style={styles.statusItem}>
            <div style={styles.statusNumber}>{manualTeams}</div>
            <div style={styles.statusLabel}>Manual Teams</div>
          </div>
          <div style={styles.statusItem}>
            <div style={{
              ...styles.statusNumber,
              color: isAutoDrafting ? '#16a34a' : themeStyles.text.muted
            }}>
              {isAutoDrafting ? 'ON' : 'OFF'}
            </div>
            <div style={styles.statusLabel}>Auto-Draft</div>
          </div>
        </div>

        <div style={styles.controlSection}>
          <button
            onClick={() => setIsAutoDrafting(!isAutoDrafting)}
            style={{
              ...styles.button,
              ...(isAutoDrafting ? styles.buttonSuccess : styles.buttonSecondary)
            }}
          >
            {isAutoDrafting ? (
              <>
                <Pause size={16} />
                Disable Auto-Draft
              </>
            ) : (
              <>
                <Play size={16} />
                Enable Auto-Draft
              </>
            )}
          </button>

          {isAutoDrafting && autoTeams > 0 && (
            <button
              onClick={startDraftSequence}
              disabled={isDraftRunning}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                ...(isDraftRunning ? styles.buttonDisabled : {})
              }}
            >
              {isDraftRunning ? 'Drafting...' : 'Start Sequence'}
            </button>
          )}
        </div>
      </div>

      {/* Global Settings */}
      <div style={styles.settingsGrid}>
        <div style={styles.settingItem}>
          <label style={styles.settingLabel}>Draft Speed</label>
          <select
            value={draftSpeed}
            onChange={(e) => setDraftSpeed(e.target.value)}
            style={styles.select}
          >
            <option value="instant">Instant</option>
            <option value="fast">Fast (0.2s)</option>
            <option value="normal">Normal (0.8s)</option>
            <option value="slow">Slow (2s)</option>
          </select>
        </div>

        <div style={styles.settingItem}>
          <label style={styles.settingLabel}>Draft Style</label>
          <select
            value={draftStyle}
            onChange={(e) => setDraftStyle(e.target.value)}
            style={styles.select}
          >
            <option value="snake">Snake Draft</option>
            <option value="linear">Linear Draft</option>
          </select>
        </div>

        <div style={styles.settingItem}>
          <label style={styles.settingLabel}>Set All Teams</label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                if (e.target.value === 'randomize') {
                  randomizeAllStrategies();
                } else {
                  setAllTeamsStrategy(e.target.value);
                }
                e.target.value = '';
              }
            }}
            style={styles.select}
          >
            <option value="">Select Strategy...</option>
            {strategies.map(strategy => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label}
              </option>
            ))}
            <option value="randomize">🎲 Randomize All</option>
          </select>
        </div>

        {showAdvancedSettings && (
          <div style={styles.settingItem}>
            <label style={styles.settingLabel}>Set All Variability</label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  setAllTeamsVariability(parseInt(e.target.value));
                  e.target.value = '';
                }
              }}
              style={styles.select}
            >
              <option value="">Select %...</option>
              <option value="0">0% (Predictable)</option>
              <option value="10">10%</option>
              <option value="20">20%</option>
              <option value="30">30% (Default)</option>
              <option value="40">40%</option>
              <option value="50">50%</option>
              <option value="60">60%</option>
              <option value="70">70%</option>
              <option value="80">80%</option>
              <option value="90">90%</option>
              <option value="100">100% (Chaotic)</option>
            </select>
          </div>
        )}
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        style={styles.advancedToggle}
      >
        <Settings size={14} />
        {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
      </button>

      {/* Team-Specific Settings */}
      <div style={styles.teamGrid}>
        {Array.from({ length: numTeams }, (_, i) => {
          const teamId = i + 1;
          const strategy = autoDraftSettings[teamId] || 'manual';
          const variability = (teamVariability[teamId] || 0.3) * 100;

          // Ensure we have a ref for this team
          if (!inputRefs.current[teamId]) {
            inputRefs.current[teamId] = React.createRef();
          }

          return (
            <div key={teamId} style={styles.teamCard}>
              <div style={styles.teamHeader}>
                <input
                  ref={inputRefs.current[teamId]}
                  type="text"
                  defaultValue={teamNames[teamId] || `Team ${teamId}`}
                  onBlur={() => handleTeamNameBlur(teamId)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                  style={styles.teamNameInput}
                  placeholder={`Team ${teamId}`}
                />
              </div>

              <select
                value={strategy}
                onChange={(e) => handleStrategyChange(teamId, e.target.value)}
                style={styles.strategySelect}
              >
                {strategies.map(strat => (
                  <option key={strat.value} value={strat.value}>
                    {strat.label}
                  </option>
                ))}
              </select>

              {showAdvancedSettings && strategy !== 'manual' && (
                <div style={styles.variabilitySection}>
                  <span style={{ fontSize: '11px', color: themeStyles.text.muted }}>
                    Variability:
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={variability}
                    onChange={(e) => handleVariabilityChange(teamId, parseInt(e.target.value))}
                    style={styles.variabilitySlider}
                  />
                  <span style={styles.variabilityLabel}>
                    {Math.round(variability)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <div style={styles.helpText}>
        💡 <strong>Auto-Draft Tips:</strong> Enable auto-draft and set strategies for each team.
        Use "Start Sequence" to draft multiple picks automatically until reaching a manual team.
        Higher variability makes AI decisions less predictable.
      </div>
    </ComponentWrapper>
  );
};

export default AutoDraftSettings;
