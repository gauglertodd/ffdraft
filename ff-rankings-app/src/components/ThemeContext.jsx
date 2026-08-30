import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Shared font stack: Iosevka monospace for the terminal-inspired identity,
// falling
// back gracefully.
const FONT_STACK = "'Iosevka', 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

export const getThemeStyles = (isDark) => {
  // ── Palette ─────────────────────────────────────────────────────────
  // Dark: "stadium night" - deep desaturated navy surfaces that step down
  // in lightness per elevation level, emerald as the single brand accent.
  // Light: warm porcelain surfaces with the same emerald accent.
  const c = isDark
    ? {
        bg: '#0b1220',            // page
        surface: '#111a2c',       // cards
        surfaceAlt: '#182338',    // nested / hover fill
        overlay: '#1e2b44',       // inputs, raised fills
        border: '#242f47',
        borderStrong: '#33436a',
        textPrimary: '#eef2f8',
        textSecondary: '#aab7cf',
        textMuted: '#7d8ca8',
        headerGlass: 'rgba(11, 18, 32, 0.78)',
        shadow: '0 4px 20px -6px rgba(0, 0, 0, 0.55)',
        shadowSm: '0 2px 10px -4px rgba(0, 0, 0, 0.5)',
        scrollbarThumb: '#2c3a58',
      }
    : {
        bg: '#f4f6f9',
        surface: '#ffffff',
        surfaceAlt: '#eef1f6',
        overlay: '#ffffff',
        border: '#e2e8f0',
        borderStrong: '#cbd5e1',
        textPrimary: '#0f172a',
        textSecondary: '#51607a',
        textMuted: '#8895ab',
        headerGlass: 'rgba(244, 246, 249, 0.8)',
        shadow: '0 4px 20px -8px rgba(15, 23, 42, 0.18)',
        shadowSm: '0 2px 8px -4px rgba(15, 23, 42, 0.12)',
        scrollbarThumb: '#c3cddd',
      };

  const accent = '#10b981';        // emerald
  const accentSoft = 'rgba(16, 185, 129, 0.14)';
  const accentStrong = '#059669';
  const info = '#3b82f6';
  const warning = '#f59e0b';
  const danger = '#ef4444';

  return {
    // Raw palette for components that compose their own styles
    colors: c,
    accent, accentSoft, accentStrong, info, warning, danger,
    fontStack: FONT_STACK,

    container: {
      backgroundColor: c.bg,
      color: c.textPrimary,
      fontFamily: FONT_STACK,
    },
    card: {
      backgroundColor: c.surface,
      border: `1px solid ${c.border}`,
      borderRadius: '14px',
      boxShadow: c.shadowSm,
    },
    cardHover: {
      backgroundColor: c.surface,
      border: `1px solid ${c.borderStrong}`,
      borderRadius: '14px',
      boxShadow: c.shadow,
    },
    input: {
      backgroundColor: c.overlay,
      border: `1px solid ${c.border}`,
      borderRadius: '9px',
      color: c.textPrimary,
      transition: 'border-color 0.15s, box-shadow 0.15s',
    },
    button: {
      secondary: {
        backgroundColor: c.surfaceAlt,
        color: c.textPrimary,
        border: `1px solid ${c.border}`,
        borderRadius: '9px',
      },
      primary: { backgroundColor: accent, color: '#04120c' },
      success: { backgroundColor: accent, color: '#04120c' },
    },
    text: {
      primary: c.textPrimary,
      secondary: c.textSecondary,
      muted: c.textMuted,
    },
    border: c.border,
    hover: { background: c.surfaceAlt },
    progressBar: { backgroundColor: c.border },
    rosterSlot: {
      empty: {
        backgroundColor: c.surface,
        color: c.textMuted,
        border: `1px dashed ${c.borderStrong}`,
      }
    },

    // ── Header helper: glass blur ────────────────────────────────────
    headerGlass: {
      backgroundColor: c.headerGlass,
      backdropFilter: 'blur(14px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(14px) saturate(1.4)',
      borderBottom: `1px solid ${c.border}`,
    },

    // ── Focus ring for interactive elements ─────────────────────────
    focusRing: {
      outline: 'none',
      '&:focus-visible': {
        boxShadow: `0 0 0 2px ${c.bg}, 0 0 0 4px ${accent}`,
      },
    },
  };
};

export const ThemeProvider = ({ children }) => {
  // Light-first: persist the user's choice; first visit defaults to light.
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('ffdraft-theme');
      if (saved !== null) return saved === 'dark';
    } catch (e) { /* localStorage unavailable - fall through */ }
    return false;
  });

  const toggleTheme = () => setIsDarkMode(prev => {
    const next = !prev;
    try { localStorage.setItem('ffdraft-theme', String(next)); } catch (e) { /* ignore */ }
    return next;
  });
  const themeStyles = getThemeStyles(isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, themeStyles }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
