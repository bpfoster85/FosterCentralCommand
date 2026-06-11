import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { registerSW } from 'virtual:pwa-register'
import 'primereact/resources/themes/lara-light-teal/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import 'primeflex/primeflex.css'
import './styles/skylight-theme.scss'
import './index.scss'

// Tag the document so CSS can show the mouse cursor in dev and hide it in
// production (the wall-mounted dashboard is touch-first).
document.documentElement.dataset.env = import.meta.env.DEV ? 'dev' : 'prod'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
