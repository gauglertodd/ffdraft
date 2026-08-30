// Mantine theme: bridges the ffdraft identity (navy surfaces, emerald
// accent, Inter) into Mantine components so anything rendered through
// Mantine matches the site out of the box.
import { createTheme } from '@mantine/core';

export const mantineTheme = createTheme({
  fontFamily: "'Iosevka', 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
  fontFamilyMonospace: "'Iosevka', 'SF Mono', Menlo, monospace",
  headings: { fontFamily: "'Iosevka', monospace", fontWeight: '600' },
  defaultRadius: 'md',
  primaryColor: 'teal',
  primaryShade: 6,
  // Iosevka is narrow; scale Mantine's font sizes up a step and add tracking
  // so controls don't look cramped.
  fontSizes: {
    xs: '12px',
    sm: '13px',
    md: '15px',
    lg: '17px',
    xl: '19px',
  },
  lineHeight: 1.5,
  letterSpacing: '0.01em',
  colors: {
    // Deep navy brand scale (1..9 light to dark) used by primary/teal alias
    brand: [
      '#e3f4ee', '#c6e8dc', '#96d6c1', '#69c4a6', '#43b48f',
      '#2fa882', '#10b981', '#0b7f5c', '#0a6b4e', '#075a41',
    ],
  },
  components: {
    Modal: {
      defaultProps: {
        overlayProps: { blur: 6, backgroundOpacity: 0.55 },
        transitionProps: { transition: 'fade', duration: 120 },
        radius: 'lg',
      },
    },
    Select: {
      defaultProps: { comboboxProps: { shadow: 'lg' } },
    },
    Tooltip: {
      defaultProps: { withArrow: true },
    },
  },
});
