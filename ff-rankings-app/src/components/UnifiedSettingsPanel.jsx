import React, { useState } from 'react';
import { Settings, Bot, BarChart3, ChevronUp, ChevronDown } from 'lucide-react';
import AutoDraftSettings from './AutoDraftSettings';
import LeagueSettings from './LeagueSettings';
import DraftStats from './DraftStats';

const UnifiedSettingsPanel = ({
  // Auto-draft props
  numTeams,
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

  // League settings props
  setNumTeams,
  rosterSettings,
  setRosterSettings,
  positionColors,
  setPositionColors,

  // Draft stats props
  draftStats,
  draftedPlayers,
  players,

  // Theme
  themeStyles
}) => {
  const [activeTab, setActiveTab] = useState('league');
  const [isExpanded, setIsExpanded] = useState(false);

  const tabs = [
    {
      id: 'league',
      label: 'League Settings',
      icon: Settings,
      description: 'Roster Settings'
    },
    {
      id: 'auto-draft',
      label: 'Auto-Draft & Team Settings',
      icon: Bot,
      description: 'Autodraft Behavior'
    },
    {
      id: 'progress',
      label: 'Draft Progress',
      icon: BarChart3,
      description: 'Positional Breakdown'
    }
  ];

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
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    headerTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    headerControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
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
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    tabsContainer: {
      display: 'flex',
      backgroundColor: themeStyles.card.backgroundColor,
      borderBottom: `1px solid ${themeStyles.border}`,
      height: isExpanded ? 'auto' : '0',
      minHeight: isExpanded ? '90px' : '0',
      maxHeight: isExpanded ? '120px' : '0',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    },
    tab: {
      flex: 1,
      padding: '16px 12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      borderBottom: '3px solid transparent',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      minHeight: '85px'
    },
    tabActive: {
      backgroundColor: themeStyles.hover.background,
      borderBottomColor: '#2563eb'
    },
    tabIcon: {
      transition: 'color 0.2s'
    },
    tabLabel: {
      fontSize: '13px',
      fontWeight: '600',
      textAlign: 'center',
      transition: 'color 0.2s',
      lineHeight: '1.3',
      whiteSpace: 'nowrap'
    },
    tabDescription: {
      fontSize: '11px',
      color: themeStyles.text.muted,
      textAlign: 'center',
      lineHeight: '1.3',
      maxWidth: '120px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    content: {
      maxHeight: isExpanded ? '1200px' : '0',
      overflow: isExpanded ? 'visible' : 'hidden',
      transition: 'max-height 0.3s ease',
      backgroundColor: themeStyles.card.backgroundColor
    },
    contentInner: {
      padding: isExpanded ? '24px' : '0 24px'
    },
    statusBar: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      fontSize: '12px',
      color: themeStyles.text.muted
    },
    statusItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    statusDot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: '#16a34a'
    }
  };

  const getTabColor = (tabId) => {
    const isActive = activeTab === tabId;
    if (isActive) return '#2563eb';
    return themeStyles.text.secondary;
  };

  const getStatusInfo = () => {
    const autoTeamsCount = Object.values(autoDraftSettings).filter(s => s && s !== 'manual').length;
    const draftProgress = players.length > 0 ? Math.round((draftedPlayers.length / players.length) * 100) : 0;

    return {
      autoTeamsCount,
      draftProgress,
      totalPlayers: players.length,
      draftedCount: draftedPlayers.length
    };
  };

  const statusInfo = getStatusInfo();

  const renderContent = () => {
    switch (activeTab) {
      case 'league':
        return (
          <LeagueSettings
            numTeams={numTeams}
            setNumTeams={setNumTeams}
            rosterSettings={rosterSettings}
            setRosterSettings={setRosterSettings}
            positionColors={positionColors}
            setPositionColors={setPositionColors}
            themeStyles={themeStyles}
            isEmbedded={true}
          />
        );
      case 'auto-draft':
        return (
          <AutoDraftSettings
            numTeams={numTeams}
            autoDraftSettings={autoDraftSettings}
            setAutoDraftSettings={setAutoDraftSettings}
            isAutoDrafting={isAutoDrafting}
            setIsAutoDrafting={setIsAutoDrafting}
            themeStyles={themeStyles}
            isDraftRunning={isDraftRunning}
            startDraftSequence={startDraftSequence}
            draftSpeed={draftSpeed}
            setDraftSpeed={setDraftSpeed}
            draftStyle={draftStyle}
            setDraftStyle={setDraftStyle}
            teamNames={teamNames}
            setTeamNames={setTeamNames}
            teamVariability={teamVariability}
            setTeamVariability={setTeamVariability}
            isEmbedded={true}
          />
        );
      case 'progress':
        return (
          <DraftStats
            draftStats={draftStats}
            draftedPlayers={draftedPlayers}
            players={players}
            themeStyles={themeStyles}
            isEmbedded={true}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div
        style={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={styles.headerTitle}>
          <Settings size={20} />
          Configuration
        </div>

        <div style={styles.headerControls}>
          {/* Quick Status Overview */}
          <div style={styles.statusBar}>
            <div style={styles.statusItem}>
              <div style={styles.statusDot} />
              {statusInfo.autoTeamsCount}/{numTeams} Auto Teams
            </div>
            <div style={styles.statusItem}>
              {statusInfo.draftProgress}% Complete
            </div>
            <div style={styles.statusItem}>
              {draftStyle === 'snake' ? 'Snake' : 'Linear'} Draft
            </div>
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
                ':hover': !isActive ? { backgroundColor: themeStyles.hover.background } : {}
              }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(tab.id);
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.target.style.backgroundColor = themeStyles.hover.background;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.backgroundColor = '';
                }
              }}
            >
              <IconComponent
                size={20}
                color={getTabColor(tab.id)}
                style={styles.tabIcon}
              />
              <div
                style={{
                  ...styles.tabLabel,
                  color: getTabColor(tab.id)
                }}
              >
                {tab.label}
              </div>
              <div style={styles.tabDescription}>
                {tab.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.contentInner}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default UnifiedSettingsPanel;
