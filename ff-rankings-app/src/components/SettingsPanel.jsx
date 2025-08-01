// Fixed SettingsPanel.jsx - resolve CSS property conflicts

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Settings, Bot, BarChart3, Play, Pause, ChevronUp, ChevronDown } from 'lucide-react';

const SettingsPanel = ({
  // League settings
  numTeams,
  setNumTeams,
  rosterSettings,
  setRosterSettings,
  positionColors,
  setPositionColors,

  // Auto-draft settings
  autoDraftSettings,
  setAutoDraftSettings,
  isAutoDrafting,
  setIsAutoDrafting,
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

  // Draft stats
  draftStats,
  draftedPlayers,
  players,

  themeStyles
}) => {
  const [activeTab, setActiveTab] = useState('league');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const inputRefs = useRef({});

  // Auto-draft strategies
  const strategies = [
    { value: 'manual', label: 'Manual', description: 'User drafts manually' },
    { value: 'bpa', label: 'Best Player Available', description: 'Always draft highest ranked player' },
    { value: 'positional', label: 'Positional Need', description: 'Draft based on roster needs' },
    { value: 'tier', label: 'Tier-Based', description: 'Draft best player in highest tier' },
    { value: 'balanced', label: 'Balanced', description: 'Mix of BPA and positional need' },
    { value: 'wr_heavy', label: 'WR Heavy', description: 'Prioritize WR early and often' },
    { value: 'rb_heavy', label: 'RB Heavy', description: 'Load up on RBs early' },
    { value: 'hero_rb', label: 'Hero RB', description: 'Take elite RB early, then focus on WR/TE' },
    { value: 'hero_wr', label: 'Hero WR', description: 'Take elite WR early, then focus on RB/TE' },
    { value: 'zero_rb', label: 'Zero RB', description: 'Wait on RB while focusing on WR/TE early' },
    { value: 'late_qb', label: 'Late QB', description: 'Wait on QB until later rounds' },
    { value: 'early_qb', label: 'Early QB', description: 'Secure elite QB early' },
    { value: 'aggressive', label: 'Aggressive', description: 'Target high-upside players early' },
    { value: 'conservative', label: 'Conservative', description: 'Prioritize safe, consistent players' }
  ];

  const tabs = [
    { id: 'league', label: 'League', icon: Settings, description: 'Teams & Roster' },
    { id: 'auto-draft', label: 'Auto-Draft', icon: Bot, description: 'Team Strategies' },
    { id: 'progress', label: 'Progress', icon: BarChart3, description: 'Draft Stats' }
  ];

  // Initialize input refs for team names
  useEffect(() => {
    for (let i = 1; i <= numTeams; i++) {
      if (!inputRefs.current[i]) {
        inputRefs.current[i] = React.createRef();
      }
    }
  }, [numTeams]);

  // Auto-draft helper functions
  const getStrategyStats = () => {
    const autoTeams = Object.values(autoDraftSettings).filter(s => s && s !== 'manual').length;
    return { autoTeams, manualTeams: numTeams - autoTeams };
  };

  const handleTeamNameChange = useCallback((teamId, newName) => {
    setTeamNames(prev => ({ ...prev, [teamId]: newName }));
  }, [setTeamNames]);

  const handleTeamNameBlur = useCallback((teamId) => {
    const input = inputRefs.current[teamId]?.current;
    if (input) {
      const cleanName = input.value.trim() || `Team ${teamId}`;
      input.value = cleanName;
      handleTeamNameChange(teamId, cleanName);
    }
  }, [handleTeamNameChange]);

  const setAllTeamsStrategy = useCallback((strategy) => {
    const newSettings = {};
    for (let i = 1; i <= numTeams; i++) {
      newSettings[i] = strategy;
    }
    setAutoDraftSettings(newSettings);
  }, [numTeams, setAutoDraftSettings]);

  const randomizeAllStrategies = useCallback(() => {
    const availableStrategies = strategies.filter(s => s.value !== 'manual').map(s => s.value);
    const newSettings = {};
    for (let i = 1; i <= numTeams; i++) {
      newSettings[i] = availableStrategies[Math.floor(Math.random() * availableStrategies.length)];
    }
    setAutoDraftSettings(newSettings);
  }, [numTeams, setAutoDraftSettings]);

  const styles = {
    container: {
      ...themeStyles.card,
      borderRadius: '8px',
      marginBottom: '24px',
      overflow: 'hidden'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      backgroundColor: themeStyles.hover.background,
      borderBottom: `1px solid ${themeStyles.border}`,
      cursor: 'pointer'
    },
    headerTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    statusBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      fontSize: '12px',
      color: themeStyles.text.muted
    },
    expandButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: '500',
      backgroundColor: themeStyles.button.secondary.backgroundColor,
      color: themeStyles.button.secondary.color,
      border: 'none',
      cursor: 'pointer'
    },
    tabsContainer: {
      display: 'flex',
      backgroundColor: themeStyles.card.backgroundColor,
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: themeStyles.border,
      height: isExpanded ? 'auto' : '0',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    },
    tab: {
      flex: 1,
      padding: '16px 12px',
      cursor: 'pointer',
      borderBottomWidth: '3px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'transparent',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      minHeight: '85px'
    },
    tabActive: {
      backgroundColor: themeStyles.hover.background,
      borderBottomColor: '#2563eb'
    },
    content: {
      maxHeight: isExpanded ? '1200px' : '0',
      overflow: isExpanded ? 'visible' : 'hidden',
      transition: 'max-height 0.3s ease',
      padding: isExpanded ? '24px' : '0'
    },
    // Common form styles
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px'
    },
    label: {
      fontSize: '12px',
      fontWeight: '500',
      color: themeStyles.text.secondary
    },
    input: {
      ...themeStyles.input,
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none'
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
    }
  };

  const { autoTeams, manualTeams } = getStrategyStats();
  const draftProgress = players.length > 0 ? Math.round((draftedPlayers.length / players.length) * 100) : 0;

  // League Settings Content
  const renderLeagueSettings = () => (
    <div style={styles.grid}>
      <div style={styles.formGroup}>
        <label style={styles.label}>Teams</label>
        <select
          value={numTeams}
          onChange={(e) => setNumTeams(parseInt(e.target.value))}
          style={styles.input}
        >
          {[8, 10, 12, 14, 16].map(num => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
      </div>

      {Object.entries(rosterSettings).map(([position, count]) => (
        <div key={position} style={styles.formGroup}>
          <label style={styles.label}>{position}</label>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <select
              value={count}
              onChange={(e) => setRosterSettings({
                ...rosterSettings,
                [position]: parseInt(e.target.value)
              })}
              style={{ ...styles.input, flex: '1' }}
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
              style={{
                width: '24px',
                height: '24px',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  // Auto-Draft Settings Content
  const renderAutoDraftSettings = () => (
    <div>
      {/* Main Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: themeStyles.hover.background,
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: themeStyles.text.primary }}>{autoTeams}</div>
            <div style={{ fontSize: '11px', color: themeStyles.text.secondary }}>Auto Teams</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: themeStyles.text.primary }}>{manualTeams}</div>
            <div style={{ fontSize: '11px', color: themeStyles.text.secondary }}>Manual Teams</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '700',
              color: isAutoDrafting ? '#16a34a' : themeStyles.text.muted
            }}>
              {isAutoDrafting ? 'ON' : 'OFF'}
            </div>
            <div style={{ fontSize: '11px', color: themeStyles.text.secondary }}>Auto-Draft</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => {
              if (autoTeams === 0) {
                alert('Configure at least one team for auto-draft before starting.');
                return;
              }
              setIsAutoDrafting(true);
              startDraftSequence();
            }}
            disabled={isDraftRunning || autoTeams === 0}
            style={{
              ...styles.button,
              backgroundColor: '#16a34a',
              color: '#ffffff',
              opacity: (isDraftRunning || autoTeams === 0) ? 0.5 : 1
            }}
          >
            <Play size={16} />
            Start Auto-Draft
          </button>

          <button
            onClick={() => setIsAutoDrafting(false)}
            disabled={!isDraftRunning}
            style={{
              ...styles.button,
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              opacity: !isDraftRunning ? 0.5 : 1
            }}
          >
            <Pause size={16} />
            Pause Auto-Draft
          </button>
        </div>
      </div>

      {/* Global Settings */}
      <div style={styles.grid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Draft Speed</label>
          <select value={draftSpeed} onChange={(e) => setDraftSpeed(e.target.value)} style={styles.input}>
            <option value="instant">Instant</option>
            <option value="fast">Fast (0.2s)</option>
            <option value="normal">Normal (0.8s)</option>
            <option value="slow">Slow (2s)</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Draft Style</label>
          <select value={draftStyle} onChange={(e) => setDraftStyle(e.target.value)} style={styles.input}>
            <option value="snake">Snake Draft</option>
            <option value="linear">Linear Draft</option>
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Set All Teams</label>
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
            style={styles.input}
          >
            <option value="">Select Strategy...</option>
            {strategies.map(strategy => (
              <option key={strategy.value} value={strategy.value}>{strategy.label}</option>
            ))}
            <option value="randomize">🎲 Randomize All</option>
          </select>
        </div>
      </div>

      {/* Team Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {Array.from({ length: numTeams }, (_, i) => {
          const teamId = i + 1;
          const strategy = autoDraftSettings[teamId] || 'manual';
          const variability = (teamVariability[teamId] || 0.3) * 100;
          const selectedStrategy = strategies.find(s => s.value === strategy);

          if (!inputRefs.current[teamId]) {
            inputRefs.current[teamId] = React.createRef();
          }

          return (
            <div key={teamId} style={{
              backgroundColor: themeStyles.hover.background,
              border: `1px solid ${themeStyles.border}`,
              borderRadius: '8px',
              padding: '16px'
            }}>
              <input
                ref={inputRefs.current[teamId]}
                type="text"
                defaultValue={teamNames[teamId] || `Team ${teamId}`}
                onBlur={() => handleTeamNameBlur(teamId)}
                style={{
                  ...styles.input,
                  marginBottom: '8px',
                  fontWeight: '500'
                }}
              />

              <select
                value={strategy}
                onChange={(e) => setAutoDraftSettings(prev => ({
                  ...prev,
                  [teamId]: e.target.value
                }))}
                style={{ ...styles.input, marginBottom: '8px' }}
              >
                {strategies.map(strat => (
                  <option key={strat.value} value={strat.value}>{strat.label}</option>
                ))}
              </select>

              <div style={{
                fontSize: '11px',
                color: themeStyles.text.muted,
                marginBottom: '8px',
                minHeight: '16px'
              }}>
                {selectedStrategy ? selectedStrategy.description : ''}
              </div>

              {showAdvancedSettings && strategy !== 'manual' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: themeStyles.text.muted }}>Variability:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={variability}
                    onChange={(e) => setTeamVariability(prev => ({
                      ...prev,
                      [teamId]: parseInt(e.target.value) / 100
                    }))}
                    style={{ flex: 1, height: '4px' }}
                  />
                  <span style={{
                    fontSize: '11px',
                    color: themeStyles.text.muted,
                    minWidth: '30px',
                    textAlign: 'right'
                  }}>
                    {Math.round(variability)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        style={{
          ...styles.button,
          backgroundColor: themeStyles.button.secondary.backgroundColor,
          color: themeStyles.button.secondary.color,
          marginBottom: '16px'
        }}
      >
        <Settings size={14} />
        {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
      </button>
    </div>
  );

  // Draft Progress Content
  const renderDraftProgress = () => (
    <div>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '16px',
        color: themeStyles.text.primary
      }}>
        Draft Progress by Position
      </h3>

      {Object.entries(draftStats).map(([position, stats]) => (
        <div key={position} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '48px',
            fontSize: '14px',
            fontWeight: '500',
            color: themeStyles.text.primary
          }}>
            {position}
          </div>
          <div style={{
            flex: '1',
            backgroundColor: themeStyles.progressBar.backgroundColor,
            borderRadius: '9999px',
            height: '24px',
            position: 'relative'
          }}>
            <div style={{
              backgroundColor: '#2563eb',
              height: '24px',
              borderRadius: '9999px',
              width: `${stats.total > 0 ? (stats.drafted / stats.total) * 100 : 0}%`,
              transition: 'width 0.3s'
            }} />
            <div style={{
              position: 'absolute',
              inset: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {stats.drafted} / {stats.total}
            </div>
          </div>
          <div style={{
            width: '64px',
            fontSize: '14px',
            color: themeStyles.text.secondary
          }}>
            {stats.total > 0 ? Math.round((stats.drafted / stats.total) * 100) : 0}%
          </div>
        </div>
      ))}

      <div style={{
        marginTop: '16px',
        fontSize: '14px',
        color: themeStyles.text.secondary
      }}>
        Total Drafted: {draftedPlayers.length} / {players.length}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'league':
        return renderLeagueSettings();
      case 'auto-draft':
        return renderAutoDraftSettings();
      case 'progress':
        return renderDraftProgress();
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div style={styles.headerTitle}>
          <Settings size={20} />
          Configuration
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={styles.statusBar}>
            <span>{autoTeams}/{numTeams} Auto Teams</span>
            <span>{draftProgress}% Complete</span>
            <span>{draftStyle === 'snake' ? 'Snake' : 'Linear'} Draft</span>
          </div>

          <button style={styles.expandButton}>
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                Configure
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <div
              key={tab.id}
              style={{
                ...styles.tab,
                ...(isActive ? styles.tabActive : {}),
                color: isActive ? '#2563eb' : themeStyles.text.secondary
              }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(tab.id);
              }}
            >
              <IconComponent size={20} />
              <div style={{ fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                {tab.label}
              </div>
              <div style={{ fontSize: '11px', color: themeStyles.text.muted, textAlign: 'center' }}>
                {tab.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {renderContent()}
      </div>
    </div>
  );
};

export default SettingsPanel;
