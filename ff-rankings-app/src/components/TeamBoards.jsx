import React, { useState, useMemo } from 'react';
import { Users, Grid, List } from 'lucide-react';
import { PlayerAvatar, FootballIcon } from './TeamVisual';

const TeamBoards = ({ teams, currentTeam, positionColors, themeStyles, teamNames, players, draftedPlayers, draftStyle, numTeams, currentDraftPick }) => {
  const [viewMode, setViewMode] = useState('teams'); // 'teams' or 'grid'

  // Calculate which team drafted each pick
  const getCurrentTeam = (pickNumber) => {
    const round = Math.floor((pickNumber - 1) / numTeams);
    const position = (pickNumber - 1) % numTeams;

    if (draftStyle === 'snake') {
      return round % 2 === 0 ? position + 1 : numTeams - position;
    }
    return position + 1;
  };

  // Generate grid data for draft board
  const gridData = useMemo(() => {
    const rounds = [];
    const totalRounds = Math.ceil(players.length / numTeams);

    for (let round = 1; round <= totalRounds; round++) {
      const roundPicks = [];

      for (let teamIndex = 1; teamIndex <= numTeams; teamIndex++) {
        let pickNumber;

        if (draftStyle === 'snake') {
          // Snake draft logic
          if (round % 2 === 1) {
            // Odd rounds: 1, 2, 3, ... numTeams
            pickNumber = (round - 1) * numTeams + teamIndex;
          } else {
            // Even rounds: numTeams, numTeams-1, ..., 1
            pickNumber = (round - 1) * numTeams + (numTeams - teamIndex + 1);
          }
        } else {
          // Linear draft
          pickNumber = (round - 1) * numTeams + teamIndex;
        }

        // Get the team that makes this pick
        const draftingTeamId = getCurrentTeam(pickNumber);
        const draftingTeamName = teamNames[draftingTeamId] || `Team ${draftingTeamId}`;

        // Get the player drafted at this pick
        let draftedPlayer = null;
        if (pickNumber <= draftedPlayers.length) {
          const playerId = draftedPlayers[pickNumber - 1];
          draftedPlayer = players.find(p => p.id === playerId);
        }

        // Determine if this is the current pick
        const isCurrentPick = pickNumber === currentDraftPick;
        const isPastPick = pickNumber < currentDraftPick;

        roundPicks.push({
          pickNumber,
          roundPosition: draftStyle === 'snake' && round % 2 === 0 ?
            (numTeams - teamIndex + 1) : teamIndex,
          draftingTeamId,
          draftingTeamName,
          draftedPlayer,
          isCurrentPick,
          isPastPick
        });
      }

      rounds.push({
        roundNumber: round,
        picks: roundPicks
      });
    }

    return rounds;
  }, [players, draftedPlayers, numTeams, draftStyle, currentDraftPick, teamNames]);

  const getTeamStats = (team) => {
    const filledSlots = team.roster.filter(slot => slot.player).length;
    const totalSlots = team.roster.length;
    const positionCounts = {};

    team.roster.forEach(slot => {
      if (slot.player) {
        positionCounts[slot.player.position] = (positionCounts[slot.player.position] || 0) + 1;
      }
    });

    return { filledSlots, totalSlots, positionCounts };
  };

  const styles = {
    card: {
      ...themeStyles.card,
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '32px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: themeStyles.text.primary,
      margin: 0
    },
    viewToggle: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: themeStyles.hover.background,
      borderRadius: '8px',
      padding: '4px',
      border: `1px solid ${themeStyles.border}`
    },
    toggleButton: {
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
      backgroundColor: 'transparent',
      color: themeStyles.text.secondary
    },
    toggleButtonActive: {
      backgroundColor: '#2563eb',
      color: '#ffffff'
    },
    // Teams view styles
    teamsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px'
    },
    teamCard: {
      backgroundColor: themeStyles.card.backgroundColor,
      borderRadius: '8px',
      boxShadow: themeStyles.card.boxShadow,
      border: themeStyles.card.border,
      padding: '16px',
      transition: 'all 0.2s'
    },
    currentTeamCard: {
      border: '2px solid #2563eb',
      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
    },
    teamHeader: {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '12px',
      color: themeStyles.text.primary,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    currentTeamHeader: {
      color: '#2563eb',
      backgroundColor: '#eff6ff',
      padding: '8px 12px',
      borderRadius: '6px',
      textAlign: 'center'
    },
    rosterGrid: {
      display: 'grid',
      gap: '2px'
    },
    rosterSlot: {
      padding: '8px 10px',
      margin: '1px 0',
      borderRadius: '4px',
      fontSize: '12px',
      border: '1px solid transparent',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.2s'
    },
    rosterSlotFilled: {
      color: '#ffffff',
      fontWeight: '500'
    },
    rosterSlotEmpty: {
      backgroundColor: themeStyles.rosterSlot.empty.backgroundColor,
      color: themeStyles.rosterSlot.empty.color,
      border: themeStyles.rosterSlot.empty.border
    },
    slotPosition: {
      fontSize: '10px',
      fontWeight: '700',
      minWidth: '40px',
      textAlign: 'left'
    },
    slotPlayer: {
      fontSize: '11px',
      textAlign: 'right',
      flex: 1,
      marginLeft: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '6px'
    },
    playerInSlot: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px'
    },
    teamStats: {
      marginTop: '12px',
      padding: '8px',
      backgroundColor: themeStyles.hover.background,
      borderRadius: '4px',
      fontSize: '11px',
      color: themeStyles.text.secondary
    },
    statRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '2px'
    },
    // Grid view styles
    gridContainer: {
      overflowX: 'auto',
      overflowY: 'auto',
      maxHeight: '70vh'
    },
    gridTable: {
      width: '100%',
      borderCollapse: 'collapse',
      minWidth: `${numTeams * 120 + 80}px` // Ensure minimum width
    },
    gridHeaderRow: {
      backgroundColor: themeStyles.hover.background,
      borderBottom: `2px solid ${themeStyles.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 10
    },
    gridHeaderCell: {
      padding: '12px 8px',
      fontSize: '12px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      textAlign: 'center',
      border: `1px solid ${themeStyles.border}`,
      minWidth: '100px'
    },
    gridRoundHeader: {
      backgroundColor: themeStyles.card.backgroundColor,
      minWidth: '60px',
      position: 'sticky',
      left: 0,
      zIndex: 11
    },
    gridRow: {
      borderBottom: `1px solid ${themeStyles.border}`
    },
    gridCell: {
      padding: '8px',
      fontSize: '11px',
      border: `1px solid ${themeStyles.border}`,
      textAlign: 'center',
      minWidth: '100px',
      maxWidth: '120px',
      height: '60px',
      verticalAlign: 'middle',
      position: 'relative'
    },
    gridRoundCell: {
      backgroundColor: themeStyles.hover.background,
      fontWeight: '600',
      color: themeStyles.text.primary,
      position: 'sticky',
      left: 0,
      zIndex: 5,
      minWidth: '60px'
    },
    currentPickCell: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      fontWeight: '600',
      border: '2px solid #1d4ed8'
    },
    draftedPickCell: {
      backgroundColor: themeStyles.card.backgroundColor
    },
    futurePickCell: {
      backgroundColor: themeStyles.hover.background,
      opacity: 0.7
    },
    pickNumber: {
      fontSize: '10px',
      color: themeStyles.text.muted,
      position: 'absolute',
      top: '2px',
      left: '4px'
    },
    currentPickNumber: {
      color: 'rgba(255, 255, 255, 0.8)'
    },
    playerName: {
      fontWeight: '500',
      marginBottom: '2px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    playerPosition: {
      fontSize: '9px',
      padding: '1px 4px',
      borderRadius: '3px',
      color: '#ffffff',
      fontWeight: '600',
      display: 'inline-block',
      marginBottom: '2px'
    },
    playerTeam: {
      fontSize: '9px',
      color: themeStyles.text.muted
    },
    emptyPickText: {
      color: themeStyles.text.muted,
      fontSize: '10px',
      fontStyle: 'italic'
    },
    teamNameGrid: {
      fontSize: '9px',
      color: themeStyles.text.muted,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  };

  // Render teams view (existing functionality)
  const renderTeamsView = () => (
    <div style={styles.teamsGrid}>
      {teams.map(team => {
        const teamName = teamNames && teamNames[team.id] ? teamNames[team.id] : team.name;
        const isCurrentTeam = team.id === currentTeam;
        const stats = getTeamStats(team);

        return (
          <div
            key={team.id}
            style={{
              ...styles.teamCard,
              ...(isCurrentTeam ? styles.currentTeamCard : {})
            }}
          >
            <div style={{
              ...styles.teamHeader,
              ...(isCurrentTeam ? styles.currentTeamHeader : {})
            }}>
              <span>{teamName}</span>
              {isCurrentTeam && <span>📍</span>}
            </div>

            <div style={styles.rosterGrid}>
              {team.roster.map((slot, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.rosterSlot,
                    ...(slot.player ? {
                      ...styles.rosterSlotFilled,
                      backgroundColor: positionColors[slot.position] || '#6b7280'
                    } : styles.rosterSlotEmpty)
                  }}
                >
                  <span style={styles.slotPosition}>
                    {slot.position}
                  </span>

                  <div style={styles.slotPlayer}>
                    {slot.player ? (
                      <div style={styles.playerInSlot}>
                        <PlayerAvatar
                          playerName={slot.player.name}
                          position={slot.player.position}
                          size="small"
                        />
                        <span style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '120px'
                        }}>
                          {slot.player.name}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FootballIcon size={16} color={themeStyles.text.muted} />
                        <span>Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Team Statistics */}
            <div style={styles.teamStats}>
              <div style={styles.statRow}>
                <span>Roster:</span>
                <span>{stats.filledSlots}/{stats.totalSlots}</span>
              </div>
              {Object.entries(stats.positionCounts).map(([pos, count]) => (
                <div key={pos} style={styles.statRow}>
                  <span>{pos}:</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render grid view (draft board style)
  const renderGridView = () => (
    <div style={styles.gridContainer}>
      <table style={styles.gridTable}>
        {/* Header Row */}
        <thead>
          <tr style={styles.gridHeaderRow}>
            <th style={{ ...styles.gridHeaderCell, ...styles.gridRoundHeader }}>
              Round
            </th>
            {Array.from({ length: numTeams }, (_, i) => i + 1).map(teamIndex => {
              const teamId = teamIndex;
              const teamName = teamNames[teamId] || `Team ${teamId}`;
              const isCurrentTeamCol = teamId === currentTeam;

              return (
                <th
                  key={teamIndex}
                  style={{
                    ...styles.gridHeaderCell,
                    ...(isCurrentTeamCol ? { backgroundColor: '#eff6ff', color: '#2563eb' } : {})
                  }}
                >
                  <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                    {teamName}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.7 }}>
                    {isCurrentTeamCol && '📍'}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Draft Picks */}
        <tbody>
          {gridData.map(round => (
            <tr key={round.roundNumber} style={styles.gridRow}>
              {/* Round Number */}
              <td style={{ ...styles.gridCell, ...styles.gridRoundCell }}>
                R{round.roundNumber}
              </td>

              {/* Picks in this round */}
              {round.picks.map(pick => {
                let cellStyle = { ...styles.gridCell };

                if (pick.isCurrentPick) {
                  cellStyle = { ...cellStyle, ...styles.currentPickCell };
                } else if (pick.isPastPick) {
                  cellStyle = { ...cellStyle, ...styles.draftedPickCell };
                } else {
                  cellStyle = { ...cellStyle, ...styles.futurePickCell };
                }

                return (
                  <td key={pick.pickNumber} style={cellStyle}>
                    {/* Pick Number */}
                    <div style={pick.isCurrentPick ?
                      { ...styles.pickNumber, ...styles.currentPickNumber } :
                      styles.pickNumber
                    }>
                      #{pick.pickNumber}
                    </div>

                    {/* Player Content */}
                    {pick.draftedPlayer ? (
                      <div>
                        <div style={styles.playerName}>
                          {pick.draftedPlayer.name}
                        </div>
                        <div style={{
                          ...styles.playerPosition,
                          backgroundColor: positionColors[pick.draftedPlayer.position] || '#6b7280'
                        }}>
                          {pick.draftedPlayer.position}
                        </div>
                        <div style={styles.playerTeam}>
                          {pick.draftedPlayer.team}
                        </div>
                      </div>
                    ) : pick.isCurrentPick ? (
                      <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '11px' }}>
                        <div style={{ fontWeight: '600' }}>ON CLOCK</div>
                        <div style={styles.teamNameGrid}>
                          {pick.draftingTeamName}
                        </div>
                      </div>
                    ) : (
                      <div style={styles.emptyPickText}>
                        <div style={styles.teamNameGrid}>
                          {pick.draftingTeamName}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={styles.card}>
      {/* Header with view toggle */}
      <div style={styles.header}>
        <h2 style={styles.title}>
          <Users size={24} />
          {viewMode === 'teams' ? 'Team Rosters' : 'Draft Board'}
        </h2>

        <div style={styles.viewToggle}>
          <button
            onClick={() => setViewMode('teams')}
            style={{
              ...styles.toggleButton,
              ...(viewMode === 'teams' ? styles.toggleButtonActive : {})
            }}
          >
            <List size={14} />
            Teams
          </button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              ...styles.toggleButton,
              ...(viewMode === 'grid' ? styles.toggleButtonActive : {})
            }}
          >
            <Grid size={14} />
            Grid
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'teams' ? renderTeamsView() : renderGridView()}
    </div>
  );
};

export default TeamBoards;
