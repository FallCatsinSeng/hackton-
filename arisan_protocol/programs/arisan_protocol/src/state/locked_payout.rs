use anchor_lang::prelude::*;

/// Tracks the locked portion of a winner's payout.
/// Created when someone wins and partially unlocked as they keep paying dues.
#[account]
#[derive(Default)]
pub struct LockedPayout {
    /// The winner's wallet.
    pub winner: Pubkey,
    /// The arisan group this payout belongs to.
    pub group: Pubkey,
    /// Total locked amount (USDC smallest unit).
    pub total_locked: u64,
    /// Amount already claimed/unlocked.
    pub amount_claimed: u64,
    /// Amount unlocked per qualifying round.
    pub unlock_per_round: u64,
    /// Remaining rounds the winner must pay to fully unlock.
    pub remaining_rounds: u8,
    /// Whether this payout has been fully resolved (claimed or slashed).
    pub is_resolved: bool,
    /// Bump seed for the PDA.
    pub bump: u8,
}

impl LockedPayout {
    /// 8 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 1 = 99
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 1;

    /// How much is still locked and unclaimed.
    pub fn remaining_locked(&self) -> u64 {
        self.total_locked.saturating_sub(self.amount_claimed)
    }
}
