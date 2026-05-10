import { useEffect, useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { useArisan, GroupInfo } from '../hooks/useArisan'
import CreateGroupModal from './CreateGroupModal'
import { ToastMsg } from '../App'

interface Props {
  onOpenGroup: (addr: string) => void
  addToast: (type: ToastMsg['type'], text: string) => void
}

export default function Dashboard({ onOpenGroup, addToast }: Props) {
  const { publicKey } = useWallet()
  const { fetchAllGroups } = useArisan()
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const g = await fetchAllGroups()
      setGroups(g)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [publicKey])

  const getRepTier = (score: number) => {
    if (score >= 80) return { label: '🏆 Veteran', color: 'var(--green)' }
    if (score >= 50) return { label: '✅ Trusted', color: 'var(--purple-light)' }
    if (score >= 25) return { label: '📈 Average', color: 'var(--warning)' }
    return { label: '🆕 New', color: 'var(--text-secondary)' }
  }

  if (!publicKey) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-icon">🔌</div>
          <div className="empty-title">Connect your wallet</div>
          <div className="empty-desc">Connect Phantom to interact with Circa</div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard animate-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2>🏦 Circa Groups</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-6)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            🔄 Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create Group
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Loading on-chain data...</span>
        </div>
      )}

      {/* Groups grid */}
      {!loading && groups.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🌱</div>
          <div className="empty-title">No groups yet</div>
          <div className="empty-desc">Create the first circa group on-chain!</div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            + Create Group
          </button>
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="groups-grid">
          {groups.map(g => {
            const isAdmin = g.admin === publicKey?.toBase58()
            const isMember = g.members.some(m => m.wallet === publicKey?.toBase58())
            const fillPct = (g.memberCount / g.maxMembers) * 100

            return (
              <div
                key={g.address}
                className="card group-card"
                onClick={() => onOpenGroup(g.address)}
              >
                <div className="group-card-header">
                  <div>
                    <div className="group-card-title">Circa Group</div>
                    <div className="group-card-subtitle">{g.address.slice(0, 8)}...{g.address.slice(-6)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    {g.isActive
                      ? <span className="badge badge-green">● Active</span>
                      : <span className="badge badge-red">Ended</span>
                    }
                    {isAdmin && <span className="badge badge-purple">Admin</span>}
                    {isMember && !isAdmin && <span className="badge badge-orange">Member</span>}
                  </div>
                </div>

                <div className="group-stats">
                  <div className="mini-stat">
                    <div className="mini-stat-value">{g.memberCount}/{g.maxMembers}</div>
                    <div className="mini-stat-label">Members</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-stat-value">Round {g.currentRound}</div>
                    <div className="mini-stat-label">of {g.totalRounds}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-stat-value">{(g.duesAmount / 1_000_000).toFixed(2)}</div>
                    <div className="mini-stat-label">USDC/round</div>
                  </div>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <span>Members</span>
                    <span>{fillPct.toFixed(0)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${fillPct}%` }} />
                  </div>
                </div>

                <div style={{ marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {g.isLocked
                    ? '🔒 Locked — playing'
                    : `🟢 Open — ${g.maxMembers - g.memberCount} spots left`
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateGroupModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
          addToast={addToast}
        />
      )}
    </div>
  )
}
