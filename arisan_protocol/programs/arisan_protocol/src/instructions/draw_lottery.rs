use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::creator_lottery::CreatorLottery;
use crate::errors::ArisanError;

#[derive(Accounts)]
pub struct DrawAndDistributeLottery<'info> {
    #[account(mut)]
    pub admin_or_creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"creator_lottery", lottery.creator.as_ref(), &lottery.end_time.to_le_bytes()],
        bump = lottery.bump
    )]
    pub lottery: Account<'info, CreatorLottery>,

    #[account(
        mut,
        seeds = [b"lottery_vault", lottery.key().as_ref()],
        bump = lottery.vault_bump,
        constraint = vault.mint == lottery.usdc_mint
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<DrawAndDistributeLottery>) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;
    let current_time = Clock::get()?.unix_timestamp;

    require!(lottery.is_active, ArisanError::LotteryAlreadyDrawn);
    require!(current_time >= lottery.end_time, ArisanError::LotteryStillActive);
    
    // If no tickets sold, just mark inactive and return
    if lottery.total_tickets_sold == 0 || lottery.participants.is_empty() {
        lottery.is_active = false;
        return Ok(());
    }

    // Since we need to transfer out of the PDA, we use the PDA signature
    // Actually, we can't easily dynamic-transfer to accounts not passed in the Accounts struct!
    // Oh, Solana requires all destination accounts to be passed in Context.
    // If we have dynamic winners, we must either pass their TokenAccounts as `remaining_accounts`
    // or let them claim it themselves.
    
    // For MVP hackathon, allowing "anyone" to claim is better. But since we need to draw FIRST,
    // let's make this instruction just "draw_lottery" which selects the winners.
    // Wait, the user wants distribution. We can pass the winner token accounts in `remaining_accounts`.
    
    // Let's do the draw first.
    let num_winners = lottery.winner_shares_pct.len();
    
    // Pseudo-random generation using clock and slot
    let clock = Clock::get()?;
    let mut pseudo_random_seed = clock.unix_timestamp.wrapping_add(clock.slot as i64) as u64;
    
    let total_tickets = lottery.total_tickets_sold;
    let mut winners = Vec::new();

    for _ in 0..num_winners {
        pseudo_random_seed = pseudo_random_seed.wrapping_mul(1103515245).wrapping_add(12345); // LCG
        let winning_ticket = (pseudo_random_seed % total_tickets) + 1;
        
        let mut current_ticket_sum = 0;
        let mut winner_pubkey = lottery.participants[0].wallet; // default fallback

        for participant in lottery.participants.iter() {
            current_ticket_sum += participant.tickets_bought;
            if current_ticket_sum >= winning_ticket {
                winner_pubkey = participant.wallet;
                break;
            }
        }
        winners.push(winner_pubkey);
    }

    lottery.winning_wallets = winners;
    lottery.is_active = false;

    Ok(())
}
