import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PrimeReactProvider } from 'primereact/api'
import CommandCenter from './pages/CommandCenter'
import ProfilesPage from './pages/ProfilesPage'
import CalendarPage from './pages/CalendarPage'
import ListsPage from './pages/ListsPage'
import ChoresPage from './pages/ChoresPage'
import GoalsPage from './pages/GoalsPage'
import AdminPage from './pages/AdminPage'
import LoginPage from './pages/LoginPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AppShell from './components/layout/AppShell'
import { RequireFamily, RequireAdmin } from './components/auth/RouteGuards'
import { VirtualKeyboardProvider } from './components/keyboard/VirtualKeyboardProvider'

const App: React.FC = () => {
  return (
    <PrimeReactProvider>
      <BrowserRouter>
        <VirtualKeyboardProvider>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />

            {/* Authenticated app */}
            <Route
              path="/"
              element={
                <RequireFamily>
                  <AppShell />
                </RequireFamily>
              }
            >
              <Route index element={<Navigate to="/command-center" replace />} />
              <Route path="command-center" element={<CommandCenter />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="lists" element={<ListsPage />} />
              <Route path="chores" element={<ChoresPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="profiles" element={<ProfilesPage />} />
              <Route
                path="admin"
                element={
                  <RequireAdmin>
                    <AdminPage />
                  </RequireAdmin>
                }
              />
            </Route>
          </Routes>
        </VirtualKeyboardProvider>
      </BrowserRouter>
    </PrimeReactProvider>
  )
}

export default App
