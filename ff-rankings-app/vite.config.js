import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cookieFile = join(root, 'tools', '.espn-cookies.json')
const loginScript = join(root, 'tools', 'espn_login.py')

// ESPN private-league proxy: the browser cannot call lm-api-reads/writes
// cross-origin with cookies (SameSite + CORS), but the dev server can.
// The UI fetches /espn/reads/... and /espn/writes/...; this proxy forwards
// to ESPN and attaches espn_s2/SWID. Cookie sources, in priority order:
//   1. The X-ESPN-Cookies request header (per-request, set by the wizard)
//   2. tools/.espn-cookies.json (written by the login flow below)
// Dev-only bridge, never used in a production build.
const fileCookies = () => {
  try {
    const raw = JSON.parse(readFileSync(cookieFile, 'utf8'))
    return `espn_s2=${raw.espn_s2}; SWID=${raw.swid}`
  } catch {
    return ''
  }
}

// Dev-only middleware: one-click ESPN login from the wizard UI.
// GET  /espn/login-status -> { cookieFile: bool }
// POST /espn/login         -> 202, spawns `python3 tools/espn_login.py`
//                             (a login browser window opens on this machine)
let loginAlreadyRunning = false
const espnLoginPlugin = () => ({
  name: 'espn-login-launcher',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/espn/login-status') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ cookieFile: existsSync(cookieFile) }))
        return
      }
      if (req.url === '/espn/login' && req.method === 'POST') {
        if (loginAlreadyRunning) {
          res.statusCode = 409
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'login window already open' }))
          return
        }
        loginAlreadyRunning = true
        res.statusCode = 202
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ status: 'launched' }))
        const child = spawn('python3', [loginScript], {
          cwd: root,
          stdio: 'ignore',
          detached: false,
        })
        child.on('exit', () => { loginAlreadyRunning = false })
        return
      }
      next()
    })
  },
})

const espnProxyRoute = (target, stripPrefix) => ({
  target,
  changeOrigin: true,
  rewrite: (path) => path.replace(stripPrefix, ''),
  headers: {
    Referer: 'https://fantasy.espn.com/',
    Origin: 'https://fantasy.espn.com',
  },
  configure: (proxy) => {
    proxy.on('proxyReq', (proxyReq, req) => {
      const headerCookie = String(req.headers['x-espn-cookies'] || '')
        .replace(/[^\x20-\x7e]/g, '')
      const cookie = headerCookie || fileCookies()
      if (cookie) {
        proxyReq.setHeader('Cookie', cookie)
      }
      proxyReq.removeHeader('x-espn-cookies')
    })
  },
})

export default defineConfig({
  plugins: [react(), espnLoginPlugin()],
  server: {
    proxy: {
      '/espn/reads': espnProxyRoute('https://lm-api-reads.fantasy.espn.com', /^\/espn\/reads/),
      '/espn/writes': espnProxyRoute('https://lm-api-writes.fantasy.espn.com', /^\/espn\/writes/),
    },
  },
})
