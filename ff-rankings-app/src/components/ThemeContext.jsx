import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const getThemeStyles = (isDark) => {
  const borderColor = isDark ? '#374151' : '#e5e7eb';
  const cardBorderColor = isDark ? '#374151' : '#e5e7eb';
  const inputBorderColor = isDark ? '#4b5563' : '#d1d5db';
  const uploadBorderColor = isDark ? '#4b5563' : '#d1d5db';

  return {
    // Container and layout
    container: {
      backgroundColor: isDark ? '#111827' : '#f9fafb',
      color: isDark ? '#f9fafb' : '#111827'
    },

    // Cards and surfaces
    card: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: cardBorderColor,
      boxShadow: isDark
        ? '0 1px 3px 0 rgba(0, 0, 0, 0.3)'
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },

    // Text colors
    text: {
      primary: isDark ? '#f9fafb' : '#111827',
      secondary: isDark ? '#d1d5db' : '#6b7280',
      muted: isDark ? '#9ca3af' : '#6b7280'
    },

    // Input elements
    input: {
      backgroundColor: isDark ? '#374151' : '#ffffff',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: inputBorderColor,
      color: isDark ? '#f9fafb' : '#111827'
    },

    // Buttons
    button: {
      secondary: {
        backgroundColor: isDark ? '#374151' : '#f3f4f6',
        color: isDark ? '#f9fafb' : '#374151'
      },
      primary: {
        backgroundColor: '#2563eb',
        color: '#ffffff'
      },
      success: {
        backgroundColor: '#16a34a',
        color: '#ffffff'
      }
    },

    // Borders and dividers
    border: borderColor,

    // Hover states
    hover: {
      background: isDark ? '#374151' : '#f9fafb'
    },

    // Upload area
    uploadArea: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderWidth: '2px',
      borderStyle: 'dashed',
      borderColor: uploadBorderColor
    },

    uploadAreaHover: {
      borderColor: '#60a5fa',
      backgroundColor: isDark ? '#1e3a8a' : '#eff6ff'
    },

    // Progress bars
    progressBar: {
      backgroundColor: isDark ? '#374151' : '#e5e7eb'
    },

    // Empty states
    emptyState: {
      color: isDark ? '#9ca3af' : '#6b7280'
    },

    // Position columns
    positionColumn: {
      backgroundColor: isDark ? '#1f2937' : '#f9fafb',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: borderColor
    },

    // Team cards
    teamCard: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: borderColor,
      boxShadow: isDark
        ? '0 1px 2px 0 rgba(0, 0, 0, 0.3)'
        : '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    },

    // Roster slots
    rosterSlot: {
      empty: {
        backgroundColor: isDark ? '#111827' : '#f9fafb',
        color: isDark ? '#6b7280' : '#9ca3af',
        borderWidth: '1px',
        borderStyle: 'dashed',
        borderColor: isDark ? '#4b5563' : '#d1d5db'
      },
      filled: {
        color: '#ffffff',
        fontWeight: '500'
      }
    }
  };
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const themeStyles = getThemeStyles(isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, themeStyles }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
