import React, { useRef, useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const SearchControls = ({
  searchQuery,
  setSearchQuery,
  selectedPosition,
  setSelectedPosition,
  positions,
  themeStyles,
  players,
  draftPlayer,
  draftedPlayers
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredDropdownPlayers, setFilteredDropdownPlayers] = useState([]);
  const dropdownRef = useRef(null);

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
        .slice(0, 8); // Limit to 8 results
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

  const styles = {
    card: {
      ...themeStyles.card,
      borderRadius: '8px',
      padding: '20px 24px',
      marginBottom: '32px'
    },
    controlsContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap'
    },
    searchContainer: {
      position: 'relative',
      flex: '1',
      maxWidth: '400px'
    },
    searchInput: {
      ...themeStyles.input,
      width: '100%',
      paddingLeft: '40px',
      paddingRight: '16px',
      paddingTop: '10px',
      paddingBottom: '10px',
      borderRadius: '6px',
      fontSize: '15px',
      outline: 'none'
    },
    searchIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: themeStyles.text.muted
    },
    select: {
      ...themeStyles.input,
      padding: '10px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none',
      minWidth: '120px'
    },
    // Dropdown styles
    dropdownContainer: {
      position: 'relative'
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
      maxHeight: '300px',
      overflowY: 'auto',
      zIndex: 1000,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    dropdownItem: {
      padding: '12px 16px',
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
    dropdownItemHover: {
      backgroundColor: themeStyles.hover.background
    },
    playerDropdownInfo: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flex: 1
    },
    playerDropdownMain: {
      display: 'flex',
      flexDirection: 'column'
    },
    playerDropdownName: {
      fontWeight: '500',
      fontSize: '14px'
    },
    playerDropdownMeta: {
      fontSize: '12px',
      color: themeStyles.text.secondary,
      marginTop: '2px'
    },
    playerDropdownRank: {
      fontSize: '12px',
      color: themeStyles.text.muted,
      fontWeight: '500'
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.controlsContainer}>
        {/* Search Bar with Dropdown */}
        <div style={{ ...styles.searchContainer, ...styles.dropdownContainer }} ref={dropdownRef}>
          <Search style={styles.searchIcon} size={16} />
          <input
            type="text"
            placeholder="Search and draft players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.searchInput}
          />

          {/* Dropdown */}
          {isDropdownOpen && (
            <div style={styles.dropdown}>
              {filteredDropdownPlayers.map((player, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={player.id}
                    style={{
                      ...styles.dropdownItem,
                      ...(isSelected ? styles.dropdownItemSelected : {}),
                      ...(isSelected ? {} : { ':hover': styles.dropdownItemHover })
                    }}
                    onClick={() => handleDropdownClick(player)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div style={styles.playerDropdownInfo}>
                      <div style={styles.playerDropdownMain}>
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
                  </div>
                );
              })}
              {filteredDropdownPlayers.length === 0 && searchQuery && (
                <div style={{ ...styles.dropdownItem, cursor: 'default' }}>
                  <div style={{ color: themeStyles.text.muted, fontSize: '14px' }}>
                    No undrafted players found
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Position Filter */}
        <select
          value={selectedPosition}
          onChange={(e) => setSelectedPosition(e.target.value)}
          style={styles.select}
        >
          {positions.map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SearchControls;
