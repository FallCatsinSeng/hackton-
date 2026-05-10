import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Hero from './components/Hero'
import Dashboard from './components/Dashboard'
import GroupDetail from './components/GroupDetail'
import LotteryDashboard from './components/LotteryDashboard'
import LotteryDetail from './components/LotteryDetail'
import Toast from './components/Toast'

export type View = 'hero' | 'dashboard' | 'group' | 'lottery' | 'lotteryDetail'
export type ToastMsg = { id: number; type: 'success' | 'error'; text: string }

export default function App() {
  const { connected } = useWallet()
  const [view, setView] = useState<View>('hero')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [selectedLottery, setSelectedLottery] = useState<string | null>(null)
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

  const openLottery = (address: string) => {
    setSelectedLottery(address)
    setView('lotteryDetail')
  }

  const handleConnect = () => {
    if (connected) setView('dashboard')
  }

  const isMainNav = view === 'dashboard' || view === 'lottery'

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div
          className="navbar-logo"
          onClick={() => setView(connected ? 'dashboard' : 'hero')}
          style={{ cursor: 'pointer' }}
        >
          <img src="/logo.png" alt="Circa Logo" className="logo-img" />
        </div>

        <div className="navbar-center">
          {connected && (
            <>
              <button
                className={`nav-tab ${view === 'dashboard' || view === 'group' ? 'active' : ''}`}
                onClick={() => setView('dashboard')}
              >
                🏦 Circa Groups
              </button>
              <button
                className={`nav-tab ${view === 'lottery' || view === 'lotteryDetail' ? 'active' : ''}`}
                onClick={() => setView('lottery')}
              >
                🎪 Creator Lottery
              </button>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        {view === 'lottery' && (
          <LotteryDashboard onOpenLottery={openLottery} addToast={addToast} />
        )}
        {view === 'lotteryDetail' && selectedLottery && (
          <LotteryDetail
            lotteryAddress={selectedLottery}
            onBack={() => setView('lottery')}
            addToast={addToast}
          />
        )}
      </main>

      {/* Toasts */}
      <Toast toasts={toasts} />
    </div>
  )
}
