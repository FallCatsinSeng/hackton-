import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { useEffect } from 'react'

interface HeroProps { onEnter: () => void }

export default function Hero({ onEnter }: HeroProps) {
  const { connected } = useWallet()

  useEffect(() => {
    if (connected) onEnter()
  }, [connected])

  return (
    <section className="hero">
      <div className="hero-badge">
        <span>🔗</span> Built on Solana
      </div>

      <h1>
        Circa, <span>Trustless.</span><br />
        Reputation-Powered.
      </h1>

      <p className="hero-desc">
        Indonesia's ancient rotating savings tradition, reimagined on-chain.
        No trust required — just code, cryptography, and community.
      </p>

      <div className="hero-actions">
        <WalletMultiButton />
        <a
          href="https://github.com"
          target="_blank"
          className="btn btn-secondary"
        >
          View Source ↗
        </a>
      </div>

      <div className="hero-stats">
        <div className="stat">
          <div className="stat-value">$40B</div>
          <div className="stat-label">Annual ROSCA market</div>
        </div>
        <div className="stat">
          <div className="stat-value">92M</div>
          <div className="stat-label">Indonesians participate</div>
        </div>
        <div className="stat">
          <div className="stat-value">0</div>
          <div className="stat-label">Trust required</div>
        </div>
      </div>

      {/* Feature tiles */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px', maxWidth: '800px', width: '100%', marginTop: '80px'
      }}>
        {[
          { icon: '🔒', title: 'Trustless Vault', desc: 'PDA-owned — no admin can touch funds' },
          { icon: '⭐', title: 'On-Chain Reputation', desc: 'Portable credit score across all groups' },
          { icon: '🎲', title: 'Fair Draw', desc: 'On-chain randomness for winner selection' },
          { icon: '⚡', title: 'Slash Protection', desc: 'Defaulters penalized, honest members protected' },
        ].map((f) => (
          <div key={f.title} className="card-glass" style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>{f.icon}</div>
            <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.95rem' }}>{f.title}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
