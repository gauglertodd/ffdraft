// Updated DraftTracker.jsx with unified player state

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

  // Core unified state - players is now a Map/Object with comprehensive metadata
  const [players, setPlayers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [showDrafted, setShowDrafted] = useState(true);
  const [activeTab, setActiveTab] = useState('overall');
  const [currentDraftPick, setCurrentDraftPick] = useState(1);
  const [currentCSVSource, setCurrentCSVSource] = useState('');

  // Watch and Avoid highlight settings
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

  // Save feedback state
  const [saveMessage, setSaveMessage] = useState('');
  const [showSaveMessage, setShowSaveMessage] = useState(false);

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

  // Derived data using the unified player state
  const playerArray = useMemo(() => Object.values(players), [players]);
  const availablePlayers = useMemo(() => playerArray.filter(p => p.status === 'available'), [playerArray]);
  const draftedPlayers = useMemo(() => playerArray.filter(p => p.status === 'drafted' || p.status === 'keeper'), [playerArray]);
  const watchedPlayers = useMemo(() => playerArray.filter(p => p.watchStatus === 'watched'), [playerArray]);
  const avoidedPlayers = useMemo(() => playerArray.filter(p => p.watchStatus === 'avoided'), [playerArray]);
  const keepers = useMemo(() => playerArray.filter(p => p.status === 'keeper'), [playerArray]);

  // Helper functions for unified player state
  const updatePlayer = (playerId, updates) => {
    console.log('🔄 updatePlayer called:', playerId, updates);
    setPlayers(prev => {
      if (!prev[playerId]) {
        console.error('❌ Player not found in updatePlayer:', playerId);
        return prev;
      }
      const newPlayers = {
        ...prev,
        [playerId]: { ...prev[playerId], ...updates }
      };
      console.log('✅ Player updated:', newPlayers[playerId]);
      return newPlayers;
    });
  };

  const updatePlayerBatch = (updates) => {
    setPlayers(prev => {
      const newPlayers = { ...prev };
      Object.entries(updates).forEach(([playerId, playerUpdates]) => {
        newPlayers[playerId] = { ...newPlayers[playerId], ...playerUpdates };
      });
      return newPlayers;
    });
  };

  // Save/load draft state with unified structure
  const saveDraftState = (showMessage = false) => {
    try {
      const draftState = {
        players, currentDraftPick, numTeams, rosterSettings, positionColors, autoDraftSettings,
        teamVariability, teamNames, draftStyle, currentCSVSource, watchHighlightColor,
        watchHighlightOpacity, avoidHighlightColor, avoidHighlightOpacity, isDarkMode,
        isKeeperMode, lastSaved: Date.now()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftState));

      if (showMessage) {
        const teamName = teamNames[currentTeam] || `Team ${currentTeam}`;
        const draftedCount = draftedPlayers.length;
        const watchedCount = watchedPlayers.length;
        const avoidedCount = avoidedPlayers.length;
        const keeperCount = keepers.length;

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
      // Restore all state
      if (savedState.players !== undefined) setPlayers(savedState.players);
      if (savedState.currentDraftPick !== undefined) setCurrentDraftPick(savedState.currentDraftPick);
      if (savedState.numTeams !== undefined) setNumTeams(savedState.numTeams);
      if (savedState.rosterSettings !== undefined) setRosterSettings(savedState.rosterSettings);
      if (savedState.positionColors !== undefined) setPositionColors(savedState.positionColors);
      if (savedState.autoDraftSettings !== undefined) setAutoDraftSettings(savedState.autoDraftSettings);
      if (savedState.teamVariability !== undefined) setTeamVariability(savedState.teamVariability);
      if (savedState.teamNames !== undefined) setTeamNames(savedState.teamNames);
      if (savedState.draftStyle !== undefined) setDraftStyle(savedState.draftStyle);
      if (savedState.currentCSVSource !== undefined) setCurrentCSVSource(savedState.currentCSVSource);
      if (savedState.watchHighlightColor !== undefined) setWatchHighlightColor(savedState.watchHighlightColor);
      if (savedState.watchHighlightOpacity !== undefined) setWatchHighlightOpacity(savedState.watchHighlightOpacity);
      if (savedState.avoidHighlightColor !== undefined) setAvoidHighlightColor(savedState.avoidHighlightColor);
      if (savedState.avoidHighlightOpacity !== undefined) setAvoidHighlightOpacity(savedState.avoidHighlightOpacity);
      if (savedState.isKeeperMode !== undefined) setIsKeeperMode(savedState.isKeeperMode);

      hasShownRestoreDialogRef.current = true;

      if (draftedPlayers.length > 0) {
        console.log(`Restored draft with ${draftedPlayers.length} picks from ${new Date(savedState.lastSaved).toLocaleString()}`);
      }
    } else {
      hasShownRestoreDialogRef.current = true;
    }
  }, [draftedPlayers.length]);

  // Auto-save on changes
  useEffect(() => {
    if (Object.keys(players).length > 0) {
      const timer = setTimeout(saveDraftState, 500);
      return () => clearTimeout(timer);
    }
  }, [players, currentDraftPick, numTeams, rosterSettings, autoDraftSettings, teamVariability,
      teamNames, draftStyle, isKeeperMode]);

// Team mapping utilities for CSVs without team information
  const normalizePlayerName = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .replace(/\s/g, ''); // Remove all spaces for exact matching
  };

  const fuzzyMatchPlayerName = (targetName, candidateName, threshold = 0.8) => {
    const target = normalizePlayerName(targetName);
    const candidate = normalizePlayerName(candidateName);

    // Exact match
    if (target === candidate) return 1.0;

    // Check if one contains the other
    if (target.includes(candidate) || candidate.includes(target)) {
      return 0.9;
    }

    // Simple similarity check
    const longer = target.length > candidate.length ? target : candidate;
    const shorter = target.length > candidate.length ? candidate : target;

    if (longer.length === 0) return 1.0;

    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }

    const similarity = matches / longer.length;
    return similarity >= threshold ? similarity : 0;
  };

  const createTeamMappingFromPreloadedCSVs = async () => {
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

    const teamMapping = new Map();
    let filesProcessed = 0;

    console.log('🔍 Building team mapping from preloaded CSV files...');

    // Column patterns for reference files
    const COLUMN_PATTERNS = {
      name: [
        'name', 'player', 'playername', 'player_name', 'player name', 'full_name', 'fullname',
        'full name', 'lastname', 'last_name', 'first_name', 'firstname'
      ],
      team: [
        'team', 'tm', 'nfl_team', 'nfl team', 'franchise', 'club', 'organization',
        'team_abbr', 'team abbr', 'team_abbreviation', 'team abbreviation', 'teamname', 'team_name'
      ]
    };

    const findColumnIndex = (headers, patterns) => {
      const normalizedHeaders = headers.map(h => h.trim().toLowerCase());

      for (const pattern of patterns) {
        const index = normalizedHeaders.findIndex(h =>
          h === pattern.toLowerCase() ||
          h.includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(h)
        );
        if (index !== -1) {
          return index;
        }
      }
      return -1;
    };

    for (const filename of csvFiles) {
      try {
        const response = await fetch(`/${filename}`);
        if (!response.ok) continue;

        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const nameIndex = findColumnIndex(headers, COLUMN_PATTERNS.name);
        const teamIndex = findColumnIndex(headers, COLUMN_PATTERNS.team);

        if (nameIndex === -1 || teamIndex === -1) {
          console.log(`⚠️ Skipping ${filename}: missing name or team columns`);
          continue;
        }

        // Process each player in this reference file
        lines.slice(1).forEach(line => {
          const values = line.split(',').map(v => v.trim());
          const playerName = values[nameIndex];
          const playerTeam = values[teamIndex];

          if (playerName && playerTeam) {
            const normalizedName = normalizePlayerName(playerName);
            if (!teamMapping.has(normalizedName)) {
              teamMapping.set(normalizedName, playerTeam.toUpperCase());
            }
          }
        });

        filesProcessed++;
        console.log(`✅ Processed ${filename} for team mapping`);

      } catch (error) {
        console.log(`❌ Failed to process ${filename}:`, error);
      }
    }

    console.log(`📊 Team mapping complete: ${teamMapping.size} players from ${filesProcessed} files`);
    return teamMapping;
  };

  const applyTeamMapping = async (playersWithoutTeams, sourceFilename = '') => {
    if (playersWithoutTeams.length === 0) {
      console.log('✅ No players need team mapping');
      return { mappedCount: 0, unmappedPlayers: [] };
    }

    console.log(`🔄 Attempting to map teams for ${playersWithoutTeams.length} players...`);

    const teamMapping = await createTeamMappingFromPreloadedCSVs();

    if (teamMapping.size === 0) {
      console.log('❌ No team mapping data available from preloaded CSVs');
      return { mappedCount: 0, unmappedPlayers: playersWithoutTeams };
    }

    let mappedCount = 0;
    const unmappedPlayers = [];

    for (const player of playersWithoutTeams) {
      let bestMatch = null;
      let bestScore = 0;

      // Try to find the best match in our team mapping
      for (const [mappedName, team] of teamMapping.entries()) {
        const score = fuzzyMatchPlayerName(player.name, mappedName);
        if (score > bestScore && score >= 0.8) {
          bestScore = score;
          bestMatch = team;
        }
      }

      if (bestMatch) {
        player.team = bestMatch;
        mappedCount++;
        console.log(`✅ Mapped ${player.name} → ${bestMatch} (confidence: ${(bestScore * 100).toFixed(1)}%)`);
      } else {
        unmappedPlayers.push(player);
        console.log(`❌ No team found for ${player.name}`);
      }
    }

    console.log(`📊 Team mapping results: ${mappedCount} mapped, ${unmappedPlayers.length} unmapped`);

    return { mappedCount, unmappedPlayers };
  };

  // Enhanced CSV parsing with flexible column detection and team mapping
  const parseCSV = async (csvText, filename = '') => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    console.log('🔍 Parsing CSV with enhanced detection...');
    console.log('📊 Headers found:', headers);

    // Column patterns for flexible matching (case insensitive)
    const COLUMN_PATTERNS = {
      name: [
        'name', 'player', 'playername', 'player_name', 'player name', 'full_name', 'fullname',
        'full name', 'lastname', 'last_name', 'first_name', 'firstname'
      ],
      position: [
        'position', 'pos', 'positions', 'player_position', 'player position', 'eligibility',
        'eligible_positions', 'eligible positions', 'fantasy_position', 'fantasy position'
      ],
      team: [
        'team', 'tm', 'nfl_team', 'nfl team', 'franchise', 'club', 'organization',
        'team_abbr', 'team abbr', 'team_abbreviation', 'team abbreviation', 'teamname', 'team_name'
      ],
      rank: [
        'rank', 'ranking', 'overall', 'overall_rank', 'overall rank', 'player_rank', 'player rank',
        'draft_rank', 'draft rank', 'fantasy_rank', 'fantasy rank', 'ecr', 'consensus_rank',
        'consensus rank', 'expert_consensus_rank', 'expert consensus rank', 'avg_rank', 'avg rank',
        'average_rank', 'average rank', 'rk', 'rnk', 'position_rank', 'positional_rank'
      ],
      tier: [
        'tier', 'tiers', 'draft_tier', 'draft tier', 'fantasy_tier', 'fantasy tier',
        'tier_rank', 'tier rank', 'player_tier', 'player tier'
      ]
    };

    // Find column index using flexible patterns
    const findColumnIndex = (headers, patterns) => {
      const normalizedHeaders = headers.map(h => h.trim().toLowerCase());

      for (const pattern of patterns) {
        const index = normalizedHeaders.findIndex(h =>
          h === pattern.toLowerCase() ||
          h.includes(pattern.toLowerCase()) ||
          pattern.toLowerCase().includes(h)
        );
        if (index !== -1) {
          console.log(`✅ Found ${pattern} column at index ${index}: "${headers[index]}"`);
          return index;
        }
      }
      return -1;
    };

    const nameIndex = findColumnIndex(headers, COLUMN_PATTERNS.name);
    const positionIndex = findColumnIndex(headers, COLUMN_PATTERNS.position);
    const teamIndex = findColumnIndex(headers, COLUMN_PATTERNS.team);
    const rankIndex = findColumnIndex(headers, COLUMN_PATTERNS.rank);
    const tierIndex = findColumnIndex(headers, COLUMN_PATTERNS.tier);

    console.log('📍 Column mapping results:', {
      name: nameIndex >= 0 ? `"${headers[nameIndex]}"` : 'NOT FOUND',
      position: positionIndex >= 0 ? `"${headers[positionIndex]}"` : 'NOT FOUND',
      team: teamIndex >= 0 ? `"${headers[teamIndex]}"` : 'NOT FOUND',
      rank: rankIndex >= 0 ? `"${headers[rankIndex]}"` : 'NOT FOUND',
      tier: tierIndex >= 0 ? `"${headers[tierIndex]}"` : 'NOT FOUND'
    });

    if (nameIndex === -1) {
      throw new Error('CSV must contain a player name column. Expected headers like: name, player, playername, player_name, full_name, etc.');
    }
    if (positionIndex === -1) {
      throw new Error('CSV must contain a position column. Expected headers like: position, pos, eligibility, fantasy_position, etc.');
    }
    if (rankIndex === -1) {
      throw new Error('CSV must contain a rank column. Expected headers like: rank, overall, player_rank, draft_rank, ecr, etc.');
    }

    const hasTeamInfo = teamIndex !== -1;
    console.log(hasTeamInfo ? '✅ Team information found in CSV' : '⚠️ No team information found - will attempt automatic mapping');

    const playersObj = {};
    const playersWithoutTeams = [];

    lines.slice(1).forEach((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const playerName = values[nameIndex] || '';
      const playerPosition = values[positionIndex] || '';
      const playerTeam = hasTeamInfo ? (values[teamIndex] || '') : '';
      const playerRank = parseInt(values[rankIndex]) || index + 1;
      const playerTier = tierIndex !== -1 ? (parseInt(values[tierIndex]) || null) : null;

      if (!playerName || !playerPosition) {
        console.warn(`⚠️ Skipping row ${index + 2}: missing name or position`);
        return;
      }

      // Create initial stable ID
      const playerId = `${playerName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${playerPosition.toLowerCase()}_${playerTeam.toLowerCase()}`.substring(0, 50);

      const playerObj = {
        id: playerId,
        name: playerName,
        position: playerPosition.toUpperCase(),
        team: playerTeam.toUpperCase(),
        rank: playerRank,
        tier: playerTier,
        status: 'available',
        draftInfo: null,
        watchStatus: null
      };

      playersObj[playerId] = playerObj;

      // Track players without teams for mapping
      if (!hasTeamInfo || !playerTeam) {
        playersWithoutTeams.push(playerObj);
      }
    });

    // If we have players without teams, try to map them
    if (playersWithoutTeams.length > 0) {
      console.log(`🔄 Attempting to map teams for ${playersWithoutTeams.length} players...`);

      try {
        const mappingResult = await applyTeamMapping(playersWithoutTeams, filename);

        if (mappingResult.mappedCount > 0) {
          console.log(`✅ Successfully mapped ${mappingResult.mappedCount} players to teams`);

          // Update the players object with mapped teams and new IDs
          playersWithoutTeams.forEach(player => {
            // Remove old ID
            delete playersObj[player.id];

            // Create new ID with team info
            const newId = `${player.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${player.position.toLowerCase()}_${player.team.toLowerCase()}`.substring(0, 50);
            player.id = newId;
            playersObj[newId] = player;
          });

          // Show user-friendly notification about team mapping
          const mappedPercentage = Math.round((mappingResult.mappedCount / playersWithoutTeams.length) * 100);
          console.log(`🎯 Team mapping summary: ${mappingResult.mappedCount}/${playersWithoutTeams.length} players (${mappedPercentage}%) successfully mapped to teams`);
        }

        if (mappingResult.unmappedPlayers.length > 0) {
          console.log(`⚠️ ${mappingResult.unmappedPlayers.length} players still without teams - they will show as blank teams`);
        }
      } catch (error) {
        console.error('❌ Team mapping failed:', error);
        console.log('📄 Continuing with original data (players without teams will have blank team fields)');
      }
    }

    console.log(`📊 CSV parsing complete: ${Object.keys(playersObj).length} players loaded from "${filename}"`);
    return playersObj;
  };

// File upload handlers - FIXED to properly handle async parseCSV
  const handleFileUpload = (file, isSwitch = false) => {
    if (file?.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          console.log('📁 Processing uploaded CSV file:', file.name);
          const parsedPlayers = await parseCSV(e.target.result, file.name);
          console.log('✅ CSV parsed successfully, players object:', parsedPlayers);
          console.log('🔢 Number of players parsed:', Object.keys(parsedPlayers).length);

          setPlayers(parsedPlayers);
          setCurrentCSVSource(file.name);

          if (!isSwitch) {
            // Reset draft state for new upload
            setCurrentDraftPick(1);
            setAvailabilityPredictions({});
            setIsKeeperMode(false);
            clearDraftState();
          }

          console.log('🎯 Players state updated, UI should now show draft interface');
        } catch (error) {
          console.error('❌ CSV parsing error:', error);
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

  // Check if current pick should be a keeper
  const isCurrentPickKeeper = () => {
    return keepers.find(k => k.draftInfo?.pickNumber === currentDraftPick);
  };

  // Draft player function - now works with unified state
  const draftPlayer = (playerId) => {
    const player = players[playerId];
    if (!player) {
      console.error('❌ Player not found:', playerId, 'Available players:', Object.keys(players));
      alert(`Player with ID ${playerId} not found!`);
      return;
    }

    console.log('🏈 Attempting to draft:', player.name, 'with ID:', playerId);

    // Check if we're trying to draft at a keeper position
    const keeperAtCurrentPick = isCurrentPickKeeper();
    if (keeperAtCurrentPick && playerId !== keeperAtCurrentPick.id) {
      alert(`This pick is reserved for keeper: ${keeperAtCurrentPick.name}`);
      return;
    }

    // Check if this player is already drafted/keeper
    if (player.status !== 'available') {
      alert(`${player.name} has already been drafted or is a keeper.`);
      return;
    }

    // Calculate round
    const round = Math.floor((currentDraftPick - 1) / numTeams) + 1;
    const teamId = getCurrentTeam(currentDraftPick);

    console.log('✅ Drafting:', player.name, 'to team', teamId, 'at pick', currentDraftPick);

    // Update player with draft info
    updatePlayer(playerId, {
      status: 'drafted',
      draftInfo: {
        teamId,
        pickNumber: currentDraftPick,
        round,
        isKeeper: false
      }
    });

    // Move to next available pick (skip keeper positions)
    let nextPick = currentDraftPick + 1;
    while (keepers.some(k => k.draftInfo?.pickNumber === nextPick)) {
      nextPick++;
    }
    setCurrentDraftPick(nextPick);

    setAvailabilityPredictions({});
  };

  const undoLastDraft = () => {
    // Find the most recent non-keeper pick
    const recentDraftedPlayers = draftedPlayers
      .filter(p => p.status === 'drafted')
      .sort((a, b) => (b.draftInfo?.pickNumber || 0) - (a.draftInfo?.pickNumber || 0));

    if (recentDraftedPlayers.length === 0) return;

    const lastDraftedPlayer = recentDraftedPlayers[0];

    // Revert player to available
    updatePlayer(lastDraftedPlayer.id, {
      status: 'available',
      draftInfo: null
    });

    // Find the previous non-keeper pick
    const lastPickNumber = lastDraftedPlayer.draftInfo?.pickNumber || currentDraftPick;
    let prevPick = lastPickNumber;
    while (prevPick > 0 && keepers.some(k => k.draftInfo?.pickNumber === prevPick)) {
      prevPick--;
    }
    setCurrentDraftPick(Math.max(1, prevPick));

    setAvailabilityPredictions({});
  };

  const restartDraft = () => {
    if (window.confirm("Restart draft? This clears all picks but keeps settings and keepers.")) {
      // Reset all drafted players to available, but keep keepers
      const updates = {};
      Object.values(players).forEach(player => {
        if (player.status === 'drafted') {
          updates[player.id] = {
            status: 'available',
            draftInfo: null
          };
        }
      });
      updatePlayerBatch(updates);

      // Find the first non-keeper pick
      let firstPick = 1;
      while (keepers.some(k => k.draftInfo?.pickNumber === firstPick)) {
        firstPick++;
      }
      setCurrentDraftPick(firstPick);

      setIsAutoDrafting(false);
      setIsDraftRunning(false);
      setAvailabilityPredictions({});
      saveDraftState();
    }
  };

  const handleNewDraft = () => {
    if (window.confirm("Start completely new draft? This clears everything including keepers.")) {
      // Reset all players to available and clear watch status
      setPlayers({}); // This will trigger showing the upload UI
      setCurrentDraftPick(1);
      setIsAutoDrafting(false);
      setIsDraftRunning(false);
      setAvailabilityPredictions({});
      setIsKeeperMode(false);
      hasShownRestoreDialogRef.current = false;
      clearDraftState();
    }
  };

  // Watch list functions - now work with unified state
  const toggleWatchPlayer = (playerId) => {
    const player = players[playerId];
    if (!player) return;

    let newWatchStatus;
    if (player.watchStatus === 'watched') {
      newWatchStatus = null;
    } else {
      newWatchStatus = 'watched';
    }

    updatePlayer(playerId, { watchStatus: newWatchStatus });
  };

  const isPlayerWatched = (playerId) => players[playerId]?.watchStatus === 'watched';

  // Avoid list functions - now work with unified state
  const toggleAvoidPlayer = (playerId) => {
    const player = players[playerId];
    if (!player) return;

    let newWatchStatus;
    if (player.watchStatus === 'avoided') {
      newWatchStatus = null;
    } else {
      newWatchStatus = 'avoided';
    }

    updatePlayer(playerId, { watchStatus: newWatchStatus });
  };

  const isPlayerAvoided = (playerId) => players[playerId]?.watchStatus === 'avoided';

  // Keeper functions - now work with unified state
  const addKeeper = (playerId, teamId, round) => {
    const player = players[playerId];
    if (!player) return;

    const pickNumber = getPickNumber(teamId, round);

    updatePlayer(playerId, {
      status: 'keeper',
      draftInfo: {
        teamId,
        pickNumber,
        round,
        isKeeper: true
      }
    });
  };

  const removeKeeper = (playerId) => {
    updatePlayer(playerId, {
      status: 'available',
      draftInfo: null
    });
  };

  const getPickNumber = (teamId, round) => {
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

  // Auto-draft system (updated to work with unified state)
  const getDraftDelay = () => {
    const delays = { instant: 50, fast: 200, normal: 800, slow: 2000 };
    return delays[draftSpeed] || 500;
  };

  const executeLocalFallback = (availablePlayersList, strategy) => {
    if (!availablePlayersList.length) return null;

    // Filter out avoided players
    const nonAvoidedPlayers = availablePlayersList.filter(p => p.watchStatus !== 'avoided');
    const playersToConsider = nonAvoidedPlayers.length > 0 ? nonAvoidedPlayers : availablePlayersList;

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

  const callAutoDraftPyScript = async (availablePlayersList, teamRoster, strategy, variability = 0.0) => {
    if (!isPyScriptReady) return null;

    try {
      // Filter out avoided players before sending to PyScript
      const nonAvoidedPlayers = availablePlayersList.filter(p => p.watchStatus !== 'avoided');
      const playersToConsider = nonAvoidedPlayers.length > 0 ? nonAvoidedPlayers : availablePlayersList;

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
    if (!isPyScriptReady || !isAutoDrafting || Object.keys(players).length === 0 || isDraftRunning) return;

    // Calculate total roster spots
    const totalRosterSpots = numTeams * Object.values(rosterSettings).reduce((sum, count) => sum + count, 0);

    // Stop if draft is complete
    if (draftedPlayers.length >= totalRosterSpots || draftedPlayers.length >= Object.keys(players).length) {
      setIsAutoDrafting(false);
      setIsDraftRunning(false);
      return;
    }

    // Check if current pick is a keeper - if so, skip it
    const keeperPick = isCurrentPickKeeper();
    if (keeperPick) {
      let nextPick = currentDraftPick + 1;
      while (keepers.some(k => k.draftInfo?.pickNumber === nextPick)) {
        nextPick++;
      }
      setCurrentDraftPick(nextPick);
      return;
    }

    const teamStrategy = autoDraftSettings[currentTeam];
    if (!teamStrategy || teamStrategy === 'manual') return;

    const executeAutoDraft = async () => {
      const currentTeamData = teams.find(t => t.id === currentTeam);
      if (!availablePlayers.length || !currentTeamData) return;

      try {
        const teamVar = teamVariability[currentTeam];
        const actualVariability = teamVar !== undefined ? teamVar : 0.3;

        const result = await callAutoDraftPyScript(availablePlayers, currentTeamData, teamStrategy, actualVariability);

        if (result?.player_id) {
          draftPlayer(result.player_id);
        } else {
          const fallbackPlayer = executeLocalFallback(availablePlayers, teamStrategy);
          if (fallbackPlayer) draftPlayer(fallbackPlayer);
        }
      } catch (error) {
        console.error('Auto-draft error:', error);
      }
    };

    const timer = setTimeout(executeAutoDraft, getDraftDelay());
    return () => clearTimeout(timer);
  }, [currentDraftPick, isAutoDrafting, autoDraftSettings, Object.keys(players).length,
      draftedPlayers.length, isDraftRunning, draftStyle, numTeams, isPyScriptReady, teamVariability, keepers]);

  // Availability prediction (updated for unified state)
  const predictPlayerAvailability = async (force = false) => {
    if (!isPyScriptReady || (!force && isPredicting)) return;

    setIsPredicting(true);
    try {
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
        Object.keys(players).length > 0 && !isDraftRunning && draftedPlayers.length > 0) {
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

  // Generate teams with roster slots - UPDATED to work with unified state
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

    // Fill rosters with drafted/keeper players
    const allDraftedPlayers = draftedPlayers.sort((a, b) =>
      (a.draftInfo?.pickNumber || 0) - (b.draftInfo?.pickNumber || 0)
    );

    allDraftedPlayers.forEach(player => {
      if (!player.draftInfo) return;

      const team = teamArray.find(t => t.id === player.draftInfo.teamId);
      if (!team) return;

      // Fill roster slots (exact position -> FLEX -> BENCH)
      let slotFound = false;

      // Try exact position match
      for (let slot of team.roster) {
        if (slot.position === player.position && !slot.player) {
          slot.player = player;
          slot.isKeeper = player.status === 'keeper';
          slotFound = true;
          break;
        }
      }

      // Try FLEX for RB/WR/TE
      if (!slotFound && ['RB', 'WR', 'TE'].includes(player.position)) {
        for (let slot of team.roster) {
          if (slot.position === 'FLEX' && !slot.player) {
            slot.player = player;
            slot.isKeeper = player.status === 'keeper';
            slotFound = true;
            break;
          }
        }
      }

      // Fill BENCH
      if (!slotFound) {
        for (let slot of team.roster) {
          if (slot.position === 'BENCH' && !slot.player) {
            slot.player = player;
            slot.isKeeper = player.status === 'keeper';
            break;
          }
        }
      }
    });

    return teamArray;
  }, [numTeams, rosterSettings, draftedPlayers, draftStyle, teamNames]);

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

  // Computed values for compatibility with existing components
  const positions = useMemo(() => {
    const posSet = new Set(playerArray.map(p => p.position));
    return ['ALL', ...Array.from(posSet).sort()];
  }, [playerArray]);

  const playersByPosition = useMemo(() => {
    const byPosition = {};
    positions.forEach(pos => {
      if (pos === 'ALL') {
        byPosition[pos] = playerArray;
      } else {
        const posPlayers = playerArray.filter(p => p.position === pos);
        byPosition[pos] = posPlayers.map((player, index) => ({
          ...player,
          positionRank: index + 1
        }));
      }
    });
    return byPosition;
  }, [playerArray, positions]);

  const filteredPlayers = useMemo(() => {
    const baseList = activeTab === 'overall' ? playerArray : (playersByPosition[activeTab] || []);
    return baseList.filter(player => {
      const matchesSearch = searchQuery === '' ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition;

      // Player is considered "drafted" if status is not 'available'
      const isPlayerDrafted = player.status !== 'available';
      const matchesDrafted = showDrafted || !isPlayerDrafted;

      return matchesSearch && matchesPosition && matchesDrafted;
    });
  }, [playerArray, playersByPosition, activeTab, searchQuery, selectedPosition, showDrafted]);

  const draftStats = useMemo(() => {
    const stats = {};
    positions.forEach(pos => {
      if (pos !== 'ALL') {
        const positionPlayers = playerArray.filter(p => p.position === pos);
        const draftedInPosition = positionPlayers.filter(p => p.status !== 'available');
        stats[pos] = {
          total: positionPlayers.length,
          drafted: draftedInPosition.length
        };
      }
    });
    return stats;
  }, [playerArray, positions]);

  // Quick draft players (updated for unified state)
  const quickDraftPlayers = useMemo(() => {
    if (!quickDraftQuery || quickDraftQuery.length < 2) return { undrafted: [], drafted: [] };

    const searchLower = quickDraftQuery.toLowerCase();
    const undraftedPlayers = [];
    const draftedMatchingPlayers = [];

    for (let i = 0; i < playerArray.length && (undraftedPlayers.length < 8 || draftedMatchingPlayers.length < 8); i++) {
      const player = playerArray[i];
      const matchesSearch = player.name.toLowerCase().includes(searchLower) ||
                          player.team.toLowerCase().includes(searchLower) ||
                          player.position.toLowerCase().includes(searchLower);

      if (matchesSearch) {
        if (player.status === 'available' && undraftedPlayers.length < 8) {
          undraftedPlayers.push(player);
        } else if (player.status !== 'available' && draftedMatchingPlayers.length < 8) {
          // Add draft info to player for display
          const draftInfo = player.draftInfo;
          if (draftInfo) {
            const round = draftInfo.round || Math.floor((draftInfo.pickNumber - 1) / numTeams) + 1;
            const pickInRound = ((draftInfo.pickNumber - 1) % numTeams) + 1;
            const draftingTeamName = teamNames[draftInfo.teamId] || `Team ${draftInfo.teamId}`;

            draftedMatchingPlayers.push({
              ...player,
              draftInfo: {
                ...draftInfo,
                round,
                pickInRound,
                draftingTeamName
              }
            });
          }
        }
      }
    }

    undraftedPlayers.sort((a, b) => a.rank - b.rank);
    draftedMatchingPlayers.sort((a, b) => (a.draftInfo?.pickNumber || 0) - (b.draftInfo?.pickNumber || 0));

    return { undrafted: undraftedPlayers, drafted: draftedMatchingPlayers };
  }, [quickDraftQuery, playerArray, numTeams, teamNames]);

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

  // Quick Draft Modal Component (updated for unified state)
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
                  👑 KEEPER: {isCurrentPickKeeper().name}
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
                  const isWatched = player.watchStatus === 'watched';
                  const isAvoided = player.watchStatus === 'avoided';

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

            {/* Show drafted players section if any found */}
            {quickDraftPlayers.drafted?.length > 0 && (
              <>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: themeStyles.text.secondary,
                  padding: '8px 12px',
                  borderBottom: `1px solid ${themeStyles.border}`,
                  backgroundColor: themeStyles.hover.background,
                  marginTop: '16px',
                  marginBottom: '4px'
                }}>
                  ALREADY DRAFTED ({quickDraftPlayers.drafted.length})
                </div>

                {quickDraftPlayers.drafted.map((player) => (
                  <div
                    key={`drafted-${player.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '2px',
                      backgroundColor: 'transparent',
                      color: themeStyles.text.secondary,
                      opacity: 0.7
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px', textDecoration: 'line-through' }}>
                        {player.name}
                        {player.status === 'keeper' && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#7c3aed' }}>👑</span>}
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        {player.position} • {player.team} • #{player.rank}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', textAlign: 'right' }}>
                      <div>Pick #{player.draftInfo?.pickNumber}</div>
                      <div>{player.draftInfo?.draftingTeamName}</div>
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
            draftedPlayers={draftedPlayers}
            onNewCSV={handleFileUpload}
            onSwitchCSV={handleCSVSwitch}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            players={playerArray}
            draftPlayer={draftPlayer}
            onRestartDraft={restartDraft}
            onSaveDraft={() => saveDraftState(true)}
            onClearSavedState={handleNewDraft}
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
              addKeeper={addKeeper}
              removeKeeper={removeKeeper}
              players={playerArray}
              numTeams={numTeams}
              teamNames={teamNames}
              draftStyle={draftStyle}
              themeStyles={themeStyles}
              getCurrentTeam={getCurrentTeam}
              getPickNumber={getPickNumber}
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
	    setIsDraftRunning={setIsDraftRunning}
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
            draftedPlayers={draftedPlayers}
            players={playerArray}
            themeStyles={themeStyles}
          />

          {/* Player Rankings */}
          <PlayerList
            // Core unified state
            players={players}
            setPlayers={setPlayers}

            // Search and filtering
            searchQuery={searchQuery}
            selectedPosition={selectedPosition}
            setSelectedPosition={setSelectedPosition}
            showDrafted={showDrafted}
            setShowDrafted={setShowDrafted}

            // Draft function
            draftPlayer={draftPlayer}

            // UI state
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            themeStyles={themeStyles}
            positionColors={positionColors}

            // Watch/Avoid colors
            watchHighlightColor={watchHighlightColor}
            setWatchHighlightColor={setWatchHighlightColor}
            watchHighlightOpacity={watchHighlightOpacity}
            setWatchHighlightOpacity={setWatchHighlightOpacity}
            avoidHighlightColor={avoidHighlightColor}
            setAvoidHighlightColor={setAvoidHighlightColor}
            avoidHighlightOpacity={avoidHighlightOpacity}
            setAvoidHighlightOpacity={setAvoidHighlightOpacity}

            // Availability prediction
            showAvailabilityPrediction={showAvailabilityPrediction}
            setShowAvailabilityPrediction={setShowAvailabilityPrediction}
            predictionTrials={predictionTrials}
            setPredictionTrials={setPredictionTrials}
            onPredictAvailability={() => predictPlayerAvailability(true)}
            isPredicting={isPredicting}
            lastPredictionTime={lastPredictionTime}
            availabilityPredictions={availabilityPredictions}

            // Helpers
            getTierColor={getTierColor}
          />

          {/* Teams Display */}
          <TeamBoards
            teams={teams}
            currentTeam={currentTeam}
            positionColors={positionColors}
            themeStyles={themeStyles}
            teamNames={teamNames}
            players={playerArray}
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
