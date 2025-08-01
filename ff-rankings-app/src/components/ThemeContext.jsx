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
  const colors = {
    border: isDark ? '#374151' : '#e5e7eb',
    background: {
      primary: isDark ? '#111827' : '#f9fafb',
      secondary: isDark ? '#1f2937' : '#ffffff',
      hover: isDark ? '#374151' : '#f9fafb'
    },
    text: {
      primary: isDark ? '#f9fafb' : '#111827',
      secondary: isDark ? '#d1d5db' : '#6b7280',
      muted: isDark ? '#9ca3af' : '#6b7280'
    }
  };

  return {
    container: {
      backgroundColor: colors.background.primary,
      color: colors.text.primary
    },
    card: {
      backgroundColor: colors.background.secondary,
      border: `1px solid ${colors.border}`,
      boxShadow: isDark ? '0 1px 3px 0 rgba(0, 0, 0, 0.3)' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    },
    input: {
      backgroundColor: isDark ? '#374151' : '#ffffff',
      border: `1px solid ${colors.border}`,
      color: colors.text.primary
    },
    button: {
      secondary: {
        backgroundColor: isDark ? '#374151' : '#f3f4f6',
        color: colors.text.primary
      },
      primary: { backgroundColor: '#2563eb', color: '#ffffff' },
      success: { backgroundColor: '#16a34a', color: '#ffffff' }
    },
    text: colors.text,
    border: colors.border,
    hover: { background: colors.background.hover },
    progressBar: { backgroundColor: isDark ? '#374151' : '#e5e7eb' },
    rosterSlot: {
      empty: {
        backgroundColor: colors.background.primary,
        color: colors.text.muted,
        border: `1px dashed ${colors.border}`
      }
    }
  };
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const themeStyles = getThemeStyles(isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, themeStyles }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
