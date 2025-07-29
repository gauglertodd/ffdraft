import React, { useRef, useState, useEffect } from 'react';
import { Upload, Undo2, Search, RotateCcw } from 'lucide-react';

const UnifiedControlPanel = ({
  // Removed: theme, view, prediction, and watch controls - now in PlayerList
  themeStyles,

  // Draft controls
  undoLastDraft,
  draftedPlayers,
  onNewCSV,

  // Search controls
  searchQuery,
  setSearchQuery,
  selectedPosition,
  setSelectedPosition,
  positions,
  players,
  draftPlayer,

  // Draft status and restart
  currentDraftPick,
  currentTeam,
  teamNames,
  onRestartDraft
}) => {
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Search dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredDropdownPlayers, setFilteredDropdownPlayers] = useState([]);

  // Filter players for dropdown
  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = players
        .filter(player => {
          const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              player.team.toLowerCase().includes(searchQuery.toLowerCase());
          const isUndrafted = !draftedPlayers.includes(player.id);
          return matchesSearch && isUndrafted;
        })
        .slice(0, 6); // Limit to 6 results for control panel
      setFilteredDropdownPlayers(filtered);
      setIsDropdownOpen(filtered.length > 0);
      setSelectedIndex(-1);
    } else {
      setFilteredDropdownPlayers([]);
      setIsDropdownOpen(false);
      setSelectedIndex(-1);
    }
  }, [searchQuery, players, draftedPlayers]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isDropdownOpen || filteredDropdownPlayers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredDropdownPlayers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredDropdownPlayers.length) {
          const selectedPlayer = filteredDropdownPlayers[selectedIndex];
          draftPlayer(selectedPlayer.id);
          setSearchQuery('');
          setIsDropdownOpen(false);
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle clicking on dropdown item
  const handleDropdownClick = (player) => {
    draftPlayer(player.id);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setSelectedIndex(-1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle restart draft with confirmation
  const handleRestartDraft = () => {
    const confirmed = window.confirm(
      "Are you sure you want to restart the draft? This will clear all picks and reset the draft to the beginning. This action cannot be undone."
    );

    if (confirmed && onRestartDraft) {
      onRestartDraft();
    }
  };

  const styles = {
    panel: {
      ...themeStyles.card,
      borderRadius: '8px',
      padding: '16px 24px',
      marginBottom: '24px'
    },
    mainRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px'
    },
    leftSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flex: '1',
      minWidth: '0'
    },
    rightSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    },
    controlGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    label: {
      fontSize: '12px',
      fontWeight: '500',
      color: themeStyles.text.secondary,
      whiteSpace: 'nowrap'
    },
    button: {
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
      whiteSpace: 'nowrap'
    },
    buttonSecondary: {
      ...themeStyles.button.secondary
    },
    buttonPrimary: {
      ...themeStyles.button.primary
    },
    buttonDanger: {
      backgroundColor: '#dc2626',
      color: '#ffffff'
    },
    buttonPrediction: {
      backgroundColor: '#7c3aed',
      color: '#ffffff'
    },
    buttonDisabled: {
      opacity: '0.5',
      cursor: 'not-allowed'
    },
    searchContainer: {
      position: 'relative',
      flex: '1',
      maxWidth: '500px', // Increased from 350px
      minWidth: '300px'
    },
    searchInputGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    searchInput: {
      ...themeStyles.input,
      width: '100%',
      paddingLeft: '36px',
      paddingRight: '16px',
      paddingTop: '8px',
      paddingBottom: '8px',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none'
    },
    searchIcon: {
      position: 'absolute',
      left: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: themeStyles.text.muted
    },
    ctrlKHint: {
      fontSize: '11px',
      color: themeStyles.text.muted,
      backgroundColor: themeStyles.hover.background,
      padding: '4px 8px',
      borderRadius: '4px',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    kbd: {
      backgroundColor: themeStyles.card.backgroundColor,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '3px',
      padding: '2px 4px',
      fontSize: '10px',
      fontWeight: 'bold'
    },
    select: {
      ...themeStyles.input,
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '13px',
      outline: 'none',
      minWidth: '100px'
    },
    opacitySlider: {
      width: '70px',
      height: '4px',
      borderRadius: '2px',
      outline: 'none',
      cursor: 'pointer',
      background: `linear-gradient(90deg, #fbbf24 30% 0%, #fbbf24 CC 100%)`
    },
    colorPicker: {
      width: '24px',
      height: '24px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    divider: {
      width: '1px',
      height: '20px',
      backgroundColor: themeStyles.border,
      margin: '0 8px'
    },
    // Dropdown styles
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: '0',
      right: '0',
      backgroundColor: themeStyles.card.backgroundColor,
      border: `1px solid ${themeStyles.border}`,
      borderTop: 'none',
      borderRadius: '0 0 6px 6px',
      maxHeight: '250px',
      overflowY: 'auto',
      zIndex: 1000,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    dropdownItem: {
      padding: '10px 12px',
      cursor: 'pointer',
      borderBottom: `1px solid ${themeStyles.border}`,
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    dropdownItemSelected: {
      backgroundColor: '#2563eb',
      color: '#ffffff'
    },
    playerDropdownName: {
      fontWeight: '500',
      fontSize: '13px'
    },
    playerDropdownMeta: {
      fontSize: '11px',
      color: themeStyles.text.secondary,
      marginTop: '2px'
    },
    playerDropdownRank: {
      fontSize: '11px',
      color: themeStyles.text.muted,
      fontWeight: '500'
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.mainRow}>
        {/* Left: Search Controls */}
        <div style={styles.leftSection}>
          <div style={styles.controlGroup} ref={dropdownRef}>
            <div style={styles.searchContainer}>
              <div style={styles.searchInputGroup}>
                <div style={{ position: 'relative', flex: '1' }}>
                  <Search style={styles.searchIcon} size={14} />
                  <input
                    type="text"
                    placeholder="Search and draft players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={styles.searchInput}
                  />

                  {/* Search Dropdown */}
                  {isDropdownOpen && (
                    <div style={styles.dropdown}>
                      {filteredDropdownPlayers.map((player, index) => {
                        const isSelected = index === selectedIndex;

                        return (
                          <div
                            key={player.id}
                            style={{
                              ...styles.dropdownItem,
                              ...(isSelected ? styles.dropdownItemSelected : {})
                            }}
                            onClick={() => handleDropdownClick(player)}
                            onMouseEnter={() => setSelectedIndex(index)}
                          >
                            <div>
                              <div style={{
                                ...styles.playerDropdownName,
                                color: isSelected ? '#ffffff' : themeStyles.text.primary
                              }}>
                                {player.name}
                              </div>
                              <div style={{
                                ...styles.playerDropdownMeta,
                                color: isSelected ? '#e0e7ff' : themeStyles.text.secondary
                              }}>
                                {player.position} • {player.team}
                              </div>
                            </div>
                            <div style={{
                              ...styles.playerDropdownRank,
                              color: isSelected ? '#e0e7ff' : themeStyles.text.muted
                            }}>
                              #{player.rank}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={styles.ctrlKHint}>
                  Quick draft: <span style={styles.kbd}>Ctrl+K</span>
                </div>
              </div>
            </div>
          </div>

          {players.length > 0 && (
            <div style={{ fontSize: '11px', color: themeStyles.text.secondary, whiteSpace: 'nowrap' }}>
              {draftedPlayers.length} / {players.length} drafted
            </div>
          )}
        </div>

        {/* Right: Action Controls */}
        <div style={styles.rightSection}>
          {/* Action Controls */}
          <div style={styles.controlGroup}>
            <button
              onClick={undoLastDraft}
              disabled={draftedPlayers.length === 0}
              style={{
                ...styles.button,
                ...styles.buttonSecondary,
                ...(draftedPlayers.length === 0 ? styles.buttonDisabled : {})
              }}
              title="Undo last draft pick"
            >
              <Undo2 size={14} />
              Undo
            </button>

            <button
              onClick={handleRestartDraft}
              disabled={draftedPlayers.length === 0}
              style={{
                ...styles.button,
                ...styles.buttonDanger,
                ...(draftedPlayers.length === 0 ? styles.buttonDisabled : {})
              }}
              title="Restart the entire draft from the beginning"
            >
              <RotateCcw size={14} />
              Restart Draft
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                ...styles.button,
                ...styles.buttonPrimary
              }}
              title="Upload new CSV file"
            >
              <Upload size={14} />
              Upload CSV
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files[0] && onNewCSV(e.target.files[0])}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default UnifiedControlPanel;
