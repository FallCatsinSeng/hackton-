import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useArisan, GroupInfo } from '../hooks/useArisan'
import { ToastMsg } from '../App'

interface Props {
  groupAddress: string
  onBack: () => void
  addToast: (type: ToastMsg['type'], text: string) => void
}

function RepTier({ score }: { score: number }) {
  let tier = '🆕 New User'
  let color = 'var(--text-secondary)'
  let instant = 55; let locked = 45; let rounds = 4
  if (score >= 80) { tier = '🏆 Veteran'; color = 'var(--green)'; instant = 90; locked = 10; rounds = 1 }
  else if (score >= 50) { tier = '✅ Trusted'; color = 'var(--purple-light)'; instant = 80; locked = 20; rounds = 2 }
  else if (score >= 25) { tier = '📈 Average'; color = 'var(--warning)'; instant = 70; locked = 30; rounds = 3 }

  return (
    <div className="rep-card">
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Your Reputation
      </div>
      <div className="rep-score-bar">
        <div className="rep-score-num" style={{ color }}>{score}</div>
        <div className="rep-details">
          <div className="rep-tier" style={{ color }}>{tier}</div>
          <div className="rep-payout-info">
            If you win: {instant}% instant · {locked}% locked over {rounds} round{rounds > 1 ? 's' : ''}
          </div>
          <div style={{ marginTop: '8px' }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${score}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GroupDetail({ groupAddress, onBack, addToast }: Props) {
  const { publicKey } = useWallet()
  const { fetchGroup, fetchReputation, joinGroup, payDues, drawWinner } = useArisan()
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [repScore, setRepScore] = useState(0)
  const [repDetails, setRepDetails] = useState({ successfulRounds: 0, defaultedRounds: 0 })
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const g = await fetchGroup(groupAddress)
      setGroup(g)
      if (publicKey) {
        const rep = await fetchReputation(publicKey.toBase58())
        if (rep) { setRepScore(rep.score); setRepDetails(rep) }
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [groupAddress, publicKey])

  const isAdmin = group?.admin === publicKey?.toBase58()
  const myMember = group?.members.find(m => m.wallet === publicKey?.toBase58())
  const isMember = !!myMember
  const hasPaid = myMember?.paidCurrentRound ?? false
  const hasWon = myMember?.hasWon ?? false

  const allPaid = group?.members.length === group?.maxMembers &&
    group?.members.every(m => m.paidCurrentRound)

  const handleJoin = async () => {
    setTxLoading('join')
    try {
      const sig = await joinGroup(groupAddress)
      addToast('success', `Joined! Tx: ${sig.slice(0, 8)}...`)
      await load()
    } catch (e: any) {
      addToast('error', e.message?.slice(0, 80) || 'Join failed')
    }
    setTxLoading(null)
  }

  const handlePayDues = async () => {
    if (!group) return
    setTxLoading('pay')
    try {
      const sig = await payDues(groupAddress, group.vault, group.usdcMint)
      addToast('success', `Dues paid! Tx: ${sig.slice(0, 8)}...`)
      await load()
    } catch (e: any) {
      addToast('error', e.message?.slice(0, 80) || 'Payment failed')
    }
    setTxLoading(null)
  }

  const handleDraw = async () => {
    if (!group) return
    setTxLoading('draw')
    try {
      const sig = await drawWinner(groupAddress, group)
      addToast('success', `Winner drawn! Tx: ${sig.slice(0, 8)}...`)
      await load()
    } catch (e: any) {
      addToast('error', e.message?.slice(0, 80) || 'Draw failed')
    }
    setTxLoading(null)
  }

  if (loading) {
    return (
      <div className="group-detail">
        <div className="loading-overlay">
          <div className="spinner" /><span>Loading group data...</span>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="group-detail">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="empty-state"><div className="empty-title">Group not found</div></div>
      </div>
    )
  }

  return (
    <div className="group-detail animate-in">
      <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>

      <div className="detail-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div className="detail-title">🏦 Arisan Group</div>
            <div className="detail-subtitle" style={{ fontFamily: 'monospace' }}>{groupAddress}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {group.isActive
              ? <span className="badge badge-green">● Active</span>
              : <span className="badge badge-red">Ended</span>}
            {group.isLocked
              ? <span className="badge badge-orange">🔒 Locked</span>
              : <span className="badge badge-purple">🟢 Open</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="detail-grid">
        <div className="info-block">
          <div className="info-label">Current Round</div>
          <div className="info-value" style={{ color: 'var(--purple-light)' }}>
            {group.currentRound} / {group.totalRounds}
          </div>
        </div>
        <div className="info-block">
          <div className="info-label">Total Pool (this round)</div>
          <div className="info-value" style={{ color: 'var(--green)' }}>
            {((group.duesAmount * group.memberCount) / 1_000_000).toFixed(2)} USDC
          </div>
        </div>
        <div className="info-block">
          <div className="info-label">Dues per Member</div>
          <div className="info-value">{(group.duesAmount / 1_000_000).toFixed(2)} USDC</div>
        </div>
        <div className="info-block">
          <div className="info-label">Members</div>
          <div className="info-value">{group.memberCount} / {group.maxMembers}</div>
          <div style={{ marginTop: '10px' }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(group.memberCount / group.maxMembers) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Your Reputation */}
      {publicKey && <RepTier score={repScore} />}

      {/* Members */}
      <div className="section-title">Members</div>
      <div className="members-list">
        {group.members.map((m, i) => (
          <div
            key={m.wallet}
            className={`member-row ${m.wallet === publicKey?.toBase58() ? 'is-you' : ''}`}
          >
            <div>
              <div className="member-wallet">
                {m.wallet === publicKey?.toBase58() ? '👤 ' : `#${i + 1} `}
                {m.wallet.slice(0, 10)}...{m.wallet.slice(-8)}
                {m.wallet === publicKey?.toBase58() && ' (You)'}
              </div>
              {m.wallet === group.admin && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Admin</div>
              )}
            </div>
            <div className="member-badges">
              {m.paidCurrentRound
                ? <span className="badge badge-green">✓ Paid</span>
                : <span className="badge badge-red">⌛ Pending</span>}
              {m.hasWon && <span className="badge badge-orange">🏆 Won</span>}
            </div>
          </div>
        ))}
        {group.members.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No members yet — be the first to join!
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="section-title">Actions</div>
      <div className="actions-panel">
        {/* Join */}
        {!isMember && !group.isLocked && group.isActive && (
          <button
            className="btn btn-primary btn-full"
            onClick={handleJoin}
            disabled={!!txLoading}
          >
            {txLoading === 'join' ? <><span className="spinner" /> Joining...</> : '👥 Join Group'}
          </button>
        )}

        {/* Pay Dues */}
        {isMember && group.isLocked && group.isActive && !hasPaid && (
          <button
            className="btn btn-green btn-full"
            onClick={handlePayDues}
            disabled={!!txLoading}
          >
            {txLoading === 'pay' ? <><span className="spinner" /> Paying...</> : '💰 Pay Dues'}
          </button>
        )}

        {hasPaid && (
          <div style={{
            padding: '14px 20px', borderRadius: '12px',
            background: 'rgba(20,241,149,0.08)', border: '1px solid rgba(20,241,149,0.2)',
            color: 'var(--green)', fontWeight: 600, textAlign: 'center'
          }}>
            ✅ Dues paid for this round
          </div>
        )}

        {/* Draw Winner */}
        {isAdmin && group.isLocked && group.isActive && allPaid && (
          <button
            className="btn btn-primary btn-full"
            onClick={handleDraw}
            disabled={!!txLoading}
          >
            {txLoading === 'draw' ? <><span className="spinner" /> Drawing...</> : '🎲 Draw Winner'}
          </button>
        )}

        {isAdmin && group.isLocked && group.isActive && !allPaid && (
          <div style={{
            padding: '14px', borderRadius: '12px',
            background: 'rgba(255,167,38,0.08)', border: '1px solid rgba(255,167,38,0.2)',
            color: 'var(--warning)', fontSize: '0.9rem', textAlign: 'center'
          }}>
            ⌛ Waiting for all members to pay before drawing...
          </div>
        )}

        {/* Refresh */}
        <button className="btn btn-secondary btn-full btn-sm" onClick={load} disabled={!!txLoading}>
          🔄 Refresh
        </button>
      </div>

      {/* Reputation details */}
      {publicKey && (
        <div style={{ marginTop: '28px' }}>
          <div className="section-title">Your Stats</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="mini-stat">
              <div className="mini-stat-value" style={{ color: 'var(--purple-light)' }}>{repScore}</div>
              <div className="mini-stat-label">Rep Score</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-value" style={{ color: 'var(--green)' }}>{repDetails.successfulRounds}</div>
              <div className="mini-stat-label">Paid On Time</div>
            </div>
            <div className="mini-stat">
              <div className="mini-stat-value" style={{ color: 'var(--danger)' }}>{repDetails.defaultedRounds}</div>
              <div className="mini-stat-label">Defaults</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
