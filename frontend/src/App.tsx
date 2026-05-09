import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Hero from './components/Hero'
import Dashboard from './components/Dashboard'
import GroupDetail from './components/GroupDetail'
import Toast from './components/Toast'

export type View = 'hero' | 'dashboard' | 'group'
export type ToastMsg = { id: number; type: 'success' | 'error'; text: string }

export default function App() {
  const { connected } = useWallet()
  const [view, setView] = useState<View>('hero')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  const addToast = (type: 'success' | 'error', text: string) => {
    const id = Date.now()
    setToasts(t => [...t, { id, type, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  const openGroup = (address: string) => {
    setSelectedGroup(address)
    setView('group')
  }

  const handleConnect = () => {
    if (connected) setView('dashboard')
  }

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo" onClick={() => setView(connected ? 'dashboard' : 'hero')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">🏦</div>
          <span>Arisan Protocol</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {connected && view !== 'dashboard' && (
            <button className="btn btn-secondary btn-sm" onClick={() => setView('dashboard')}>
              Dashboard
            </button>
          )}
          <WalletMultiButton onClick={handleConnect} />
        </div>
      </nav>

      {/* Views */}
      <main className="main">
        {view === 'hero' && (
          <Hero onEnter={() => setView('dashboard')} />
        )}
        {view === 'dashboard' && (
          <Dashboard onOpenGroup={openGroup} addToast={addToast} />
        )}
        {view === 'group' && selectedGroup && (
          <GroupDetail
            groupAddress={selectedGroup}
            onBack={() => setView('dashboard')}
            addToast={addToast}
          />
        )}
      </main>

      {/* Toasts */}
      <Toast toasts={toasts} />
    </div>
  )
}
