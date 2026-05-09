import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { ConnectionConfig } from '@solana/web3.js'
import App from './App'
import './index.css'
import '@solana/wallet-adapter-react-ui/styles.css'

const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://api.devnet.solana.com'

// Connection with longer timeout and no rate limit retry
const connectionConfig: ConnectionConfig = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 120000, // 2 minutes
  disableRetryOnRateLimit: false,
}

// Support Phantom + any Standard Wallet (Brave Wallet, etc.)
const wallets = [new PhantomWalletAdapter()]

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={RPC_URL} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
)
