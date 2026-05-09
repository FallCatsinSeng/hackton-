use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{ArisanGroup, LockedPayout, UserReputation};
use crate::errors::ArisanError;

/// Called by a previous winner to claim the next portion of their locked funds.
/// Requires that they have paid dues for the current round first.
pub fn handler(ctx: Context<ClaimUnlocked>) -> Result<()> {
    let group = &ctx.accounts.group;
    let locked_payout = &mut ctx.accounts.locked_payout;
    let user = ctx.accounts.user.key();

    require!(!locked_payout.is_resolved, ArisanError::PayoutAlreadyResolved);
    require!(locked_payout.remaining_rounds > 0, ArisanError::NothingToClaim);

    // Verify the user has paid their dues for this round
    let member = group
        .members
        .iter()
        .find(|m| m.wallet == user)
        .ok_or(ArisanError::NotAMember)?;
    require!(member.paid_current_round, ArisanError::MustPayDuesFirst);

    // Calculate the unlock amount for this round
    let unlock_amount = locked_payout.unlock_per_round
        .min(locked_payout.remaining_locked());

    // Transfer from vault to winner
    let group_key = group.key();
    let seeds = &[
        b"vault".as_ref(),
        group_key.as_ref(),
        &[group.vault_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.group.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, unlock_amount)?;

    // Update locked payout state
    locked_payout.amount_claimed += unlock_amount;
    locked_payout.remaining_rounds -= 1;

    // Update reputation — record successful payment
    let reputation = &mut ctx.accounts.reputation;
    reputation.record_success();

    if locked_payout.remaining_rounds == 0 {
        locked_payout.is_resolved = true;
        msg!("All locked funds claimed! Payout fully resolved.");
    }

    msg!(
        "Claimed {} USDC. Remaining locked: {}. Rounds left: {}. Rep score: {}",
        unlock_amount,
        locked_payout.remaining_locked(),
        locked_payout.remaining_rounds,
        reputation.score
    );
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimUnlocked<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    pub group: Account<'info, ArisanGroup>,

    #[account(
        mut,
        constraint = locked_payout.winner == user.key() @ ArisanError::Unauthorized,
        constraint = locked_payout.group == group.key() @ ArisanError::InvalidGroup,
    )]
    pub locked_payout: Account<'info, LockedPayout>,

    #[account(
        mut,
        seeds = [b"reputation", user.key().as_ref()],
        bump = reputation.bump,
    )]
    pub reputation: Account<'info, UserReputation>,

    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ArisanError::InvalidTokenAccount,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault.key() == group.vault @ ArisanError::InvalidVault,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
