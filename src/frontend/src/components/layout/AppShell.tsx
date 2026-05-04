import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from 'primereact/sidebar'
import { Button } from 'primereact/button'
import { TabMenu } from 'primereact/tabmenu'

const navItems = [
  { label: 'Dashboard', icon: 'pi pi-home', path: '/command-center' },
  { label: 'Calendar', icon: 'pi pi-calendar', path: '/calendar' },
  { label: 'Lists', icon: 'pi pi-list', path: '/lists' },
  { label: 'Profiles', icon: 'pi pi-users', path: '/profiles' },
]

const AppShell: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarVisible, setSidebarVisible] = useState(false)

  const activeIndex = navItems.findIndex(item => location.pathname.startsWith(item.path))

  return (
    <div className="fullscreen-container">
      {/* Top Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          background: 'var(--primary-color)',
          color: 'var(--primary-color-text)',
          flexShrink: 0,
          zIndex: 100,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      >
        <Button
          icon="pi pi-bars"
          className="p-button-text p-button-plain"
          style={{ color: 'white', marginRight: '0.5rem' }}
          onClick={() => setSidebarVisible(true)}
        />
        <span style={{ fontSize: '1.2rem', fontWeight: 700, flex: 1 }}>
          Foster Central Command
        </span>
      </div>

      {/* Tab Navigation */}
      <TabMenu
        model={navItems.map((item) => ({
          ...item,
          command: () => navigate(item.path)
        }))}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        onTabChange={e => navigate(navItems[e.index].path)}
        style={{ flexShrink: 0 }}
      />

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </div>

      {/* Sidebar Menu */}
      <Sidebar
        visible={sidebarVisible}
        onHide={() => setSidebarVisible(false)}
        style={{ width: '280px' }}
      >
        <h3 style={{ marginBottom: '1rem' }}>Navigation</h3>
        {navItems.map(item => (
          <Button
            key={item.path}
            label={item.label}
            icon={item.icon}
            className="p-button-text w-full"
            style={{ justifyContent: 'flex-start', marginBottom: '0.5rem' }}
            onClick={() => {
              navigate(item.path)
              setSidebarVisible(false)
            }}
          />
        ))}
      </Sidebar>
    </div>
  )
}

export default AppShell
