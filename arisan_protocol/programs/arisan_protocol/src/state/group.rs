use anchor_lang::prelude::*;

/// Maximum number of members per arisan group (for fixed account sizing).
pub const MAX_MEMBERS: usize = 20;

/// Status of each member within a group.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Debug)]
pub struct MemberStatus {
    /// The member's wallet pubkey.
    pub wallet: Pubkey,
    /// Whether this member has paid dues for the current round.
    pub paid_current_round: bool,
    /// Whether this member has already won a payout.
    pub has_won: bool,
}

/// State of the arisan group — stored as a PDA.
#[account]
#[derive(Default)]
pub struct ArisanGroup {
    /// The group admin (creator).
    pub admin: Pubkey,
    /// The USDC mint address.
    pub usdc_mint: Pubkey,
    /// The vault token account (PDA-owned) holding USDC.
    pub vault: Pubkey,
    /// Amount of dues each member must pay per round (in USDC smallest unit).
    pub dues_amount: u64,
    /// Maximum number of members in this group.
    pub max_members: u8,
    /// Current active member count.
    pub member_count: u8,
    /// Current round number (starts at 1).
    pub current_round: u8,
    /// Total number of rounds (= max_members, one winner per round).
    pub total_rounds: u8,
    /// Whether the arisan group is currently active.
    pub is_active: bool,
    /// Whether all members have joined and the group is locked for play.
    pub is_locked: bool,
    /// Bump seed for the group PDA.
    pub bump: u8,
    /// Bump seed for the vault PDA.
    pub vault_bump: u8,
    /// Members list.
    pub members: Vec<MemberStatus>,
}

impl ArisanGroup {
    /// Space calculation for account allocation.
    /// 8 (discriminator) + 32 + 32 + 32 + 8 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1
    /// + 4 (vec prefix) + MAX_MEMBERS * MemberStatus size
    /// MemberStatus = 32 + 1 + 1 = 34
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1
        + 4 + (MAX_MEMBERS * 34);

    /// Check if a wallet is already a member.
    pub fn is_member(&self, wallet: &Pubkey) -> bool {
        self.members.iter().any(|m| m.wallet == *wallet)
    }

    /// Check if all active members have paid for the current round.
    pub fn all_paid(&self) -> bool {
        self.members.iter().all(|m| m.paid_current_round)
    }

    /// Get list of members who haven't won yet (eligible for draw).
    pub fn eligible_for_draw(&self) -> Vec<usize> {
        self.members
            .iter()
            .enumerate()
            .filter(|(_, m)| !m.has_won)
            .map(|(i, _)| i)
            .collect()
    }

    /// Reset paid status for all members (new round).
    pub fn reset_round_payments(&mut self) {
        for member in self.members.iter_mut() {
            member.paid_current_round = false;
        }
    }
}
