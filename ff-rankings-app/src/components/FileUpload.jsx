import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

const FileUpload = ({ onFileUpload, isDragOver, setIsDragOver, themeStyles }) => {
  const fileInputRef = useRef(null);

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
      margin: '0 auto'
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
      lineHeight: '1.5'
    }
  };

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
          CSV should contain columns for name, position, team, and rank
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files[0] && onFileUpload(e.target.files[0])}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default FileUpload;
