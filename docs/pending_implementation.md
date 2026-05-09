# Daftar Fitur & Tugas yang Belum Diimplementasikan (Pending Implementation)

Berdasarkan status pengembangan terakhir, logika inti *Smart Contract* sudah ditulis 100%. Namun, proyek ini belum selesai sepenuhnya. Berikut adalah hal-hal esensial yang masih harus dikerjakan:

## 1. Kompilasi & Pengujian (*Build & Test*) Smart Contract
Walaupun kode Anchor (Rust) sudah selesai ditulis, kita belum melakukan verifikasi kompilasi dan _testing_ karena sebelumnya terhambat oleh setup Docker.
- **Tugas:** Menjalankan `anchor build` di dalam container Docker.
- **Tugas:** Memperbaiki *error syntax* atau *bug* jika ditemukan saat proses _build_.
- **Tugas:** Menjalankan `anchor test` (TypeScript) untuk memvalidasi skenario (seperti _happy path_ arisan dan fungsi hukuman/slashing).

## 2. Pembuatan Aplikasi Frontend (UI/UX)
Pengguna tidak bisa berinteraksi langsung menggunakan terminal. Kita perlu membuat antarmuka web (DApp) agar sistem arisan ini mudah digunakan.
- **Tugas:** Setup proyek React/Next.js.
- **Tugas:** Integrasi Solana Wallet Adapter (contoh: Phantom, Solflare).
- **Tugas:** Pembuatan halaman **Dashboard** untuk:
  - Membuat grup arisan baru.
  - Mengambil _invite link_ untuk teman.
  - Menampilkan skor Reputasi (Credit Score) pengguna.
- **Tugas:** Interaksi tombol UI dengan _Smart Contract_ (`pay_dues`, `claim_unlocked`).

## 3. Integrasi Pengacakan Asli (Switchboard VRF)
Saat ini mekanisme pemilihan pemenang masih menggunakan cara *pseudo-random* (berbasis blockhash) yang cukup rentan jika digunakan di *mainnet*. Sesuai rencana untuk memenangkan hackathon, pengacakan harus bersifat absolut dan *verifiable*.
- **Tugas:** Mengganti baris kode pengacakan sementara dengan **Switchboard VRF (Verifiable Random Function)**.
- **Tugas:** Setup infrastruktur dan akun oracle Switchboard di environment Devnet.

## 4. Deploy ke Devnet/Mainnet Solana
Saat ini pengaturan *smart contract* masih diarahkan ke jaringan lokal (Localnet).
- **Tugas:** Mengubah konfigurasi `Anchor.toml` dari `localnet` menjadi `devnet`.
- **Tugas:** Membiayai (fund) _deployer wallet_ dengan token SOL devnet (menggunakan `solana airdrop`).
- **Tugas:** Melakukan `anchor deploy` ke jaringan Devnet agar aplikasi bisa dicoba oleh juri atau publik.

---
*Dokumen ini dapat dijadikan panduan (roadmap) untuk melanjutkan pengembangan proyek.*
