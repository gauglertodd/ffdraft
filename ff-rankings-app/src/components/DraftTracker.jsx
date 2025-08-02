// Updated DraftTracker.jsx with improved Keeper Mode functionality

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

  // Core state
  const [players, setPlayers] = useState([]);
  const [draftedPlayers, setDraftedPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [showDrafted, setShowDrafted] = useState(true);
  const [activeTab, setActiveTab] = useState('overall');
  const [currentDraftPick, setCurrentDraftPick] = useState(1);
  const [currentCSVSource, setCurrentCSVSource] = useState('');

  // Watch and Avoid lists
  const [watchedPlayers, setWatchedPlayers] = useState([]);
  const [avoidedPlayers, setAvoidedPlayers] = useState([]);
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

  // Keeper mode
  const [isKeeperMode, setIsKeeperMode] = useState(false);
  const [keepers, setKeepers] = useState([]);

  // Auto-draft settings
  const [autoDraftSettings, setAutoDraftSettings] = useState({});
  const [isAutoDrafting, setIsAutoDrafting] = useState(false);
  const [isDraftRunning, setIsDraftRunning] = useState(false);
  const [draftSpeed, setDraftSpeed] = useState('fast');
  const [draftStyle, setDraftStyle] = useState('snake');
  const [teamNames, setTeamNames] = useState({});
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

  // Save feedback state
  const [saveMessage, setSaveMessage] = useState('');
  const [showSaveMessage, setShowSaveMessage] = useState(false);

  // Save/load draft state (updated to include avoided players and keepers)
  const saveDraftState = (showMessage = false) => {
    try {
      const draftState = {
        draftedPlayers, currentDraftPick, watchedPlayers, avoidedPlayers, numTeams, rosterSettings,
        positionColors, autoDraftSettings, teamVariability, teamNames, draftStyle,
        players, currentCSVSource, watchHighlightColor, watchHighlightOpacity,
        avoidHighlightColor, avoidHighlightOpacity, isDarkMode, isKeeperMode, keepers, lastSaved: Date.now()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState));

      // Only show save confirmation message when explicitly requested
      if (showMessage) {
        const teamName = teamNames[currentTeam] || `Team ${currentTeam}`;
        setSaveMessage(`Saved: Pick ${currentDraftPick} (${teamName} on clock) • ${draftedPlayers.length} picks completed • ${watchedPlayers.length} watched • ${avoidedPlayers.length} avoided • ${keepers.length} keepers`);
        setShowSaveMessage(true);

        // Hide message after 3 seconds
        setTimeout(() => {
          setShowSaveMessage(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to save draft state:', error);
      if (showMessage) {
        setSaveMessage('Save failed - please try again');
        setShowSaveMessage(true);
        setTimeout(() => {
          setShowSaveMessage(false);
        }, 3000);
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

  // Load saved state on mount (updated to include avoided players and keepers)
  useEffect(() => {
    if (hasShownRestoreDialogRef.current) return;

    const savedState = loadDraftState();
    if (savedState?.players?.length > 0) {
      // Restore state with explicit setters
      if (savedState.players !== undefined) setPlayers(savedState.players);
      if (savedState.draftedPlayers !== undefined) setDraftedPlayers(savedState.draftedPlayers);
      if (savedState.currentDraftPick !== undefined) setCurrentDraftPick(savedState.currentDraftPick);
      if (savedState.watchedPlayers !== undefined) setWatchedPlayers(savedState.watchedPlayers);
      if (savedState.avoidHighlightColor !== undefined) setAvoidHighlightColor(savedState.avoidHighlightColor);
      if (savedState.avoidHighlightOpacity !== undefined) setAvoidHighlightOpacity(savedState.avoidHighlightOpacity);
      if (savedState.isKeeperMode !== undefined) setIsKeeperMode(savedState.isKeeperMode);
      if (savedState.keepers !== undefined) setKeepers(savedState.keepers);

      hasShownRestoreDialogRef.current = true;

      // Optional: Show a brief toast notification instead of blocking popup
      if (savedState.draftedPlayers?.length > 0) {
        console.log(`Restored draft with ${savedState.draftedPlayers.length} picks from ${new Date(savedState.lastSaved).toLocaleString()}`);
      }
    } else {
      hasShownRestoreDialogRef.current = true;
    }
  }, []);

  // Auto-save on changes (updated to include avoided players and keepers)
  useEffect(() => {
    if (players.length > 0) {
      const timer = setTimeout(saveDraftState, 500);
      return () => clearTimeout(timer);
    }
  }, [draftedPlayers, currentDraftPick, watchedPlayers, avoidedPlayers, numTeams, rosterSettings,
      autoDraftSettings, teamVariability, teamNames, draftStyle, players, isKeeperMode, keepers]);

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

  // File upload handlers
  const handleFileUpload = (file, isSwitch = false) => {
    if (file?.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedPlayers = parseCSV(e.target.result);
          setPlayers(parsedPlayers);
          setCurrentCSVSource(file.name);

          if (!isSwitch) {
            // Reset draft state for new upload
            setDraftedPlayers([]);
            setCurrentDraftPick(1);
            setWatchedPlayers([]);
            setAvoidedPlayers([]);
            setAvailabilityPredictions({});
            setIsKeeperMode(false);
            setKeepers([]);
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

  // Draft helpers
  const getCurrentTeam = (pickNumber) => {
    const round = Math.floor((pickNumber - 1) / numTeams);
    const position = (pickNumber - 1) % numTeams;

    if (draftStyle === 'snake') {
      return round % 2 === 0 ? position + 1 : numTeams - position;
    }
    return position + 1;
  };

  const currentTeam = getCurrentTeam(currentDraftPick);

  // NEW: Check if current pick should be a keeper
  const isCurrentPickKeeper = () => {
    if (!isKeeperMode) return null;
    return keepers.find(k => k.pickNumber === currentDraftPick);
  };

  // NEW: Apply keepers to teams immediately when they're set (not at draft start)
  // This function is no longer needed since we don't pre-draft keepers
  // We'll handle them dynamically in the team generation and draft process

  // Modified draft player function to handle keepers properly
  const draftPlayer = (playerId) => {
    // Check if we're trying to draft at a keeper position
    const keeperAtCurrentPick = isCurrentPickKeeper();

    if (keeperAtCurrentPick && playerId !== keeperAtCurrentPick.playerId) {
      alert(`This pick is reserved for keeper: ${keeperAtCurrentPick.playerName}`);
      return;
    }

    // Check if this player is already drafted (including as a keeper)
    const isAlreadyDrafted = draftedPlayers.includes(playerId) ||
                            keepers.some(k => k.playerId === playerId && k.pickNumber <= currentDraftPick);

    if (isAlreadyDrafted) {
      alert('This player has already been drafted or is a keeper.');
      return;
    }

    // Add to drafted players
    setDraftedPlayers(prev => [...prev, playerId]);

    // Find next available pick (skip keeper positions)
    let nextPick = currentDraftPick + 1;
    while (keepers.some(k => k.pickNumber === nextPick)) {
      nextPick++;
    }
    setCurrentDraftPick(nextPick);

    setAvailabilityPredictions({});
  };

  const undoLastDraft = () => {
    if (draftedPlayers.length === 0) return;

    const lastDraftedPlayerId = draftedPlayers[draftedPlayers.length - 1];

    // Check if the last drafted player was a keeper (shouldn't happen but good safeguard)
    const wasKeeper = keepers.some(k => k.playerId === lastDraftedPlayerId);

    if (wasKeeper) {
      alert("Cannot undo a keeper pick. Please modify keepers in the Keeper Mode panel instead.");
      return;
    }

    setDraftedPlayers(prev => prev.slice(0, -1));

    // Find the previous non-keeper pick
    let prevPick = currentDraftPick - 1;
    while (prevPick > 0 && keepers.some(k => k.pickNumber === prevPick)) {
      prevPick--;
    }
    setCurrentDraftPick(Math.max(1, prevPick));

    setAvailabilityPredictions({});
  };

  const restartDraft = () => {
    if (window.confirm("Restart draft? This clears all picks but keeps settings and keepers.")) {
      setDraftedPlayers([]);

      // Find the first non-keeper pick
      let firstPick = 1;
      while (keepers.some(k => k.pickNumber === firstPick)) {
        firstPick++;
      }
      setCurrentDraftPick(firstPick);

      setWatchedPlayers([]);
      setAvoidedPlayers([]);
      setIsAutoDrafting(false);
      setIsDraftRunning(false);
      setAvailabilityPredictions({});

      // Save the cleared state
      saveDraftState();
    }
  };

  const handleNewDraft = () => {
    if (window.confirm("Start completely new draft? This clears everything including keepers.")) {
      setDraftedPlayers([]);
      setCurrentDraftPick(1);
      setWatchedPlayers([]);
      setAvoidedPlayers([]);
      setIsAutoDrafting(false);
      setIsDraftRunning(false);
      setAvailabilityPredictions({});
      setIsKeeperMode(false);
      setKeepers([]);
      hasShownRestoreDialogRef.current = false;
      clearDraftState();
    }
  };

  // Watch list functions
  const toggleWatchPlayer = (playerId) => {
    // If player is avoided, remove from avoid list when adding to watch
    if (avoidedPlayers.includes(playerId)) {
      setAvoidedPlayers(prev => prev.filter(id => id !== playerId));
    }

    setWatchedPlayers(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const isPlayerWatched = (playerId) => watchedPlayers.includes(playerId);

  // Avoid list functions
  const toggleAvoidPlayer = (playerId) => {
    // If player is watched, remove from watch list when adding to avoid
    if (watchedPlayers.includes(playerId)) {
      setWatchedPlayers(prev => prev.filter(id => id !== playerId));
    }

    setAvoidedPlayers(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const isPlayerAvoided = (playerId) => avoidedPlayers.includes(playerId);

  // Auto-draft system (updated to handle keepers and avoid avoided players)
  const getDraftDelay = () => {
    const delays = { instant: 50, fast: 200, normal: 800, slow: 2000 };
    return delays[draftSpeed] || 500;
  };

  const executeLocalFallback = (availablePlayers, strategy) => {
    if (!availablePlayers.length) return null;

    // Filter out avoided players
    const nonAvoidedPlayers = availablePlayers.filter(p => !avoidedPlayers.includes(p.id));
    const playersToConsider = nonAvoidedPlayers.length > 0 ? nonAvoidedPlayers : availablePlayers;

    switch (strategy) {
      case 'bpa':
        return playersToConsider.sort((a, b) => a.rank - b.rank)[0]?.id;
      case 'tier':
        const tieredPlayers = playersToConsider.filter(p => p.tier);
        if (tieredPlayers.length) {
          return tieredPlayers.sort((a, b) => a.tier - b.tier || a.rank - b.rank)[0]?.id;
        }
        return playersToConsider.sort((a, b) => a.rank - b.rank)[0]?.id;
      default:
        return playersToConsider.sort((a, b) => a.rank - b.rank)[0]?.id;
    }
  };

  const callAutoDraftPyScript = async (availablePlayers, teamRoster, strategy, variability = 0.0) => {
    if (!isPyScriptReady) return null;

    try {
      // Filter out avoided players before sending to PyScript
      const nonAvoidedPlayers = availablePlayers.filter(p => !avoidedPlayers.includes(p.id));
      const playersToConsider = nonAvoidedPlayers.length > 0 ? nonAvoidedPlayers : availablePlayers;

      // Ensure team roster includes roster requirements for proper DST/K handling
      const enhancedTeamRoster = {
        ...teamRoster,
        roster_requirements: rosterSettings
      };

      const resultJson = window.pyAutoDraft(
        JSON.stringify(playersToConsider),
        JSON.stringify(enhancedTeamRoster),
        strategy,
        variability
      );
      const result = JSON.parse(resultJson);
      return result.error ? null : result;
    } catch (error) {
      console.error('PyScript auto-draft error:', error);
      return null;
    }
  };

  // Updated auto-draft execution to skip keeper picks
  useEffect(() => {
    if (!isPyScriptReady || !isAutoDrafting || !players.length || isDraftRunning) return;

    // Calculate total roster spots
    const totalRosterSpots = numTeams * Object.values(rosterSettings).reduce((sum, count) => sum + count, 0);

    // Stop if draft is complete
    if (draftedPlayers.length >= totalRosterSpots || draftedPlayers.length >= players.length) {
      setIsAutoDrafting(false);
      setIsDraftRunning(false);
      return;
    }

    // Check if current pick is a keeper - if so, skip it (keepers are shown but not auto-drafted)
    const keeperPick = isCurrentPickKeeper();
    if (keeperPick) {
      // Skip to next non-keeper pick
      let nextPick = currentDraftPick + 1;
      while (keepers.some(k => k.pickNumber === nextPick)) {
        nextPick++;
      }
      setCurrentDraftPick(nextPick);
      return;
    }

    const teamStrategy = autoDraftSettings[currentTeam];
    if (!teamStrategy || teamStrategy === 'manual') return;

    const executeAutoDraft = async () => {
      // Filter out players that are already drafted or are keepers
      const keeperPlayerIds = keepers.map(k => k.playerId);
      const availablePlayers = players.filter(p =>
        !draftedPlayers.includes(p.id) && !keeperPlayerIds.includes(p.id)
      );
      const currentTeamData = teams.find(t => t.id === currentTeam);

      if (!availablePlayers.length || !currentTeamData) return;

      try {
        // Get the actual variability value, ensuring 0 is treated as valid
        const teamVar = teamVariability[currentTeam];
        const actualVariability = teamVar !== undefined ? teamVar : 0.3;

        const result = await callAutoDraftPyScript(availablePlayers, currentTeamData, teamStrategy, actualVariability);

        if (result?.player_id) {
          draftPlayer(result.player_id);
        } else {
          // Fallback
          const fallbackPlayer = executeLocalFallback(availablePlayers, teamStrategy);
          if (fallbackPlayer) draftPlayer(fallbackPlayer);
        }
      } catch (error) {
        console.error('Auto-draft error:', error);
      }
    };

    const timer = setTimeout(executeAutoDraft, getDraftDelay());
    return () => clearTimeout(timer);
  }, [currentDraftPick, isAutoDrafting, autoDraftSettings, players.length,
      draftedPlayers.length, isDraftRunning, draftStyle, numTeams, isPyScriptReady, teamVariability, keepers]);

  // Availability prediction
  const predictPlayerAvailability = async (force = false) => {
    if (!isPyScriptReady || (!force && isPredicting)) return;

    setIsPredicting(true);
    try {
      const availablePlayers = players.filter(p => !draftedPlayers.includes(p.id));
      const resultJson = window.pyPredictAvailability(
        JSON.stringify(availablePlayers),
        JSON.stringify(teams),
        currentDraftPick,
        currentTeam,
        numTeams,
        draftStyle,
        predictionTrials,
        JSON.stringify(teamVariability)
      );

      const result = JSON.parse(resultJson);
      if (!result.error) {
        setAvailabilityPredictions(result.availability_predictions);
        setLastPredictionTime(Date.now());
      }
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setIsPredicting(false);
    }
  };

  // Auto-predict when it's a manual team's turn
  useEffect(() => {
    if (isPyScriptReady && showAvailabilityPrediction && !isPredicting &&
        players.length > 0 && !isDraftRunning && draftedPlayers.length > 0) {
      const currentTeamStrategy = autoDraftSettings[currentTeam];
      if (!currentTeamStrategy || currentTeamStrategy === 'manual') {
        setTimeout(() => predictPlayerAvailability(false), 1000);
      }
    }
  }, [currentDraftPick, currentTeam, showAvailabilityPrediction, isDraftRunning]);

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

  // Generate teams with roster slots - UPDATED to show keeper assignments
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

    // Create a comprehensive list of all picks (drafted + keeper positions)
    const allPicks = [];

    // Add all drafted players
    draftedPlayers.forEach((playerId, draftIndex) => {
      const pickNumber = draftIndex + 1;
      const teamId = getCurrentTeam(pickNumber);
      const player = players.find(p => p.id === playerId);
      if (player) {
        allPicks.push({
          pickNumber,
          teamId,
          player,
          isKeeper: keepers.some(k => k.playerId === playerId && k.pickNumber === pickNumber)
        });
      }
    });

    // Add keeper positions that haven't been drafted yet
    keepers.forEach(keeper => {
      // Only add if this keeper position hasn't been filled by the draft yet
      const alreadyDrafted = allPicks.some(pick => pick.pickNumber === keeper.pickNumber);
      if (!alreadyDrafted) {
        const player = players.find(p => p.id === keeper.playerId);
        if (player) {
          allPicks.push({
            pickNumber: keeper.pickNumber,
            teamId: keeper.teamId,
            player,
            isKeeper: true
          });
        }
      }
    });

    // Sort all picks by pick number to process them in draft order
    allPicks.sort((a, b) => a.pickNumber - b.pickNumber);

    // Assign players to team rosters
    allPicks.forEach(pick => {
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
  }, [numTeams, rosterSettings, draftedPlayers, players, draftStyle, teamNames, keepers]);

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
        // Explicitly check if the value exists, don't use || operator which treats 0 as falsy
        newVariability[i] = prev[i] !== undefined ? prev[i] : 0.3;
      }
      return newVariability;
    });
  }, [numTeams]);

  // Computed values
  const positions = useMemo(() => {
    const posSet = new Set(players.map(p => p.position));
    return ['ALL', ...Array.from(posSet).sort()];
  }, [players]);

  const playersByPosition = useMemo(() => {
    const byPosition = {};
    positions.forEach(pos => {
      if (pos === 'ALL') {
        byPosition[pos] = players;
      } else {
        const posPlayers = players.filter(p => p.position === pos);
        byPosition[pos] = posPlayers.map((player, index) => ({
          ...player,
          positionRank: index + 1
        }));
      }
    });
    return byPosition;
  }, [players, positions]);

  const filteredPlayers = useMemo(() => {
    const baseList = activeTab === 'overall' ? players : (playersByPosition[activeTab] || []);
    return baseList.filter(player => {
      const matchesSearch = searchQuery === '' ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition;

      // Player is considered "drafted" if they're in draftedPlayers OR they're a keeper
      const isPlayerDrafted = draftedPlayers.includes(player.id) ||
                             keepers.some(k => k.playerId === player.id);
      const matchesDrafted = showDrafted || !isPlayerDrafted;

      return matchesSearch && matchesPosition && matchesDrafted;
    });
  }, [players, playersByPosition, activeTab, searchQuery, selectedPosition, showDrafted, draftedPlayers, keepers]);

  const draftStats = useMemo(() => {
    const stats = {};
    positions.forEach(pos => {
      if (pos !== 'ALL') {
        const positionPlayers = players.filter(p => p.position === pos);
        const draftedInPosition = positionPlayers.filter(p => draftedPlayers.includes(p.id));
        stats[pos] = {
          total: positionPlayers.length,
          drafted: draftedInPosition.length
        };
      }
    });
    return stats;
  }, [players, draftedPlayers, positions]);

  // Quick draft players (updated to include drafted players)
  const quickDraftPlayers = useMemo(() => {
    if (!quickDraftQuery || quickDraftQuery.length < 2) return { undrafted: [], drafted: [] };

    const searchLower = quickDraftQuery.toLowerCase();
    const undraftedPlayers = [];
    const draftedMatchingPlayers = [];

    for (let i = 0; i < players.length && (undraftedPlayers.length < 8 || draftedMatchingPlayers.length < 8); i++) {
      const player = players[i];
      const matchesSearch = player.name.toLowerCase().includes(searchLower) ||
                          player.team.toLowerCase().includes(searchLower) ||
                          player.position.toLowerCase().includes(searchLower);

      if (matchesSearch) {
        if (!draftedPlayers.includes(player.id) && undraftedPlayers.length < 8) {
          undraftedPlayers.push(player);
        } else if (draftedPlayers.includes(player.id) && draftedMatchingPlayers.length < 8) {
          // Add draft info to player
          const draftIndex = draftedPlayers.indexOf(player.id);
          const pickNumber = draftIndex + 1;
          const round = Math.floor(draftIndex / numTeams) + 1;
          const pickInRound = (draftIndex % numTeams) + 1;
          const draftingTeamId = getCurrentTeam(pickNumber);
          const draftingTeamName = teamNames[draftingTeamId] || `Team ${draftingTeamId}`;

          draftedMatchingPlayers.push({
            ...player,
            draftInfo: {
              pickNumber,
              round,
              pickInRound,
              draftingTeamId,
              draftingTeamName
            }
          });
        }
      }
    }

    undraftedPlayers.sort((a, b) => a.rank - b.rank);
    draftedMatchingPlayers.sort((a, b) => a.draftInfo.pickNumber - b.draftInfo.pickNumber);

    return { undrafted: undraftedPlayers, drafted: draftedMatchingPlayers };
  }, [quickDraftQuery, players, draftedPlayers, numTeams, teamNames]);

  const handleQuickDraft = (playerId) => {
    draftPlayer(playerId);
    setShowQuickDraft(false);
    setQuickDraftQuery('');
    setSelectedPlayerIndex(0);
  };

  // Tier color helper
  const getTierColor = (tier) => {
    if (!tier) return 'transparent';
    if (tier <= 3) return '#22c55e';
    if (tier <= 6) return '#84cc16';
    if (tier <= 9) return '#eab308';
    if (tier <= 12) return '#f97316';
    return '#a16207';
  };

  // Quick Draft Modal Component (same as before)
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
        case 'w':
          e.preventDefault();
          if (selectedPlayerIndex >= 0 && selectedPlayerIndex < totalUndrafted) {
            toggleWatchPlayer(quickDraftPlayers.undrafted[selectedPlayerIndex].id);
          }
          break;
        case 'a':
          e.preventDefault();
          if (selectedPlayerIndex >= 0 && selectedPlayerIndex < totalUndrafted) {
            toggleAvoidPlayer(quickDraftPlayers.undrafted[selectedPlayerIndex].id);
          }
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
                  👑 KEEPER: {isCurrentPickKeeper().playerName}
                </span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: themeStyles.text.muted }}>
              <strong>Hotkeys:</strong> ↑↓ navigate • Enter draft • W watch • A avoid • Esc close
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
                  const isWatched = isPlayerWatched(player.id);
                  const isAvoided = isPlayerAvoided(player.id);

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

            {quickDraftQuery.length >= 2 && quickDraftPlayers.undrafted?.length === 0 && (
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
      {players.length > 0 && (
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
                  👑 {keepers.length} Keepers
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
                      👑 KEEPER: {keeperPick.playerName}
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
      {players.length === 0 && (
        <FileUpload
          onFileUpload={handleFileUpload}
          isDragOver={isDragOver}
          setIsDragOver={setIsDragOver}
          themeStyles={themeStyles}
        />
      )}

      {players.length > 0 && (
        <>
          {/* Control Panel */}
          <UnifiedControlPanel
            themeStyles={themeStyles}
            undoLastDraft={undoLastDraft}
            draftedPlayers={draftedPlayers}
            onNewCSV={handleFileUpload}
            onSwitchCSV={handleCSVSwitch}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            players={players}
            draftPlayer={draftPlayer}
            onRestartDraft={restartDraft}
            onNewDraft={handleNewDraft}
            onSaveDraft={() => saveDraftState(true)}
            onClearSavedState={clearDraftState}
            watchedPlayers={watchedPlayers}
            toggleWatchPlayer={toggleWatchPlayer}
            isPlayerWatched={isPlayerWatched}
            avoidedPlayers={avoidedPlayers}
            toggleAvoidPlayer={toggleAvoidPlayer}
            isPlayerAvoided={isPlayerAvoided}
            watchHighlightColor={watchHighlightColor}
            avoidHighlightColor={avoidHighlightColor}
            isKeeperMode={isKeeperMode}
            setIsKeeperMode={setIsKeeperMode}
            keepers={keepers}
          />

          {/* Keeper Mode Panel - Only show when keeper mode is enabled */}
          {isKeeperMode && (
            <KeeperModePanel
              isKeeperMode={isKeeperMode}
              setIsKeeperMode={setIsKeeperMode}
              keepers={keepers}
              setKeepers={setKeepers}
              players={players}
              numTeams={numTeams}
              teamNames={teamNames}
              draftStyle={draftStyle}
              themeStyles={themeStyles}
              getCurrentTeam={getCurrentTeam}
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
            startDraftSequence={() => {}} // Remove the startDraftSequence since we handle it differently now
            draftSpeed={draftSpeed}
            setDraftSpeed={setDraftSpeed}
            draftStyle={draftStyle}
            setDraftStyle={setDraftStyle}
            teamNames={teamNames}
            setTeamNames={setTeamNames}
            teamVariability={teamVariability}
            setTeamVariability={setTeamVariability}
            draftStats={draftStats}
            draftedPlayers={draftedPlayers}
            players={players}
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
            onPredictAvailability={() => predictPlayerAvailability(true)}
            isPredicting={isPredicting}
            lastPredictionTime={lastPredictionTime}
            filteredPlayers={filteredPlayers}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            positions={positions}
            draftedPlayers={draftedPlayers}
            draftPlayer={draftPlayer}
            searchQuery={searchQuery}
            selectedPosition={selectedPosition}
            setSelectedPosition={setSelectedPosition}
            playersByPosition={playersByPosition}
            positionColors={positionColors}
            showDrafted={showDrafted}
            themeStyles={themeStyles}
            watchedPlayers={watchedPlayers}
            toggleWatchPlayer={toggleWatchPlayer}
            isPlayerWatched={isPlayerWatched}
            watchHighlightColor={watchHighlightColor}
            watchHighlightOpacity={watchHighlightOpacity}
            setWatchHighlightOpacity={setWatchHighlightOpacity}
            avoidedPlayers={avoidedPlayers}
            toggleAvoidPlayer={toggleAvoidPlayer}
            isPlayerAvoided={isPlayerAvoided}
            avoidHighlightColor={avoidHighlightColor}
            avoidHighlightOpacity={avoidHighlightOpacity}
            setAvoidHighlightOpacity={setAvoidHighlightOpacity}
            getTierColor={getTierColor}
            showAvailabilityPrediction={showAvailabilityPrediction}
            availabilityPredictions={availabilityPredictions}
          />

          {/* Teams Display */}
          <TeamBoards
            teams={teams}
            currentTeam={currentTeam}
            positionColors={positionColors}
            themeStyles={themeStyles}
            teamNames={teamNames}
            players={players}
            draftedPlayers={draftedPlayers}
            draftStyle={draftStyle}
            numTeams={numTeams}
            currentDraftPick={currentDraftPick}
            keepers={keepers}
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
