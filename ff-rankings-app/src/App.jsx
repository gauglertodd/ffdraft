import { Toaster } from 'sonner'
import DraftTracker from './components/DraftTracker'
import { useTheme } from './components/ThemeContext'
import { useEffect } from 'react'

function App() {
  const { isDarkMode } = useTheme()

  // Mirror the theme onto <html> for the CSS custom-property palette, and
  // onto <body> data attributes for Mantine's color scheme (auto = follow
  // data-mantine-color-scheme).
  useEffect(() => {
    const scheme = isDarkMode ? 'dark' : 'light'
    document.documentElement.classList.toggle('ffx-dark', isDarkMode)
    document.documentElement.classList.toggle('ffx-light', !isDarkMode)
    document.documentElement.setAttribute('data-mantine-color-scheme', scheme)
  }, [isDarkMode])

  return (
    <div className="App">
      <DraftTracker />
      <Toaster
        position="top-center"
        closeButton
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: 'var(--ffx-surface)',
            border: '1px solid var(--ffx-border)',
            color: 'var(--ffx-text)',
            fontFamily: 'var(--ffx-font)',
          },
        }}
      />
    </div>
  )
}

export default App
