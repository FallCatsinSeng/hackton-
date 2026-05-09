# 🏦 Arisan Protocol

> **Decentralized Rotating Savings on Solana** — trustless, transparent, reputation-driven.

[![Solana](https://img.shields.io/badge/Solana-Mainnet_Ready-9945FF?logo=solana)](https://solana.com)
[![Anchor](https://img.shields.io/badge/Anchor-v0.31.1-512DA8)](https://anchor-lang.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📖 What is Arisan?

**Arisan** is a traditional Indonesian rotating savings association (ROSCA) practiced by millions. A group of people pool money every period, and one member receives the entire pot. The cycle continues until every member has received once.

**Problem:** Traditional arisan relies entirely on social trust. One defaulter breaks the entire group.

**Solution:** Arisan Protocol brings arisan on-chain — eliminating the need for interpersonal trust through smart contracts, cryptographic guarantees, and an on-chain reputation system.

---

## ✨ Key Features

### 🔒 Trustless Vault
All USDC deposits are locked in a **program-owned PDA vault**. No single person can touch the funds — only the protocol logic can authorize transfers.

### ⭐ On-Chain Reputation System
Every participant has a **portable reputation PDA** that tracks their payment history across all arisan groups:

| Reputation Score | Tier | Instant Payout | Locked | Unlock Period |
|:---:|:---:|:---:|:---:|:---:|
| 80–100 | 🏆 Veteran | 90% | 10% | 1 round |
| 50–79 | ✅ Trusted | 80% | 20% | 2 rounds |
| 25–49 | 📈 Average | 70% | 30% | 3 rounds |
| 0–24 | 🆕 New | 55% | 45% | 4 rounds |

New or unreliable members have a portion of their winnings **locked and released gradually** — incentivizing continued participation and penalizing exit after winning.

### 🎲 Fair Winner Selection
Pseudo-random winner selection using Solana slot hash and unix timestamp. Production-ready path: Switchboard VRF integration.

### ⚡ Slash Mechanism
Admins can slash non-paying members, burning their vault share and permanently damaging their reputation score — protecting honest participants.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Arisan Protocol                    │
├──────────────────┬──────────────────────────────────┤
│   Group PDA      │   Vault PDA (Token Account)       │
│  ─────────────   │  ──────────────────────────────   │
│  admin           │  authority: Group PDA             │
│  dues_amount     │  mint: USDC                       │
│  members[]       │  balance: N × dues_amount         │
│  current_round   │                                   │
│  is_locked       │                                   │
├──────────────────┴──────────────────────────────────┤
│              User Reputation PDA                     │
│  ──────────────────────────────────────────────────  │
│  user: Pubkey  |  score: 0-100  |  completed_groups  │
│  successful_rounds  |  defaulted_rounds              │
├─────────────────────────────────────────────────────┤
│              Locked Payout PDA                       │
│  ──────────────────────────────────────────────────  │
│  winner  |  total_locked  |  unlock_per_round        │
│  remaining_rounds  |  amount_claimed                 │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Instructions

| Instruction | Description |
|---|---|
| `initialize_group` | Create arisan group with USDC vault |
| `join_group` | Join group + auto-create reputation PDA |
| `pay_dues` | Pay USDC dues, updates reputation on success |
| `draw_winner` | Pseudo-random draw + tiered delayed payout |
| `claim_unlocked` | Winner claims locked funds each round |
| `slash_defaulter` | Admin penalizes non-paying member |

---

## 🚀 Quick Start

### Prerequisites
- Docker + Docker Compose
- Git

### Run Locally

```bash
git clone https://github.com/your-repo/arisan-protocol
cd arisan-protocol

# Start Docker environment (first run downloads ~500MB toolchain)
docker compose up -d
docker exec -it arisan-dev bash

# Inside container — start test validator
rm -rf test-ledger
solana-test-validator --reset > /tmp/val.log 2>&1 &
sleep 10

# Run full test suite
anchor test --skip-local-validator
```

### Expected Output
```
5 passing (9s)

✅ Group initialized successfully
✅ All 3 users joined. Group locked. Round 1 started.
✅ All members paid. Vault balance: 1500000
🎉 Winner drawn! Total locked: 300000 | Unlock per round: 150000
✅ Reputation system verified | Score: 70
```

---

## 🧪 Test Coverage

| Test | Status |
|---|---|
| Initialize arisan group | ✅ Pass |
| Users join + reputation PDA auto-created | ✅ Pass |
| Pay dues + reputation score updates | ✅ Pass |
| Draw winner + delayed payout transfer | ✅ Pass |
| Reputation PDAs verified on-chain | ✅ Pass |

---

## 🔐 Security Properties

- **No admin rug-pull:** Vault is PDA-owned, admin cannot withdraw directly
- **Sybil resistance:** Reputation is per-wallet and portable across groups
- **Delayed payout:** New users can't win & disappear — funds locked until next rounds
- **Trustless enforcement:** All rules encoded in smart contract, no off-chain reliance

---

## 🛠️ Tech Stack

- **Blockchain:** Solana (Localnet / Devnet)
- **Smart Contract Framework:** Anchor v0.31.1
- **Token Standard:** SPL Token (USDC-compatible)
- **Language:** Rust (smart contract) + TypeScript (tests)
- **Dev Environment:** Docker + Solana CLI 3.1.15

---

## 🗺️ Roadmap

- [x] Core arisan lifecycle (init → join → pay → draw → claim)
- [x] On-chain reputation system
- [x] Tiered delayed payout mechanism
- [x] Slash mechanism for defaulters
- [ ] Switchboard VRF for verifiable randomness
- [ ] Multi-round group support
- [ ] Frontend dApp (Next.js + Wallet Adapter)
- [ ] Devnet deployment
- [ ] Mainnet launch

---

## 📄 License

MIT © 2025 Arisan Protocol Team
