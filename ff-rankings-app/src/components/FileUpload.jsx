import React, { useRef, useState, useEffect } from 'react';
import { Upload, FileText, Info, RefreshCw, Plus } from 'lucide-react';

const FileUpload = ({ onFileUpload, isDragOver, setIsDragOver, themeStyles }) => {
  const fileInputRef = useRef(null);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);
  const [availableCSVs, setAvailableCSVs] = useState([]);
  const [isScanning, setIsScanning] = useState(true);
  const [scanError, setScanError] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Hardcoded list of CSV files to check for in public/ directory
  // Add any filenames you want to support here
  const csvFilesToCheck = [
    // FantasyPros variations
    'FantasyPros 2025 PPR.csv',
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
      setScanError('No CSV files found. Place your CSV files in the public/ folder and click "Rescan", or use "Custom File" to load any filename.');
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileUpload(files[0]);
    }
  };

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

  const handleCustomFileTest = async () => {
    if (!customFileName.trim()) return;

    const filename = customFileName.trim();
    if (!filename.endsWith('.csv')) {
      alert('Please include .csv extension');
      return;
    }

    try {
      const response = await fetch(`/${filename}`, { method: 'HEAD' });
      if (response.ok) {
        console.log(`✅ Custom file found: ${filename}`);
        handlePresetLoad(filename);
        setCustomFileName('');
        setShowCustomInput(false);
        // Rescan to potentially add it to the list if it matches our hardcoded names
        scanForCSVFiles();
      } else {
        alert(`File "${filename}" not found in public/ directory (Status: ${response.status})`);
      }
    } catch (error) {
      alert(`Error checking file "${filename}": ${error.message}`);
    }
  };

  const handleRescan = () => {
    scanForCSVFiles();
  };

  const styles = {
    container: {
      textAlign: 'center',
      padding: '48px 24px'
    },
    uploadArea: {
      ...themeStyles.uploadArea,
      borderRadius: '12px',
      padding: '64px 48px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      maxWidth: '600px',
      margin: '0 auto',
      marginBottom: '32px'
    },
    uploadAreaHover: {
      ...themeStyles.uploadAreaHover
    },
    uploadIcon: {
      margin: '0 auto 24px',
      width: '64px',
      height: '64px',
      color: themeStyles.text.muted
    },
    uploadTitle: {
      fontSize: '24px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '12px'
    },
    uploadSubtitle: {
      color: themeStyles.text.secondary,
      fontSize: '16px',
      lineHeight: '1.5',
      marginBottom: '24px'
    },
    csvRequirements: {
      backgroundColor: themeStyles.hover.background,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '32px',
      textAlign: 'left'
    },
    requirementsTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    requirementsList: {
      color: themeStyles.text.secondary,
      fontSize: '14px',
      lineHeight: '1.5',
      margin: '0',
      paddingLeft: '20px'
    },
    requirementsItem: {
      marginBottom: '4px'
    },
    optionalNote: {
      fontSize: '13px',
      color: themeStyles.text.muted,
      fontStyle: 'italic',
      marginTop: '8px'
    },
    divider: {
      margin: '32px 0',
      textAlign: 'center',
      position: 'relative'
    },
    dividerLine: {
      height: '1px',
      backgroundColor: themeStyles.border,
      margin: '0 auto'
    },
    dividerText: {
      backgroundColor: themeStyles.container.backgroundColor,
      color: themeStyles.text.muted,
      padding: '0 16px',
      fontSize: '14px',
      fontWeight: '500',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    },
    presetSection: {
      maxWidth: '600px',
      margin: '0 auto'
    },
    presetHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px'
    },
    presetTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      margin: '0'
    },
    headerButtons: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    rescanButton: {
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
      backgroundColor: themeStyles.button.secondary.backgroundColor,
      color: themeStyles.button.secondary.color
    },
    customButton: {
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
      backgroundColor: '#7c3aed',
      color: '#ffffff'
    },
    presetSubtitle: {
      color: themeStyles.text.secondary,
      fontSize: '14px',
      marginBottom: '24px'
    },
    customFileSection: {
      backgroundColor: themeStyles.hover.background,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      textAlign: 'left'
    },
    customFileTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: themeStyles.text.primary,
      marginBottom: '8px'
    },
    customFileInput: {
      ...themeStyles.input,
      width: '100%',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '14px',
      marginBottom: '8px'
    },
    customFileActions: {
      display: 'flex',
      gap: '8px'
    },
    customFileButton: {
      padding: '6px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      border: 'none',
      transition: 'all 0.2s'
    },
    scanningMessage: {
      padding: '40px 20px',
      textAlign: 'center',
      color: themeStyles.text.secondary,
      fontSize: '14px',
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
      padding: '20px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      color: '#dc2626',
      fontSize: '14px',
      textAlign: 'center'
    },
    noFilesMessage: {
      padding: '40px 20px',
      textAlign: 'center',
      color: themeStyles.text.muted,
      fontSize: '14px',
      backgroundColor: themeStyles.hover.background,
      borderRadius: '8px',
      border: `1px dashed ${themeStyles.border}`
    },
    noFilesTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: themeStyles.text.secondary,
      marginBottom: '8px'
    },
    presetGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px'
    },
    presetCard: {
      backgroundColor: themeStyles.card.backgroundColor,
      border: `1px solid ${themeStyles.border}`,
      borderRadius: '8px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'left',
      position: 'relative'
    },
    presetCardHover: {
      backgroundColor: themeStyles.hover.background,
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

  // Create dynamic styles to avoid shorthand/longhand conflicts
  const uploadAreaStyles = {
    ...styles.uploadArea,
    ...(isDragOver ? {
      borderColor: '#60a5fa',
      backgroundColor: themeStyles.uploadAreaHover.backgroundColor
    } : {})
  };

  return (
    <div style={styles.container}>
      {/* Upload Area */}
      <div
        style={uploadAreaStyles}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload style={styles.uploadIcon} />
        <p style={styles.uploadTitle}>
          Drop your CSV file here, or click to browse
        </p>
        <p style={styles.uploadSubtitle}>
          Upload your custom player rankings
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>

      {/* CSV Requirements */}
      <div style={styles.csvRequirements}>
        <div style={styles.requirementsTitle}>
          <Info size={20} />
          CSV Format Requirements
        </div>
        <ul style={styles.requirementsList}>
          <li style={styles.requirementsItem}>
            <strong>Required columns:</strong> name, position, team, rank
          </li>
          <li style={styles.requirementsItem}>
            <strong>Optional columns:</strong> tier (for tier-based strategies)
          </li>
          <li style={styles.requirementsItem}>
            <strong>Positions:</strong> QB, RB, WR, TE, DST, K
          </li>
          <li style={styles.requirementsItem}>
            <strong>Format:</strong> Standard CSV with headers in first row
          </li>
        </ul>
        <div style={styles.optionalNote}>
          💡 <strong>Tip:</strong> Adding a "tier" column enables tier-based draft strategies.
          Tiers group players of similar value (e.g., Tier 1 = elite players, Tier 2 = very good players, etc.)
        </div>
      </div>

      {/* Divider */}
      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span style={styles.dividerText}>OR</span>
      </div>

      {/* Preset Files Section */}
      <div style={styles.presetSection}>
        <div style={styles.presetHeader}>
          <h3 style={styles.presetTitle}>Use Pre-loaded Rankings</h3>
          <div style={styles.headerButtons}>
            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              style={{
                ...styles.customButton,
                opacity: showCustomInput ? 0.8 : 1
              }}
              title="Load any CSV file by name"
            >
              <Plus size={14} />
              Custom File
            </button>
            <button
              onClick={handleRescan}
              disabled={isScanning}
              style={{
                ...styles.rescanButton,
                opacity: isScanning ? 0.6 : 1,
                cursor: isScanning ? 'not-allowed' : 'pointer'
              }}
              title="Rescan for CSV files"
            >
              <RefreshCw size={14} style={{
                animation: isScanning ? 'spin 1s linear infinite' : 'none'
              }} />
              {isScanning ? 'Scanning...' : 'Rescan'}
            </button>
          </div>
        </div>

        <p style={styles.presetSubtitle}>
          Automatically detects common CSV filenames in your public/ directory. Use "Custom File" to load any other CSV file.
        </p>

        {/* Custom File Input */}
        {showCustomInput && (
          <div style={styles.customFileSection}>
            <div style={styles.customFileTitle}>Load Any CSV File</div>
            <input
              type="text"
              placeholder="Enter exact filename (e.g., 'FantasyPros 2025 PPR.csv')"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              style={styles.customFileInput}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomFileTest()}
            />
            <div style={styles.customFileActions}>
              <button
                onClick={handleCustomFileTest}
                style={{
                  ...styles.customFileButton,
                  backgroundColor: '#16a34a',
                  color: '#ffffff'
                }}
              >
                Load File
              </button>
              <button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomFileName('');
                }}
                style={{
                  ...styles.customFileButton,
                  backgroundColor: themeStyles.button.secondary.backgroundColor,
                  color: themeStyles.button.secondary.color
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Scanning State */}
        {isScanning && (
          <div style={styles.scanningMessage}>
            <div style={styles.scanningSpinner} />
            Checking {csvFilesToCheck.length} specific filenames...
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
            <div style={styles.noFilesTitle}>No CSV files found</div>
            <p>Place your CSV files in the <code>public/</code> directory using one of the supported filenames, or use "Custom File" to load any CSV.</p>
            <p style={{ fontSize: '12px', marginTop: '12px', color: themeStyles.text.muted }}>
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
                        backgroundColor: themeStyles.card.backgroundColor,
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
                    <div style={{ fontSize: '11px', color: themeStyles.text.muted, marginTop: '4px' }}>
                      {preset.filename}
                    </div>
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
