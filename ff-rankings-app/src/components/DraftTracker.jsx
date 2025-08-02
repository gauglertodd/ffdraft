// Completely redesigned DraftTracker.jsx with truly unified player state

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';
import FileUpload from './FileUpload';
import PlayerList from './PlayerList';
import TeamBoards from './TeamBoards';
import UnifiedControlPanel from './UnifiedControlPanel';
import SettingsPanel from './SettingsPanel';
import KeeperModePanel from './KeeperModePanel';

const DraftTrackerContent = () => {
  const { isDarkMode, toggleTheme, themeStyles } = useTheme();

  // SINGLE UNIFIED STATE - player ID -> complete player object with all metadata
  const [players, setPlayers] = useState({}); // playerId -> { ...playerData, ...metadata }
  const [playerRankings, setPlayerRankings] = useState([]); // Ordered array of player IDs for rankings

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [showDrafted, setShowDrafted] = useState(true);
  const [activeTab, setActiveTab] = useState('overall');
  const [currentDraftPick, setCurrentDraftPick] = useState(1);
  const [currentCSVSource, setCurrentCSVSource] = useState('');

  // Highlight settings
  const [watchHighlightColor, setWatchHighlightColor] = useState('#fbbf24');
  const [watchHighlightOpacity, setWatchHighlightOpacity] = useState(30);
  const [avoidHighlightColor, setAvoidHighlightColor] = useState('#ef4444');
  const [avoidHighlightOpacity, setAvoidHighlightOpacity] = useState(30);

  // League settings
  const [numTeams, setNumTeams] = useState(12);
  const [rosterSettings, setRosterSettings] = useState({
    QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, DST: 1, K: 1, BENCH: 6
  });
  const [positionColors, setPositionColors] = useState({
    QB: '#dc2626', RB: '#16a34a', WR: '#2563eb', TE: '#ca8a04',
    FLEX: '#7c3aed', DST: '#374151', K: '#ea580c', BENCH: '#6b7280'
  });

  // Draft settings
  const [isKeeperMode, setIsKeeperMode] = useState(false);
  const [draftStyle, setDraftStyle] = useState('snake');
  const [teamNames, setTeamNames] = useState({});

  // Auto-draft settings
  const [autoDraftSettings, setAutoDraftSettings] = useState({});
  const [isAutoDrafting, setIsAutoDrafting] = useState(false);
  const [isDraftRunning, setIsDraftRunning] = useState(false);
  const [draftSpeed, setDraftSpeed] = useState('fast');
  const [teamVariability, setTeamVariability] = useState({});

  // Availability prediction
  const [showAvailabilityPrediction, setShowAvailabilityPrediction] = useState(false);
  const [availabilityPredictions, setAvailabilityPredictions] = useState({});
  const [predictionTrials, setPredictionTrials] = useState(100);
  const [isPredicting, setIsPredicting] = useState(false);
  const [lastPredictionTime, setLastPredictionTime] = useState(null);

  // PyScript readiness
  const [isPyScriptReady, setIsPyScriptReady] = useState(false);

  // Quick draft modal
  const [showQuickDraft, setShowQuickDraft] = useState(false);
  const [quickDraftQuery, setQuickDraftQuery] = useState('');
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);

  // Drag and drop
  const [isDragOver, setIsDragOver] = useState(false);

  // Draft persistence
  const DRAFT_STORAGE_KEY = 'fantasy-draft-state';
  const hasShownRestoreDialogRef = useRef(false);

  // Save feedback state
  const [saveMessage, setSaveMessage] = useState('');
  const [showSaveMessage, setShowSaveMessage] = useState(false);

  // UNIFIED PLAYER STATE HELPER FUNCTIONS

  // Update a single player's data
  const updatePlayer = (playerId, updates) => {
    setPlayers(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        ...updates
      }
    }));
  };

  // Get all players as array (sorted by rank)
  const getAllPlayers = () => {
    return playerRankings.map(id => players[id]).filter(Boolean);
  };

  // Get players by status
  const getPlayersByStatus = (status) => {
    return Object.values(players).filter(p => p.status === status);
  };

  // Get all draft picks (drafted + keepers) sorted by pick number
  const getAllDraftPicks = () => {
    const picks = [];

    Object.values(players).forEach(player => {
      if (player.status === 'drafted' || player.status === 'keeper') {
        picks.push({
          ...player,
          pickNumber: player.pickNumber,
          round: player.round,
          teamId: player.teamId,
          teamName: player.teamName,
          isKeeper: player.status === 'keeper'
        });
      }
    });

    return picks.sort((a, b) => a.pickNumber - b.pickNumber);
  };

  // Get team that picks at a specific position
  const getCurrentTeam = (pickNumber) => {
    const round = Math.floor((pickNumber - 1) / numTeams);
    const position = (pickNumber - 1) % numTeams;

    if (draftStyle === 'snake') {
      return round % 2 === 0 ? position + 1 : numTeams - position;
    }
    return position + 1;
  };

  const currentTeam = getCurrentTeam(currentDraftPick);

  // Check PyScript readiness
  useEffect(() => {
    const checkPyScript = () => {
      if (window.pyAutoDraft && window.pyPredictAvailability) {
        setIsPyScriptReady(true);
        return true;
      }
      return false;
    };

    if (checkPyScript()) return;
    const interval = setInterval(() => checkPyScript() && clearInterval(interval), 100);
    setTimeout(() => clearInterval(interval), 30000);
    return () => clearInterval(interval);
  }, []);

  // CSV parsing
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const nameIndex = headers.findIndex(h => h.includes('name'));
    const positionIndex = headers.findIndex(h => h.includes('position') || h.includes('pos'));
    const teamIndex = headers.findIndex(h => h.includes('team'));
    const rankIndex = headers.findIndex(h => h.includes('rank'));
    const tierIndex = headers.findIndex(h => h.includes('tier'));

    if (nameIndex === -1 || positionIndex === -1 || rankIndex === -1) {
      throw new Error('CSV must contain name, position, and rank columns');
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      return {
        id: index + 1,
        name: values[nameIndex] || '',
        position: values[positionIndex] || '',
        team: teamIndex !== -1 ? values[teamIndex] || '' : '',
        rank: parseInt(values[rankIndex]) || index + 1,
        tier: tierIndex !== -1 ? parseInt(values[tierIndex]) || null : null
      };
    }).sort((a, b) => a.rank - b.rank);
  };

  // Initialize players from CSV
  const initializePlayers = (csvPlayers) => {
    const playersMap = {};
    const rankings = [];

    csvPlayers.forEach(player => {
      playersMap[player.id] = {
        ...player,
        // Status: 'available', 'drafted', 'keeper'
        status: 'available',
        // Draft info (when drafted/kept)
        pickNumber: null,
        round: null,
        teamId: null,
        teamName: null,
        // UI states
        isWatched: false,
        isAvoided: false,
        // When this player was drafted/kept
        draftedAt: null
      };
      rankings.push(player.id);
    });

    setPlayers(playersMap);
    setPlayerRankings(rankings);
  };

  // File upload handlers
  const handleFileUpload = (file, isSwitch = false) => {
    if (file?.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedPlayers = parseCSV(e.target.result);
          initializePlayers(parsedPlayers);
          setCurrentCSVSource(file.name);

          if (!isSwitch) {
            // Reset draft state for new upload
            setCurrentDraftPick(1);
            setAvailabilityPredictions({});
            setIsKeeperMode(false);
            clearDraftState();
          }
        } catch (error) {
          alert('Error parsing CSV: ' + error.message);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCSVSwitch = (file) => {
    if (window.confirm("Switch rankings? This preserves your draft but changes player data.")) {
      handleFileUpload(file, true);
    }
  };

  // Check if current pick is a keeper
  const isCurrentPickKeeper = () => {
    if (!isKeeperMode) return null;
    const keeperAtPick = Object.values(players).find(p =>
      p.status === 'keeper' && p.pickNumber === currentDraftPick
    );
    return keeperAtPick || null;
  };

  // Get next available (non-keeper) pick
  const getNextAvailablePick = (fromPick) => {
    let nextPick = fromPick;
    while (Object.values(players).some(p => p.status === 'keeper' && p.pickNumber === nextPick)) {
      nextPick++;
    }
    return nextPick;
  };

  // Draft a player
  const draftPlayer = (playerId) => {
    const player = players[playerId];
    if (!player) return;

    // Check if player is available
    if (player.status !== 'available') {
      alert('This player has already been drafted or is a keeper.');
      return;
    }

    // Check if we're trying to draft at a keeper position
    const keeperAtCurrentPick = isCurrentPickKeeper();
    if (keeperAtCurrentPick) {
      // Skip to next available pick since this position is reserved for a keeper
      const nextPick = getNextAvailablePick(currentDraftPick + 1);
      setCurrentDraftPick(nextPick);
      // Try to draft at the new position
      if (nextPick !== currentDraftPick) {
        // Recursively call with the new position
        setTimeout(() => draftPlayer(playerId), 0);
        return;
      }
    }

    // Determine pick info - use current draft pick (not keeper position)
    const pickNumber = currentDraftPick;
    const round = Math.floor((pickNumber - 1) / numTeams) + 1;
    const teamId = currentTeam;
    const teamName = teamNames[teamId] || `Team ${teamId}`;

    // Update player
    updatePlayer(playerId, {
      status: 'drafted',
      pickNumber,
      round,
      teamId,
      teamName,
      draftedAt: Date.now()
    });

    // Move to next available pick (skip keeper positions)
    const nextPick = getNextAvailablePick(currentDraftPick + 1);
    setCurrentDraftPick(nextPick);

    setAvailabilityPredictions({});
  };

  // Undo last draft
  const undoLastDraft = () => {
    const draftedPlayers = getPlayersByStatus('drafted');
    if (draftedPlayers.length === 0) return;

    // Find the most recently drafted player
    const lastDrafted = draftedPlayers.reduce((latest, player) =>
      !latest || player.draftedAt > latest.draftedAt ? player : latest
    );

    // Cannot undo keepers
    if (lastDrafted.status === 'keeper') {
      alert("Cannot undo a keeper pick. Please modify keepers in the Keeper Mode panel instead.");
      return;
    }

    // Get the pick number before resetting the player
    const lastPickNumber = lastDrafted.pickNumber;

    // Reset player to available
    updatePlayer(lastDrafted.id, {
      status: 'available',
      pickNumber: null,
      round: null,
      teamId: null,
      teamName: null,
      draftedAt: null
    });

    // Set current pick back to the undone pick position
    setCurrentDraftPick(lastPickNumber);

    setAvailabilityPredictions({});
  };

  // Restart draft
  const restartDraft = () => {
    if (window.confirm("Restart draft? This clears all picks but keeps settings and keepers.")) {
      // Reset all drafted players to available (keep keepers)
      Object.keys(players).forEach(playerId => {
        const player = players[playerId];
        if (player.status === 'drafted') {
          updatePlayer(playerId, {
            status: 'available',
            pickNumber: null,
            round: null,
            teamId: null,
            teamName: null,
            draftedAt: null
          });
        }
      });

      // Find the first non-keeper pick
      const firstAvailablePick = getNextAvailablePick(1);
      setCurrentDraftPick(firstAvailablePick);

      setIsAutoDrafting(false);
      setIsDraftRunning(false);
      setAvailabilityPredictions({});
      saveDraftState();
    }
  };

  // New draft
  const handleNewDraft = () => {
    if (window.confirm("Start completely new draft? This clears everything including keepers.")) {
      // Reset all players to available
      Object.keys(players).forEach(playerId => {
        updatePlayer(playerId, {
          status: 'available',
          pickNumber: null,
          round: null,
          teamId: null,
          teamName: null,
          draftedAt: null,
          isWatched: false,
          isAvoided: false
        });
      });

      setCurrentDraftPick(1);
      setIsAutoDrafting(false);
      setIsDraftRunning(false);
      setAvailabilityPredictions({});
      setIsKeeperMode(false);
      hasShownRestoreDialogRef.current = false;
      clearDraftState();
    }
  };

  // Watch/Avoid functions
  const toggleWatchPlayer = (playerId) => {
    const player = players[playerId];
    if (!player) return;

    const newWatchStatus = !player.isWatched;

    updatePlayer(playerId, {
      isWatched: newWatchStatus,
      isAvoided: newWatchStatus ? false : player.isAvoided // Remove from avoid if adding to watch
    });
  };

  const toggleAvoidPlayer = (playerId) => {
    const player = players[playerId];
    if (!player) return;

    const newAvoidStatus = !player.isAvoided;

    updatePlayer(playerId, {
      isAvoided: newAvoidStatus,
      isWatched: newAvoidStatus ? false : player.isWatched // Remove from watch if adding to avoid
    });
  };

  const isPlayerWatched = (playerId) => players[playerId]?.isWatched || false;
  const isPlayerAvoided = (playerId) => players[playerId]?.isAvoided || false;

  // Keeper management
  const addKeeper = (playerId, teamId, round) => {
    const player = players[playerId];
    if (!player) return;

    const pickNumber = getPickNumberForTeamAndRound(teamId, round);
    const teamName = teamNames[teamId] || `Team ${teamId}`;

    updatePlayer(playerId, {
      status: 'keeper',
      pickNumber,
      round,
      teamId,
      teamName
    });
  };

  const removeKeeper = (playerId) => {
    updatePlayer(playerId, {
      status: 'available',
      pickNumber: null,
      round: null,
      teamId: null,
      teamName: null
    });
  };

  const getPickNumberForTeamAndRound = (teamId, round) => {
    if (draftStyle === 'snake') {
      if (round % 2 === 1) {
        return (round - 1) * numTeams + teamId;
      } else {
        return (round - 1) * numTeams + (numTeams - teamId + 1);
      }
    } else {
      return (round - 1) * numTeams + teamId;
    }
  };

  // Get keepers as array for UI compatibility
  const getKeepers = () => {
    return Object.values(players)
      .filter(p => p.status === 'keeper')
      .map(p => ({
        id: p.id,
        playerId: p.id,
        playerName: p.name,
        playerPosition: p.position,
        playerTeam: p.team,
        playerRank: p.rank,
        teamId: p.teamId,
        teamName: p.teamName,
        round: p.round,
        pickNumber: p.pickNumber
      }));
  };

  // Update keepers (for KeeperModePanel compatibility)
  const updateKeepers = (newKeepers) => {
    // First clear all existing keepers
    Object.keys(players).forEach(playerId => {
      if (players[playerId].status === 'keeper') {
        updatePlayer(playerId, {
          status: 'available',
          pickNumber: null,
          round: null,
          teamId: null,
          teamName: null
        });
      }
    });

    // Then add new keepers
    newKeepers.forEach(keeper => {
      updatePlayer(keeper.playerId, {
        status: 'keeper',
        pickNumber: keeper.pickNumber,
        round: keeper.round,
        teamId: keeper.teamId,
        teamName: keeper.teamName
      });
    });

    // After updating keepers, ensure current draft pick is not on a keeper position
    const nextAvailablePick = getNextAvailablePick(currentDraftPick);
    if (nextAvailablePick !== currentDraftPick) {
      setCurrentDraftPick(nextAvailablePick);
    }
  };

  // Generate teams
  const teams = useMemo(() => {
    const teamArray = [];
    for (let i = 1; i <= numTeams; i++) {
      const roster = [];
      Object.entries(rosterSettings).forEach(([position, count]) => {
        for (let j = 0; j < count; j++) {
          roster.push({ position, player: null, slotIndex: roster.length, isKeeper: false });
        }
      });

      teamArray.push({
        id: i,
        name: teamNames[i] || `Team ${i}`,
        roster
      });
    }

    // Create a map of picks by their actual pick numbers
    const pickMap = new Map();

    // Add all drafted players (regular draft picks only)
    Object.values(players).forEach(player => {
      if (player.status === 'drafted' && player.pickNumber) {
        pickMap.set(player.pickNumber, {
          player,
          teamId: player.teamId,
          isKeeper: false
        });
      }
    });

    // Add keepers at their designated positions (separate from drafted players)
    Object.values(players).forEach(player => {
      if (player.status === 'keeper' && player.pickNumber) {
        pickMap.set(player.pickNumber, {
          player,
          teamId: player.teamId,
          isKeeper: true
        });
      }
    });

    // Assign players to team rosters from the pick map
    pickMap.forEach((pick, pickNumber) => {
      const team = teamArray.find(t => t.id === pick.teamId);
      if (!team || !pick.player) return;

      // Fill roster slots (exact position -> FLEX -> BENCH)
      let slotFound = false;

      // Try exact position match
      for (let slot of team.roster) {
        if (slot.position === pick.player.position && !slot.player) {
          slot.player = pick.player;
          slot.isKeeper = pick.isKeeper;
          slotFound = true;
          break;
        }
      }

      // Try FLEX for RB/WR/TE
      if (!slotFound && ['RB', 'WR', 'TE'].includes(pick.player.position)) {
        for (let slot of team.roster) {
          if (slot.position === 'FLEX' && !slot.player) {
            slot.player = pick.player;
            slot.isKeeper = pick.isKeeper;
            slotFound = true;
            break;
          }
        }
      }

      // Fill BENCH
      if (!slotFound) {
        for (let slot of team.roster) {
          if (slot.position === 'BENCH' && !slot.player) {
            slot.player = pick.player;
            slot.isKeeper = pick.isKeeper;
            break;
          }
        }
      }
    });

    return teamArray;
  }, [players, numTeams, rosterSettings, teamNames]);

  // Update auto-draft settings when teams change
  useEffect(() => {
    setAutoDraftSettings(prev => {
      const newSettings = {};
      for (let i = 1; i <= numTeams; i++) {
        newSettings[i] = prev[i] || 'manual';
      }
      return newSettings;
    });

    setTeamVariability(prev => {
      const newVariability = {};
      for (let i = 1; i <= numTeams; i++) {
        newVariability[i] = prev[i] !== undefined ? prev[i] : 0.3;
      }
      return newVariability;
    });
  }, [numTeams]);

  // Computed values for UI
  const positions = useMemo(() => {
    const posSet = new Set(Object.values(players).map(p => p.position));
    return ['ALL', ...Array.from(posSet).sort()];
  }, [players]);

  const playersByPosition = useMemo(() => {
    const byPosition = {};
    const allPlayers = getAllPlayers();

    positions.forEach(pos => {
      if (pos === 'ALL') {
        byPosition[pos] = allPlayers;
      } else {
        const posPlayers = allPlayers.filter(p => p.position === pos);
        byPosition[pos] = posPlayers.map((player, index) => ({
          ...player,
          positionRank: index + 1
        }));
      }
    });
    return byPosition;
  }, [players, positions]);

  const filteredPlayers = useMemo(() => {
    const baseList = activeTab === 'overall' ? getAllPlayers() : (playersByPosition[activeTab] || []);
    return baseList.filter(player => {
      const matchesSearch = searchQuery === '' ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition;

      // If showDrafted is false, only show available players
      // If showDrafted is true, show all players
      if (!showDrafted) {
        // Only show available players when showDrafted is false
        return matchesSearch && matchesPosition && player.status === 'available';
      } else {
        // Show all players when showDrafted is true
        return matchesSearch && matchesPosition;
      }
    });
  }, [players, playersByPosition, activeTab, searchQuery, selectedPosition, showDrafted]);

  const draftStats = useMemo(() => {
    const stats = {};
    const allPlayers = getAllPlayers();

    positions.forEach(pos => {
      if (pos !== 'ALL') {
        const positionPlayers = allPlayers.filter(p => p.position === pos);
        const draftedInPosition = positionPlayers.filter(p => p.status === 'drafted'); // Only count drafted, not keepers
        stats[pos] = {
          total: positionPlayers.length,
          drafted: draftedInPosition.length
        };
      }
    });
    return stats;
  }, [players, positions]);

  // Get drafted players for legacy compatibility (only actual draft picks, not keepers)
  const getDraftedPlayers = () => {
    return Object.values(players)
      .filter(p => p.status === 'drafted') // Only drafted players, not keepers
      .sort((a, b) => a.pickNumber - b.pickNumber)
      .map(p => p.id);
  };

  // Quick draft players
  const quickDraftPlayers = useMemo(() => {
    if (!quickDraftQuery || quickDraftQuery.length < 2) return { undrafted: [], drafted: [] };

    const searchLower = quickDraftQuery.toLowerCase();
    const undraftedPlayers = [];
    const draftedMatchingPlayers = [];
    const allPlayers = getAllPlayers();

    for (let i = 0; i < allPlayers.length && (undraftedPlayers.length < 8 || draftedMatchingPlayers.length < 8); i++) {
      const player = allPlayers[i];
      const matchesSearch = player.name.toLowerCase().includes(searchLower) ||
                          player.team.toLowerCase().includes(searchLower) ||
                          player.position.toLowerCase().includes(searchLower);

      if (matchesSearch) {
        if (player.status === 'available' && undraftedPlayers.length < 8) {
          undraftedPlayers.push(player);
        } else if ((player.status === 'drafted' || player.status === 'keeper') && draftedMatchingPlayers.length < 8) {
          const pickInRound = ((player.pickNumber - 1) % numTeams) + 1;

          draftedMatchingPlayers.push({
            ...player,
            draftInfo: {
              pickNumber: player.pickNumber,
              round: player.round,
              pickInRound,
              draftingTeamId: player.teamId,
              draftingTeamName: player.teamName
            }
          });
        }
      }
    }

    undraftedPlayers.sort((a, b) => a.rank - b.rank);
    draftedMatchingPlayers.sort((a, b) => a.pickNumber - b.pickNumber);

    return { undrafted: undraftedPlayers, drafted: draftedMatchingPlayers };
  }, [quickDraftQuery, players, numTeams, teamNames]);

  const handleQuickDraft = (playerId) => {
    draftPlayer(playerId);
    setShowQuickDraft(false);
    setQuickDraftQuery('');
    setSelectedPlayerIndex(0);
  };

  // Save/load functionality
  const saveDraftState = (showMessage = false) => {
    try {
      const draftState = {
        players,
        playerRankings,
        currentDraftPick,
        numTeams,
        rosterSettings,
        positionColors,
        autoDraftSettings,
        teamVariability,
        teamNames,
        draftStyle,
        currentCSVSource,
        watchHighlightColor,
        watchHighlightOpacity,
        avoidHighlightColor,
        avoidHighlightOpacity,
        isDarkMode,
        isKeeperMode,
        lastSaved: Date.now()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState));

      if (showMessage) {
        const draftedCount = Object.values(players).filter(p => p.status === 'drafted').length;
        const keeperCount = Object.values(players).filter(p => p.status === 'keeper').length;
        const watchedCount = Object.values(players).filter(p => p.isWatched).length;
        const avoidedCount = Object.values(players).filter(p => p.isAvoided).length;
        const teamName = teamNames[currentTeam] || `Team ${currentTeam}`;

        setSaveMessage(`Saved: Pick ${currentDraftPick} (${teamName} on clock) • ${draftedCount} picks completed • ${watchedCount} watched • ${avoidedCount} avoided • ${keeperCount} keepers`);
        setShowSaveMessage(true);
        setTimeout(() => setShowSaveMessage(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save draft state:', error);
      if (showMessage) {
        setSaveMessage('Save failed - please try again');
        setShowSaveMessage(true);
        setTimeout(() => setShowSaveMessage(false), 3000);
      }
    }
  };

  const loadDraftState = () => {
    try {
      const savedState = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!savedState) return null;
      return JSON.parse(savedState);
    } catch (error) {
      console.error('Failed to load draft state:', error);
      return null;
    }
  };

  const clearDraftState = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear draft state:', error);
    }
  };

  // Load saved state on mount
  useEffect(() => {
    if (hasShownRestoreDialogRef.current) return;

    const savedState = loadDraftState();
    if (savedState?.players && Object.keys(savedState.players).length > 0) {
      if (savedState.players) setPlayers(savedState.players);
      if (savedState.playerRankings) setPlayerRankings(savedState.playerRankings);
      if (savedState.currentDraftPick !== undefined) setCurrentDraftPick(savedState.currentDraftPick);
      if (savedState.isKeeperMode !== undefined) setIsKeeperMode(savedState.isKeeperMode);
      if (savedState.currentCSVSource !== undefined) setCurrentCSVSource(savedState.currentCSVSource);

      hasShownRestoreDialogRef.current = true;

      const draftedCount = Object.values(savedState.players).filter(p => p.status === 'drafted').length;
      if (draftedCount > 0) {
        console.log(`Restored draft with ${draftedCount} picks from ${new Date(savedState.lastSaved).toLocaleString()}`);
      }
    } else {
      hasShownRestoreDialogRef.current = true;
    }
  }, []);

  // Auto-save on changes
  useEffect(() => {
    if (Object.keys(players).length > 0) {
      const timer = setTimeout(saveDraftState, 500);
      return () => clearTimeout(timer);
    }
  }, [players, currentDraftPick, numTeams, rosterSettings, autoDraftSettings,
      teamVariability, teamNames, draftStyle, isKeeperMode]);

  // Quick draft keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickDraft(true);
        setQuickDraftQuery('');
        setSelectedPlayerIndex(0);
      }
      if (e.key === 'Escape') {
        setShowQuickDraft(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tier color helper
  const getTierColor = (tier) => {
    if (!tier) return 'transparent';
    if (tier <= 3) return '#22c55e';
    if (tier <= 6) return '#84cc16';
    if (tier <= 9) return '#eab308';
    if (tier <= 12) return '#f97316';
    return '#a16207';
  };

  // Quick Draft Modal Component
  const QuickDraftModal = () => {
    if (!showQuickDraft) return null;

    const handleKeyDown = (e) => {
      const totalUndrafted = quickDraftPlayers.undrafted?.length || 0;
      if (totalUndrafted === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedPlayerIndex(prev => prev < totalUndrafted - 1 ? prev + 1 : prev);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedPlayerIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedPlayerIndex >= 0 && selectedPlayerIndex < totalUndrafted) {
            handleQuickDraft(quickDraftPlayers.undrafted[selectedPlayerIndex].id);
          }
          break;
        case 'Escape':
          setShowQuickDraft(false);
          break;
        case 'W': // Capital W for watch
          e.preventDefault();
          if (selectedPlayerIndex >= 0 && selectedPlayerIndex < totalUndrafted) {
            toggleWatchPlayer(quickDraftPlayers.undrafted[selectedPlayerIndex].id);
          }
          break;
        case 'A': // Capital A for avoid
          e.preventDefault();
          if (selectedPlayerIndex >= 0 && selectedPlayerIndex < totalUndrafted) {
            toggleAvoidPlayer(quickDraftPlayers.undrafted[selectedPlayerIndex].id);
          }
          break;
        // Lowercase letters and other characters should pass through to the input for search
        default:
          // Don't prevent default for other keys - let them go to the search input
          break;
      }
    };

    return (
      <div style={{
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
      }} onClick={() => setShowQuickDraft(false)}>
        <div style={{
          backgroundColor: themeStyles.card.backgroundColor,
          border: themeStyles.card.border,
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'hidden'
        }} onClick={(e) => e.stopPropagation()}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: themeStyles.text.primary, margin: 0 }}>
              Quick Draft
            </h3>
            <button onClick={() => setShowQuickDraft(false)} style={{
              background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer',
              color: themeStyles.text.secondary
            }}>
              ✕
            </button>
          </div>

          <div style={{
            fontSize: '14px',
            color: themeStyles.text.secondary,
            backgroundColor: themeStyles.hover.background,
            padding: '8px 12px',
            borderRadius: '6px',
            marginBottom: '16px'
          }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>Current Pick:</strong> {currentDraftPick} - {teamNames[currentTeam] || `Team ${currentTeam}`}
              {isCurrentPickKeeper() && (
                <span style={{ marginLeft: '8px', color: '#7c3aed', fontWeight: '600' }}>
                  👑 KEEPER: {isCurrentPickKeeper().name}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: themeStyles.text.muted }}>
              <strong>Hotkeys:</strong> ↑↓ navigate • Enter draft • Shift+W watch • Shift+A avoid • Esc close
            </div>
          </div>

          <input
            type="text"
            placeholder="Search players to draft..."
            value={quickDraftQuery}
            onChange={(e) => {
              setQuickDraftQuery(e.target.value);
              setSelectedPlayerIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: `2px solid ${themeStyles.border}`,
              borderRadius: '8px',
              backgroundColor: themeStyles.input.backgroundColor,
              color: themeStyles.text.primary,
              outline: 'none',
              marginBottom: '16px'
            }}
            autoFocus
          />

          <div style={{ height: '400px', overflowY: 'auto' }}>
            {/* Undrafted Players Section */}
            {quickDraftPlayers.undrafted?.length > 0 && (
              <>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: themeStyles.text.secondary,
                  padding: '8px 12px',
                  borderBottom: `1px solid ${themeStyles.border}`,
                  backgroundColor: themeStyles.hover.background,
                  marginBottom: '4px'
                }}>
                  AVAILABLE PLAYERS ({quickDraftPlayers.undrafted.length})
                </div>

                {quickDraftPlayers.undrafted.map((player, index) => {
                  const isSelected = index === selectedPlayerIndex;
                  const isWatched = player.isWatched;
                  const isAvoided = player.isAvoided;

                  return (
                    <div
                      key={player.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginBottom: '2px',
                        backgroundColor: isSelected ? '#2563eb' : (
                          isWatched ? `${watchHighlightColor}30` :
                          isAvoided ? `${avoidHighlightColor}30` : 'transparent'
                        ),
                        color: isSelected ? '#ffffff' : themeStyles.text.primary,
                        borderLeft: isWatched ? `4px solid ${watchHighlightColor}` :
                                   isAvoided ? `4px solid ${avoidHighlightColor}` : 'none'
                      }}
                      onClick={() => handleQuickDraft(player.id)}
                      onMouseEnter={() => setSelectedPlayerIndex(index)}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {player.name}
                          {isWatched && <span style={{ marginLeft: '8px', fontSize: '12px' }}>👁️</span>}
                          {isAvoided && <span style={{ marginLeft: '8px', fontSize: '12px' }}>🚫</span>}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: isSelected ? '#e0e7ff' : themeStyles.text.secondary
                        }}>
                          {player.position} • {player.team} • #{player.rank}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginLeft: '12px',
                        opacity: isSelected ? 1 : 0.7
                      }}>
                        {/* Watch button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchPlayer(player.id);
                          }}
                          style={{
                            padding: '4px 6px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                            backgroundColor: isWatched ? watchHighlightColor : (isSelected ? 'rgba(255,255,255,0.2)' : themeStyles.button.secondary.backgroundColor),
                            color: isWatched ? '#ffffff' : (isSelected ? '#ffffff' : themeStyles.text.secondary)
                          }}
                          title="Watch (W key)"
                        >
                          👁️
                        </button>

                        {/* Avoid button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAvoidPlayer(player.id);
                          }}
                          style={{
                            padding: '4px 6px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                            backgroundColor: isAvoided ? avoidHighlightColor : (isSelected ? 'rgba(255,255,255,0.2)' : themeStyles.button.secondary.backgroundColor),
                            color: isAvoided ? '#ffffff' : (isSelected ? '#ffffff' : themeStyles.text.secondary)
                          }}
                          title="Avoid (A key)"
                        >
                          🚫
                        </button>

                        {/* Draft button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickDraft(player.id);
                          }}
                          style={{
                            padding: '4px 8px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '500',
                            transition: 'all 0.2s',
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.9)' : '#16a34a',
                            color: isSelected ? '#2563eb' : '#ffffff'
                          }}
                          title="Draft (Enter key)"
                        >
                          DRAFT
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Drafted Players Section */}
            {quickDraftPlayers.drafted?.length > 0 && (
              <>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: themeStyles.text.secondary,
                  padding: '8px 12px',
                  borderBottom: `1px solid ${themeStyles.border}`,
                  backgroundColor: themeStyles.hover.background,
                  marginTop: quickDraftPlayers.undrafted?.length > 0 ? '16px' : '0',
                  marginBottom: '4px'
                }}>
                  ALREADY DRAFTED ({quickDraftPlayers.drafted.length})
                </div>

                {quickDraftPlayers.drafted.map((player) => (
                  <div
                    key={player.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '2px',
                      backgroundColor: themeStyles.hover.background,
                      opacity: 0.7
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '500',
                        marginBottom: '4px',
                        color: themeStyles.text.primary,
                        textDecoration: 'line-through',
                        textDecorationColor: themeStyles.text.secondary,
                        textDecorationThickness: '2px'
                      }}>
                        {player.name}
                        {player.status === 'keeper' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#7c3aed' }}>👑</span>}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: themeStyles.text.secondary
                      }}>
                        {player.position} • {player.team} • #{player.rank}
                      </div>
                    </div>

                    {/* Draft info */}
                    <div style={{
                      textAlign: 'right',
                      fontSize: '11px',
                      color: themeStyles.text.muted
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                        Pick #{player.draftInfo.pickNumber}
                      </div>
                      <div>
                        R{player.draftInfo.round} • {player.draftInfo.draftingTeamName}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {quickDraftQuery.length >= 2 && quickDraftPlayers.undrafted?.length === 0 && quickDraftPlayers.drafted?.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: themeStyles.text.muted,
                padding: '40px 20px'
              }}>
                No players found matching "{quickDraftQuery}"
              </div>
            )}

            {quickDraftQuery.length < 2 && (
              <div style={{
                textAlign: 'center',
                color: themeStyles.text.muted,
                padding: '40px 20px'
              }}>
                Type at least 2 characters to search...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const styles = {
    container: {
      ...themeStyles.container,
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    stickyHeader: {
      position: 'sticky',
      top: '0',
      zIndex: 100,
      backgroundColor: themeStyles.container.backgroundColor,
      borderBottom: `1px solid ${themeStyles.border}`,
      padding: '12px 0',
      marginBottom: '24px'
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 16px',
      backgroundColor: '#2563eb',
      color: '#ffffff',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      position: 'relative'
    },
    pyScriptStatus: {
      position: 'absolute',
      left: '16px',
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.8)',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    csvSourceIndicator: {
      position: 'absolute',
      right: '16px',
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.8)'
    }
  };

  return (
    <div style={styles.container}>
      <QuickDraftModal />

      {/* Sticky Header */}
      {Object.keys(players).length > 0 && (
        <div style={styles.stickyHeader}>
          <div style={styles.headerContent}>
            <div style={styles.pyScriptStatus}>
              {isPyScriptReady ? (
                <>
                  <span style={{ color: '#16a34a' }}>🐍</span>
                  PyScript Ready
                </>
              ) : (
                <>
                  <span style={{ color: '#f59e0b' }}>⏳</span>
                  Loading...
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isKeeperMode && (
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  👑 {getKeepers().length} Keepers
                </div>
              )}

              {(() => {
                const keeperPick = isCurrentPickKeeper();
                if (keeperPick) {
                  return (
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      👑 KEEPER: {keeperPick.name}
                    </div>
                  );
                } else {
                  return (
                    <span>
                      📍 Pick {currentDraftPick} - {teamNames[currentTeam] || `Team ${currentTeam}`} On The Clock
                    </span>
                  );
                }
              })()}
            </div>

            {currentCSVSource && (
              <div style={styles.csvSourceIndicator}>
                Using: {currentCSVSource}
              </div>
            )}
          </div>

          {/* Save Message */}
          {showSaveMessage && (
            <div style={{
              backgroundColor: '#16a34a',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              marginTop: '8px',
              textAlign: 'center',
              animation: 'fadeInOut 3s ease-in-out',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              {saveMessage}
            </div>
          )}
        </div>
      )}

      {/* File Upload Area */}
      {Object.keys(players).length === 0 && (
        <FileUpload
          onFileUpload={handleFileUpload}
          isDragOver={isDragOver}
          setIsDragOver={setIsDragOver}
          themeStyles={themeStyles}
        />
      )}

      {Object.keys(players).length > 0 && (
        <>
          {/* Control Panel */}
          <UnifiedControlPanel
            themeStyles={themeStyles}
            undoLastDraft={undoLastDraft}
            draftedPlayers={getDraftedPlayers()}
            onNewCSV={handleFileUpload}
            onSwitchCSV={handleCSVSwitch}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            players={getAllPlayers()}
            draftPlayer={draftPlayer}
            onRestartDraft={restartDraft}
            onNewDraft={handleNewDraft}
            onSaveDraft={() => saveDraftState(true)}
            onClearSavedState={clearDraftState}
            watchedPlayers={Object.values(players).filter(p => p.isWatched).map(p => p.id)}
            toggleWatchPlayer={toggleWatchPlayer}
            isPlayerWatched={isPlayerWatched}
            avoidedPlayers={Object.values(players).filter(p => p.isAvoided).map(p => p.id)}
            toggleAvoidPlayer={toggleAvoidPlayer}
            isPlayerAvoided={isPlayerAvoided}
            watchHighlightColor={watchHighlightColor}
            avoidHighlightColor={avoidHighlightColor}
            isKeeperMode={isKeeperMode}
            setIsKeeperMode={setIsKeeperMode}
            keepers={getKeepers()}
            teamNames={teamNames}
            numTeams={numTeams}
          />

          {/* Keeper Mode Panel - Only show when keeper mode is enabled */}
          {isKeeperMode && (
            <KeeperModePanel
              isKeeperMode={isKeeperMode}
              setIsKeeperMode={setIsKeeperMode}
              keepers={getKeepers()}
              setKeepers={updateKeepers}
              players={getAllPlayers()}
              numTeams={numTeams}
              teamNames={teamNames}
              draftStyle={draftStyle}
              themeStyles={themeStyles}
              getCurrentTeam={getCurrentTeam}
              draftPlayer={draftPlayer}
            />
          )}

          {/* Settings Panel */}
          <SettingsPanel
            numTeams={numTeams}
            setNumTeams={setNumTeams}
            rosterSettings={rosterSettings}
            setRosterSettings={setRosterSettings}
            positionColors={positionColors}
            setPositionColors={setPositionColors}
            autoDraftSettings={autoDraftSettings}
            setAutoDraftSettings={setAutoDraftSettings}
            isAutoDrafting={isAutoDrafting}
            setIsAutoDrafting={setIsAutoDrafting}
            isDraftRunning={isDraftRunning}
            startDraftSequence={() => {}}
            draftSpeed={draftSpeed}
            setDraftSpeed={setDraftSpeed}
            draftStyle={draftStyle}
            setDraftStyle={setDraftStyle}
            teamNames={teamNames}
            setTeamNames={setTeamNames}
            teamVariability={teamVariability}
            setTeamVariability={setTeamVariability}
            draftStats={draftStats}
            draftedPlayers={getDraftedPlayers()}
            players={getAllPlayers()}
            themeStyles={themeStyles}
          />

          {/* Player Rankings */}
          <PlayerList
            setShowDrafted={setShowDrafted}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            setWatchHighlightColor={setWatchHighlightColor}
            setAvoidHighlightColor={setAvoidHighlightColor}
            setShowAvailabilityPrediction={setShowAvailabilityPrediction}
            predictionTrials={predictionTrials}
            setPredictionTrials={setPredictionTrials}
            onPredictAvailability={() => {}} // Placeholder
            isPredicting={isPredicting}
            lastPredictionTime={lastPredictionTime}
            filteredPlayers={filteredPlayers}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            positions={positions}
            draftedPlayers={getDraftedPlayers()}
            draftPlayer={draftPlayer}
            searchQuery={searchQuery}
            selectedPosition={selectedPosition}
            setSelectedPosition={setSelectedPosition}
            playersByPosition={playersByPosition}
            positionColors={positionColors}
            showDrafted={showDrafted}
            themeStyles={themeStyles}
            watchedPlayers={Object.values(players).filter(p => p.isWatched).map(p => p.id)}
            toggleWatchPlayer={toggleWatchPlayer}
            isPlayerWatched={isPlayerWatched}
            watchHighlightColor={watchHighlightColor}
            watchHighlightOpacity={watchHighlightOpacity}
            setWatchHighlightOpacity={setWatchHighlightOpacity}
            avoidedPlayers={Object.values(players).filter(p => p.isAvoided).map(p => p.id)}
            toggleAvoidPlayer={toggleAvoidPlayer}
            isPlayerAvoided={isPlayerAvoided}
            avoidHighlightColor={avoidHighlightColor}
            avoidHighlightOpacity={avoidHighlightOpacity}
            setAvoidHighlightOpacity={setAvoidHighlightOpacity}
            getTierColor={getTierColor}
            showAvailabilityPrediction={showAvailabilityPrediction}
            availabilityPredictions={availabilityPredictions}
            // Add players object so PlayerList can check status directly
            players={players}
          />

          {/* Teams Display */}
          <TeamBoards
            teams={teams}
            currentTeam={currentTeam}
            positionColors={positionColors}
            themeStyles={themeStyles}
            teamNames={teamNames}
            players={getAllPlayers()}
            draftedPlayers={getDraftedPlayers()}
            draftStyle={draftStyle}
            numTeams={numTeams}
            currentDraftPick={currentDraftPick}
            keepers={getKeepers()}
          />
        </>
      )}

      <style>
        {`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-10px); }
            15% { opacity: 1; transform: translateY(0); }
            85% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-10px); }
          }
        `}
      </style>
    </div>
  );
};

const DraftTracker = () => {
  return (
    <ThemeProvider>
      <DraftTrackerContent />
    </ThemeProvider>
  );
};

export default DraftTracker;
