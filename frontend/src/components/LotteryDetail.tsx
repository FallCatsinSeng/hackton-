import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useArisan, LotteryInfo } from '../hooks/useArisan'

type ToastFn = (type: 'success' | 'error', text: string) => void

interface Props {
  lotteryAddress: string
  onBack: () => void
  addToast: ToastFn
}

export default function LotteryDetail({ lotteryAddress, onBack, addToast }: Props) {
  const { publicKey } = useWallet()
  const { fetchAllLotteries, buyLotteryTicket, drawLottery, claimLotteryPrize } = useArisan()
  const [lottery, setLottery] = useState<LotteryInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [numTickets, setNumTickets] = useState(1)
  const [actionLoading, setActionLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  const fetchLottery = async () => {
    const all = await fetchAllLotteries()
    const found = all.find(l => l.address === lotteryAddress) ?? null
    setLottery(found)
    setLoading(false)
  }

  useEffect(() => {
    fetchLottery()
  }, [lotteryAddress])

  // Countdown timer
  useEffect(() => {
    if (!lottery) return
    const interval = setInterval(() => {
      const remaining = lottery.endTime - Math.floor(Date.now() / 1000)
      setTimeLeft(remaining)
    }, 1000)
    return () => clearInterval(interval)
  }, [lottery])

  const formatTime = (secs: number) => {
    if (secs <= 0) return 'Ended'
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  const handleBuyTicket = async () => {
    if (!lottery) return
    setActionLoading(true)
    try {
      const tx = await buyLotteryTicket(lottery, numTickets)
      addToast('success', `🎟️ Bought ${numTickets} ticket(s)! TX: ${tx.slice(0, 12)}...`)
      await fetchLottery()
    } catch (e: any) {
      addToast('error', e.message || 'Failed to buy ticket')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDraw = async () => {
    if (!lottery) return
    setActionLoading(true)
    try {
      const tx = await drawLottery(lottery)
      addToast('success', `🎉 Lottery drawn! TX: ${tx.slice(0, 12)}...`)
      await fetchLottery()
    } catch (e: any) {
      addToast('error', e.message || 'Failed to draw lottery')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!lottery) return
    setActionLoading(true)
    try {
      const tx = await claimLotteryPrize(lottery)
      addToast('success', `💰 Prize claimed! TX: ${tx.slice(0, 12)}...`)
      await fetchLottery()
    } catch (e: any) {
      addToast('error', e.message || 'Failed to claim prize')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" />
        <p>Loading lottery...</p>
      </div>
    )
  }

  if (!lottery) {
    return (
      <div className="empty-state">
        <p>Lottery not found.</p>
        <button className="btn btn-secondary" onClick={onBack}>← Back</button>
      </div>
    )
  }

  const myWallet = publicKey?.toBase58()
  const isCreator = myWallet === lottery.creator
  const isWinner = myWallet ? lottery.winningWallets.includes(myWallet) : false
  const myParticipation = myWallet ? lottery.participants.find(p => p.wallet === myWallet) : null
  const myTickets = myParticipation?.ticketsBought ?? 0
  const isEnded = !lottery.isActive || timeLeft <= 0
  const canDraw = isCreator && isEnded && lottery.winningWallets.length === 0
  const canClaim = !lottery.isActive && (isCreator || isWinner)
  const winChance = lottery.totalTicketsSold > 0
    ? ((myTickets / lottery.totalTicketsSold) * 100).toFixed(2)
    : '0.00'

  const ticketCostDisplay = ((numTickets * lottery.ticketPrice) / 1_000_000).toFixed(2)

  return (
    <div className="lottery-detail">
      {/* Back */}
      <button className="back-btn" onClick={onBack}>← Back to Lotteries</button>

      <div className="lottery-detail-grid">
        {/* Left: Info */}
        <div className="lottery-detail-main">
          {/* Header */}
          <div className="lottery-detail-header">
            <div className="creator-avatar-lg">
              {lottery.creator.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="detail-title">Creator Support Lottery</h1>
              <div className="detail-creator">
                by <span className="address-mono">{lottery.creator.slice(0, 16)}...{lottery.creator.slice(-8)}</span>
                {isCreator && <span className="badge badge-creator">👑 You</span>}
              </div>
            </div>
            <div className={`status-pill ${isEnded ? 'ended' : 'active'}`}>
              {isEnded ? '✅ Ended' : '🔥 Live'}
            </div>
          </div>

          {/* Countdown */}
          <div className="countdown-card">
            <div className="countdown-label">{isEnded ? 'Lottery Ended' : 'Time Remaining'}</div>
            <div className={`countdown-time ${!isEnded && timeLeft < 3600 ? 'urgent' : ''}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="countdown-end">
              Ends at: {new Date(lottery.endTime * 1000).toLocaleString()}
            </div>
          </div>

          {/* Pool Info */}
          <div className="detail-stats-grid">
            <div className="detail-stat">
              <span className="detail-stat-label">💰 Prize Pool</span>
              <span className="detail-stat-value prize">{(lottery.totalPool / 1_000_000).toFixed(2)} USDC</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-label">🎟️ Ticket Price</span>
              <span className="detail-stat-value">{(lottery.ticketPrice / 1_000_000).toFixed(2)} USDC</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-label">🎫 Tickets Sold</span>
              <span className="detail-stat-value">{lottery.totalTicketsSold}</span>
            </div>
            <div className="detail-stat">
              <span className="detail-stat-label">👥 Participants</span>
              <span className="detail-stat-value">{lottery.participants.length}</span>
            </div>
          </div>

          {/* Prize Distribution Visualization */}
          <div className="prize-distribution">
            <h3>🏆 Prize Distribution</h3>
            <div className="dist-bar-lg">
              <div
                className="dist-creator"
                style={{ width: `${lottery.creatorSharePct}%` }}
              >
                <span className="dist-label">{lottery.creatorSharePct}%</span>
              </div>
              {lottery.winnerSharesPct.map((pct, i) => (
                <div
                  key={i}
                  className={`dist-winner dist-winner-${i}`}
                  style={{ width: `${pct}%` }}
                >
                  <span className="dist-label">{pct}%</span>
                </div>
              ))}
            </div>
            <div className="dist-items">
              <div className="dist-item creator-dist">
                <div className="dist-dot creator-dot" />
                <span>👤 Creator</span>
                <span className="dist-amount">
                  {((lottery.totalPool * lottery.creatorSharePct) / 100_000_000).toFixed(2)} USDC
                </span>
              </div>
              {lottery.winnerSharesPct.map((pct, i) => {
                const winnerAddr = lottery.winningWallets[i]
                return (
                  <div key={i} className="dist-item">
                    <div className={`dist-dot winner-dot-${i}`} />
                    <span>🏆 Winner #{i + 1}</span>
                    <span className="dist-amount">
                      {((lottery.totalPool * pct) / 100_000_000).toFixed(2)} USDC
                    </span>
                    {winnerAddr && (
                      <span className="winner-addr">
                        {winnerAddr.slice(0, 8)}...
                        {winnerAddr === myWallet && ' (YOU!)'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Participants Table */}
          <div className="participants-section">
            <h3>🎫 Participants ({lottery.participants.length})</h3>
            {lottery.participants.length === 0 ? (
              <p className="no-participants">No tickets sold yet. Be the first!</p>
            ) : (
              <div className="participants-table">
                <div className="participant-row header">
                  <span>Wallet</span>
                  <span>Tickets</span>
                  <span>Win Chance</span>
                  <span>Est. Pool Share</span>
                </div>
                {lottery.participants
                  .sort((a, b) => b.ticketsBought - a.ticketsBought)
                  .map((p) => {
                    const chance = ((p.ticketsBought / lottery.totalTicketsSold) * 100).toFixed(1)
                    const isMe = p.wallet === myWallet
                    const isWon = lottery.winningWallets.includes(p.wallet)
                    return (
                      <div key={p.wallet} className={`participant-row ${isMe ? 'is-me' : ''} ${isWon ? 'is-winner' : ''}`}>
                        <span className="p-wallet">
                          {p.wallet.slice(0, 8)}...{p.wallet.slice(-6)}
                          {isMe && ' 👤'}
                          {isWon && ' 🏆'}
                        </span>
                        <span className="p-tickets">{p.ticketsBought}</span>
                        <span className="p-chance">{chance}%</span>
                        <span className="p-pool">
                          {((p.ticketsBought / Math.max(lottery.totalTicketsSold, 1)) * (lottery.totalPool / 1_000_000) * (1 - lottery.creatorSharePct / 100)).toFixed(2)} USDC
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Action Panel */}
        <div className="lottery-action-panel">
          {/* My Stats */}
          {myWallet && (
            <div className="my-stats-card">
              <h3>📊 Your Stats</h3>
              <div className="my-stat">
                <span>Your Tickets</span>
                <span className="my-stat-value">{myTickets}</span>
              </div>
              <div className="my-stat">
                <span>Win Probability</span>
                <span className="my-stat-value win-pct">{winChance}%</span>
              </div>
              {isWinner && (
                <div className="winner-banner">🎉 You are a Winner!</div>
              )}
              {isCreator && (
                <div className="creator-banner">👑 You are the Creator</div>
              )}
            </div>
          )}

          {/* Buy Tickets (active only) */}
          {!isEnded && (
            <div className="buy-ticket-card">
              <h3>🎟️ Buy Tickets</h3>
              <p className="buy-hint">More tickets = higher probability to win!</p>

              <div className="ticket-counter">
                <button
                  className="counter-btn"
                  onClick={() => setNumTickets(n => Math.max(1, n - 1))}
                >−</button>
                <span className="counter-val">{numTickets}</span>
                <button
                  className="counter-btn"
                  onClick={() => setNumTickets(n => n + 1)}
                >+</button>
              </div>

              <div className="ticket-cost">
                Cost: <strong>{ticketCostDisplay} USDC</strong>
              </div>

              <div className="ticket-probability">
                Win chance after purchase:{' '}
                <strong>
                  {lottery.totalTicketsSold > 0
                    ? (((myTickets + numTickets) / (lottery.totalTicketsSold + numTickets)) * 100).toFixed(1)
                    : '100.0'}%
                </strong>
              </div>

              <button
                className="btn btn-primary buy-btn"
                onClick={handleBuyTicket}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : `🎟️ Buy ${numTickets} Ticket${numTickets > 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {/* Draw (ended, not drawn yet, creator only) */}
          {canDraw && (
            <div className="action-card">
              <h3>🎲 Draw Winners</h3>
              <p>The lottery has ended. Draw to determine the winners!</p>
              <button
                className="btn btn-primary"
                onClick={handleDraw}
                disabled={actionLoading}
              >
                {actionLoading ? 'Drawing...' : '🎲 Draw Now'}
              </button>
            </div>
          )}

          {/* Claim (ended, drawn, creator or winner) */}
          {canClaim && (
            <div className="action-card claim-card">
              <h3>💰 Claim Your Prize</h3>
              <p>
                {isWinner && `You won! Claim your prize now.`}
                {isCreator && !isWinner && `Claim your ${lottery.creatorSharePct}% creator share.`}
                {isCreator && isWinner && `You are both creator and winner! Claim both shares.`}
              </p>
              <button
                className="btn btn-primary"
                onClick={handleClaim}
                disabled={actionLoading}
              >
                {actionLoading ? 'Claiming...' : '💰 Claim USDC'}
              </button>
            </div>
          )}

          {/* Waiting for draw */}
          {isEnded && !lottery.isActive && lottery.winningWallets.length > 0 && !canClaim && (
            <div className="action-card ended-card">
              <h3>🏁 Lottery Complete</h3>
              <p>Winners have been drawn. Check the participants list above.</p>
            </div>
          )}

          {isEnded && lottery.isActive && lottery.winningWallets.length === 0 && !isCreator && (
            <div className="action-card ended-card">
              <h3>⏳ Awaiting Draw</h3>
              <p>The lottery has ended. Waiting for the creator to draw winners.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
