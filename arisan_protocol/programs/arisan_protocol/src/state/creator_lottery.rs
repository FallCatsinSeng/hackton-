use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub struct LotteryParticipant {
    pub wallet: Pubkey,
    pub tickets_bought: u64,
}

#[account]
pub struct CreatorLottery {
    pub creator: Pubkey,
    pub usdc_mint: Pubkey,
    pub vault: Pubkey,
    pub ticket_price: u64,
    pub creator_share_pct: u8,
    pub winner_shares_pct: Vec<u8>,
    pub end_time: i64,
    pub total_tickets_sold: u64,
    pub total_pool: u64,
    pub participants: Vec<LotteryParticipant>,
    pub is_active: bool,
    pub winning_wallets: Vec<Pubkey>,
    pub bump: u8,
    pub vault_bump: u8,
}

impl CreatorLottery {
    // 8 (discriminator) + 32 (creator) + 32 (mint) + 32 (vault) + 8 (price) + 1 (pct) + 
    // 4 + 5 (winner_shares max 5) + 8 (time) + 8 (total tickets) + 8 (total pool) + 
    // 4 + (250 * 40) (participants max 250) + 1 (active) + 4 + (5 * 32) (winners max 5) + 1 + 1
    // Total approx: ~10,350 bytes. We will allocate 10240 (10KB limit roughly)
    pub const MAX_SIZE: usize = 10000; 
}
