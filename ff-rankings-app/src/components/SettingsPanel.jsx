// SettingsPanel - Mantine-native reskin.
//
// Visual language: Mantine Paper surfaces, Tabs, Selects, Slider, Switch,
// Badge chips and Progress bars. All props/behavior identical to the
// original: per-team strategy + ranking assignment, variability, detection,
// roster config and draft progress.

import React, { useState, useCallback, useRef } from 'react';
import { Settings, Bot, Play, Pause, ChevronDown, ChevronUp, Wand2, Dices } from 'lucide-react';
import {
  Paper, Group, Stack, Text, Tabs, Select, TextInput, Slider,
  Button, Badge, Progress, SegmentedControl, Box, Divider,
} from '@mantine/core';
import { toast } from 'sonner';
import { UnmountCollapse } from './Modern';

const SettingsPanel = ({
  numTeams,
  setNumTeams,
  rosterSettings,
  setRosterSettings,
  positionColors,
  setPositionColors,
  autoDraftSettings,
  setAutoDraftSettings,
  isAutoDrafting,
  setIsAutoDrafting,
  setIsDraftRunning,
  isDraftRunning,
  startDraftSequence,
  draftSpeed,
  setDraftSpeed,
  draftStyle,
  setDraftStyle,
  teamNames,
  setTeamNames,
  teamVariability,
  setTeamVariability,
  teamRankingProfile,
  setTeamRankingProfile,
  rankingProfiles,
  defaultRankingProfileId,
  detectAllTeams,
  isDetecting,
  inferredMeta,
  draftStats,
  draftedPlayers,
  players,
  themeStyles
}) => {
  const [activeTab, setActiveTab] = useState('auto-draft');
  const [isExpanded, setIsExpanded] = useState(false);


  // Auto-draft strategies
  const strategies = [
    { value: 'manual', label: 'Manual', description: 'User drafts manually' },
    { value: 'bpa', label: 'Best Player Available', description: 'Always draft highest ranked player' },
    { value: 'positional', label: 'Positional Need', description: 'Draft based on roster needs' },
    { value: 'tier', label: 'Tier-Based', description: 'Draft best player in highest tier' },
    { value: 'balanced', label: 'Balanced', description: 'Mix of BPA and positional need' },
    { value: 'wr_heavy', label: 'WR Heavy', description: 'Prioritize WR early and often' },
    { value: 'rb_heavy', label: 'RB Heavy', description: 'Load up on RBs early' },
    { value: 'hero_rb', label: 'Hero RB', description: 'Take elite RB early, then focus on WR/TE' },
    { value: 'hero_wr', label: 'Hero WR', description: 'Take elite WR early, then focus on RB/TE' },
    { value: 'zero_rb', label: 'Zero RB', description: 'Wait on RB while focusing on WR/TE early' },
    { value: 'late_qb', label: 'Late QB', description: 'Wait on QB until later rounds' },
    { value: 'early_qb', label: 'Early QB', description: 'Secure elite QB early' },
    { value: 'vbd', label: 'VBD', description: 'Value Based Drafting: most value above position baseline' },
    { value: 'scarcity', label: 'Scarcity', description: 'Target positions about to dry up (run prevention)' },
    { value: 'elite_te', label: 'Elite TE', description: 'Lock a top TE early, or punt the position' },
    { value: 'upside', label: 'Upside', description: 'Safe early, tier-break fliers mid, RB/WR stash late' }
  ];

  const strategyStats = () => {
    const autoTeams = Object.values(autoDraftSettings).filter(s => s && s !== 'manual').length;
    return { autoTeams, manualTeams: numTeams - autoTeams };
  };

  const handleTeamNameChange = useCallback((teamId, newName) => {
    setTeamNames(prev => ({ ...prev, [teamId]: newName }));
  }, [setTeamNames]);

  // The blur event carries the input element; no refs needed. (The old
  // ref-based read broke with Mantine v8, whose TextInput ref points at
  // the wrapper element - input.value was undefined, so every blur reset
  // the name to the default and edits never stuck.)
  const handleTeamNameBlur = useCallback((teamId, event) => {
    const raw = event?.currentTarget?.value;
    const cleanName = (raw || '').trim() || `Team ${teamId}`;
    if (event?.currentTarget) event.currentTarget.value = cleanName;
    handleTeamNameChange(teamId, cleanName);
  }, [handleTeamNameChange]);

  const setAllTeamsStrategy = useCallback((strategy) => {
    const newSettings = {};
    for (let i = 1; i <= numTeams; i++) {
      newSettings[i] = strategy;
    }
    setAutoDraftSettings(newSettings);
  }, [numTeams, setAutoDraftSettings]);

  const randomizeAllStrategies = useCallback(() => {
    const availableStrategies = strategies.filter(s => s.value !== 'manual').map(s => s.value);
    const newSettings = {};
    for (let i = 1; i <= numTeams; i++) {
      newSettings[i] = availableStrategies[Math.floor(Math.random() * availableStrategies.length)];
    }
    setAutoDraftSettings(newSettings);
  }, [numTeams, setAutoDraftSettings]);

  const setAllTeamsRankingProfile = useCallback((profileId) => {
    const newProfiles = {};
    for (let i = 1; i <= numTeams; i++) newProfiles[i] = profileId;
    setTeamRankingProfile(newProfiles);
  }, [numTeams, setTeamRankingProfile]);

  const randomizeAllRankingProfiles = useCallback(() => {
    const ids = (rankingProfiles || []).map(p => p.id).filter(Boolean);
    if (!ids.length) return;
    const newProfiles = {};
    for (let i = 1; i <= numTeams; i++) {
      newProfiles[i] = ids[Math.floor(Math.random() * ids.length)];
    }
    setTeamRankingProfile(newProfiles);
  }, [numTeams, rankingProfiles, setTeamRankingProfile]);

  const setAllTeamsVariability = useCallback((variability) => {
    const newVariability = {};
    for (let i = 1; i <= numTeams; i++) {
      newVariability[i] = parseFloat(variability);
    }
    setTeamVariability(newVariability);
  }, [numTeams, setTeamVariability]);

  const randomizeAllVariability = useCallback(() => {
    const buckets = [0, 0.2, 0.3, 0.5, 0.7, 0.8, 0.9, 1.0];
    const newVariability = {};
    for (let i = 1; i <= numTeams; i++) {
      newVariability[i] = buckets[Math.floor(Math.random() * buckets.length)];
    }
    setTeamVariability(newVariability);
  }, [numTeams, setTeamVariability]);

  const { autoTeams, manualTeams } = strategyStats();
  const draftProgress = players.length > 0
    ? Math.round((draftedPlayers.length / players.length) * 100)
    : 0;

  // ── League tab ──────────────────────────────────────────────────────
  // Inline swatch grid state: which position's picker is open (null = none).
  // Deliberately NOT a floating popover — the grid renders in normal layout
  // flow under the row, so there is no portal, no transition, no positioning:
  // nothing that can animate or "zoom".
  const [openColorPicker, setOpenColorPicker] = useState(null);

  const SWATCHES = [
    '#ef4444', '#f59e0b', '#eab308', '#10b981',
    '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
    '#f97316', '#84cc16', '#06b6d4', '#6366f1',
    '#64748b', '#0f172a', '#e2e8f0', '#ffffff',
  ];

  const renderLeagueSettings = () => (
    <Stack gap="md">
      <Group align="flex-end" gap="md">
        <Select
          label="Teams"
          value={String(numTeams)}
          onChange={(v) => v && setNumTeams(parseInt(v))}
          data={['8', '10', '12', '14', '16'].map(n => ({ value: n, label: `${n} teams` }))}
          w={130}
        />
        <Divider orientation="vertical" style={{ alignSelf: 'stretch' }} />
        <Text size="xs" c="dimmed">
          Roster slots and position colors. Click a color chip to open the
          palette below its row.
        </Text>
      </Group>

      <Stack gap={0}>
        {Object.entries(rosterSettings).map(([position, count], idx, arr) => {
          const isOpen = openColorPicker === position;
          return (
            <Box key={position}>
              <Group
                gap={6}
                wrap="nowrap"
                px={4}
                py={4}
                style={{
                  borderBottom: idx < arr.length - 1 ? '1px solid var(--ffx-border)' : 'none',
                }}
              >
                <Text size="xs" fw={700} w={44}>{position}</Text>
                <Select
                  value={String(count)}
                  onChange={(v) => v !== null && setRosterSettings({
                    ...rosterSettings,
                    [position]: parseInt(v)
                  })}
                  data={Array.from({ length: 9 }, (_, n) => ({ value: String(n), label: String(n) }))}
                  w={64}
                  size="xs"
                />
                <Box
                  onClick={() => setOpenColorPicker(isOpen ? null : position)}
                  title={`${position} color — click to change`}
                  style={{
                    width: 30,
                    height: 26,
                    borderRadius: 6,
                    backgroundColor: positionColors[position],
                    border: '1px solid var(--ffx-border-strong)',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <Text size="10px" c="dimmed" ff="monospace" style={{ userSelect: 'none' }}>
                  {positionColors[position]}
                </Text>
              </Group>

              {isOpen && (
                <Group
                  gap={6}
                  p={8}
                  mb={4}
                  style={{
                    backgroundColor: 'var(--ffx-surface-alt)',
                    borderRadius: 8,
                    border: '1px solid var(--ffx-border)',
                    flexWrap: 'wrap',
                  }}
                >
                  {SWATCHES.map(color => (
                    <Box
                      key={color}
                      onClick={() => {
                        setPositionColors({
                          ...positionColors,
                          [position]: color
                        });
                        setOpenColorPicker(null);
                      }}
                      title={color}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        backgroundColor: color,
                        border: positionColors[position] === color
                          ? '2px solid var(--ffx-text)'
                          : '1px solid var(--ffx-border-strong)',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Group>
              )}
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );

  // ── Auto-Draft tab ─────────────────────────────────────────────────
  const renderAutoDraftSettings = () => (
    <Stack gap="lg">
      {/* Status + main controls */}
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="sm">
          {[
            { label: 'Auto Teams', value: autoTeams, color: 'var(--ffx-info)' },
            { label: 'Manual Teams', value: manualTeams, color: 'var(--ffx-text-3)' },
            { label: 'Auto-Draft', value: isAutoDrafting ? 'ON' : 'OFF', color: isAutoDrafting ? 'var(--ffx-accent)' : 'var(--ffx-text-3)' },
          ].map(stat => (
            <Paper key={stat.label} withBorder radius="md" px="sm" py={6} style={{ minWidth: 86 }}>
              <Text size="lg" fw={700} c={stat.color} style={{ lineHeight: 1.2 }}>{stat.value}</Text>
              <Text size="xs" c="dimmed">{stat.label}</Text>
            </Paper>
          ))}
        </Group>

        <Group gap="sm">
          <Button
            variant="light"
            color="grape"
            leftSection={<Wand2 size={15} />}
            onClick={() => detectAllTeams && detectAllTeams()}
            loading={isDetecting}
            disabled={!detectAllTeams}
          >
            Auto-Detect
          </Button>
          <Button
            color="teal"
            variant="filled"
            leftSection={<Play size={15} />}
            onClick={() => {
              if (autoTeams === 0) {
                toast.warning('Configure at least one team for auto-draft before starting.');
                return;
              }
              setIsAutoDrafting(true);
              startDraftSequence();
            }}
            disabled={isDraftRunning || autoTeams === 0}
          >
            Start
          </Button>
          <Button
            color="orange"
            variant="light"
            leftSection={<Pause size={15} />}
            onClick={() => {
              setIsAutoDrafting(false);
              setIsDraftRunning(false);
            }}
            disabled={!isAutoDrafting && !isDraftRunning}
          >
            Stop
          </Button>
        </Group>
      </Group>

      {/* Global settings */}
      <Group gap="md" align="flex-end" wrap="wrap">
        <Select
          label="Draft Speed"
          value={draftSpeed}
          onChange={(v) => v && setDraftSpeed(v)}
          data={[
            { value: 'instant', label: 'Instant' },
            { value: 'fast', label: 'Fast (0.2s)' },
            { value: 'normal', label: 'Normal (0.8s)' },
            { value: 'slow', label: 'Slow (2s)' },
          ]}
          w={150}
        />
        <Box>
          <Text size="xs" fw={600} mb={6} c="dimmed">Draft Style</Text>
          <SegmentedControl
            value={draftStyle}
            onChange={setDraftStyle}
            data={[
              { value: 'snake', label: 'Snake' },
              { value: 'linear', label: 'Linear' },
            ]}
            color="teal"
          />
        </Box>
        <Select
          label="Set All Strategies"
          placeholder="Pick to apply..."
          value={null}
          onChange={(v) => {
            if (!v) return;
            if (v === 'randomize') randomizeAllStrategies();
            else setAllTeamsStrategy(v);
          }}
          data={[
            ...strategies.map(s => ({ value: s.value, label: s.label })),
            { value: 'randomize', label: '🎲 Randomize All' },
          ]}
          w={210}
        />
        <Select
          label="Set All Rankings"
          placeholder="Pick to apply..."
          value={null}
          onChange={(v) => {
            if (!v) return;
            if (v === 'randomize') randomizeAllRankingProfiles();
            else setAllTeamsRankingProfile(v);
          }}
          data={[
            ...(rankingProfiles || []).map(p => ({ value: p.id, label: p.label })),
            { value: 'randomize', label: '🎲 Randomize All Rankings' },
          ]}
          w={240}
        />
        <Select
          label="Set All Variability"
          placeholder="Pick to apply..."
          value={null}
          onChange={(v) => {
            if (!v) return;
            if (v === 'randomize') randomizeAllVariability();
            else setAllTeamsVariability(v);
          }}
          data={[
            { value: '0', label: '0% (Rigid)' },
            { value: '0.2', label: '20% (Low)' },
            { value: '0.3', label: '30% (Medium)' },
            { value: '0.5', label: '50% (High)' },
            { value: '0.7', label: '70% (Very High)' },
            { value: '0.8', label: '80% (Extreme)' },
            { value: '0.9', label: '90% (Wild)' },
            { value: '1.0', label: '100% (Pure Chaos)' },
            { value: 'randomize', label: '🎲 Randomize All' },
          ]}
          w={200}
        />
        <Button
          variant="light"
          color="grape"
          leftSection={<Dices size={15} />}
          onClick={() => {
            randomizeAllStrategies();
            randomizeAllRankingProfiles();
            randomizeAllVariability();
            toast.success('🎲 Randomized strategies, rankings, and variability for all teams.', {
              description: 'Every team now drafts with a different personality. Re-roll as often as you like.',
            });
          }}
          title="Randomize strategies, rankings, and variability for every team"
        >
          Randomize everything!
        </Button>
      </Group>

      {/* Team cards */}
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {Array.from({ length: numTeams }, (_, i) => {
          const teamId = i + 1;
          const strategy = autoDraftSettings[teamId] || 'manual';
          const variabilityValue = teamVariability[teamId];
          const variability = (variabilityValue !== undefined ? variabilityValue : 0.3) * 100;
          const selectedStrategy = strategies.find(s => s.value === strategy);
          const meta = inferredMeta?.[teamId];

          return (
            <Paper
              key={teamId}
              withBorder
              radius="md"
              p="sm"
              style={{
                backgroundColor: 'var(--ffx-surface-alt)',
                borderColor: 'var(--ffx-border)',
              }}
            >
              <Stack gap={6}>
                <TextInput
                  defaultValue={teamNames[teamId] || `Team ${teamId}`}
                  onBlur={(e) => handleTeamNameBlur(teamId, e)}
                  size="xs"
                  variant="unstyled"
                  placeholder={`Team ${teamId}`}
                  styles={{ input: { fontWeight: 700, fontSize: 14, minHeight: 24 } }}
                />

                <Select
                  value={strategy}
                  onChange={(v) => v && setAutoDraftSettings(prev => ({
                    ...prev,
                    [teamId]: v
                  }))}
                  data={strategies.map(s => ({ value: s.value, label: s.label }))}
                  size="sm"
                  styles={{ input: { backgroundColor: 'var(--ffx-overlay)' } }}
                />

                <Select
                  value={teamRankingProfile?.[teamId] || defaultRankingProfileId || ''}
                  onChange={(v) => v && setTeamRankingProfile(prev => ({
                    ...prev,
                    [teamId]: v
                  }))}
                  data={(rankingProfiles || []).map(p => ({ value: p.id, label: p.label }))}
                  size="sm"
                  styles={{ input: { backgroundColor: 'var(--ffx-overlay)' } }}
                />

                <Text size="xs" c="dimmed" mih={30} lh={1.4}>
                  {selectedStrategy ? selectedStrategy.description : ''}
                </Text>

                {meta && (
                  <Badge
                    size="sm"
                    variant="light"
                    color={meta.confidence >= 0.6 ? 'teal' : meta.confidence >= 0.25 ? 'yellow' : 'gray'}
                    leftSection="🔍"
                    styles={{ section: { marginInlineEnd: 2 } }}
                    title="Inferred from this team's actual picks. Override freely - the detection only pre-fills."
                  >
                    {meta.confidence >= 0.6 ? 'Strong' : meta.confidence >= 0.25 ? 'Weak' : 'Low'} match
                    {meta.boardLabel ? ` · ${meta.boardLabel}` : ''}
                    {typeof meta.meanGap === 'number' ? ` · ${Math.round(meta.meanGap)} dev` : ''}
                  </Badge>
                )}

                {strategy !== 'manual' && (
                  <Group gap={6} wrap="nowrap">
                    <Text size="xs" c="dimmed" w={30}>Var</Text>
                    <Slider
                      min={0}
                      max={100}
                      step={10}
                      value={Math.round(variability)}
                      onChange={(v) => setTeamVariability(prev => ({
                        ...prev,
                        [teamId]: v / 100
                      }))}
                      label={(v) => `${v}%`}
                      color="teal"
                      size="sm"
                      flex={1}
                    />
                    <Text size="xs" c="dimmed" w={32} ta="right">{Math.round(variability)}%</Text>
                  </Group>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );

  // ── Progress tab ───────────────────────────────────────────────────
  const renderDraftProgress = () => (
    <Stack gap="md">
      <Text size="sm" fw={600}>Draft Progress by Position</Text>

      {Object.entries(draftStats).map(([position, stats]) => {
        const pct = stats.total > 0 ? (stats.drafted / stats.total) * 100 : 0;
        return (
          <Group key={position} gap="md" wrap="nowrap">
            <Text size="sm" fw={600} w={44}>{position}</Text>
            <Box pos="relative" flex={1}>
              <Progress
                value={pct}
                size="lg"
                radius="xl"
                color="teal"
                bg="var(--ffx-surface-alt)"
              />
              <Text
                size="xs"
                fw={600}
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  // Label sits on both fill (teal) and track (surface) - give
                  // it its own contrast surface so it never goes black-on-black
                  // or white-on-white at any fill level.
                  color: '#0b1220',
                  backgroundColor: 'rgba(255, 255, 255, 0.72)',
                  borderRadius: 999,
                  padding: '0 8px',
                  backdropFilter: 'blur(2px)',
                }}
              >
                {stats.drafted} / {stats.total}
              </Text>
            </Box>
            <Text size="sm" c="dimmed" w={44} ta="right">{Math.round(pct)}%</Text>
          </Group>
        );
      })}

      <Text size="sm" c="dimmed">
        Total Drafted: {draftedPlayers.length} / {players.length}
      </Text>
    </Stack>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'league':
        return renderLeagueSettings();
      case 'auto-draft':
        return renderAutoDraftSettings();
      case 'progress':
        return renderDraftProgress();
      default:
        return null;
    }
  };

  return (
    <Paper
      withBorder
      radius="lg"
      mb="lg"
      style={{ overflow: 'hidden', boxShadow: 'var(--ffx-shadow-sm)' }}
    >
      {/* Header */}
      <Group
        justify="space-between"
        wrap="nowrap"
        px="lg"
        py="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--mantine-color-default-border)' : 'none' }}
      >
        <Group gap="xs">
          <Settings size={18} />
          <Text fw={600} size="md">Configuration</Text>
        </Group>

        <Group gap="sm" wrap="nowrap">
          <Group gap="xs" visibleFrom="sm">
            <Badge size="sm" variant="light" color="teal">{autoTeams}/{numTeams} auto</Badge>
            <Badge size="sm" variant="light" color="blue">{draftProgress}%</Badge>
            <Badge size="sm" variant="light" color="gray">
              {draftStyle === 'snake' ? 'Snake' : 'Linear'}
            </Badge>
          </Group>
          <Button
            size="compact-xs"
            variant="default"
            leftSection={isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? 'Collapse' : 'Configure'}
          </Button>
        </Group>
      </Group>

      {/* Body */}
      <UnmountCollapse collapsed={!isExpanded}>
        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
          <Tabs.List grow px="md" pt="xs">
            <Tabs.Tab value="league" leftSection={<Settings size={15} />}>League</Tabs.Tab>
            <Tabs.Tab value="auto-draft" leftSection={<Bot size={15} />}>Auto-Draft</Tabs.Tab>
            <Tabs.Tab value="progress" leftSection={<Wand2 size={15} />}>Progress</Tabs.Tab>
          </Tabs.List>

          <Box p="lg">
            <Tabs.Panel value="league">{renderLeagueSettings()}</Tabs.Panel>
            <Tabs.Panel value="auto-draft">{renderAutoDraftSettings()}</Tabs.Panel>
            <Tabs.Panel value="progress">{renderDraftProgress()}</Tabs.Panel>
          </Box>
        </Tabs>
      </UnmountCollapse>
    </Paper>
  );
};

export default SettingsPanel;
