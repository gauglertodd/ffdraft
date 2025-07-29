import React from 'react';
import { Users } from 'lucide-react';
import { PlayerAvatar, FootballIcon } from './TeamVisual';

const TeamBoards = ({ teams, currentTeam, positionColors, themeStyles, teamNames }) => {
  const styles = {
    card: {
      ...themeStyles.card,
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '32px'
    },
    teamsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
      marginBottom: '32px'
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
    }
  };

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

  return (
    <div style={styles.card}>
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: themeStyles.text.primary
      }}>
        <Users size={24} />
        Draft Boards
      </h2>

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
    </div>
  );
};

export default TeamBoards;
