# Mekanisme Arisan: Delayed Payout & Reputasi Dinamis

Berikut adalah diagram alur logika dari smart contract yang menggabungkan sistem penahanan dana (delayed payout) dengan skor reputasi on-chain.

```mermaid
graph TD
    %% Styling
    classDef contract fill:#2d3748,stroke:#4a5568,stroke-width:2px,color:#fff
    classDef action fill:#3182ce,stroke:#2b6cb0,stroke-width:2px,color:#fff
    classDef decision fill:#d69e2e,stroke:#b7791f,stroke-width:2px,color:#fff
    classDef penalty fill:#e53e3e,stroke:#c53030,stroke-width:2px,color:#fff
    classDef success fill:#38a169,stroke:#2f855a,stroke-width:2px,color:#fff

    A[Mulai Putaran Arisan]:::action --> B{Undian Pemenang<br/>via Switchboard VRF}:::decision
    B --> C[Pemenang Terpilih]:::action
    
    C --> D{Cek Reputasi On-Chain<br/>Pemenang}:::decision
    
    D -->|Baru / Tidak ada riwayat| E[Tahan 45% Dana<br/>Syarat: 4 Putaran]:::contract
    D -->|Pernah arisan, lancar| F[Tahan 30% Dana<br/>Syarat: 3 Putaran]:::contract
    D -->|Track record 2+ Arisan| G[Tahan 20% Dana<br/>Syarat: 2 Putaran]:::contract
    D -->|Veteran Terpercaya| H[Tahan 10% Dana<br/>Syarat: 1 Putaran]:::contract
    
    E --> I[Transfer Instan Sisa Dana<br/>ke Wallet Pemenang]:::action
    F --> I
    G --> I
    H --> I
    
    I --> J[Putaran Berikutnya:<br/>Tagihan Iuran Berjalan]:::action
    J --> K{Pemenang Bayar<br/>Iuran?}:::decision
    
    K -->|Ya, Tepat Waktu| L{Syarat Putaran<br/>Terpenuhi?}:::decision
    
    L -->|Belum| J
    L -->|Sudah| M[Unlock Dana Tertahan<br/>ke Pemenang]:::success
    M --> N[Skor Reputasi NFT Naik]:::success
    
    K -->|Tidak / Kabur| O[Penalti Otomatis Triggered]:::penalty
    O --> P[Dana Tertahan Hangus]:::penalty
    P --> Q[Distribusi Dana ke<br/>Anggota Aktif Lainnya]:::success
    Q --> R[Reputasi Pemenang Hancur<br/>Blacklist On-Chain]:::penalty

```

### Penjelasan Komponen Kritis:

1. **Switchboard VRF (Verifiable Random Function):** Memastikan undian 100% acak, transparan, dan tidak bisa diakali oleh pembuat program (krusial untuk kepercayaan).
2. **Dynamic Vault:** Porsi dana yang ditransfer dan ditahan dihitung secara dinamis oleh smart contract berdasarkan metadata dari NFT Reputasi pengguna.
3. **Slashing Mechanism (Penalti):** Jika peserta gagal bayar iuran lanjutan, kontrak otomatis mencabut hak mereka atas sisa dana di vault dan mendistribusikannya secara proporsional kepada anggota yang tidak kabur.
4. **Portable Reputation:** Skor loyalitas dicatat secara permanen di blockchain (bisa berbentuk Soulbound Token / Non-Transferable NFT), yang akan menjadi "credit score" terdesentralisasi bagi pengguna di ekosistem web3 Indonesia.
