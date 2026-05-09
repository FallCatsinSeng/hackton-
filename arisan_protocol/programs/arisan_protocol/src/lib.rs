use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("81ASx7dk4ijHXKJjkgj2f5K4u8Z2p1kzKtUbUiXZgzex");

#[program]
pub mod arisan_protocol {
    use super::*;

    /// Create a new arisan group with a USDC vault.
    pub fn initialize_group(
        ctx: Context<InitializeGroup>,
        dues_amount: u64,
        max_members: u8,
    ) -> Result<()> {
        instructions::initialize_group::handler(ctx, dues_amount, max_members)
    }

    /// Join an existing arisan group. Creates a reputation PDA if new user.
    pub fn join_group(ctx: Context<JoinGroup>) -> Result<()> {
        instructions::join_group::handler(ctx)
    }

    /// Pay dues for the current round (USDC transfer to vault).
    pub fn pay_dues(ctx: Context<PayDues>) -> Result<()> {
        instructions::pay_dues::handler(ctx)
    }

    /// Draw a winner and execute delayed payout based on reputation score.
    pub fn draw_winner(ctx: Context<DrawWinner>) -> Result<()> {
        instructions::draw_winner::handler(ctx)
    }

    /// Claim the next unlocked portion of locked funds (requires paid dues).
    pub fn claim_unlocked(ctx: Context<ClaimUnlocked>) -> Result<()> {
        instructions::claim_unlocked::handler(ctx)
    }

    /// Slash a defaulting winner and redistribute their locked funds.
    pub fn slash_defaulter(ctx: Context<SlashDefaulter>) -> Result<()> {
        instructions::slash_defaulter::handler(ctx)
    }

    // --- CREATOR LOTTERY INSTRUCTIONS ---

    pub fn initialize_creator_lottery(
        ctx: Context<InitCreatorLottery>,
        ticket_price: u64,
        creator_share_pct: u8,
        winner_shares_pct: Vec<u8>,
        end_time: i64,
    ) -> Result<()> {
        instructions::init_creator_lottery::handler(
            ctx,
            ticket_price,
            creator_share_pct,
            winner_shares_pct,
            end_time,
        )
    }

    pub fn buy_lottery_ticket(ctx: Context<BuyLotteryTicket>, amount_usdc: u64) -> Result<()> {
        instructions::buy_lottery_ticket::handler(ctx, amount_usdc)
    }

    pub fn draw_lottery(ctx: Context<DrawAndDistributeLottery>) -> Result<()> {
        instructions::draw_lottery::handler(ctx)
    }

    pub fn claim_lottery_prize(ctx: Context<ClaimLotteryPrize>) -> Result<()> {
        instructions::claim_lottery_prize::handler(ctx)
    }
}
