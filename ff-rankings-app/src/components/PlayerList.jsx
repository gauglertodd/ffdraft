// Updated PlayerList.jsx with proper keeper and unified state support

import React from 'react';
import { UserPlus, Eye, Sun, Moon, EyeOff, TrendingUp, X } from 'lucide-react';
import { TeamVisual } from './TeamVisual';

const PlayerList = ({
  filteredPlayers,
  activeTab,
  setActiveTab,
  positions,
  draftedPlayers,
  draftPlayer,
  searchQuery,
  selectedPosition,
  setSelectedPosition,
  playersByPosition,
  positionColors,
  showDrafted,
  setShowDrafted,
  isDarkMode,
  toggleTheme,
  themeStyles,
  watchedPlayers,
  toggleWatchPlayer,
  isPlayerWatched,
  watchHighlightColor,
  setWatchHighlightColor,
  watchHighlightOpacity,
  setWatchHighlightOpacity,
  avoidedPlayers,
  toggleAvoidPlayer,
  isPlayerAvoided,
  avoidHighlightColor,
  setAvoidHighlightColor,
  avoidHighlightOpacity,
  setAvoidHighlightOpacity,
  getTierColor,
  showAvailabilityPrediction,
  setShowAvailabilityPrediction,
  predictionTrials,
  setPredictionTrials,
  onPredictAvailability,
  isPredicting,
  lastPredictionTime,
  availabilityPredictions,
  // NEW: Access to unified player state
  players
}) => {
  const [isCondensedMode, setIsCondensedMode] = React.useState(false);

  // Helper function to check if player is drafted/keeper using unified state
  const getPlayerStatus = (playerId) => {
    return players?.[playerId]?.status || 'available';
  };

  // Helper function to check if player is keeper
  const isPlayerKeeper = (playerId) => {
    return getPlayerStatus(playerId) === 'keeper';
  };

  // Helper function to check if player is drafted (includes keepers)
  const isPlayerDrafted = (playerId) => {
    const status = getPlayerStatus(playerId);
    return status === 'drafted' || status === 'keeper';
  };

  // Generate tabs based on actual positions found in the data
  const getMainPositionTabs = () => {
    const possiblePositions = ['QB', 'RB', 'WR', 'TE', 'DST', 'K'];
    const actualPositions = possiblePositions.filter(pos => positions.includes(pos));
    const hasFlexPositions = ['RB', 'WR', 'TE'].some(pos => positions.includes(pos));

    const tabs = ['overall', ...actualPositions];
    if (hasFlexPositions) {
      tabs.push('FLEX');
    }
    tabs.push('skill-positions');

    return tabs;
  };

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'overall': return 'Overall';
      case 'skill-positions': return 'QB/RB/WR/TE';
      case 'FLEX': return 'FLEX (RB/WR/TE)';
      default: return tab;
    }
  };

  const getPositionsForTab = (tab) => {
    switch (tab) {
      case 'skill-positions': return ['QB', 'RB', 'WR', 'TE'];
      case 'FLEX': return ['RB', 'WR', 'TE'];
      default: return [];
    }
  };

  // Availability prediction helper functions
  const getAvailabilityColor = (probability) => {
    if (probability >= 0.8) return '#16a34a';
    if (probability >= 0.6) return '#ca8a04';
    if (probability >= 0.4) return '#ea580c';
    return '#dc2626';
  };

  const getAvailabilityText = (probability) => {
    const percentage = Math.round(probability * 100);
    if (percentage >= 90) return `${percentage}% (Safe)`;
    if (percentage >= 70) return `${percentage}% (Likely)`;
    if (percentage >= 50) return `${percentage}% (Risky)`;
    return `${percentage}% (Danger)`;
  };

  const getAvailabilityTooltip = (probability, playerName) => {
    const percentage = Math.round(probability * 100);
    return `${percentage}% chance ${playerName} will still be available when it's your turn to pick`;
  };

  const getFilteredPlayersForPosition = (position) => {
    const posPlayers = playersByPosition[position] || [];
    return posPlayers.filter(player => {
      const matchesSearch = searchQuery === '' ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team.toLowerCase().includes(searchQuery.toLowerCase());

      // Use unified state to check if player is drafted/keeper
      const isDrafted = isPlayerDrafted(player.id);
      const matchesDrafted = showDrafted || !isDrafted;

      return matchesSearch && matchesDrafted;
    });
  };

  // For FLEX tab, get filtered players from multiple positions
  const getFilteredPlayersForFlex = () => {
    const flexPositions = ['RB', 'WR', 'TE'];
    let allFlexPlayers = [];

    flexPositions.forEach(position => {
      const posPlayers = playersByPosition[position] || [];
      const filteredPosPlayers = posPlayers.filter(player => {
        const matchesSearch = searchQuery === '' ||
          player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          player.team.toLowerCase().includes(searchQuery.toLowerCase());

        // Use unified state to check if player is drafted/keeper
        const isDrafted = isPlayerDrafted(player.id);
        const matchesDrafted = showDrafted || !isDrafted;

        return matchesSearch && matchesDrafted;
      });
      allFlexPlayers = [...allFlexPlayers, ...filteredPosPlayers];
    });

    return allFlexPlayers.sort((a, b) => a.rank - b.rank);
  };

  // Helper function to determine player row styling based on watch/avoid status
  const getPlayerRowStyle = (baseStyle, playerId, isWatched, isAvoided) => {
    let style = { ...baseStyle };
    const isDrafted = isPlayerDrafted(playerId);

    if (isDrafted) {
      style.opacity = '0.5';
    }

    if (isWatched && !isDrafted) {
      style.backgroundColor = `${watchHighlightColor}${Math.round((watchHighlightOpacity || 30) / 100 * 255).toString(16).padStart(2, '0')}`;
      style.borderLeft = `4px solid ${watchHighlightColor}`;
    } else if (isAvoided && !isDrafted) {
      style.backgroundColor = `${avoidHighlightColor}${Math.round((avoidHighlightOpacity || 30) / 100 * 255).toString(16).padStart(2, '0')}`;
      style.borderLeft = `4px solid ${avoidHighlightColor}`;
    }

    return style;
  };

  const styles = {
    card: {
      ...themeStyles.card,
      borderRadius: '8px',
      marginBottom: '32px'
    },
    tabContainer: {
      display: 'flex',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: themeStyles.border,
      marginBottom: '16px',
      overflowX: 'auto',
      flexWrap: 'nowrap'
    },
    tab: {
      padding: '8px 16px',
      cursor: 'pointer',
      borderBottomWidth: '2px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'transparent',
      fontSize: '14px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      flexShrink: 0
    },
    tabActive: {
      borderBottomColor: '#2563eb',
      color: '#2563eb'
    },
    tabInactive: {
      color: themeStyles.text.secondary
    },
    playersList: {
      maxHeight: '500px',
      overflowY: 'auto',
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '8px'
    },
    playerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      borderBottom: `1px solid ${themeStyles.border}`,
      transition: 'background-color 0.2s',
      position: 'relative'
    },
    playerRowCondensed: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      borderBottom: `1px solid ${themeStyles.border}`,
      transition: 'background-color 0.2s',
      position: 'relative'
    },
    tierIndicator: {
      position: 'absolute',
      left: '0',
      top: '0',
      bottom: '0',
      width: '4px',
      borderRadius: '0 2px 2px 0'
    },
    playerInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: '1'
    },
    playerVisualSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '60px'
    },
    rankBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      backgroundColor: '#f3f4f6',
      color: '#1f2937',
      fontSize: '14px',
      fontWeight: '500',
      borderRadius: '50%'
    },
    playerDetails: {
      flex: '1'
    },
    playerDetailsCondensed: {
      flex: '1',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    playerNameSection: {
      display: 'flex',
      flexDirection: 'column'
    },
    playerNameSectionCondensed: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flex: '1'
    },
    playerName: {
      fontWeight: '500',
      color: themeStyles.text.primary,
      marginBottom: '4px'
    },
    playerNameDrafted: {
      textDecoration: 'line-through',
      color: themeStyles.text.secondary
    },
    playerNameKeeper: {
      textDecoration: 'line-through',
      color: '#7c3aed',
      fontWeight: '600'
    },
    playerMeta: {
      fontSize: '14px',
      color: themeStyles.text.secondary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap'
    },
    playerMetaCondensed: {
      fontSize: '12px',
      color: themeStyles.text.secondary,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      flexWrap: 'wrap'
    },
    tierBadge: {
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600',
      color: '#ffffff'
    },
    keeperBadge: {
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '600',
      backgroundColor: '#7c3aed',
      color: '#ffffff',
      marginLeft: '8px'
    },
    availabilityBadge: {
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '10px',
      fontWeight: '600',
      color: '#ffffff',
      marginLeft: '8px',
      minWidth: '32px',
      textAlign: 'center'
    },
    actionButtons: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    watchButton: {
      padding: '6px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center'
    },
    avoidButton: {
      padding: '6px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center'
    },
    button: {
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
    buttonSuccess: {
      ...themeStyles.button.success
    },
    draftedLabel: {
      fontSize: '14px',
      color: themeStyles.text.secondary,
      fontWeight: '500'
    },
    keeperLabel: {
      fontSize: '14px',
      color: '#7c3aed',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    emptyState: {
      padding: '32px',
      textAlign: 'center',
      color: themeStyles.text.muted
    },
    toggleSwitch: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: themeStyles.text.secondary
    },
    switch: {
      position: 'relative',
      width: '44px',
      height: '24px',
      backgroundColor: isCondensedMode ? '#2563eb' : '#d1d5db',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    switchToggle: {
      position: 'absolute',
      top: '2px',
      left: isCondensedMode ? '22px' : '2px',
      width: '20px',
      height: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '50%',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
    }
  };

  // Render the multi-position grid view
  const renderPositionGridView = (tabPositions) => {
    const positionsToShow = tabPositions.filter(pos => positions.includes(pos));

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        padding: '16px'
      }}>
        {positionsToShow.map(position => {
          const positionPlayers = getFilteredPlayersForPosition(position);

          return (
            <div key={position} style={{
              ...themeStyles.positionColumn,
              borderRadius: '8px'
            }}>
              <div style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${themeStyles.border}`,
                fontWeight: '600',
                fontSize: '16px',
                color: '#ffffff',
                textAlign: 'center',
                backgroundColor: positionColors[position] || '#6b7280'
              }}>
                {position} ({positionPlayers.length})
              </div>
              <div style={{
                maxHeight: '600px',
                overflowY: 'auto'
              }}>
                {positionPlayers.map((player) => {
                  const isDrafted = isPlayerDrafted(player.id);
                  const isKeeper = isPlayerKeeper(player.id);
                  const isUndrafted = !isDrafted;
                  const isWatched = isPlayerWatched(player.id);
                  const isAvoided = isPlayerAvoided(player.id);

                  return (
                    <div
                      key={player.id}
                      style={getPlayerRowStyle(
                        isCondensedMode ? {
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 12px',
                          borderBottom: `1px solid ${themeStyles.border}`,
                          fontSize: '12px',
                          position: 'relative'
                        } : {
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderBottom: `1px solid ${themeStyles.border}`,
                          fontSize: '13px',
                          position: 'relative'
                        },
                        player.id,
                        isWatched,
                        isAvoided
                      )}
                      onClick={isCondensedMode && isUndrafted ? () => draftPlayer(player.id) : undefined}
                      title={isCondensedMode && isUndrafted ? `Draft ${player.name}` : undefined}
                    >
                      {/* Tier indicator */}
                      {player.tier && (
                        <div
                          style={{
                            position: 'absolute',
                            left: '0',
                            top: '0',
                            bottom: '0',
                            width: '3px',
                            backgroundColor: getTierColor(player.tier)
                          }}
                        />
                      )}

                      {/* Player info with visuals */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        flex: '1',
                        minWidth: '0',
                        gap: '6px',
                        paddingLeft: player.tier ? '8px' : '0'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: isCondensedMode ? '20px' : '24px',
                            height: isCondensedMode ? '20px' : '24px',
                            backgroundColor: '#f3f4f6',
                            color: '#1f2937',
                            fontSize: isCondensedMode ? '9px' : '11px',
                            fontWeight: '600',
                            borderRadius: '50%',
                            minWidth: isCondensedMode ? '20px' : '24px'
                          }}>
                            {player.positionRank || player.rank}
                          </span>
                        </div>

                        <div style={isCondensedMode ? {
                          flex: '1',
                          minWidth: '0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        } : {
                          flex: '1'
                        }}>
                          <div style={isCondensedMode ? {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flex: '1',
                            minWidth: '0',
                            overflow: 'hidden'
                          } : {
                            display: 'flex',
                            flexDirection: 'column'
                          }}>
                            <div style={{
                              fontWeight: '500',
                              color: themeStyles.text.primary,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: isCondensedMode ? '120px' : 'none',
                              fontSize: isCondensedMode ? '11px' : '13px',
                              marginBottom: isCondensedMode ? '0' : '2px',
                              ...(isDrafted ? (isKeeper ? styles.playerNameKeeper : styles.playerNameDrafted) : {})
                            }}>
                              {player.name}
                              {isWatched && <span style={{ marginLeft: '4px', fontSize: '10px' }}>👁️</span>}
                              {isAvoided && <span style={{ marginLeft: '4px', fontSize: '10px' }}>🚫</span>}
                              {isKeeper && <span style={{ marginLeft: '4px', fontSize: '10px' }}>👑</span>}
                            </div>

                            {!isCondensedMode && (
                              <div style={{
                                fontSize: '11px',
                                color: themeStyles.text.secondary,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '2px'
                              }}>
                                <TeamVisual
                                  teamAbbr={player.team}
                                  size="small"
                                  style="badge"
                                />
                                <span style={{ color: themeStyles.text.muted, fontSize: '10px' }}>
                                  #{player.rank} overall
                                </span>
                                {player.tier && (
                                  <span style={{
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    fontSize: '9px',
                                    fontWeight: '600',
                                    color: '#ffffff',
                                    backgroundColor: getTierColor(player.tier)
                                  }}>
                                    T{player.tier}
                                  </span>
                                )}
                                {showAvailabilityPrediction && availabilityPredictions[player.id] !== undefined && (
                                  <span
                                    style={{
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                      fontSize: '8px',
                                      fontWeight: '600',
                                      color: '#ffffff',
                                      minWidth: '24px',
                                      textAlign: 'center',
                                      backgroundColor: getAvailabilityColor(availabilityPredictions[player.id])
                                    }}
                                    title={getAvailabilityTooltip(availabilityPredictions[player.id], player.name)}
                                  >
                                    {Math.round(availabilityPredictions[player.id] * 100)}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {isCondensedMode && (
                            <div style={{
                              fontSize: '10px',
                              color: themeStyles.text.secondary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <TeamVisual
                                teamAbbr={player.team}
                                size="small"
                                style="badge"
                              />
                              <span style={{ fontSize: '9px', color: themeStyles.text.muted }}>
                                #{player.rank}
                              </span>
                              {player.tier && (
                                <span style={{
                                  padding: '3px 6px',
                                  borderRadius: '3px',
                                  fontSize: '8px',
                                  fontWeight: '600',
                                  color: '#ffffff',
                                  backgroundColor: getTierColor(player.tier),
                                  minWidth: 'fit-content'
                                }}>
                                  T{player.tier}
                                </span>
                              )}
                              {showAvailabilityPrediction && availabilityPredictions[player.id] !== undefined && (
                                <span
                                  style={{
                                    padding: '2px 4px',
                                    borderRadius: '3px',
                                    fontSize: '8px',
                                    fontWeight: '600',
                                    color: '#ffffff',
                                    backgroundColor: getAvailabilityColor(availabilityPredictions[player.id]),
                                    minWidth: 'fit-content'
                                  }}
                                  title={getAvailabilityTooltip(availabilityPredictions[player.id], player.name)}
                                >
                                  {Math.round(availabilityPredictions[player.id] * 100)}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons - only show in normal mode */}
                      {!isCondensedMode && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          minWidth: 'fit-content'
                        }}>
                          {isUndrafted && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWatchPlayer(player.id);
                                }}
                                style={{
                                  padding: '2px',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  backgroundColor: isWatched ? watchHighlightColor : 'transparent',
                                  color: isWatched ? '#ffffff' : themeStyles.text.muted,
                                  transition: 'all 0.2s'
                                }}
                                title={isWatched ? 'Remove from watch list' : 'Add to watch list'}
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAvoidPlayer(player.id);
                                }}
                                style={{
                                  padding: '2px',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  backgroundColor: isAvoided ? avoidHighlightColor : 'transparent',
                                  color: isAvoided ? '#ffffff' : themeStyles.text.muted,
                                  transition: 'all 0.2s'
                                }}
                                title={isAvoided ? 'Remove from avoid list' : 'Add to avoid list'}
                              >
                                <X size={12} />
                              </button>
                              <button
                                onClick={() => draftPlayer(player.id)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  borderRadius: '4px',
                                  backgroundColor: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: '500',
                                  minWidth: 'fit-content'
                                }}
                              >
                                Draft
                              </button>
                            </>
                          )}

                          {isDrafted && !isKeeper && (
                            <span style={{
                              fontSize: '11px',
                              color: themeStyles.text.secondary,
                              fontWeight: '500'
                            }}>
                              ✓
                            </span>
                          )}

                          {isKeeper && (
                            <span style={{
                              fontSize: '11px',
                              color: '#7c3aed',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}>
                              👑 KEEPER
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {positionPlayers.length === 0 && (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: themeStyles.text.muted,
                    fontSize: '12px'
                  }}>
                    No players found
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render the standard single-column view
  const renderStandardView = () => {
    // For FLEX tab, use special filtered players
    const playersToShow = activeTab === 'FLEX' ? getFilteredPlayersForFlex() : filteredPlayers;

    return (
      <div style={styles.playersList}>
        {playersToShow.map((player) => {
          const isDrafted = isPlayerDrafted(player.id);
          const isKeeper = isPlayerKeeper(player.id);
          const isUndrafted = !isDrafted;
          const isWatched = isPlayerWatched(player.id);
          const isAvoided = isPlayerAvoided(player.id);

          // For FLEX tab, show overall rank since we're mixing positions
          const displayRank = (activeTab === 'overall' || activeTab === 'FLEX') ? player.rank : (player.positionRank || player.rank);

          return (
            <div
              key={player.id}
              style={getPlayerRowStyle(
                isCondensedMode ? styles.playerRowCondensed : styles.playerRow,
                player.id,
                isWatched,
                isAvoided
              )}
            >
              {/* Tier indicator */}
              {player.tier && (
                <div
                  style={{
                    ...styles.tierIndicator,
                    backgroundColor: getTierColor(player.tier)
                  }}
                />
              )}

              {/* Player information with visuals */}
              <div style={styles.playerInfo}>
                <div style={styles.playerVisualSection}>
                  <div style={{ width: '48px', textAlign: 'center' }}>
                    <span style={styles.rankBadge}>
                      {displayRank}
                    </span>
                  </div>
                </div>

                <div style={isCondensedMode ? styles.playerDetailsCondensed : styles.playerDetails}>
                  <div style={isCondensedMode ? styles.playerNameSectionCondensed : styles.playerNameSection}>
                    <div style={{
                      ...styles.playerName,
                      ...(isDrafted ? (isKeeper ? styles.playerNameKeeper : styles.playerNameDrafted) : {}),
                      marginBottom: isCondensedMode ? '0' : '4px'
                    }}>
                      {player.name}
                      {isWatched && <span style={{ marginLeft: '8px', fontSize: '14px' }}>👁️</span>}
                      {isAvoided && <span style={{ marginLeft: '8px', fontSize: '14px' }}>🚫</span>}
                      {isKeeper && <span style={{ marginLeft: '8px', fontSize: '14px' }}>👑</span>}
                    </div>

                    {!isCondensedMode && (
                      <div style={styles.playerMeta}>
                        <span style={{
                          ...styles.tierBadge,
                          backgroundColor: positionColors[player.position] || '#6b7280',
                          marginRight: '8px'
                        }}>
                          {player.position}
                        </span>
                        <TeamVisual
                          teamAbbr={player.team}
                          size="small"
                          style="badge"
                        />
                        {(activeTab !== 'overall' && activeTab !== 'FLEX') && (
                          <span style={{ marginLeft: '8px', color: themeStyles.text.muted }}>
                            (#{player.rank} overall)
                          </span>
                        )}
                        {player.tier && (
                          <span style={{
                            ...styles.tierBadge,
                            backgroundColor: getTierColor(player.tier),
                            marginLeft: '8px'
                          }}>
                            Tier {player.tier}
                          </span>
                        )}
                        {isKeeper && (
                          <span style={styles.keeperBadge}>
                            👑 KEEPER
                          </span>
                        )}
                        {showAvailabilityPrediction && availabilityPredictions[player.id] !== undefined && (
                          <span
                            style={{
                              ...styles.availabilityBadge,
                              backgroundColor: getAvailabilityColor(availabilityPredictions[player.id])
                            }}
                            title={getAvailabilityTooltip(availabilityPredictions[player.id], player.name)}
                          >
                            {getAvailabilityText(availabilityPredictions[player.id])}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {isCondensedMode && (
                    <div style={styles.playerMetaCondensed}>
                      <span style={{
                        ...styles.tierBadge,
                        backgroundColor: positionColors[player.position] || '#6b7280',
                        fontSize: '10px',
                        padding: '4px 8px'
                      }}>
                        {player.position}
                      </span>
                      <TeamVisual
                        teamAbbr={player.team}
                        size="small"
                        style="badge"
                      />
                      {(activeTab !== 'overall' && activeTab !== 'FLEX') && (
                        <span style={{ fontSize: '10px', color: themeStyles.text.muted }}>
                          #{player.rank}
                        </span>
                      )}
                      {player.tier && (
                        <span style={{
                          ...styles.tierBadge,
                          backgroundColor: getTierColor(player.tier),
                          fontSize: '10px',
                          padding: '4px 8px'
                        }}>
                          T{player.tier}
                        </span>
                      )}
                      {isKeeper && (
                        <span style={{
                          ...styles.keeperBadge,
                          fontSize: '10px',
                          padding: '4px 8px'
                        }}>
                          👑
                        </span>
                      )}
                      {showAvailabilityPrediction && availabilityPredictions[player.id] !== undefined && (
                        <span
                          style={{
                            ...styles.availabilityBadge,
                            backgroundColor: getAvailabilityColor(availabilityPredictions[player.id]),
                            fontSize: '10px',
                            padding: '3px 6px'
                          }}
                          title={getAvailabilityTooltip(availabilityPredictions[player.id], player.name)}
                        >
                          {getAvailabilityText(availabilityPredictions[player.id])}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div style={styles.actionButtons}>
                {isUndrafted && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchPlayer(player.id);
                      }}
                      style={{
                        ...styles.watchButton,
                        backgroundColor: isWatched ? watchHighlightColor : themeStyles.button.secondary.backgroundColor,
                        color: isWatched ? '#ffffff' : themeStyles.text.secondary
                      }}
                      title={isWatched ? 'Remove from watch list' : 'Add to watch list'}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAvoidPlayer(player.id);
                      }}
                      style={{
                        ...styles.avoidButton,
                        backgroundColor: isAvoided ? avoidHighlightColor : themeStyles.button.secondary.backgroundColor,
                        color: isAvoided ? '#ffffff' : themeStyles.text.secondary
                      }}
                      title={isAvoided ? 'Remove from avoid list' : 'Add to avoid list'}
                    >
                      <X size={16} />
                    </button>
                    {isCondensedMode ? (
                      <span
                        onClick={() => draftPlayer(player.id)}
                        style={{
                          ...styles.tierBadge,
                          backgroundColor: '#16a34a',
                          fontSize: '10px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          userSelect: 'none'
                        }}
                        title="Draft player"
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#15803d';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#16a34a';
                        }}
                      >
                        ⚡
                      </span>
                    ) : (
                      <button
                        onClick={() => draftPlayer(player.id)}
                        style={{
                          ...styles.button,
                          ...styles.buttonSuccess
                        }}
                      >
                        <UserPlus size={16} />
                        Draft
                      </button>
                    )}
                  </>
                )}

                {isDrafted && !isKeeper && (
                  <span style={styles.draftedLabel}>DRAFTED</span>
                )}

                {isKeeper && (
                  <span style={styles.keeperLabel}>
                    👑 KEEPER
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const mainPositionTabs = getMainPositionTabs();

  return (
    <div style={styles.card}>
      {/* Header with tabs and controls */}
      <div style={{ padding: '24px', borderBottom: `1px solid ${themeStyles.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: themeStyles.text.primary,
            margin: '0'
          }}>
            Player Rankings
          </h2>

          {/* View Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Prediction Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowAvailabilityPrediction(!showAvailabilityPrediction)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: showAvailabilityPrediction ? '#7c3aed' : themeStyles.button.secondary.backgroundColor,
                  color: showAvailabilityPrediction ? '#ffffff' : themeStyles.button.secondary.color
                }}
                title="Show probability that players will be available on your next pick"
              >
                <TrendingUp size={14} />
                {showAvailabilityPrediction ? 'Hide' : 'Show'} Likelihood Player Will Be Available Next Pick
              </button>

              {showAvailabilityPrediction && (
                <>
                  <select
                    value={predictionTrials}
                    onChange={(e) => setPredictionTrials(parseInt(e.target.value))}
                    style={{
                      ...themeStyles.input,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      outline: 'none',
                      minWidth: '80px'
                    }}
                    title="Number of simulation trials for accuracy"
                  >
                    <option value={10}>10 trials</option>
                    <option value={100}>100 trials</option>
                    <option value={1000}>1000 trials</option>
                  </select>

                  <button
                    onClick={onPredictAvailability}
                    disabled={isPredicting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: isPredicting ? 'not-allowed' : 'pointer',
                      border: 'none',
                      transition: 'all 0.2s',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff',
                      opacity: isPredicting ? 0.5 : 1
                    }}
                    title="Calculate odds that players will still be available when it's your turn"
                  >
                    {isPredicting ? 'Calculating...' : 'Calculate Odds'}
                  </button>

                  {lastPredictionTime && (
                    <span style={{ fontSize: '10px', color: themeStyles.text.muted }}>
                      {Math.round((Date.now() - lastPredictionTime) / 1000)}s ago
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Divider */}
            <div style={{
              width: '1px',
              height: '20px',
              backgroundColor: themeStyles.border,
              margin: '0 4px'
            }} />

            {/* Watch & Avoid Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: themeStyles.text.secondary,
                whiteSpace: 'nowrap'
              }}>
                Watch:
              </span>
              <input
                type="color"
                value={watchHighlightColor}
                onChange={(e) => setWatchHighlightColor(e.target.value)}
                style={{
                  width: '20px',
                  height: '20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Watch highlight color"
              />
              <input
                type="range"
                min="10"
                max="80"
                step="10"
                value={watchHighlightOpacity || 30}
                onChange={(e) => setWatchHighlightOpacity(parseInt(e.target.value))}
                style={{
                  width: '60px',
                  height: '4px',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer',
                  background: `linear-gradient(90deg, ${watchHighlightColor}30 0%, ${watchHighlightColor}CC 100%)`
                }}
                title={`Watch opacity: ${watchHighlightOpacity || 30}%`}
              />
              <span style={{
                fontSize: '10px',
                color: themeStyles.text.muted,
                minWidth: '25px',
                textAlign: 'center'
              }}>
                {watchHighlightOpacity || 30}%
              </span>
            </div>

            {/* Avoid Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: themeStyles.text.secondary,
                whiteSpace: 'nowrap'
              }}>
                Avoid:
              </span>
              <input
                type="color"
                value={avoidHighlightColor}
                onChange={(e) => setAvoidHighlightColor(e.target.value)}
                style={{
                  width: '20px',
                  height: '20px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                title="Avoid highlight color"
              />
              <input
                type="range"
                min="10"
                max="80"
                step="10"
                value={avoidHighlightOpacity || 30}
                onChange={(e) => setAvoidHighlightOpacity(parseInt(e.target.value))}
                style={{
                  width: '60px',
                  height: '4px',
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer',
                  background: `linear-gradient(90deg, ${avoidHighlightColor}30 0%, ${avoidHighlightColor}CC 100%)`
                }}
                title={`Avoid opacity: ${avoidHighlightOpacity || 30}%`}
              />
              <span style={{
                fontSize: '10px',
                color: themeStyles.text.muted,
                minWidth: '25px',
                textAlign: 'center'
              }}>
                {avoidHighlightOpacity || 30}%
              </span>
            </div>

            {/* Divider */}
            <div style={{
              width: '1px',
              height: '20px',
              backgroundColor: themeStyles.border,
              margin: '0 4px'
            }} />

            {/* Theme Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: themeStyles.button.secondary.backgroundColor,
                  color: themeStyles.button.secondary.color
                }}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <>
                    <Sun size={14} />
                    Light
                  </>
                ) : (
                  <>
                    <Moon size={14} />
                    Dark
                  </>
                )}
              </button>

              {/* Show/Hide Drafted Toggle */}
              <button
                onClick={() => setShowDrafted(!showDrafted)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: themeStyles.button.secondary.backgroundColor,
                  color: themeStyles.button.secondary.color
                }}
                title={showDrafted ? 'Hide drafted players' : 'Show drafted players'}
              >
                {showDrafted ? (
                  <>
                    <EyeOff size={14} />
                    Hide Drafted
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    Show Drafted
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={styles.tabContainer}>
            {mainPositionTabs.map(tab => {
              const tabLabel = getTabLabel(tab);
              const isActive = activeTab === tab;

              return (
                <div
                  key={tab}
                  style={{
                    ...styles.tab,
                    ...(isActive ? styles.tabActive : styles.tabInactive)
                  }}
                  onClick={() => setActiveTab(tab)}
                >
                  {tabLabel}
                </div>
              );
            })}
          </div>

          {/* Condensed mode toggle */}
          <div style={styles.toggleSwitch}>
            <span>Condensed</span>
            <div
              style={styles.switch}
              onClick={() => setIsCondensedMode(!isCondensedMode)}
            >
              <div style={styles.switchToggle} />
            </div>
          </div>
        </div>
      </div>

      {/* Content based on active tab */}
      {(activeTab === 'skill-positions' || activeTab === 'FLEX') ?
        renderPositionGridView(getPositionsForTab(activeTab)) :
        renderStandardView()}

      {/* Empty state for search results */}
      {(activeTab !== 'skill-positions' && activeTab !== 'FLEX') && filteredPlayers.length === 0 && searchQuery && (
        <div style={styles.emptyState}>
          No players found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default PlayerList;
