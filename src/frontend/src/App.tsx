import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PrimeReactProvider } from 'primereact/api'
import CommandCenter from './pages/CommandCenter'
import ProfilesPage from './pages/ProfilesPage'
import CalendarPage from './pages/CalendarPage'
import ListsPage from './pages/ListsPage'
import AppShell from './components/layout/AppShell'

const App: React.FC = () => {
  return (
    <PrimeReactProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Navigate to="/command-center" replace />} />
            <Route path="command-center" element={<CommandCenter />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="lists" element={<ListsPage />} />
            <Route path="profiles" element={<ProfilesPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PrimeReactProvider>
  )
}

export default App
