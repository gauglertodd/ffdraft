import React, { useState, useMemo, useEffect } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';
import FileUpload from './FileUpload';
import LeagueSettings from './LeagueSettings';
import SearchControls from './SearchControls';
import DraftStats from './DraftStats';
import PlayerList from './PlayerList';
import TeamBoards from './TeamBoards';
import AutoDraftSettings from './AutoDraftSettings';
import UnifiedControlPanel from './UnifiedControlPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const DraftTrackerContent = () => {
  const { isDarkMode, toggleTheme, themeStyles } = useTheme();

  // Basic state
  const [players, setPlayers] = useState([]);
  const [draftedPlayers, setDraftedPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('ALL');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDrafted, setShowDrafted] = useState(true);
  const [activeTab, setActiveTab] = useState('overall');
  const [numTeams, setNumTeams] = useState(12);
  const [currentDraftPick, setCurrentDraftPick] = useState(1);
  const [watchedPlayers, setWatchedPlayers] = useState([]);
  const [watchHighlightColor, setWatchHighlightColor] = useState('#fbbf24');
  const [watchHighlightOpacity, setWatchHighlightOpacity] = useState(30);

  // Auto-draft settings
  const [autoDraftSettings, setAutoDraftSettings] = useState({});
  const [isAutoDrafting, setIsAutoDrafting] = useState(false);
  const [autoDraftDelay, setAutoDraftDelay] = useState(500);
  const [lastAutoDraftTime, setLastAutoDraftTime] = useState(null);
  const [isAutoProcessing, setIsAutoProcessing] = useState(false);
  const [isDraftRunning, setIsDraftRunning] = useState(false);
  const [draftSpeed, setDraftSpeed] = useState('fast');
  const [draftStyle, setDraftStyle] = useState('snake');
  const [teamNames, setTeamNames] = useState({});
  const [showQuickDraft, setShowQuickDraft] = useState(false);
  const [quickDraftQuery, setQuickDraftQuery] = useState('');
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);

  // Team variability settings (0.0 - 1.0)
  const [teamVariability, setTeamVariability] = useState({});

  // Availability prediction state
  const [showAvailabilityPrediction, setShowAvailabilityPrediction] = useState(false);
  const [availabilityPredictions, setAvailabilityPredictions] = useState({});
  const [predictionTrials, setPredictionTrials] = useState(100);
  const [isPredicting, setIsPredicting] = useState(false);
  const [lastPredictionTime, setLastPredictionTime] = useState(null);

  // Roster settings
  const [rosterSettings, setRosterSettings] = useState({
    QB: 1,
    RB: 2,
    WR: 2,
    TE: 1,
    FLEX: 1,
    DST: 1,
    K: 1,
    BENCH: 6
  });

  // Position color settings
  const [positionColors, setPositionColors] = useState({
    QB: '#dc2626',
    RB: '#16a34a',
    WR: '#2563eb',
    TE: '#ca8a04',
    FLEX: '#7c3aed',
    DST: '#374151',
    K: '#ea580c',
    BENCH: '#6b7280'
  });

  // Current CSV source tracking
  const [currentCSVSource, setCurrentCSVSource] = useState('');

  const styles = {
    container: {
      ...themeStyles.container,
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    // Sticky header styles
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
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    csvSourceIndicator: {
      position: 'absolute',
      right: '16px',
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '400'
    }
  };

  // Parse CSV data
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

  // Get tier color gradient (green -> yellow -> brown)
  const getTierColor = (tier) => {
    if (!tier) return 'transparent';

    if (tier <= 3) return '#22c55e';
    if (tier <= 6) return '#84cc16';
    if (tier <= 9) return '#eab308';
    if (tier <= 12) return '#f97316';
    return '#a16207';
  };

  // Calculate which team is drafting based on pick number and draft style
  const getCurrentTeam = (pickNumber) => {
    const round = Math.floor((pickNumber - 1) / numTeams);
    const position = (pickNumber - 1) % numTeams;

    if (draftStyle === 'snake') {
      if (round % 2 === 0) {
        return position + 1;
      } else {
        return numTeams - position;
      }
    } else {
      return position + 1;
    }
  };

  // Get delay based on speed setting
  const getDraftDelay = () => {
    switch (draftSpeed) {
      case 'instant': return 50;
      case 'fast': return 200;
      case 'normal': return 800;
      case 'slow': return 2000;
      default: return 500;
    }
  };

  // Handle file upload (both new and switching)
  const handleFileUpload = (file, isSwitch = false) => {
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsedPlayers = parseCSV(e.target.result);
          setPlayers(parsedPlayers);

          // Set CSV source indicator
          setCurrentCSVSource(file.name);

          if (!isSwitch) {
            // Only reset draft state if this is a new upload, not a switch
            setDraftedPlayers([]);
            setSearchQuery('');
            setCurrentDraftPick(1);
            setWatchedPlayers([]);
            setIsAutoDrafting(false);
            setLastAutoDraftTime(null);
            setAvailabilityPredictions({});
            setLastPredictionTime(null);
          } else {
            // For switches, preserve draft state but reset predictions
            setAvailabilityPredictions({});
            setLastPredictionTime(null);
          }
        } catch (error) {
          alert('Error parsing CSV: ' + error.message);
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a CSV file');
    }
  };

  // Handle CSV switching (preserves draft state)
  const handleCSVSwitch = (file) => {
    const confirmed = window.confirm(
      "Switch to different rankings? This will change the player data but preserve your current draft picks and settings."
    );

    if (confirmed) {
      handleFileUpload(file, true);
    }
  };

  // Watch player functions
  const toggleWatchPlayer = (playerId) => {
    setWatchedPlayers(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const isPlayerWatched = (playerId) => {
    return watchedPlayers.includes(playerId);
  };

  // Draft/Undo functions
  const draftPlayer = (playerId) => {
    if (!draftedPlayers.includes(playerId)) {
      setDraftedPlayers([...draftedPlayers, playerId]);
      setCurrentDraftPick(currentDraftPick + 1);
      setLastAutoDraftTime(Date.now());

      // Reset availability predictions when a pick is made
      console.log('🔄 Resetting availability predictions after draft pick');
      setAvailabilityPredictions({});
      setLastPredictionTime(null);
    }
  };

  const undoLastDraft = () => {
    if (draftedPlayers.length > 0) {
      setDraftedPlayers(draftedPlayers.slice(0, -1));
      setCurrentDraftPick(Math.max(1, currentDraftPick - 1));

      // Reset availability predictions when undoing a pick
      console.log('🔄 Resetting availability predictions after undo');
      setAvailabilityPredictions({});
      setLastPredictionTime(null);
    }
  };

  const restartDraft = () => {
    setDraftedPlayers([]);
    setCurrentDraftPick(1);
    setWatchedPlayers([]);
    setIsAutoDrafting(false);
    setIsDraftRunning(false);
    setIsAutoProcessing(false);
    setLastAutoDraftTime(null);
    setAvailabilityPredictions({});
    setLastPredictionTime(null);
  };

  // Predict player availability for next pick
  const predictPlayerAvailability = async (force = false) => {
    if (!players.length || teams.length === 0) {
      console.log('Cannot predict: no players or teams loaded');
      return;
    }

    // Don't run prediction if already predicting unless forced
    if (isPredicting && !force) {
      console.log('Prediction already in progress, skipping...');
      return;
    }

    setIsPredicting(true);
    console.log(`🔮 Starting availability prediction with ${predictionTrials} trials...`);

    try {
      const availablePlayers = players.filter(p => !draftedPlayers.includes(p.id));

      const response = await fetch(`${API_URL}/predict-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          available_players: availablePlayers,
          teams: teams,
          current_pick: currentDraftPick,
          my_team_id: currentTeam,
          num_teams: numTeams,
          draft_style: draftStyle,
          trials: predictionTrials,
          team_variability: teamVariability
        })
      });

      if (!response.ok) {
        throw new Error(`Prediction API request failed: ${response.status}`);
      }

      const result = await response.json();
      setAvailabilityPredictions(result.availability_predictions);
      setLastPredictionTime(Date.now());
      console.log(`✅ Availability predictions completed for ${Object.keys(result.availability_predictions).length} players`);

    } catch (error) {
      console.error('Availability prediction error:', error);

      if (error.message.includes('Failed to fetch')) {
        console.warn('Backend API not available for predictions');
        // Don't show alert for automatic predictions, just log
        if (force) {
          alert('❌ Backend API not available!\n\nTo use availability predictions:\n1. Make sure Python is installed\n2. Install dependencies: pip install flask flask-cors pandas pydantic\n3. Run: python auto_draft_api.py\n4. The server should start on ${API_URL}');
        }
      } else {
        console.error('Failed to predict player availability:', error);
        if (force) {
          alert('Failed to predict player availability. Check the console for details.');
        }
      }
    } finally {
      setIsPredicting(false);
    }
  };

  // Generate teams with roster slots (moved up before useEffects that use it)
  const teams = useMemo(() => {
    const teamArray = [];
    for (let i = 1; i <= numTeams; i++) {
      const roster = [];

      Object.entries(rosterSettings).forEach(([position, count]) => {
        for (let j = 0; j < count; j++) {
          roster.push({
            position: position,
            player: null,
            slotIndex: roster.length
          });
        }
      });

      teamArray.push({
        id: i,
        name: teamNames[i] || `Team ${i}`,
        roster: roster
      });
    }

    // Assign drafted players to teams based on draft order
    draftedPlayers.forEach((playerId, draftIndex) => {
      const player = players.find(p => p.id === playerId);
      if (!player) return;

      const pickNumber = draftIndex + 1;
      const teamId = getCurrentTeam(pickNumber);
      const team = teamArray.find(t => t.id === teamId);

      if (!team) return;

      let slotFound = false;

      // First try to fill exact position match
      for (let slot of team.roster) {
        if (slot.position === player.position && !slot.player) {
          slot.player = player;
          slotFound = true;
          break;
        }
      }

      // Then try FLEX slot for RB/WR/TE
      if (!slotFound && ['RB', 'WR', 'TE'].includes(player.position)) {
        for (let slot of team.roster) {
          if (slot.position === 'FLEX' && !slot.player) {
            slot.player = player;
            slotFound = true;
            break;
          }
        }
      }

      // Finally, put in BENCH
      if (!slotFound) {
        for (let slot of team.roster) {
          if (slot.position === 'BENCH' && !slot.player) {
            slot.player = player;
            slotFound = true;
            break;
          }
        }
      }
    });

    return teamArray;
  }, [numTeams, rosterSettings, draftedPlayers, players, draftStyle, teamNames]);

  // Calculate current team (after teams is defined)
  const currentTeam = getCurrentTeam(currentDraftPick);

  // Auto-predict when draft state changes and it's a manual team's turn
  useEffect(() => {
    // Only auto-predict if:
    // 1. Predictions are enabled
    // 2. Not currently predicting
    // 3. Have players and teams loaded
    // 4. Not in the middle of an auto-draft sequence
    // 5. Current team is set to manual draft
    if (showAvailabilityPrediction &&
        !isPredicting &&
        players.length > 0 &&
        teams.length > 0 &&
        !isDraftRunning &&
        draftedPlayers.length > 0) { // Only predict after at least one pick has been made

      const currentTeamStrategy = autoDraftSettings[currentTeam];

      // Only auto-predict if the current team is manual
      if (!currentTeamStrategy || currentTeamStrategy === 'manual') {
        console.log(`🤖 Auto-triggering prediction for manual team ${currentTeam} at pick ${currentDraftPick}`);

        // Small delay to ensure state has settled
        const timer = setTimeout(() => {
          predictPlayerAvailability(false); // false = don't show error alerts for auto-predictions
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [currentDraftPick, currentTeam, showAvailabilityPrediction, isDraftRunning, autoDraftSettings, draftedPlayers.length, players.length, teams.length]);

  // Auto-draft API integration
const callAutoDraftAPI = async (availablePlayers, teamRoster, strategy, variability = 0.0) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Debug logging
  console.log('🔍 API_URL being used:', API_URL);
  console.log('🔍 Full URL:', `${API_URL}/auto-draft`);
  console.log('🔍 Request payload:', {
    available_players: availablePlayers,
    team_roster: teamRoster,
    strategy: strategy,
    variability: variability
  });

  try {
    const response = await fetch(`${API_URL}/auto-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        available_players: availablePlayers,
        team_roster: teamRoster,
        strategy: strategy,
        variability: variability
      })
    });

    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response headers:', response.headers);

    // Get the raw response text first
    const responseText = await response.text();
    console.log('🔍 Raw response:', responseText);

    // Try to parse as JSON
    if (responseText) {
      const result = JSON.parse(responseText);
      return result;
    } else {
      throw new Error('Empty response from server');
    }

  } catch (error) {
    console.error('❌ Auto-draft API error:', error);
    return null;
  }
};

  // Local fallback strategy execution
  const executeLocalFallback = (availablePlayers, strategy) => {
    if (!availablePlayers.length) return null;

    switch (strategy) {
      case 'bpa':
        return availablePlayers.sort((a, b) => a.rank - b.rank)[0]?.id;
      case 'tier':
        const tieredPlayers = availablePlayers.filter(p => p.tier);
        if (tieredPlayers.length) {
          return tieredPlayers.sort((a, b) => a.tier - b.tier || a.rank - b.rank)[0]?.id;
        }
        return availablePlayers.sort((a, b) => a.rank - b.rank)[0]?.id;
      default:
        return availablePlayers.sort((a, b) => a.rank - b.rank)[0]?.id;
    }
  };

  // Start continuous auto-draft until manual team
  const startDraftSequence = async () => {
    if (!isAutoDrafting || players.length === 0) {
      console.log('Cannot start draft: auto-draft disabled or no players loaded');
      return;
    }

    setIsDraftRunning(true);
    console.log(`🚀 Starting continuous draft sequence at ${draftSpeed} speed...`);

    let currentPick = currentDraftPick;
    let draftedList = [...draftedPlayers];
    const delay = getDraftDelay();
    let availablePlayers = players.filter(p => !draftedList.includes(p.id));

    while (currentPick <= players.length && draftedList.length < players.length && availablePlayers.length > 0) {
      const teamOnClock = getCurrentTeam(currentPick);
      const teamStrategy = autoDraftSettings[teamOnClock];

      console.log(`Pick ${currentPick}: Team ${teamOnClock} (Strategy: ${teamStrategy || 'manual'}) [${draftStyle} draft]`);

      if (!teamStrategy || teamStrategy === 'manual') {
        console.log(`🛑 Stopping at Pick ${currentPick} - Team ${teamOnClock} is set to manual`);
        break;
      }

      try {
        setIsAutoProcessing(true);
        const currentTeamData = teams.find(t => t.id === teamOnClock);

        if (!currentTeamData || availablePlayers.length === 0) {
          console.log('No team data or available players - stopping');
          break;
        }

        let selectedPlayerId = null;

        try {
          const apiPromise = callAutoDraftAPI(availablePlayers, currentTeamData, teamStrategy, teamVariability[teamOnClock] || 0.3);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('API timeout')), 2000)
          );

          const result = await Promise.race([apiPromise, timeoutPromise]);

          if (result && result.player_id) {
            selectedPlayerId = result.player_id;
            console.log(`✅ API: ${result.player_name} → Team ${teamOnClock} (${result.strategy_used})`);
          }
        } catch (apiError) {
          console.warn(`API failed for Team ${teamOnClock}:`, apiError.message);
        }

        if (!selectedPlayerId) {
          selectedPlayerId = executeLocalFallback(availablePlayers, teamStrategy);
          if (selectedPlayerId) {
            const player = availablePlayers.find(p => p.id === selectedPlayerId);
            console.log(`🔄 Fallback: ${player.name} → Team ${teamOnClock} (${teamStrategy})`);
          }
        }

        if (selectedPlayerId) {
          draftedList.push(selectedPlayerId);
          availablePlayers = availablePlayers.filter(p => p.id !== selectedPlayerId);
          currentPick++;

          setDraftedPlayers([...draftedList]);
          setCurrentDraftPick(currentPick);

          if (draftSpeed !== 'instant') {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          console.log('No player selected - stopping');
          break;
        }
      } catch (error) {
        console.error('Draft sequence error:', error);
        break;
      }
    }

    setIsAutoProcessing(false);
    setIsDraftRunning(false);
    console.log('🏁 Draft sequence complete');
  };

  // Execute auto-draft for current team
  const executeAutoDraft = async () => {
    if (!isAutoDrafting || players.length === 0) {
      console.log('Auto-draft skipped: disabled or no players');
      return;
    }

    const currentTeam = getCurrentTeam(currentDraftPick);
    const teamStrategy = autoDraftSettings[currentTeam];

    if (!teamStrategy || teamStrategy === 'manual') {
      console.log(`Team ${currentTeam} is manual - skipping auto-draft`);
      return;
    }

    const availablePlayers = players.filter(p => !draftedPlayers.includes(p.id));
    const currentTeamData = teams.find(t => t.id === currentTeam);

    if (!currentTeamData || availablePlayers.length === 0) {
      console.log('No team data or available players');
      return;
    }

    console.log(`Executing auto-draft for Team ${currentTeam} with ${availablePlayers.length} available players`);

    try {
      setLastAutoDraftTime(Date.now());

      const teamVar = teamVariability[currentTeam] || 0.3;
      const result = await callAutoDraftAPI(availablePlayers, currentTeamData, teamStrategy, teamVar);

      if (result && result.player_id) {
        console.log(`Auto-draft result: ${result.player_name} (${result.reasoning})`);
        draftPlayer(result.player_id);
        console.log(`✅ Auto-drafted: ${result.player_name} for ${currentTeamData.name} using ${result.strategy_used}`);
      } else {
        console.log('Auto-draft API returned no player');
      }
    } catch (error) {
      console.error('Auto-draft execution error:', error);

      if (availablePlayers.length > 0) {
        const fallbackPlayer = availablePlayers.sort((a, b) => a.rank - b.rank)[0];
        console.log(`Fallback: drafting ${fallbackPlayer.name}`);
        draftPlayer(fallbackPlayer.id);
      }
    } finally {
      setIsAutoProcessing(false);
    }
  };

  // Enhanced keyboard shortcut for quick draft (Ctrl+K)
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
        setQuickDraftQuery('');
        setSelectedPlayerIndex(0);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Enhanced quick draft players with selection tracking
  const quickDraftPlayers = useMemo(() => {
    if (!quickDraftQuery || quickDraftQuery.length < 1) return [];

    const availablePlayers = players.filter(p => !draftedPlayers.includes(p.id));
    return availablePlayers
      .filter(player =>
        player.name.toLowerCase().includes(quickDraftQuery.toLowerCase()) ||
        player.team.toLowerCase().includes(quickDraftQuery.toLowerCase()) ||
        player.position.toLowerCase().includes(quickDraftQuery.toLowerCase())
      )
      .slice(0, 8)
      .sort((a, b) => a.rank - b.rank);
  }, [quickDraftQuery, players, draftedPlayers]);

  // Enhanced handleQuickDraft function
  const handleQuickDraft = (playerId) => {
    draftPlayer(playerId);
    setShowQuickDraft(false);
    setQuickDraftQuery('');
    setSelectedPlayerIndex(0);
  };

  // Update auto-draft settings when number of teams changes
  useEffect(() => {
    setAutoDraftSettings(prevSettings => {
      const newSettings = {};
      for (let i = 1; i <= numTeams; i++) {
        newSettings[i] = prevSettings[i] || 'manual';
      }
      return newSettings;
    });

    setTeamVariability(prevVariability => {
      const newVariability = {};
      for (let i = 1; i <= numTeams; i++) {
        newVariability[i] = prevVariability[i] || 0.3; // Default to 30% variability
      }
      return newVariability;
    });
  }, [numTeams]);

  // Modified auto-draft effect - only for single picks when not running sequence
  useEffect(() => {
    if (!isAutoDrafting || players.length === 0 || draftedPlayers.length >= players.length || isDraftRunning) return;

    const currentTeam = getCurrentTeam(currentDraftPick);
    const teamStrategy = autoDraftSettings[currentTeam];

    console.log(`Pick ${currentDraftPick}: Team ${currentTeam} (Strategy: ${teamStrategy || 'manual'}) [${draftStyle} draft]`);

    if (teamStrategy && teamStrategy !== 'manual') {
      console.log(`Single auto-draft for Team ${currentTeam} using ${teamStrategy} strategy`);
      setIsAutoProcessing(true);

      const timer = setTimeout(() => {
        executeAutoDraft();
      }, getDraftDelay());

      return () => {
        clearTimeout(timer);
        setIsAutoProcessing(false);
      };
    } else {
      console.log(`Team ${currentTeam} is set to manual draft - waiting for user input`);
      setIsAutoProcessing(false);
    }
  }, [currentDraftPick, isAutoDrafting, autoDraftSettings, players.length, draftedPlayers.length, isDraftRunning, draftStyle, numTeams]);

  // Get unique positions
  const positions = useMemo(() => {
    const posSet = new Set(players.map(p => p.position));
    return ['ALL', ...Array.from(posSet).sort()];
  }, [players]);

  // Get players by position with position-specific rankings
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

  // Filter players based on search and position
  const filteredPlayers = useMemo(() => {
    const baseList = activeTab === 'overall' ? players : (playersByPosition[activeTab] || []);

    return baseList.filter(player => {
      const matchesSearch = searchQuery === '' ||
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPosition = selectedPosition === 'ALL' || player.position === selectedPosition;
      const matchesDrafted = showDrafted || !draftedPlayers.includes(player.id);

      return matchesSearch && matchesPosition && matchesDrafted;
    });
  }, [players, playersByPosition, activeTab, searchQuery, selectedPosition, showDrafted, draftedPlayers]);

  // Get draft statistics by position
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

  // Enhanced Quick Draft Modal Component
  const QuickDraftModal = () => {
    if (!showQuickDraft) return null;

    const modalStyles = {
      overlay: {
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
      modal: {
        backgroundColor: themeStyles.card.backgroundColor,
        border: themeStyles.card.border,
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      },
      header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      },
      title: {
        fontSize: '18px',
        fontWeight: '600',
        color: themeStyles.text.primary
      },
      currentTeamInfo: {
        fontSize: '14px',
        color: themeStyles.text.secondary,
        backgroundColor: themeStyles.hover.background,
        padding: '8px 12px',
        borderRadius: '6px',
        marginBottom: '16px'
      },
      searchInput: {
        width: '100%',
        padding: '12px 16px',
        fontSize: '16px',
        border: `2px solid ${themeStyles.border}`,
        borderRadius: '8px',
        backgroundColor: themeStyles.input.backgroundColor,
        color: themeStyles.text.primary,
        outline: 'none',
        marginBottom: '16px'
      },
      playersList: {
        maxHeight: '300px',
        overflowY: 'auto'
      },
      playerItem: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        border: `1px solid transparent`,
        marginBottom: '2px'
      },
      playerItemSelected: {
        backgroundColor: '#2563eb',
        border: `1px solid #1d4ed8`,
        color: '#ffffff'
      },
      playerItemHover: {
        backgroundColor: themeStyles.hover.background,
        border: `1px solid ${themeStyles.border}`
      },
      playerInfo: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      },
      playerMain: {
        flex: 1
      },
      playerName: {
        fontWeight: '500',
        color: themeStyles.text.primary,
        marginBottom: '4px'
      },
      playerNameSelected: {
        color: '#ffffff'
      },
      playerMeta: {
        fontSize: '12px',
        color: themeStyles.text.secondary
      },
      playerMetaSelected: {
        color: '#e0e7ff'
      },
      playerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginLeft: '12px'
      },
      rankBadge: {
        backgroundColor: '#f3f4f6',
        color: '#1f2937',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        marginRight: '12px'
      },
      rankBadgeSelected: {
        backgroundColor: '#1d4ed8',
        color: '#ffffff'
      },
      watchButton: {
        padding: '6px',
        borderRadius: '4px',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center'
      },
      helper: {
        fontSize: '11px',
        color: themeStyles.text.muted,
        backgroundColor: themeStyles.hover.background,
        padding: '8px 12px',
        borderRadius: '6px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      },
      helperSection: {
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
      }
    };

    // Enhanced keyboard navigation
    const handleKeyDown = (e) => {
      if (quickDraftPlayers.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedPlayerIndex(prev =>
            prev < quickDraftPlayers.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedPlayerIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedPlayerIndex >= 0 && selectedPlayerIndex < quickDraftPlayers.length) {
            const selectedPlayer = quickDraftPlayers[selectedPlayerIndex];
            handleQuickDraft(selectedPlayer.id);
          }
          break;
        case 'w':
        case 'W':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (selectedPlayerIndex >= 0 && selectedPlayerIndex < quickDraftPlayers.length) {
              const selectedPlayer = quickDraftPlayers[selectedPlayerIndex];
              toggleWatchPlayer(selectedPlayer.id);
            }
          }
          break;
        case 'Escape':
          setShowQuickDraft(false);
          setQuickDraftQuery('');
          setSelectedPlayerIndex(0);
          break;
      }
    };

    const handleWatchClick = (e, playerId) => {
      e.stopPropagation();
      toggleWatchPlayer(playerId);
    };

    return (
      <div style={modalStyles.overlay} onClick={() => setShowQuickDraft(false)}>
        <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={modalStyles.header}>
            <div style={modalStyles.title}>Quick Draft</div>
            <button
              onClick={() => setShowQuickDraft(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: themeStyles.text.secondary
              }}
            >
              ✕
            </button>
          </div>

          <div style={modalStyles.currentTeamInfo}>
            <strong>Current Pick:</strong> {currentDraftPick} - {teamNames[currentTeam] || `Team ${currentTeam}`}
          </div>

          <input
            type="text"
            placeholder="Search players to draft..."
            value={quickDraftQuery}
            onChange={(e) => {
              setQuickDraftQuery(e.target.value);
              setSelectedPlayerIndex(0); // Reset selection when typing
            }}
            onKeyDown={handleKeyDown}
            style={modalStyles.searchInput}
            autoFocus
          />

          {quickDraftPlayers.length > 0 && (
            <div style={modalStyles.helper}>
              <div style={modalStyles.helperSection}>
                <span>↑↓</span> navigate
              </div>
              <div style={modalStyles.helperSection}>
                <span style={modalStyles.kbd}>Enter</span> draft
              </div>
              <div style={modalStyles.helperSection}>
                <span style={modalStyles.kbd}>Ctrl+W</span> watch
              </div>
              <div style={modalStyles.helperSection}>
                <span style={modalStyles.kbd}>Esc</span> close
              </div>
            </div>
          )}

          <div style={modalStyles.playersList}>
            {quickDraftPlayers.map((player, index) => {
              const isSelected = index === selectedPlayerIndex;
              const isWatched = isPlayerWatched(player.id);

              return (
                <div
                  key={player.id}
                  style={{
                    ...modalStyles.playerItem,
                    ...(isSelected ? modalStyles.playerItemSelected : {}),
                    ...(isWatched && !isSelected ? {
                      backgroundColor: `${watchHighlightColor}${Math.round((watchHighlightOpacity || 30) / 100 * 255).toString(16).padStart(2, '0')}`,
                      border: `1px solid ${watchHighlightColor}`
                    } : {})
                  }}
                  onClick={() => handleQuickDraft(player.id)}
                  onMouseEnter={() => setSelectedPlayerIndex(index)}
                >
                  <div style={modalStyles.playerInfo}>
                    <div style={{
                      ...modalStyles.rankBadge,
                      ...(isSelected ? modalStyles.rankBadgeSelected : {})
                    }}>
                      #{player.rank}
                    </div>

                    <div style={modalStyles.playerMain}>
                      <div style={{
                        ...modalStyles.playerName,
                        ...(isSelected ? modalStyles.playerNameSelected : {})
                      }}>
                        {player.name}
                      </div>
                      <div style={{
                        ...modalStyles.playerMeta,
                        ...(isSelected ? modalStyles.playerMetaSelected : {})
                      }}>
                        {player.position} • {player.team}
                        {player.tier && ` • Tier ${player.tier}`}
                      </div>
                    </div>

                    <div style={modalStyles.playerActions}>
                      <button
                        onClick={(e) => handleWatchClick(e, player.id)}
                        style={{
                          ...modalStyles.watchButton,
                          backgroundColor: isWatched ? watchHighlightColor : 'transparent',
                          color: isWatched ? '#ffffff' : (isSelected ? '#ffffff' : themeStyles.text.muted)
                        }}
                        title={isWatched ? 'Remove from watch list' : 'Add to watch list'}
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {quickDraftQuery && quickDraftPlayers.length === 0 && (
              <div style={{ textAlign: 'center', color: themeStyles.text.muted, padding: '20px' }}>
                No players found matching "{quickDraftQuery}"
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <QuickDraftModal />

      {/* Sticky Header - only shown when players are loaded */}
      {players.length > 0 && (
        <div style={styles.stickyHeader}>
          <div style={{ position: 'relative' }}>
            <div style={styles.headerContent}>
              📍 Pick {currentDraftPick} - {teamNames[currentTeam] || `Team ${currentTeam}`} On The Clock
            </div>
            {currentCSVSource && (
              <div style={styles.csvSourceIndicator}>
                Using: {currentCSVSource}
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Upload Area - only shown when no players loaded */}
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
          {/* Unified Control Panel */}
          <UnifiedControlPanel
            themeStyles={themeStyles}
            undoLastDraft={undoLastDraft}
            draftedPlayers={draftedPlayers}
            onNewCSV={handleFileUpload}
            onSwitchCSV={handleCSVSwitch}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedPosition={selectedPosition}
            setSelectedPosition={setSelectedPosition}
            positions={positions}
            players={players}
            draftPlayer={draftPlayer}
            currentDraftPick={currentDraftPick}
            currentTeam={currentTeam}
            teamNames={teamNames}
            onRestartDraft={restartDraft}
          />

          {/* Auto-Draft Settings */}
          <AutoDraftSettings
            numTeams={numTeams}
            autoDraftSettings={autoDraftSettings}
            setAutoDraftSettings={setAutoDraftSettings}
            isAutoDrafting={isAutoDrafting}
            setIsAutoDrafting={setIsAutoDrafting}
            themeStyles={themeStyles}
            isDraftRunning={isDraftRunning}
            startDraftSequence={startDraftSequence}
            draftSpeed={draftSpeed}
            setDraftSpeed={setDraftSpeed}
            draftStyle={draftStyle}
            setDraftStyle={setDraftStyle}
            teamNames={teamNames}
            setTeamNames={setTeamNames}
            teamVariability={teamVariability}
            setTeamVariability={setTeamVariability}
          />

          {/* League Settings */}
          <LeagueSettings
            numTeams={numTeams}
            setNumTeams={setNumTeams}
            rosterSettings={rosterSettings}
            setRosterSettings={setRosterSettings}
            positionColors={positionColors}
            setPositionColors={setPositionColors}
            themeStyles={themeStyles}
          />

          {/* Draft Statistics Chart */}
          <DraftStats
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
          />
        </>
      )}
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
