use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{ArisanGroup, LockedPayout, UserReputation};
use crate::errors::ArisanError;

/// Draws a winner (pseudo-random for MVP) and executes delayed payout based on reputation.
pub fn handler(ctx: Context<DrawWinner>) -> Result<()> {
    let group = &mut ctx.accounts.group;

    require!(group.is_active, ArisanError::GroupNotActive);
    require!(group.is_locked, ArisanError::GroupNotLocked);
    require!(group.all_paid(), ArisanError::NotAllPaid);
    require!(
        group.current_round <= group.total_rounds,
        ArisanError::ArisanComplete
    );

    // --- Pseudo-random winner selection (MVP) ---
    // Uses slot hash as randomness source. Replace with Switchboard VRF in production.
    let clock = Clock::get()?;
    let eligible = group.eligible_for_draw();
    require!(!eligible.is_empty(), ArisanError::NoEligibleMembers);

    let random_seed = clock.slot
        .wrapping_add(clock.unix_timestamp as u64)
        .wrapping_mul(31);
    let winner_idx = eligible[random_seed as usize % eligible.len()];

    // Mark the winner
    group.members[winner_idx].has_won = true;
    let winner_wallet = group.members[winner_idx].wallet;

    // --- Calculate payout based on reputation ---
    // Read reputation values before any mutable borrows
    let (held_pct, rounds_to_unlock) = ctx.accounts.winner_reputation.get_payout_params();
    let rep_score = ctx.accounts.winner_reputation.score;

    let total_pool = group.dues_amount * group.member_count as u64;
    let locked_amount = (total_pool * held_pct as u64) / 100;
    let instant_payout = total_pool - locked_amount;

    // --- Capture group values needed for CPI before releasing mutable borrow ---
    let group_key = group.key();
    let group_bump = group.bump;
    let admin_key = group.admin;
    let max_members = group.max_members;

    // The vault's token authority is the GROUP PDA (set via `token::authority = group`
    // in initialize_group). So we must sign CPI with the GROUP PDA seeds.
    let seeds = &[
        b"arisan_group".as_ref(),
        admin_key.as_ref(),
        &[max_members],
        &[group_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // --- Transfer instant payout from vault to winner ---
    if instant_payout > 0 {
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.winner_token_account.to_account_info(),
                authority: ctx.accounts.group.to_account_info(), // Group PDA is vault authority
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, instant_payout)?;
    }

    // --- Create locked payout record ---
    let locked_payout = &mut ctx.accounts.locked_payout;
    locked_payout.winner = winner_wallet;
    locked_payout.group = group_key;
    locked_payout.total_locked = locked_amount;
    locked_payout.amount_claimed = 0;
    locked_payout.unlock_per_round = if rounds_to_unlock > 0 {
        locked_amount / rounds_to_unlock as u64
    } else {
        locked_amount
    };
    locked_payout.remaining_rounds = rounds_to_unlock;
    locked_payout.is_resolved = locked_amount == 0;
    locked_payout.bump = ctx.bumps.locked_payout;

    // --- Update winner's reputation ---
    let reputation = &mut ctx.accounts.winner_reputation;
    reputation.record_success();

    // --- Advance to next round ---
    let group = &mut ctx.accounts.group;
    group.reset_round_payments();
    group.current_round += 1;

    // Check if arisan is complete
    if group.current_round > group.total_rounds {
        group.is_active = false;
        msg!("Arisan complete! All rounds finished.");
    }

    msg!(
        "Winner: {} | Instant: {} | Locked: {} ({} rounds to unlock) | Rep score before: {}",
        winner_wallet,
        instant_payout,
        locked_amount,
        rounds_to_unlock,
        rep_score
    );

    Ok(())
}

#[derive(Accounts)]
pub struct DrawWinner<'info> {
    #[account(
        mut,
        constraint = admin.key() == group.admin @ ArisanError::Unauthorized,
    )]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub group: Account<'info, ArisanGroup>,

    /// CHECK: The winner is determined on-chain. This is their token account for receiving USDC.
    #[account(mut)]
    pub winner_token_account: Account<'info, TokenAccount>,

    /// Winner's reputation PDA — mutable so we can update score after payout.
    #[account(mut)]
    pub winner_reputation: Account<'info, UserReputation>,

    /// Vault holding the USDC pool.
    #[account(
        mut,
        constraint = vault.key() == group.vault @ ArisanError::InvalidVault,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The locked payout PDA for this winner+group combo.
    #[account(
        init,
        payer = admin,
        space = LockedPayout::SPACE,
        seeds = [b"locked_payout", group.key().as_ref(), winner_token_account.owner.as_ref()],
        bump,
    )]
    pub locked_payout: Account<'info, LockedPayout>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
