# 🏦 Arisan Protocol
## Pitch Deck — Hackathon Submission

---

## 🎯 The Problem

**Arisan** — Indonesia's oldest financial tradition. 92 million Indonesians participate in rotating savings groups (ROSCA). It works great *until it doesn't.*

### What goes wrong today?
- 🚨 **1 defaulter destroys the group** — winner disappears after receiving the pot
- 🤝 **Requires personal trust** — only works among close friends/family
- 📵 **No recourse** — no enforcement mechanism exists
- 🌍 **Can't scale** — limited to people who know each other personally

> **$40 billion+** moves through informal ROSCA systems in Indonesia annually — all on personal trust alone.

---

## 💡 Our Solution

**Arisan Protocol** — a trustless, on-chain arisan built on Solana.

Replace interpersonal trust with **cryptographic guarantees** and **programmable incentives**.

---

## ⚙️ How It Works

```
1. Admin creates group (3–20 members, sets USDC dues amount)
         ↓
2. Members join → Reputation PDA auto-created on-chain
         ↓
3. Each round: all members pay dues into locked vault
         ↓
4. Smart contract draws winner (pseudo-random, on-chain)
         ↓
5. Winner receives payout — amount depends on reputation score
         ↓
6. Cycle repeats until all members have won
```

**Key Innovation:** Winners with low reputation receive only a PORTION of their winnings immediately. The rest unlocks over subsequent rounds — ensuring they stay and pay.

---

## ⭐ The Reputation Engine

Every wallet has a **portable, cross-group reputation score** (0–100):

```
New User (score 0–24):    55% instant / 45% locked over 4 rounds
Average  (score 25–49):   70% instant / 30% locked over 3 rounds  
Trusted  (score 50–79):   80% instant / 20% locked over 2 rounds
Veteran  (score 80–100):  90% instant / 10% locked over 1 round
```

**The incentive is self-reinforcing:**
- Pay on time → score goes up → future payouts are larger % instant
- Default → score drops → reputation permanently damaged on-chain

---

## 🔐 Security Architecture

| Traditional Arisan | Arisan Protocol |
|---|---|
| Admin holds all money | PDA vault, no single controller |
| Trust-based enforcement | Code-based enforcement |
| No recourse for defaults | On-chain slash mechanism |
| Limited to local networks | Anyone with a Solana wallet |
| No reputation system | Portable reputation, cross-group |

---

## 📊 Market Opportunity

| Market | Size |
|---|---|
| Indonesia ROSCA market | ~$40B/year |
| Southeast Asia informal savings | ~$180B/year |
| Global unbanked population | 1.4 billion people |

Arisan Protocol targets the **financially underserved** — people who already participate in ROSCAs but lack access to formal credit or banking. On-chain reputation becomes a **credit score for the unbanked**.

---

## 🏗️ Technical Achievements

✅ **Deployed & tested on Solana localnet**
- 5/5 test scenarios passing
- Full lifecycle: initialize → join → pay → draw → claim

✅ **On-chain reputation system**
- Reputation PDA per wallet, portable across groups
- Score updates automatically on every payment
- Tiered payout parameters derived from score

✅ **Trustless vault**
- All USDC locked in program-owned PDA
- Group PDA signs CPI transfers — no admin key needed

✅ **Slash mechanism**
- Admin can penalize defaulters
- Permanent on-chain reputation damage

✅ **Frontend dApp**
- React + Vite + Solana Wallet Adapter
- Phantom wallet integration
- Real-time on-chain data

---

## 🛠️ Tech Stack

```
Solana Blockchain (Agave 3.1.15)
    └── Anchor Framework v0.31.1
        └── SPL Token (USDC-compatible)
            └── Program PDAs for vault + reputation + locked payout

Frontend: React + Vite + @coral-xyz/anchor + Phantom Wallet
```

**Development:** Rust + TypeScript | Docker + Solana CLI

---

## 🗺️ What's Next

### Short-term (Post-Hackathon)
1. **Switchboard VRF** — replace pseudo-random with verifiable randomness
2. **Devnet deployment** — public testnet accessible to anyone
3. **Mobile app** — reach the unbanked via smartphone

### Medium-term
4. **Multi-currency** — support for other SPL tokens
5. **Group discovery** — on-chain registry for finding groups

### Long-term Vision
> Arisan Protocol becomes the **on-chain credit layer for emerging markets** — where participation in a trustless ROSCA becomes your gateway to DeFi lending, insurance, and beyond.

---

## 👥 Why Now?

- **Solana's speed & cost** makes microtransaction-heavy arisan viable (< $0.001/tx)
- **USDC on Solana** provides stable, accessible settlement currency
- **90 million Indonesians** already understand arisan — zero education needed
- **Hackathon moment** to prove the concept before scaling

---

## 🎬 Demo Flow

```bash
# 1. Start environment
docker compose up -d && docker exec -it arisan-dev bash

# 2. Start validator
solana-test-validator --reset > /tmp/val.log 2>&1 & sleep 10

# 3. Run full test suite — watch the entire lifecycle execute
anchor test --skip-local-validator
```

**Output:**
```
✅ Group initialized — USDC vault created
✅ 3 users joined — reputation PDAs created on-chain
✅ All dues paid — vault: 1,500,000 USDC lamports
🎉 Winner drawn — 1,200,000 instant + 300,000 locked (20% for trusted user)
✅ Reputation verified — Score: 70 | Successful rounds: 2
```

---

## 💬 One-Line Pitch

> **"Arisan Protocol makes Indonesia's $40B rotating savings tradition trustless, transparent, and accessible to anyone with a Solana wallet."**

---

*Built with ❤️ for the Solana Hackathon 2025*
