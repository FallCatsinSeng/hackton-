# Arisan Protocol — Walkthrough

## Apa yang Sudah Dikerjakan

### ✅ Seluruh Smart Contract Ditulis (6 Instructions)

Kode Solana/Anchor untuk protokol arisan sudah **selesai 100%** dan siap di-build.

### Struktur Proyek

```
hackton/
├── Dockerfile                          ← Docker image (Solana+Anchor+Rust+Node)
├── docker-compose.yml                  ← Docker compose config
└── arisan_protocol/
    ├── Anchor.toml                     ← Anchor config (Localnet)
    ├── Cargo.toml                      ← Workspace Cargo
    ├── package.json                    ← Node dependencies
    ├── tsconfig.json
    ├── migrations/deploy.js
    ├── programs/arisan_protocol/
    │   ├── Cargo.toml                  ← Program dependencies (anchor-lang, anchor-spl)
    │   └── src/
    │       ├── lib.rs                  ← Entry point (6 instructions wired)
    │       ├── errors.rs               ← 17 custom error codes
    │       ├── state/
    │       │   ├── mod.rs
    │       │   ├── group.rs            ← ArisanGroup (members, vault, rounds)
    │       │   ├── reputation.rs       ← UserReputation (score, payment history)
    │       │   └── locked_payout.rs    ← LockedPayout (delayed payout tracking)
    │       └── instructions/
    │           ├── mod.rs
    │           ├── initialize_group.rs ← Buat grup + USDC vault
    │           ├── join_group.rs       ← Gabung + auto-create reputation PDA
    │           ├── pay_dues.rs         ← Bayar iuran USDC ke vault
    │           ├── draw_winner.rs      ← Undian + delayed payout by reputation
    │           ├── claim_unlocked.rs   ← Klaim dana yang sudah unlock
    │           └── slash_defaulter.rs  ← Penalti defaulter + distribusi dana
    └── tests/
        └── arisan_protocol.ts          ← Integration tests (5 test cases)
```

### Fitur Inti yang Diimplementasi

| Fitur | Status | Penjelasan |
|---|---|---|
| **USDC Vault (PDA)** | ✅ | Token account yang dimiliki oleh PDA, tidak ada manusia yang pegang kunci |
| **Delayed Payout** | ✅ | Pemenang hanya dapat sebagian instan, sisanya dikunci sesuai skor reputasi |
| **Dynamic Reputation** | ✅ | Skor 0-100 dihitung otomatis dari riwayat on-chain, menentukan % dana ditahan |
| **Auto-Lock Group** | ✅ | Grup otomatis terkunci saat anggota penuh, round 1 dimulai |
| **Slashing Mechanism** | ✅ | Pemenang kabur → dana hangus & didistribusikan ke anggota setia |
| **Portable PDA** | ✅ | Skor reputasi dibawa ke grup lain (PDA per wallet, bukan per grup) |

### Tabel Reputasi → Payout

| Skor Reputasi | % Dana Ditahan | Putaran untuk Unlock |
|---|---|---|
| 0 — 24 (Baru) | **45%** | 4 putaran |
| 25 — 49 (Rata-rata) | **30%** | 3 putaran |
| 50 — 79 (Bagus) | **20%** | 2 putaran |
| 80 — 100 (Veteran) | **10%** | 1 putaran |

---

## 🐳 Cara Build & Test dengan Docker

Docker image sudah disiapkan. Jalankan perintah berikut **di terminal** secara berurutan:

### Step 1: Build Docker Image
```bash
cd /media/maulana/01DC6F62F07304601/hackton
docker build -t arisan-dev .
```
> Ini memakan waktu ~10-15 menit pertama kali (download Rust, Solana CLI, Anchor).

### Step 2: Masuk ke Container
```bash
docker run -it --rm \
  -v $(pwd)/arisan_protocol:/workspace/arisan_protocol \
  -w /workspace/arisan_protocol \
  -p 8899:8899 -p 8900:8900 \
  arisan-dev /bin/bash
```

### Step 3: Di Dalam Container — Build Smart Contract
```bash
# Install node dependencies
npm install

# Build the Anchor program
anchor build

# Update program ID (dari hasil build)
# 1. Lihat program ID yang di-generate:
solana address -k target/deploy/arisan_protocol-keypair.json

# 2. Update ID tersebut di:
#    - programs/arisan_protocol/src/lib.rs (declare_id!)
#    - Anchor.toml (programs.localnet)
```

### Step 4: Di Dalam Container — Run Tests
```bash
# Start local validator di background
solana-test-validator &

# Wait a moment, then run tests
sleep 3
anchor test --skip-local-validator
```

---

## Belum Dikerjakan (Next Steps)

1. **`anchor build` & `anchor test`** — Perlu dijalankan di dalam Docker container
2. **Frontend (Next.js)** — Dashboard untuk berinteraksi dengan smart contract
3. **Replace pseudo-random → Switchboard VRF** — Jika ada waktu
