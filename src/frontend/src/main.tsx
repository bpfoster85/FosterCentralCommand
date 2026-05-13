import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { registerSW } from 'virtual:pwa-register'
import 'primereact/resources/themes/lara-light-teal/theme.css'
import 'primereact/resources/primereact.min.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import './styles/skylight-theme.scss'
import './index.scss'

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
