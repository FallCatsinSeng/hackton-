import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useArisan, LotteryInfo } from '../hooks/useArisan'

type ToastFn = (type: 'success' | 'error', text: string) => void

interface Props {
  onOpenLottery: (address: string) => void
  addToast: ToastFn
}

export default function LotteryDashboard({ onOpenLottery, addToast }: Props) {
  const { connected, publicKey } = useWallet()
  const { fetchAllLotteries } = useArisan()
  const [lotteries, setLotteries] = useState<LotteryInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab] = useState<'active' | 'ended'>('active')

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await fetchAllLotteries()
      setLotteries(data)
    } catch (e: any) {
      addToast('error', e.message || 'Failed to load lotteries')
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount
  useState(() => { refresh() })

  const now = Math.floor(Date.now() / 1000)
  const activeLotteries = lotteries.filter(l => l.endTime > now)
  const endedLotteries = lotteries.filter(l => l.endTime <= now)
  const displayed = tab === 'active' ? activeLotteries : endedLotteries

  return (
    <div className="lottery-dashboard">
      {/* Header */}
      <div className="lottery-header">
        <div className="lottery-header-text">
          <h1 className="lottery-title">🎪 Creator Support Lottery</h1>
          <p className="lottery-subtitle">
            Support your favorite creator. Buy lots. The more lots you hold, the higher your chance of winning the prize pool.
          </p>
        </div>
        <div className="lottery-header-actions">
          <button className="btn btn-secondary" onClick={refresh} disabled={loading}>
            {loading ? '⟳' : '↻ Refresh'}
          </button>
          {connected && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + Create Lottery
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="lottery-stats">
        <div className="lottery-stat-card">
          <span className="stat-value">{activeLotteries.length}</span>
          <span className="stat-label">Active Lotteries</span>
        </div>
        <div className="lottery-stat-card">
          <span className="stat-value">
            {(lotteries.reduce((s, l) => s + l.totalPool, 0) / 1_000_000).toFixed(2)}
          </span>
          <span className="stat-label">Total USDC in Pools</span>
        </div>
        <div className="lottery-stat-card">
          <span className="stat-value">
            {lotteries.reduce((s, l) => s + l.participants.length, 0)}
          </span>
          <span className="stat-label">Total Participants</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="lottery-tabs">
        <button
          className={`lottery-tab ${tab === 'active' ? 'active' : ''}`}
          onClick={() => setTab('active')}
        >
          🔥 Active ({activeLotteries.length})
        </button>
        <button
          className={`lottery-tab ${tab === 'ended' ? 'active' : ''}`}
          onClick={() => setTab('ended')}
        >
          ✅ Ended ({endedLotteries.length})
        </button>
      </div>

      {/* Lottery Cards */}
      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
          <p>Loading lotteries from chain...</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '3rem' }}>{tab === 'active' ? '🎪' : '📭'}</div>
          <p>{tab === 'active' ? 'No active lotteries yet.' : 'No ended lotteries.'}</p>
          {connected && tab === 'active' && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              Create the First Lottery
            </button>
          )}
        </div>
      ) : (
        <div className="lottery-grid">
          {displayed.map(lottery => (
            <LotteryCard
              key={lottery.address}
              lottery={lottery}
              currentWallet={publicKey?.toBase58()}
              onClick={() => onOpenLottery(lottery.address)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateLotteryModal
          onClose={() => setShowCreate(false)}
          addToast={addToast}
          onSuccess={() => { setShowCreate(false); refresh() }}
        />
      )}
    </div>
  )
}

// ─── Lottery Card ────────────────────────────────────────────────────────────

function LotteryCard({
  lottery,
  currentWallet,
  onClick,
}: {
  lottery: LotteryInfo
  currentWallet?: string
  onClick: () => void
}) {
  const now = Math.floor(Date.now() / 1000)
  const timeLeft = lottery.endTime - now
  const isEnded = timeLeft <= 0 || !lottery.isActive
  const isCreator = currentWallet === lottery.creator
  const isWinner = currentWallet && lottery.winningWallets.includes(currentWallet)

  const timeDisplay = () => {
    if (isEnded) return 'Ended'
    const h = Math.floor(timeLeft / 3600)
    const m = Math.floor((timeLeft % 3600) / 60)
    if (h > 24) return `${Math.floor(h / 24)}d left`
    if (h > 0) return `${h}h ${m}m left`
    return `${m}m left`
  }

  const myTickets = currentWallet
    ? lottery.participants.find(p => p.wallet === currentWallet)?.ticketsBought ?? 0
    : 0

  const winChance = lottery.totalTicketsSold > 0
    ? ((myTickets / lottery.totalTicketsSold) * 100).toFixed(1)
    : '0.0'

  return (
    <div
      className={`lottery-card ${isEnded ? 'ended' : ''} ${isCreator ? 'is-creator' : ''}`}
      onClick={onClick}
    >
      {/* Badges */}
      <div className="lottery-card-badges">
        {isCreator && <span className="badge badge-creator">👑 Your Event</span>}
        {isWinner && <span className="badge badge-winner">🏆 You Won!</span>}
        <span className={`badge ${isEnded ? 'badge-ended' : 'badge-active'}`}>
          {isEnded ? '✅ Ended' : '🔥 Live'}
        </span>
      </div>

      {/* Creator */}
      <div className="lottery-card-creator">
        <div className="creator-avatar">
          {lottery.creator.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="creator-label">Creator</div>
          <div className="creator-address">
            {lottery.creator.slice(0, 8)}...{lottery.creator.slice(-6)}
          </div>
        </div>
      </div>

      {/* Pool */}
      <div className="lottery-card-pool">
        <span className="pool-amount">
          {(lottery.totalPool / 1_000_000).toFixed(2)}
        </span>
        <span className="pool-unit">USDC</span>
        <span className="pool-label">Prize Pool</span>
      </div>

      {/* Distribution */}
      <div className="lottery-distribution">
        <div className="dist-bar">
          <div
            className="dist-creator"
            style={{ width: `${lottery.creatorSharePct}%` }}
            title={`Creator: ${lottery.creatorSharePct}%`}
          />
          {lottery.winnerSharesPct.map((pct, i) => (
            <div
              key={i}
              className={`dist-winner dist-winner-${i}`}
              style={{ width: `${pct}%` }}
              title={`Winner ${i + 1}: ${pct}%`}
            />
          ))}
        </div>
        <div className="dist-legend">
          <span>👤 Creator {lottery.creatorSharePct}%</span>
          {lottery.winnerSharesPct.map((pct, i) => (
            <span key={i}>🏆 #{i + 1}: {pct}%</span>
          ))}
        </div>
      </div>

      {/* Info Row */}
      <div className="lottery-card-info">
        <div className="info-item">
          <span className="info-label">🎟️ Price</span>
          <span className="info-value">{(lottery.ticketPrice / 1_000_000).toFixed(2)} USDC</span>
        </div>
        <div className="info-item">
          <span className="info-label">⏱️ Time</span>
          <span className={`info-value ${!isEnded && timeLeft < 3600 ? 'urgent' : ''}`}>
            {timeDisplay()}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">🎫 Sold</span>
          <span className="info-value">{lottery.totalTicketsSold}</span>
        </div>
        {myTickets > 0 && (
          <div className="info-item">
            <span className="info-label">📊 Your Chance</span>
            <span className="info-value win-chance">{winChance}%</span>
          </div>
        )}
      </div>

      <button className="btn btn-primary lottery-enter-btn">
        {isEnded ? 'View Results' : 'Enter Lottery →'}
      </button>
    </div>
  )
}

// ─── Create Lottery Modal ────────────────────────────────────────────────────

function CreateLotteryModal({
  onClose,
  addToast,
  onSuccess,
}: {
  onClose: () => void
  addToast: ToastFn
  onSuccess: () => void
}) {
  const { initializeLottery } = useArisan()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    usdcMint: '',
    ticketPrice: '0.1',
    creatorShare: '40',
    winnerShares: '35, 15, 10',
    durationHours: '24',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    const creatorPct = parseInt(form.creatorShare)
    const winnerPcts = form.winnerShares.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))

    if (!form.usdcMint || form.usdcMint.length < 32) e.usdcMint = 'Enter valid USDC mint address'
    if (parseFloat(form.ticketPrice) < 0.1) e.ticketPrice = 'Minimum 0.1 USDC per ticket'
    if (creatorPct < 20 || creatorPct > 70) e.creatorShare = 'Must be 20% - 70%'
    if (winnerPcts.length === 0 || winnerPcts.length > 5) e.winnerShares = '1 to 5 winners'
    const total = creatorPct + winnerPcts.reduce((a, b) => a + b, 0)
    if (total !== 100) e.winnerShares = `Total must be 100%. Current: ${total}%`
    if (parseInt(form.durationHours) < 1) e.durationHours = 'At least 1 hour'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    setLoading(true)
    try {
      const ticketPriceRaw = Math.round(parseFloat(form.ticketPrice) * 1_000_000)
      const creatorPct = parseInt(form.creatorShare)
      const winnerPcts = form.winnerShares.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      const durationSecs = parseInt(form.durationHours) * 3600
      const endTime = Math.floor(Date.now() / 1000) + durationSecs

      const tx = await initializeLottery(form.usdcMint, ticketPriceRaw, creatorPct, winnerPcts, endTime)
      addToast('success', `🎉 Lottery created! TX: ${tx.slice(0, 12)}...`)
      onSuccess()
    } catch (err: any) {
      addToast('error', err.message || 'Failed to create lottery')
    } finally {
      setLoading(false)
    }
  }

  const totalPct = (() => {
    const c = parseInt(form.creatorShare) || 0
    const winners = form.winnerShares.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    return c + winners.reduce((a, b) => a + b, 0)
  })()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎪 Create Creator Lottery</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>USDC Mint Address</label>
            <input
              className={`form-input ${errors.usdcMint ? 'error' : ''}`}
              placeholder="USDC mint pubkey (e.g., Es9v...)"
              value={form.usdcMint}
              onChange={e => setForm(f => ({ ...f, usdcMint: e.target.value }))}
            />
            {errors.usdcMint && <span className="form-error">{errors.usdcMint}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ticket Price (USDC)</label>
              <input
                className={`form-input ${errors.ticketPrice ? 'error' : ''}`}
                type="number"
                min="0.1"
                step="0.1"
                value={form.ticketPrice}
                onChange={e => setForm(f => ({ ...f, ticketPrice: e.target.value }))}
              />
              {errors.ticketPrice && <span className="form-error">{errors.ticketPrice}</span>}
            </div>
            <div className="form-group">
              <label>Duration (Hours)</label>
              <input
                className={`form-input ${errors.durationHours ? 'error' : ''}`}
                type="number"
                min="1"
                value={form.durationHours}
                onChange={e => setForm(f => ({ ...f, durationHours: e.target.value }))}
              />
              {errors.durationHours && <span className="form-error">{errors.durationHours}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Your Cut (Creator Share %) <span className="label-hint">20% - 70%</span></label>
            <input
              className={`form-input ${errors.creatorShare ? 'error' : ''}`}
              type="number"
              min="20"
              max="70"
              value={form.creatorShare}
              onChange={e => setForm(f => ({ ...f, creatorShare: e.target.value }))}
            />
            {errors.creatorShare && <span className="form-error">{errors.creatorShare}</span>}
          </div>

          <div className="form-group">
            <label>
              Winner Shares (%) <span className="label-hint">Comma-separated. Max 5 winners. Example: 35, 15, 10</span>
            </label>
            <input
              className={`form-input ${errors.winnerShares ? 'error' : ''}`}
              placeholder="e.g. 35, 15, 10"
              value={form.winnerShares}
              onChange={e => setForm(f => ({ ...f, winnerShares: e.target.value }))}
            />
            {errors.winnerShares && <span className="form-error">{errors.winnerShares}</span>}
          </div>

          {/* Percentage bar preview */}
          <div className="pct-preview">
            <div className="pct-bar">
              <div
                className="pct-creator"
                style={{ width: `${Math.min(parseInt(form.creatorShare) || 0, 100)}%` }}
              />
              {form.winnerShares.split(',').map((s, i) => {
                const pct = parseInt(s.trim()) || 0
                return (
                  <div
                    key={i}
                    className={`pct-winner pct-winner-${i}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                )
              })}
            </div>
            <div className={`pct-total ${totalPct === 100 ? 'valid' : 'invalid'}`}>
              Total: {totalPct}% {totalPct === 100 ? '✅' : `(need ${100 - totalPct}% more)`}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Creating...' : '🚀 Create Lottery'}
          </button>
        </div>
      </div>
    </div>
  )
}
