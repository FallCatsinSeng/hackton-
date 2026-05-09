# Arisan Web3: Delayed Payout & Dynamic Reputation Smart Contract

Pembuatan sistem Arisan terdesentralisasi di blockchain Solana menggunakan framework Anchor. Fokus utama pada implementasi kontrak pintar (smart contract) untuk mengamankan dana, mengelola reputasi *on-chain*, dan memastikan undian adil secara acak.

## User Review Required

> [!IMPORTANT]
> **Skop Hackathon (MVP):** Mengingat keterbatasan waktu hackathon, disarankan untuk menggunakan representasi **PDA (Program Derived Address)** sebagai pencatat Skor Reputasi dibandingkan menggunakan sistem *Soulbound NFT* (Token-2022) sungguhan, karena logika PDA jauh lebih mudah diimplementasikan, sangat murah biayanya (gas fee), dan mudah di-_query_ oleh frontend. Kita bisa meng-upgrade ini ke NFT di masa depan.
> 
> Apakah Anda setuju menggunakan arsitektur PDA untuk skor reputasinya di versi MVP ini?

## Open Questions

> [!WARNING]
> Mohon konfirmasi untuk 2 hal strategis ini sebelum kita mulai *koding*:
> 1. **Mata Uang Iuran:** Apakah arisan ini akan menggunakan koin asli **SOL** atau token stabil **USDC** (SPL Token)? (Sangat disarankan memakai USDC (Devnet) agar nilainya tidak berfluktuasi saat arisan berjalan).
> 2. **Sistem Pengacakan (VRF):** Mengintegrasikan *Switchboard VRF* ke Solana butuh waktu *setup* infrastruktur oracle-nya. Untuk MVP, apakah kita mau menggunakan *Pseudo-random blockhash* dulu agar fungsionalitas utama (Reputasi & *Delayed Payout*) selesai cepat, lalu me-replace-nya dengan *Switchboard VRF* jika masih ada sisa waktu?

## Proposed Changes

Proyek akan diinisiasi menggunakan `anchor init arisan_protocol`. Berikut adalah arsitektur kodenya.

### Program State & Accounts
Mendefinisikan struktur data yang akan tersimpan di Solana secara permanen.

#### [NEW] `programs/arisan/src/state/group.rs`
Menyimpan state/status dari suatu grup Arisan.
- `admin`: Pubkey pembuat grup.
- `dues_amount`: Nominal iuran per putaran.
- `max_members`: Jumlah maksimal anggota.
- `current_round`: Putaran saat ini (1, 2, ... N).
- `vault_bump`: Bump seed untuk PDA tempat menyimpan uang (Vault).
- `members`: Vektor/Array berisi status anggota (Pubkey, sudah bayar putaran ini atau belum, apakah sudah menang).

#### [NEW] `programs/arisan/src/state/reputation.rs`
PDA unik untuk setiap pengguna (Pubkey) yang berinteraksi dengan protokol.
- `user`: Pubkey pengguna.
- `successful_rounds`: Total putaran yang dibayar tepat waktu.
- `defaulted_rounds`: Total putaran kabur/gagal bayar.
- `reputation_score`: Nilai kredit (0 - 100), dihitung otomatis berdasarkan riwayat.

#### [NEW] `programs/arisan/src/state/locked_payout.rs`
Menyimpan dana pemenang yang ditahan.
- `winner`: Pubkey pemenang.
- `group`: Pubkey grup arisan.
- `locked_amount`: Total dana yang masih ditahan.
- `unlock_per_round`: Jumlah dana yang di-_unlock_ setiap mereka bayar iuran putaran berikutnya.
- `remaining_rounds_to_unlock`: Sisa putaran yang harus dibayar.

---

### Instructions (Logika Bisnis)
Kumpulan fungsi (endpoints) yang bisa dipanggil oleh Frontend.

#### [NEW] `programs/arisan/src/instructions/initialize_group.rs`
- Fungsi untuk membuat grup baru.
- Membuat PDA *Vault* tempat menampung iuran (SOL/USDC).

#### [NEW] `programs/arisan/src/instructions/join_group.rs`
- User bergabung. Kontrak mengecek apakah `max_members` sudah penuh.
- Jika user belum punya akun `reputation`, kontrak otomatis membuatkannya dengan `reputation_score` standar (pengguna baru).

#### [NEW] `programs/arisan/src/instructions/pay_dues.rs`
- Anggota mentransfer iuran ke *Vault*.
- Mengubah status anggota menjadi `paid_current_round = true`.

#### [NEW] `programs/arisan/src/instructions/draw_winner_and_payout.rs`
- **Fase Undian:** Menentukan pemenang dari daftar anggota yang belum menang. (Mock VRF/Switchboard).
- **Fase Payout:** 
  - Membaca `reputation_score` dari pemenang.
  - Kalkulasi persentase dana yang cair instan vs ditahan.
  - Transfer dana cair instan ke wallet pemenang.
  - Membuat objek `LockedPayout` dengan sisa dana di dalam *Vault*.

#### [NEW] `programs/arisan/src/instructions/claim_unlocked_payout.rs`
- Dipanggil pemenang di putaran-putaran selanjutnya **setelah** mereka melakukan `pay_dues`.
- Kontrak mengurangi `remaining_rounds_to_unlock` dan mentransfer `unlock_per_round` ke pemenang.

#### [NEW] `programs/arisan/src/instructions/slash_defaulter.rs`
- Jika pemenang sebelumnya gagal bayar di putaran selanjutnya, *Admin/Bot* memanggil fungsi ini.
- `reputation_score` pemenang dikurangi drastis (Blacklist).
- Dana di `LockedPayout` didistribusikan/dicairkan kepada anggota tersisa yang setia membayar.

---

### Frontend Setup

#### [NEW] `app/`
Folder Next.js (berbasis React) berisi:
- Integrasi `Solana Wallet Adapter` (Phantom, Solflare).
- Integrasi `@coral-xyz/anchor` untuk terhubung langsung ke smart contract.
- UI Dashboard untuk melihat Grup Arisan, Membayar Iuran, dan mengecek *Reputation Score*.

## Verification Plan

### Automated Tests (Anchor TypeScript Tests)
Di folder `tests/arisan.ts`, kita akan mensimulasikan:
1. **Skenario Happy Path (Lancar):** 3 User gabung -> Semua bayar -> Undian -> Pemenang Reputasi Baru (Dana ditahan sebagian) -> Putaran 2 berjalan -> Pemenang bayar lagi -> Dana sisa cair sebagian. Reputasi naik.
2. **Skenario Hit and Run (Kabur):** Pemenang putaran 1 menolak bayar di putaran 2. -> Fungsi Slashing dipanggil -> Dana terkunci milik pemenang didistribusikan ke 2 anggota lain. Reputasi pemenang hancur.

### Manual Verification
1. Menjalankan `solana-test-validator` di lokal.
2. Men-deploy (build) smart contract menggunakan Anchor.
3. Berinteraksi menggunakan skrip TS langsung ke lokal blockchain.
