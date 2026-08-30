import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider, useTheme } from './components/ThemeContext'
import { MantineProvider } from '@mantine/core'
import { mantineTheme } from './mantineTheme'
import '@mantine/core/styles.css'
import './index.css'

// Bridge: ThemeContext owns the light/dark decision; Mantine is forced to
// follow it so dropdowns, popovers and cards always match the page palette
// (auto mode followed the OS and desynced from the in-app toggle).
function MantineBridge({ children }) {
  const { isDarkMode } = useTheme()
  return (
    <MantineProvider theme={mantineTheme} forceColorScheme={isDarkMode ? 'dark' : 'light'}>
      {children}
    </MantineProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <MantineBridge>
        <App />
      </MantineBridge>
    </ThemeProvider>
  </React.StrictMode>,
)
