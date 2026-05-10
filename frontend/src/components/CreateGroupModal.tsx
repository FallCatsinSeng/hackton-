import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useArisan } from '../hooks/useArisan'
import { ToastMsg } from '../App'

interface Props {
  onClose: () => void
  onCreated: () => void
  addToast: (type: ToastMsg['type'], text: string) => void
}

export default function CreateGroupModal({ onClose, onCreated, addToast }: Props) {
  const { publicKey } = useWallet()
  const { createGroup } = useArisan()
  const [duesUSDC, setDuesUSDC] = useState('1')
  const [maxMembers, setMaxMembers] = useState('3')
  const [usdcMint, setUsdcMint] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!publicKey) return
    if (!usdcMint) { addToast('error', 'Enter USDC mint address'); return }
    const dues = parseFloat(duesUSDC)
    const members = parseInt(maxMembers)
    if (isNaN(dues) || dues <= 0) { addToast('error', 'Invalid dues amount'); return }
    if (members < 3 || members > 20) { addToast('error', 'Members must be 3-20'); return }

    setLoading(true)
    try {
      const duesLamports = Math.floor(dues * 1_000_000)
      const sig = await createGroup(usdcMint, duesLamports, members)
      addToast('success', `Group created! Tx: ${sig.slice(0, 8)}...`)
      onCreated()
    } catch (e: any) {
      addToast('error', e.message?.slice(0, 80) || 'Failed to create group')
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Create Circa Group</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="form-group">
          <label className="form-label">USDC Mint Address</label>
          <input
            className="form-input"
            value={usdcMint}
            onChange={e => setUsdcMint(e.target.value)}
            placeholder="TokenMintAddress..."
          />
          <div className="form-hint">Enter the USDC Mint Address for this group</div>
        </div>

        <div className="form-group">
          <label className="form-label">Dues per round (USDC)</label>
          <input
            className="form-input"
            type="number"
            min="0.01"
            step="0.1"
            value={duesUSDC}
            onChange={e => setDuesUSDC(e.target.value)}
          />
          <div className="form-hint">Each member pays this amount per round</div>
        </div>

        <div className="form-group">
          <label className="form-label">Max Members</label>
          <input
            className="form-input"
            type="number"
            min="3"
            max="20"
            value={maxMembers}
            onChange={e => setMaxMembers(e.target.value)}
          />
          <div className="form-hint">3–20 members. One winner per round.</div>
        </div>

        <div style={{
          padding: '14px', background: 'rgba(153,69,255,0.08)',
          borderRadius: '10px', marginBottom: '20px',
          fontSize: '0.85rem', color: 'var(--text-secondary)'
        }}>
          💡 Total pool per round: <strong style={{ color: 'var(--purple-light)' }}>
            {(parseFloat(duesUSDC || '0') * parseInt(maxMembers || '3')).toFixed(2)} USDC
          </strong>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? <><span className="spinner" /> Creating...</> : '🚀 Create Group'}
        </button>
      </div>
    </div>
  )
}
