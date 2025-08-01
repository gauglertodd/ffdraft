import React, { useState, useMemo } from 'react';
import { Crown, Plus, Trash2, Edit3, Save, X, Search } from 'lucide-react';

const KeeperModePanel = ({
  isKeeperMode,
  setIsKeeperMode,
  keepers,
  setKeepers,
  players,
  numTeams,
  teamNames,
  draftStyle,
  themeStyles,
  getCurrentTeam
}) => {
  const [showAddKeeper, setShowAddKeeper] = useState(false);
  const [editingKeeper, setEditingKeeper] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(1);
  const [selectedRound, setSelectedRound] = useState(1);

  // Filter available players for keeper selection
  const availablePlayersForKeepers = useMemo(() => {
    const keeperPlayerIds = keepers.map(k => k.playerId);
    return players.filter(p => !keeperPlayerIds.includes(p.id));
  }, [players, keepers]);

  // Search filtered players
  const searchFilteredPlayers = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const searchLower = searchQuery.toLowerCase();
    return availablePlayersForKeepers
      .filter(player =>
        player.name.toLowerCase().includes(searchLower) ||
        player.team.toLowerCase().includes(searchLower) ||
        player.position.toLowerCase().includes(searchLower)
      )
      .slice(0, 10)
      .sort((a, b) => a.rank - b.rank);
  }, [searchQuery, availablePlayersForKeepers]);

  // Get pick number for a given team and round
  const getPickNumber = (teamId, round) => {
    if (draftStyle === 'snake') {
      if (round % 2 === 1) {
        // Odd rounds: team position is direct
        return (round - 1) * numTeams + teamId;
      } else {
        // Even rounds: team position is reversed
        return (round - 1) * numTeams + (numTeams - teamId + 1);
      }
    } else {
      // Linear draft
      return (round - 1) * numTeams + teamId;
    }
  };

  // Get team that picks at a specific pick number
  const getTeamAtPick = (pickNumber) => {
    return getCurrentTeam(pickNumber);
  };

  // Add or update keeper
  const handleSaveKeeper = () => {
    if (!selectedPlayer) return;

    const pickNumber = getPickNumber(selectedTeam, selectedRound);

    const keeperData = {
      id: editingKeeper ? editingKeeper.id : Date.now(),
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      playerPosition: selectedPlayer.position,
      playerTeam: selectedPlayer.team,
      playerRank: selectedPlayer.rank,
      teamId: selectedTeam,
      teamName: teamNames[selectedTeam] || `Team ${selectedTeam}`,
      round: selectedRound,
      pickNumber: pickNumber
    };

    if (editingKeeper) {
      setKeepers(prev => prev.map(k => k.id === editingKeeper.id ? keeperData : k));
    } else {
      setKeepers(prev => [...prev, keeperData]);
    }

    // Reset form
    setShowAddKeeper(false);
    setEditingKeeper(null);
    setSelectedPlayer(null);
    setSearchQuery('');
    setSelectedTeam(1);
    setSelectedRound(1);
  };

  // Delete keeper
  const handleDeleteKeeper = (keeperId) => {
    setKeepers(prev => prev.filter(k => k.id !== keeperId));
  };

  // Start editing keeper
  const handleEditKeeper = (keeper) => {
    setEditingKeeper(keeper);
    setSelectedPlayer({
      id: keeper.playerId,
      name: keeper.playerName,
      position: keeper.playerPosition,
      team: keeper.playerTeam,
      rank: keeper.playerRank
    });
    setSelectedTeam(keeper.teamId);
    setSelectedRound(keeper.round);
    setShowAddKeeper(true);
  };

  // Cancel add/edit
  const handleCancel = () => {
    setShowAddKeeper(false);
    setEditingKeeper(null);
    setSelectedPlayer(null);
    setSearchQuery('');
    setSelectedTeam(1);
    setSelectedRound(1);
  };

  // Sort keepers by pick number
  const sortedKeepers = useMemo(() => {
    return [...keepers].sort((a, b) => a.pickNumber - b.pickNumber);
  }, [keepers]);

  const styles = {
    container: {
      ...themeStyles.card,
      borderRadius: '8px',
      marginBottom: '24px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 24px',
      borderBottom: `1px solid ${themeStyles.border}`
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: 0
    },
    toggleContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    toggle: {
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
      backgroundColor: isKeeperMode ? '#2563eb' : '#d1d5db',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    switchToggle: {
      position: 'absolute',
      top: '2px',
      left: isKeeperMode ? '22px' : '2px',
      width: '20px',
      height: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '50%',
      transition: 'left 0.2s',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
    },
    content: {
      padding: '24px'
    },
    keepersList: {
      marginBottom: '24px'
    },
    keeperItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      backgroundColor: themeStyles.hover.background,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '8px',
      marginBottom: '8px'
    },
    keeperInfo: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    keeperPlayer: {
      flex: 1
    },
    keeperPlayerName: {
      fontSize: '16px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '4px'
    },
    keeperPlayerMeta: {
      fontSize: '13px',
      color: themeStyles.text.secondary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    keeperDraft: {
      textAlign: 'center',
      minWidth: '120px'
    },
    keeperDraftText: {
      fontSize: '14px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '4px'
    },
    keeperDraftMeta: {
      fontSize: '12px',
      color: themeStyles.text.secondary
    },
    keeperActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    actionButton: {
      padding: '8px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center'
    },
    editButton: {
      backgroundColor: '#2563eb',
      color: '#ffffff'
    },
    deleteButton: {
      backgroundColor: '#dc2626',
      color: '#ffffff'
    },
    addButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 16px',
      backgroundColor: '#16a34a',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modalContent: {
      backgroundColor: themeStyles.card.backgroundColor,
      border: themeStyles.card.border,
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      overflow: 'hidden'
    },
    modalHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px'
    },
    modalTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
      color: themeStyles.text.secondary
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '8px'
    },
    input: {
      ...themeStyles.input,
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      fontSize: '14px'
    },
    select: {
      ...themeStyles.input,
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      fontSize: '14px'
    },
    playerSearch: {
      position: 'relative'
    },
    searchResults: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: themeStyles.card.backgroundColor,
      border: `1px solid ${themeStyles.border}`,
      borderTop: 'none',
      borderRadius: '0 0 6px 6px',
      maxHeight: '200px',
      overflowY: 'auto',
      zIndex: 10
    },
    searchResultItem: {
      padding: '12px',
      cursor: 'pointer',
      borderBottom: `1px solid ${themeStyles.border}`,
      transition: 'background-color 0.2s'
    },
    selectedPlayer: {
      padding: '12px',
      backgroundColor: themeStyles.hover.background,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    modalActions: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '24px'
    },
    button: {
      padding: '10px 16px',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    primaryButton: {
      backgroundColor: '#2563eb',
      color: '#ffffff'
    },
    secondaryButton: {
      backgroundColor: themeStyles.button.secondary.backgroundColor,
      color: themeStyles.button.secondary.color
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: themeStyles.text.muted
    },
    disabledState: {
      opacity: 0.5,
      pointerEvents: 'none'
    }
  };

  if (!isKeeperMode) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            <Crown size={20} />
            Keeper Mode
          </h3>
          <div style={styles.toggleContainer}>
          </div>
        </div>
        <div style={styles.content}>
          <p style={{ color: themeStyles.text.secondary, margin: 0 }}>
            Enable keeper mode to designate specific players to specific teams at specific rounds before the draft begins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          <Crown size={20} />
          Keeper Mode ({keepers.length} keepers)
        </h3>
        <div style={styles.toggleContainer}>
          <button
            style={styles.addButton}
            onClick={() => setShowAddKeeper(true)}
          >
            <Plus size={16} />
            Add Keeper
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {keepers.length === 0 ? (
          <div style={styles.emptyState}>
            <Crown size={48} color={themeStyles.text.muted} style={{ marginBottom: '16px' }} />
            <p>No keepers configured. Add keepers to designate specific players to teams at specific rounds.</p>
          </div>
        ) : (
          <div style={styles.keepersList}>
            {sortedKeepers.map(keeper => (
              <div key={keeper.id} style={styles.keeperItem}>
                <div style={styles.keeperInfo}>
                  <div style={styles.keeperPlayer}>
                    <div style={styles.keeperPlayerName}>
                      {keeper.playerName}
                    </div>
                    <div style={styles.keeperPlayerMeta}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {keeper.playerPosition}
                      </span>
                      <span>{keeper.playerTeam}</span>
                      <span>#{keeper.playerRank}</span>
                    </div>
                  </div>

                  <div style={styles.keeperDraft}>
                    <div style={styles.keeperDraftText}>
                      Pick #{keeper.pickNumber}
                    </div>
                    <div style={styles.keeperDraftMeta}>
                      Round {keeper.round} • {keeper.teamName}
                    </div>
                  </div>
                </div>

                <div style={styles.keeperActions}>
                  <button
                    style={{ ...styles.actionButton, ...styles.editButton }}
                    onClick={() => handleEditKeeper(keeper)}
                    title="Edit keeper"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    style={{ ...styles.actionButton, ...styles.deleteButton }}
                    onClick={() => handleDeleteKeeper(keeper.id)}
                    title="Delete keeper"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Keeper Modal */}
      {showAddKeeper && (
        <div style={styles.modal} onClick={handleCancel}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h4 style={styles.modalTitle}>
                {editingKeeper ? 'Edit Keeper' : 'Add Keeper'}
              </h4>
              <button style={styles.closeButton} onClick={handleCancel}>
                ✕
              </button>
            </div>

            {/* Player Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Player</label>
              {selectedPlayer ? (
                <div style={styles.selectedPlayer}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {selectedPlayer.name}
                    </div>
                    <div style={{ fontSize: '12px', color: themeStyles.text.secondary }}>
                      {selectedPlayer.position} • {selectedPlayer.team} • #{selectedPlayer.rank}
                    </div>
                  </div>
                  <button
                    style={{ ...styles.actionButton, backgroundColor: themeStyles.button.secondary.backgroundColor }}
                    onClick={() => {
                      setSelectedPlayer(null);
                      setSearchQuery('');
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={styles.playerSearch}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: themeStyles.text.muted
                    }} />
                    <input
                      type="text"
                      placeholder="Search for a player..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ ...styles.input, paddingLeft: '40px' }}
                    />
                  </div>

                  {searchFilteredPlayers.length > 0 && (
                    <div style={styles.searchResults}>
                      {searchFilteredPlayers.map(player => (
                        <div
                          key={player.id}
                          style={styles.searchResultItem}
                          onClick={() => {
                            setSelectedPlayer(player);
                            setSearchQuery('');
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = themeStyles.hover.background;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                            {player.name}
                          </div>
                          <div style={{ fontSize: '12px', color: themeStyles.text.secondary }}>
                            {player.position} • {player.team} • #{player.rank}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Team Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(parseInt(e.target.value))}
                style={styles.select}
              >
                {Array.from({ length: numTeams }, (_, i) => i + 1).map(teamId => (
                  <option key={teamId} value={teamId}>
                    {teamNames[teamId] || `Team ${teamId}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Round Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Round</label>
              <select
                value={selectedRound}
                onChange={(e) => setSelectedRound(parseInt(e.target.value))}
                style={styles.select}
              >
                {Array.from({ length: 16 }, (_, i) => i + 1).map(round => {
                  const pickNumber = getPickNumber(selectedTeam, round);
                  return (
                    <option key={round} value={round}>
                      Round {round} (Pick #{pickNumber})
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={styles.modalActions}>
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  ...(selectedPlayer ? {} : styles.disabledState)
                }}
                onClick={handleSaveKeeper}
                disabled={!selectedPlayer}
              >
                <Save size={14} style={{ marginRight: '6px' }} />
                {editingKeeper ? 'Update' : 'Add'} Keeper
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeeperModePanel;
