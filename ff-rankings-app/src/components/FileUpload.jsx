import React, { useRef, useState, useEffect } from 'react';
import { Upload, FileText, Info } from 'lucide-react';

const FileUpload = ({ onFileUpload, isDragOver, setIsDragOver, themeStyles }) => {
  const fileInputRef = useRef(null);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);
  const [availableCSVs, setAvailableCSVs] = useState([]);
  const [isScanning, setIsScanning] = useState(true);
  const [scanError, setScanError] = useState(null);

  // Hardcoded list of CSV files to check for in public/ directory
  const csvFilesToCheck = [
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

    // Handle files with spaces (keep as-is)
    if (filename.includes(' ')) {
      return nameWithoutExt;
    }

    // Handle common patterns with underscores
    const patterns = [
      { match: 'fantasypros_', replace: 'FantasyPros ' },
      { match: 'espn_', replace: 'ESPN ' },
      { match: 'yahoo_', replace: 'Yahoo ' },
      { match: 'sleeper_', replace: 'Sleeper ' },
      { match: 'sample_rankings', replace: 'Sample Rankings' },
      { match: 'draft_rankings', replace: 'Draft Rankings' },
      { match: 'player_rankings', replace: 'Player Rankings' },
      { match: 'draft_board', replace: 'Draft Board' }
    ];

    let friendlyName = nameWithoutExt;

    patterns.forEach(pattern => {
      if (friendlyName.includes(pattern.match)) {
        friendlyName = friendlyName.replace(pattern.match, pattern.replace);
      }
    });

    // Replace remaining underscores with spaces and capitalize
    return friendlyName
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Scan for available CSV files in the public directory
  const scanForCSVFiles = async () => {
    setIsScanning(true);
    setScanError(null);
    const foundFiles = [];

    console.log('🔍 Scanning for CSV files in public directory...');
    console.log(`Checking ${csvFilesToCheck.length} specific filenames...`);

    // Check each filename in our hardcoded list
    for (const filename of csvFilesToCheck) {
      try {
        const response = await fetch(`/${filename}`, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ Found: ${filename}`);

          // Try to get a preview of the file to extract player count
          try {
            const previewResponse = await fetch(`/${filename}`);
            const csvText = await previewResponse.text();
            const lines = csvText.split('\n').filter(line => line.trim());
            const playerCount = Math.max(0, lines.length - 1); // Subtract header row

            foundFiles.push({
              filename,
              name: generateFriendlyName(filename),
              description: `${playerCount} players`,
              playerCount
            });
          } catch (previewError) {
            // If preview fails, still add the file with basic info
            foundFiles.push({
              filename,
              name: generateFriendlyName(filename),
              description: 'CSV file found',
              playerCount: null
            });
          }
        }
      } catch (error) {
        // File doesn't exist or isn't accessible, skip silently
        console.log(`❌ Not found: ${filename}`);
      }
    }

    if (foundFiles.length === 0) {
      setScanError('No CSV files found.');
    }

    // Sort by name for better organization
    foundFiles.sort((a, b) => a.name.localeCompare(b.name));

    setAvailableCSVs(foundFiles);
    setIsScanning(false);

    console.log(`📊 Scan complete: Found ${foundFiles.length} CSV files`);
  };

  // Scan for files on component mount
  useEffect(() => {
    scanForCSVFiles();
  }, []);

  const handlePresetLoad = async (filename) => {
    setIsLoadingPreset(true);
    setSelectedPreset(filename);

    try {
      const response = await fetch(`/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}: ${response.status}`);
      }

      const csvText = await response.text();

      // Create a fake File object from the CSV text
      const blob = new Blob([csvText], { type: 'text/csv' });
      const file = new File([blob], filename, { type: 'text/csv' });

      onFileUpload(file);
    } catch (error) {
      console.error('Error loading preset file:', error);
      alert(`Failed to load ${filename}. Make sure the file exists in your public/ directory.`);
    } finally {
      setIsLoadingPreset(false);
      setSelectedPreset('');
    }
  };

  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '48px 24px'
    },
    welcomeSection: {
      textAlign: 'center',
      marginBottom: '48px'
    },
    welcomeTitle: {
      fontSize: '32px',
      fontWeight: '700',
      color: themeStyles.text.primary,
      marginBottom: '16px'
    },
    welcomeSubtitle: {
      fontSize: '18px',
      color: themeStyles.text.secondary,
      lineHeight: '1.6',
      maxWidth: '600px',
      margin: '0 auto'
    },
    csvRequirements: {
      backgroundColor: themeStyles.hover.background,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '32px',
      textAlign: 'left'
    },
    requirementsTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    requirementsList: {
      color: themeStyles.text.secondary,
      fontSize: '15px',
      lineHeight: '1.6',
      margin: '0',
      paddingLeft: '20px'
    },
    requirementsItem: {
      marginBottom: '8px'
    },
    optionalNote: {
      fontSize: '14px',
      color: themeStyles.text.muted,
      fontStyle: 'italic',
      marginTop: '16px',
      padding: '12px',
      backgroundColor: themeStyles.card.backgroundColor,
      borderRadius: '8px',
      border: `1px solid ${themeStyles.border}`
    },
    actionsSection: {
      marginBottom: '32px',
      textAlign: 'center'
    },
    actionCard: {
      backgroundColor: themeStyles.card.backgroundColor,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '12px',
      padding: '32px',
      maxWidth: '500px',
      margin: '0 auto'
    },
    actionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '12px'
    },
    actionDescription: {
      fontSize: '14px',
      color: themeStyles.text.secondary,
      marginBottom: '20px',
      lineHeight: '1.5'
    },
    uploadButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '16px 32px',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      border: `2px dashed ${isDragOver ? '#2563eb' : themeStyles.border}`,
      backgroundColor: isDragOver ? '#eff6ff' : themeStyles.card.backgroundColor,
      color: isDragOver ? '#2563eb' : themeStyles.text.primary,
      transition: 'all 0.2s',
      width: '100%',
      minHeight: '80px',
      margin: '0 auto',
      boxSizing: 'border-box'
    },
    presetSection: {
      backgroundColor: themeStyles.card.backgroundColor,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '12px',
      padding: '24px'
    },
    presetHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px'
    },
    presetTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      margin: '0',
      textAlign: 'center'
    },
    scanningMessage: {
      padding: '40px 20px',
      textAlign: 'center',
      color: themeStyles.text.secondary,
      fontSize: '15px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px'
    },
    scanningSpinner: {
      width: '20px',
      height: '20px',
      border: '2px solid #e5e7eb',
      borderTop: '2px solid #2563eb',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    errorMessage: {
      padding: '24px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      color: '#dc2626',
      fontSize: '15px',
      textAlign: 'center'
    },
    noFilesMessage: {
      padding: '40px 20px',
      textAlign: 'center',
      color: themeStyles.text.muted,
      fontSize: '15px',
      backgroundColor: themeStyles.hover.background,
      borderRadius: '8px',
      border: `1px dashed ${themeStyles.border}`
    },
    noFilesTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: themeStyles.text.secondary,
      marginBottom: '12px'
    },
    presetGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '16px'
    },
    presetCard: {
      backgroundColor: themeStyles.hover.background,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '8px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'left',
      position: 'relative'
    },
    presetCardHover: {
      backgroundColor: themeStyles.card.backgroundColor,
      borderColor: '#2563eb',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
    },
    presetCardLoading: {
      opacity: '0.6',
      cursor: 'not-allowed'
    },
    presetIcon: {
      color: '#2563eb',
      marginBottom: '12px'
    },
    presetName: {
      fontSize: '16px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '6px'
    },
    presetDescription: {
      fontSize: '13px',
      color: themeStyles.text.secondary,
      lineHeight: '1.4'
    },
    presetFilename: {
      fontSize: '11px',
      color: themeStyles.text.muted,
      marginTop: '6px',
      fontFamily: 'monospace'
    },
    loadingSpinner: {
      position: 'absolute',
      top: '50%',
      right: '16px',
      transform: 'translateY(-50%)',
      width: '20px',
      height: '20px',
      border: '2px solid #e5e7eb',
      borderTop: '2px solid #2563eb',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  return (
    <div style={styles.container}>
      {/* Welcome Section */}
      <div style={styles.welcomeSection}>
        <h1 style={styles.welcomeTitle}>Fantasy Football Draft Tracker</h1>
        <p style={styles.welcomeSubtitle}>
          Import your player rankings to start drafting with advanced auto-draft strategies,
          availability predictions, and real-time draft tracking.
        </p>
      </div>

      {/* CSV Requirements */}
      <div style={styles.csvRequirements}>
        <div style={styles.requirementsTitle}>
          <Info size={22} />
          CSV Format Requirements
        </div>
        <ul style={styles.requirementsList}>
          <li style={styles.requirementsItem}>
            <strong>Required columns:</strong> name, position, team, rank
          </li>
          <li style={styles.requirementsItem}>
            <strong>Optional columns:</strong> tier (enables tier-based draft strategies)
          </li>
          <li style={styles.requirementsItem}>
            <strong>Supported positions:</strong> QB, RB, WR, TE, DST, K
          </li>
          <li style={styles.requirementsItem}>
            <strong>Format:</strong> Standard CSV with headers in the first row
          </li>
        </ul>
        <div style={styles.optionalNote}>
          💡 <strong>Pro Tip:</strong> Adding a "tier" column enables advanced tier-based draft strategies.
        </div>
      </div>

      {/* Action Card */}
      <div style={styles.actionsSection}>
        <div style={styles.actionCard}>
          <div style={styles.actionTitle}>Upload Your Rankings</div>
          <div style={styles.actionDescription}>
            Browse for a CSV file or drag and drop it here to get started with your draft.
          </div>
          <div
            style={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) {
                onFileUpload(files[0]);
              }
            }}
          >
            <Upload size={24} />
            {isDragOver ? 'Drop CSV file here' : 'Browse for CSV or Drag & Drop'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Pre-loaded Rankings Section */}
      <div style={styles.presetSection}>
        <div style={styles.presetHeader}>
          <h2 style={styles.presetTitle}>Pre-loaded Rankings</h2>
        </div>

        {/* Scanning State */}
        {isScanning && (
          <div style={styles.scanningMessage}>
            <div style={styles.scanningSpinner} />
            Checking {csvFilesToCheck.length} potential filenames...
          </div>
        )}

        {/* Error State */}
        {scanError && !isScanning && (
          <div style={styles.errorMessage}>
            {scanError}
          </div>
        )}

        {/* No Files Found */}
        {!isScanning && !scanError && availableCSVs.length === 0 && (
          <div style={styles.noFilesMessage}>
            <div style={styles.noFilesTitle}>No Pre-loaded Rankings Found</div>
            <p>Place CSV files in your <code>public/</code> directory using supported filenames.</p>
            <p style={{ fontSize: '13px', marginTop: '12px', color: themeStyles.text.muted }}>
              <strong>Supported filenames include:</strong><br/>
              FantasyPros 2025 PPR.csv, ESPN 2024.csv, Yahoo 2025 PPR.csv, sample_rankings.csv, and {csvFilesToCheck.length - 4} others.
            </p>
          </div>
        )}

        {/* Available Files */}
        {!isScanning && availableCSVs.length > 0 && (
          <div style={styles.presetGrid}>
            {availableCSVs.map((preset) => {
              const isLoading = isLoadingPreset && selectedPreset === preset.filename;

              return (
                <div
                  key={preset.filename}
                  style={{
                    ...styles.presetCard,
                    ...(isLoading ? styles.presetCardLoading : {})
                  }}
                  onClick={() => !isLoading && handlePresetLoad(preset.filename)}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      Object.assign(e.target.style, styles.presetCardHover);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLoading) {
                      Object.assign(e.target.style, {
                        backgroundColor: styles.presetCard.backgroundColor,
                        borderColor: themeStyles.border,
                        transform: 'translateY(0px)',
                        boxShadow: 'none'
                      });
                    }
                  }}
                >
                  <FileText style={styles.presetIcon} size={24} />
                  <div style={styles.presetName}>{preset.name}</div>
                  <div style={styles.presetDescription}>
                    {preset.description}
                  </div>
                  <div style={styles.presetFilename}>
                    {preset.filename}
                  </div>

                  {isLoading && (
                    <div style={styles.loadingSpinner} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: translateY(-50%) rotate(0deg); }
            100% { transform: translateY(-50%) rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default FileUpload;
