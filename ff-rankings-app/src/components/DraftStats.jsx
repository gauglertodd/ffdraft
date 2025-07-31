import React from 'react';

const DraftStats = ({
  draftStats,
  draftedPlayers,
  players,
  themeStyles,
  isEmbedded = false // New prop to determine if this is embedded in UnifiedSettingsPanel
}) => {
  const cardStyles = {
    card: isEmbedded ? {} : {
      ...themeStyles.card,
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '32px'
    },
    title: isEmbedded ? {
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '16px',
      color: themeStyles.text.primary
    } : {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '16px',
      color: themeStyles.text.primary
    }
  };

  const styles = {
    ...cardStyles,
    statsContainer: {
      marginBottom: '16px'
    },
    statRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px'
    },
    statLabel: {
      width: '48px',
      fontSize: '14px',
      fontWeight: '500',
      color: themeStyles.text.primary
    },
    progressBar: {
      flex: '1',
      backgroundColor: themeStyles.progressBar.backgroundColor,
      borderRadius: '9999px',
      height: '24px',
      position: 'relative'
    },
    progressFill: {
      backgroundColor: '#2563eb',
      height: '24px',
      borderRadius: '9999px',
      transition: 'width 0.3s'
    },
    progressText: {
      position: 'absolute',
      inset: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '12px',
      fontWeight: '500'
    },
    statPercent: {
      width: '64px',
      fontSize: '14px',
      color: themeStyles.text.secondary
    },
    totalStats: {
      marginTop: '16px',
      fontSize: '14px',
      color: themeStyles.text.secondary
    }
  };

  const ComponentContent = () => (
    <>
      <h2 style={styles.title}>Draft Progress by Position</h2>
      <div style={styles.statsContainer}>
        {Object.entries(draftStats).map(([position, stats]) => (
          <div key={position} style={styles.statRow}>
            <div style={styles.statLabel}>{position}</div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${stats.total > 0 ? (stats.drafted / stats.total) * 100 : 0}%`
                }}
              />
              <div style={styles.progressText}>
                {stats.drafted} / {stats.total}
              </div>
            </div>
            <div style={styles.statPercent}>
              {stats.total > 0 ? Math.round((stats.drafted / stats.total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
      <div style={styles.totalStats}>
        Total Drafted: {draftedPlayers.length} / {players.length}
      </div>
    </>
  );

  if (isEmbedded) {
    return <ComponentContent />;
  }

  return (
    <div style={styles.card}>
      <ComponentContent />
    </div>
  );
};

export default DraftStats;
