import React, { useRef, useState, useEffect } from 'react';
import { Upload, Undo2, Search, RotateCcw, FileText, RefreshCw, Save, Trash2, Plus, Eye, X, UserPlus, Crown } from 'lucide-react';

const UnifiedControlPanel = ({
  themeStyles,
  undoLastDraft,
  draftedPlayers,
  onNewCSV,
  searchQuery,
  setSearchQuery,
  players,
  draftPlayer,
  onRestartDraft,
  onSwitchCSV,
  onSaveDraft,
  onClearSavedState,
  // Watch/Avoid functionality
  watchedPlayers,
  toggleWatchPlayer,
  isPlayerWatched,
  avoidedPlayers,
  toggleAvoidPlayer,
  isPlayerAvoided,
  watchHighlightColor,
  avoidHighlightColor,
  // Keeper mode props
  isKeeperMode,
  setIsKeeperMode,
  keepers
}) => {
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [showCSVOptions, setShowCSVOptions] = useState(false);
  const [availableCSVs, setAvailableCSVs] = useState([]);
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);

  // Common CSV filenames to check for
  const csvFiles = [
    'FantasyPros 2025 PPR.csv',
    '4for4 Underdog ADP.csv',
    'BB10s ADP.csv',
    'CBS ADP.csv',
    'ESPN ADP.csv',
    'FFPC ADP.csv',
    'Y! ADP.csv',
    'FantasyPros .5 PPR.csv',
    'FantasyPros 2025 Top 10 Accurate Overall PPR.csv',
    'FantasyNow+ PPR.csv',
    'The Fantasy Headliners PPR.csv'
  ];

  // Filter players for search dropdown
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const searchLower = searchQuery.toLowerCase();
      const matches = players
        .filter(player => {
          const matchesSearch = player.name.toLowerCase().includes(searchLower) ||
                              player.team.toLowerCase().includes(searchLower);
          return matchesSearch && !draftedPlayers.includes(player.id);
        })
        .slice(0, 8); // Increased to show more results

      setFilteredPlayers(matches);
      setIsDropdownOpen(matches.length > 0);
      setSelectedIndex(-1);
    } else {
      setFilteredPlayers([]);
      setIsDropdownOpen(false);
    }
  }, [searchQuery, players, draftedPlayers]);

  // Scan for CSV files
  const scanForCSVFiles = async () => {
    const foundFiles = [];
    for (const filename of csvFiles) {
      try {
        const response = await fetch(`/${filename}`, { method: 'HEAD' });
        if (response.ok) {
          foundFiles.push({
            filename,
            name: filename.replace('.csv', ''),
            description: 'Available rankings'
          });
        }
      } catch (error) {
        // File doesn't exist, skip
      }
    }
    setAvailableCSVs(foundFiles);
  };

  // Load preset CSV
  const handlePresetLoad = async (filename) => {
    setIsLoadingPreset(true);
    try {
      const response = await fetch(`/${filename}`);
      const csvText = await response.text();
      const blob = new Blob([csvText], { type: 'text/csv' });
      const file = new File([blob], filename, { type: 'text/csv' });

      if (onSwitchCSV) {
        onSwitchCSV(file);
      } else {
        onNewCSV(file);
      }
      setShowCSVOptions(false);
    } catch (error) {
      alert(`Failed to load ${filename}`);
    } finally {
      setIsLoadingPreset(false);
    }
  };

  // Keyboard navigation for search
  const handleKeyDown = (e) => {
    if (!isDropdownOpen || filteredPlayers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < filteredPlayers.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          draftPlayer(filteredPlayers[selectedIndex].id);
          setSearchQuery('');
          setIsDropdownOpen(false);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scan for CSV files when options are opened
  useEffect(() => {
    if (showCSVOptions && availableCSVs.length === 0) {
      scanForCSVFiles();
    }
  }, [showCSVOptions]);

  const styles = {
    panel: {
      ...themeStyles.card,
      borderRadius: '8px',
      padding: '16px 24px',
      marginBottom: '24px'
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px'
    },
    searchContainer: {
      position: 'relative',
      flex: '1',
      maxWidth: '400px',
      minWidth: '250px'
    },
    searchInput: {
      ...themeStyles.input,
      width: '100%',
      paddingLeft: '36px',
      padding: '8px 16px 8px 36px',
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
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: '0',
      right: '0',
      backgroundColor: themeStyles.card.backgroundColor,
      border: `1px solid ${themeStyles.border}`,
      borderTop: 'none',
      borderRadius: '0 0 6px 6px',
      maxHeight: '320px',
      overflowY: 'auto',
      zIndex: 1000,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    dropdownItem: {
      padding: '12px 16px',
      cursor: 'pointer',
      borderBottom: `1px solid ${themeStyles.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'background-color 0.2s'
    },
    dropdownItemSelected: {
      backgroundColor: '#2563eb',
      color: '#ffffff'
    },
    dropdownItemHover: {
      backgroundColor: themeStyles.hover.background
    },
    playerInfo: {
      flex: 1,
      minWidth: 0
    },
    playerName: {
      fontWeight: '500',
      fontSize: '14px',
      marginBottom: '2px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    playerMeta: {
      fontSize: '12px',
      color: themeStyles.text.secondary,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    playerRank: {
      fontSize: '12px',
      color: themeStyles.text.muted,
      fontWeight: '500',
      minWidth: '35px',
      textAlign: 'right'
    },
    actionButtons: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      marginLeft: '12px'
    },
    actionButton: {
      padding: '4px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      fontSize: '12px'
    },
    watchButton: {
      backgroundColor: 'transparent',
      color: themeStyles.text.muted
    },
    watchButtonActive: {
      backgroundColor: watchHighlightColor,
      color: '#ffffff'
    },
    avoidButton: {
      backgroundColor: 'transparent',
      color: themeStyles.text.muted
    },
    avoidButtonActive: {
      backgroundColor: avoidHighlightColor,
      color: '#ffffff'
    },
    draftButton: {
      backgroundColor: '#16a34a',
      color: '#ffffff',
      padding: '4px 8px',
      fontWeight: '500'
    },
    buttonGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
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
    keeperButton: {
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
      backgroundColor: isKeeperMode ? '#7c3aed' : themeStyles.button.secondary.backgroundColor,
      color: isKeeperMode ? '#ffffff' : themeStyles.button.secondary.color
    },
    optionsDropdown: {
      position: 'absolute',
      top: '100%',
      right: '0',
      backgroundColor: themeStyles.card.backgroundColor,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '6px',
      minWidth: '240px',
      maxHeight: '400px',
      overflowY: 'auto',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      marginTop: '4px'
    },
    optionItem: {
      padding: '12px 16px',
      cursor: 'pointer',
      borderBottom: `1px solid ${themeStyles.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    statusIndicator: {
      fontSize: '10px',
      marginLeft: '4px'
    },
    keeperStatusBadge: {
      fontSize: '10px',
      backgroundColor: '#7c3aed',
      color: '#ffffff',
      padding: '2px 6px',
      borderRadius: '12px',
      fontWeight: '600',
      marginLeft: '4px'
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.row}>
        {/* Left: Search with enhanced dropdown */}
        <div style={styles.searchContainer} ref={dropdownRef}>
          <Search style={styles.searchIcon} size={14} />
          <input
            type="text"
            placeholder="Search, watch, avoid, or draft players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.searchInput}
          />

          {isDropdownOpen && (
            <div style={styles.dropdown}>
              {filteredPlayers.map((player, index) => {
                const isSelected = index === selectedIndex;
                const isWatched = isPlayerWatched(player.id);
                const isAvoided = isPlayerAvoided(player.id);

                return (
                  <div
                    key={player.id}
                    style={{
                      ...styles.dropdownItem,
                      ...(isSelected ? styles.dropdownItemSelected : {}),
                      // Add subtle background for watched/avoided players
                      backgroundColor: isSelected ? '#2563eb' :
                        isWatched ? `${watchHighlightColor}20` :
                        isAvoided ? `${avoidHighlightColor}20` : 'transparent'
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div style={styles.playerInfo}>
                      <div style={{
                        ...styles.playerName,
                        color: isSelected ? '#ffffff' : themeStyles.text.primary
                      }}>
                        {player.name}
                        {isWatched && <span style={styles.statusIndicator}>👁️</span>}
                        {isAvoided && <span style={styles.statusIndicator}>🚫</span>}
                      </div>
                      <div style={{
                        ...styles.playerMeta,
                        color: isSelected ? '#e0e7ff' : themeStyles.text.secondary
                      }}>
                        <span>{player.position}</span>
                        <span>•</span>
                        <span>{player.team}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        ...styles.playerRank,
                        color: isSelected ? '#e0e7ff' : themeStyles.text.muted
                      }}>
                        #{player.rank}
                      </div>

                      <div style={styles.actionButtons}>
                        {/* Watch Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchPlayer(player.id);
                          }}
                          style={{
                            ...styles.actionButton,
                            ...(isWatched ? styles.watchButtonActive : styles.watchButton),
                            opacity: isSelected ? 0.9 : 1
                          }}
                          title={isWatched ? 'Remove from watch list' : 'Add to watch list'}
                        >
                          <Eye size={12} />
                        </button>

                        {/* Avoid Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAvoidPlayer(player.id);
                          }}
                          style={{
                            ...styles.actionButton,
                            ...(isAvoided ? styles.avoidButtonActive : styles.avoidButton),
                            opacity: isSelected ? 0.9 : 1
                          }}
                          title={isAvoided ? 'Remove from avoid list' : 'Add to avoid list'}
                        >
                          <X size={12} />
                        </button>

                        {/* Draft Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            draftPlayer(player.id);
                            setSearchQuery('');
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            ...styles.actionButton,
                            ...styles.draftButton,
                            opacity: isSelected ? 0.9 : 1
                          }}
                          title="Draft player"
                        >
                          <UserPlus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPlayers.length === 0 && searchQuery.length >= 2 && (
                <div style={{
                  ...styles.dropdownItem,
                  cursor: 'default',
                  justifyContent: 'center'
                }}>
                  <div style={{ color: themeStyles.text.muted, fontSize: '14px' }}>
                    No undrafted players found
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div style={styles.buttonGroup}>
          {/* Keeper Mode Toggle */}
          <button
            onClick={() => setIsKeeperMode(!isKeeperMode)}
            style={styles.keeperButton}
            title={isKeeperMode ? 'Disable keeper mode' : 'Enable keeper mode'}
          >
            <Crown size={14} />
            Keeper Mode
            {isKeeperMode && keepers && keepers.length > 0 && (
              <span style={styles.keeperStatusBadge}>
                {keepers.length}
              </span>
            )}
          </button>

          {/* Draft Controls */}
          <button
            onClick={undoLastDraft}
            disabled={draftedPlayers.length === 0}
            style={{
              ...styles.button,
              ...themeStyles.button.secondary,
              opacity: draftedPlayers.length === 0 ? 0.5 : 1
            }}
          >
            <Undo2 size={14} />
            Undo
          </button>

          <button
            onClick={onRestartDraft}
            disabled={draftedPlayers.length === 0}
            style={{
              ...styles.button,
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              opacity: draftedPlayers.length === 0 ? 0.5 : 1
            }}
          >
            <RotateCcw size={14} />
            Restart
          </button>

          {/* Save Controls */}
          <button
            onClick={onSaveDraft}
            style={{
              ...styles.button,
              ...themeStyles.button.success
            }}
          >
            <Save size={14} />
            Save
          </button>

          <button
            onClick={onClearSavedState}
            style={{
              ...styles.button,
              backgroundColor: '#dc2626',
              color: '#ffffff'
            }}
          >
            <Trash2 size={14} />
            Clear
          </button>

          {/* CSV Controls */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowCSVOptions(!showCSVOptions)}
              style={{
                ...styles.button,
                ...themeStyles.button.secondary
              }}
            >
              <RefreshCw size={14} />
              Switch
            </button>

            {showCSVOptions && (
              <div style={styles.optionsDropdown}>
                {availableCSVs.map((preset) => (
                  <div
                    key={preset.filename}
                    style={styles.optionItem}
                    onClick={() => handlePresetLoad(preset.filename)}
                  >
                    <FileText size={16} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>
                        {preset.name}
                      </div>
                      <div style={{ fontSize: '11px', color: themeStyles.text.secondary }}>
                        {preset.description}
                      </div>
                    </div>
                  </div>
                ))}

                <div
                  style={{
                    ...styles.optionItem,
                    color: '#2563eb',
                    fontWeight: '500'
                  }}
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowCSVOptions(false);
                  }}
                >
                  <Upload size={16} />
                  Upload Custom CSV
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              ...styles.button,
              ...themeStyles.button.primary
            }}
          >
            <Upload size={14} />
            Upload
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={(e) => e.target.files[0] && onNewCSV(e.target.files[0])}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default UnifiedControlPanel;
