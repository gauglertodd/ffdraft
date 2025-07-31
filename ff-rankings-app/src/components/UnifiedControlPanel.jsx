import React, { useRef, useState, useEffect } from 'react';
import { Upload, Undo2, Search, RotateCcw, FileText, RefreshCw, Save, Trash2, Plus } from 'lucide-react';

const UnifiedControlPanel = ({
  themeStyles,
  undoLastDraft,
  draftedPlayers,
  onNewCSV,
  searchQuery,
  setSearchQuery,
  selectedPosition,
  setSelectedPosition,
  positions,
  players,
  draftPlayer,
  currentDraftPick,
  currentTeam,
  teamNames,
  onRestartDraft,
  onSwitchCSV,
  onNewDraft,
  onSaveDraft,
  onClearSavedState
}) => {
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Search dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredDropdownPlayers, setFilteredDropdownPlayers] = useState([]);

  // CSV switching state
  const [showCSVOptions, setShowCSVOptions] = useState(false);
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);
  const [availableCSVs, setAvailableCSVs] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  // Save state tracking
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  // Common CSV filenames to check for
  const commonCSVNames = [
    'FantasyPros 2025 PPR.csv',
    '4for4 Underdog ADP.csv',
    'BB10s ADP.csv',
    'CBS ADP.csv',
    'ESPN ADP.csv',
    'FFPC ADP.csv',
    'Y! ADP.csv',
    'LateRoundDraft.csv'
  ];

  // Generate friendly names from filenames
  const generateFriendlyName = (filename) => {
    const nameWithoutExt = filename.replace('.csv', '');

    if (nameWithoutExt.includes('fantasypros')) {
      return nameWithoutExt.replace('fantasypros_', 'FantasyPros ').replace('_', ' ');
    }
    if (nameWithoutExt.includes('espn')) {
      return nameWithoutExt.replace('espn_', 'ESPN ').replace('_', ' ');
    }
    if (nameWithoutExt.includes('yahoo')) {
      return nameWithoutExt.replace('yahoo_', 'Yahoo ').replace('_', ' ');
    }
    if (nameWithoutExt.includes('sleeper')) {
      return nameWithoutExt.replace('sleeper_', 'Sleeper ').replace('_', ' ');
    }
    if (nameWithoutExt.includes('sample')) {
      return 'Sample Rankings';
    }

    return nameWithoutExt
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Scan for available CSV files in the public directory
  const scanForCSVFiles = async () => {
    setIsScanning(true);
    const foundFiles = [];

    for (const filename of commonCSVNames) {
      try {
        const response = await fetch(`/${filename}`, { method: 'HEAD' });
        if (response.ok) {
          foundFiles.push({
            filename,
            name: generateFriendlyName(filename),
            description: 'Available rankings'
          });
        }
      } catch (error) {
        // File doesn't exist or isn't accessible, skip silently
      }
    }

    setAvailableCSVs(foundFiles);
    setIsScanning(false);
  };

  // Scan for files when CSV options are first opened
  useEffect(() => {
    if (showCSVOptions && availableCSVs.length === 0 && !isScanning) {
      scanForCSVFiles();
    }
  }, [showCSVOptions, availableCSVs.length, isScanning]);

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
        .slice(0, 6);
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

  // Handle manual save
  const handleManualSave = () => {
    if (onSaveDraft) {
      onSaveDraft();
      setLastSaveTime(Date.now());
      setShowSaveOptions(false);
    }
  };

  // Handle clear saved state
  const handleClearSavedState = () => {
    const confirmed = window.confirm(
      "Clear all saved draft data? This will remove the saved state from your browser but won't affect your current session."
    );

    if (confirmed && onClearSavedState) {
      onClearSavedState();
      setLastSaveTime(null);
      setShowSaveOptions(false);
    }
  };

  // Handle preset CSV loading
  const handlePresetLoad = async (filename) => {
    setIsLoadingPreset(true);

    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.status}`);
      }

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
      console.error('Error loading preset file:', error);
      alert(`Failed to load ${filename}. Make sure the file exists in your public/ directory.`);
    } finally {
      setIsLoadingPreset(false);
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
    buttonSuccess: {
      backgroundColor: '#16a34a',
      color: '#ffffff'
    },
    buttonWarning: {
      backgroundColor: '#f59e0b',
      color: '#ffffff'
    },
    buttonDisabled: {
      opacity: '0.5',
      cursor: 'not-allowed'
    },
    searchContainer: {
      position: 'relative',
      flex: '1',
      maxWidth: '400px',
      minWidth: '250px'
    },
    searchInputGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    searchInputWrapper: {
      position: 'relative',
      flex: '1'
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
      gap: '4px',
      flexShrink: 0
    },
    kbd: {
      backgroundColor: themeStyles.card.backgroundColor,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '3px',
      padding: '2px 4px',
      fontSize: '10px',
      fontWeight: 'bold'
    },
    divider: {
      width: '1px',
      height: '20px',
      backgroundColor: themeStyles.border,
      margin: '0 8px'
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
    optionHeader: {
      padding: '12px 16px',
      borderBottom: `1px solid ${themeStyles.border}`,
      fontSize: '13px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      backgroundColor: themeStyles.hover.background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    optionItem: {
      padding: '12px 16px',
      cursor: 'pointer',
      borderBottom: `1px solid ${themeStyles.border}`,
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    optionItemHover: {
      backgroundColor: themeStyles.hover.background
    },
    optionText: {
      flex: '1'
    },
    optionName: {
      fontSize: '13px',
      fontWeight: '500',
      color: themeStyles.text.primary,
      marginBottom: '2px'
    },
    optionDesc: {
      fontSize: '11px',
      color: themeStyles.text.secondary
    },
    uploadOptionItem: {
      padding: '12px 16px',
      cursor: 'pointer',
      borderBottom: `1px solid ${themeStyles.border}`,
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#2563eb',
      fontWeight: '500'
    },
    noFilesMessage: {
      padding: '16px',
      textAlign: 'center',
      color: themeStyles.text.muted,
      fontSize: '12px',
      fontStyle: 'italic'
    },
    scanningMessage: {
      padding: '16px',
      textAlign: 'center',
      color: themeStyles.text.secondary,
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    scanningSpinner: {
      width: '14px',
      height: '14px',
      border: '2px solid #e5e7eb',
      borderTop: '2px solid #2563eb',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    rescanButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s',
      backgroundColor: 'transparent',
      color: themeStyles.text.muted
    },
    saveStatus: {
      fontSize: '11px',
      color: themeStyles.text.muted,
      padding: '8px 16px',
      fontStyle: 'italic'
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
                <div style={styles.searchInputWrapper}>
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
                  Quick: <span style={styles.kbd}>Ctrl+K</span>
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
          {/* Draft Controls */}
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
              onClick={onRestartDraft}
              disabled={draftedPlayers.length === 0}
              style={{
                ...styles.button,
                ...styles.buttonWarning,
                ...(draftedPlayers.length === 0 ? styles.buttonDisabled : {})
              }}
              title="Restart the draft (keep settings and CSV)"
            >
              <RotateCcw size={14} />
              Restart
            </button>

            <button
              onClick={onNewDraft}
              style={{
                ...styles.button,
                ...styles.buttonDanger
              }}
              title="Start completely new draft (clear everything)"
            >
              <Plus size={14} />
              New Draft
            </button>
          </div>

          <div style={styles.divider} />

          {/* Save Controls */}
          <div style={styles.controlGroup}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSaveOptions(!showSaveOptions)}
                style={{
                  ...styles.button,
                  ...styles.buttonSuccess
                }}
                title="Save and restore options"
              >
                <Save size={14} />
                Save
              </button>

              {/* Save Options Dropdown */}
              {showSaveOptions && (
                <div style={styles.optionsDropdown}>
                  <div style={styles.optionHeader}>
                    Draft Persistence
                  </div>

                  <div
                    style={styles.optionItem}
                    onClick={handleManualSave}
                    onMouseEnter={(e) => {
                      Object.assign(e.target.style, styles.optionItemHover);
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '';
                    }}
                  >
                    <Save size={16} color={themeStyles.text.muted} />
                    <div style={styles.optionText}>
                      <div style={styles.optionName}>Save Now</div>
                      <div style={styles.optionDesc}>Manual save current state</div>
                    </div>
                  </div>

                  <div
                    style={{...styles.optionItem, color: '#dc2626'}}
                    onClick={handleClearSavedState}
                    onMouseEnter={(e) => {
                      Object.assign(e.target.style, styles.optionItemHover);
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '';
                    }}
                  >
                    <Trash2 size={16} color="#dc2626" />
                    <div style={styles.optionText}>
                      <div style={{...styles.optionName, color: '#dc2626'}}>Clear Saved</div>
                      <div style={styles.optionDesc}>Remove saved draft data</div>
                    </div>
                  </div>

                  <div style={styles.saveStatus}>
                    {lastSaveTime ?
                      `Last saved: ${new Date(lastSaveTime).toLocaleTimeString()}` :
                      'Auto-saves every change'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={styles.divider} />

          {/* File Controls */}
          <div style={styles.controlGroup}>
            {/* CSV Switch Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowCSVOptions(!showCSVOptions)}
                style={{
                  ...styles.button,
                  ...styles.buttonSecondary
                }}
                title="Switch to different rankings"
              >
                <RefreshCw size={14} />
                Switch Rankings
              </button>

              {/* CSV Options Dropdown */}
              {showCSVOptions && (
                <div style={styles.optionsDropdown}>
                  <div style={styles.optionHeader}>
                    <span>Choose Rankings</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        scanForCSVFiles();
                      }}
                      style={{
                        ...styles.rescanButton,
                        opacity: isScanning ? 0.6 : 1
                      }}
                      disabled={isScanning}
                      title="Rescan for CSV files"
                    >
                      <RefreshCw size={12} style={{
                        animation: isScanning ? 'spin 1s linear infinite' : 'none'
                      }} />
                      Rescan
                    </button>
                  </div>

                  {/* Scanning State */}
                  {isScanning && (
                    <div style={styles.scanningMessage}>
                      <div style={styles.scanningSpinner} />
                      Scanning public/ directory...
                    </div>
                  )}

                  {/* No Files Found */}
                  {!isScanning && availableCSVs.length === 0 && (
                    <div style={styles.noFilesMessage}>
                      No CSV files found in public/ directory.
                      <br />
                      Place files there and rescan.
                    </div>
                  )}

                  {/* Available Files */}
                  {!isScanning && availableCSVs.length > 0 && (
                    <>
                      {availableCSVs.map((preset) => (
                        <div
                          key={preset.filename}
                          style={styles.optionItem}
                          onClick={() => handlePresetLoad(preset.filename)}
                          onMouseEnter={(e) => {
                            Object.assign(e.target.style, styles.optionItemHover);
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '';
                          }}
                        >
                          <FileText size={16} color={themeStyles.text.muted} />
                          <div style={styles.optionText}>
                            <div style={styles.optionName}>{preset.name}</div>
                            <div style={styles.optionDesc}>{preset.description}</div>
                          </div>
                          {isLoadingPreset && (
                            <div style={{
                              width: '12px',
                              height: '12px',
                              border: '2px solid #e5e7eb',
                              borderTop: '2px solid #2563eb',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }} />
                          )}
                        </div>
                      ))}

                      {/* Upload Custom File */}
                      <div
                        style={styles.uploadOptionItem}
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowCSVOptions(false);
                        }}
                        onMouseEnter={(e) => {
                          Object.assign(e.target.style, styles.optionItemHover);
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '';
                        }}
                      >
                        <Upload size={16} />
                        Upload Custom CSV
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

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

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default UnifiedControlPanel;
