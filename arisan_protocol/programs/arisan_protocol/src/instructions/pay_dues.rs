use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{ArisanGroup, UserReputation};
use crate::errors::ArisanError;

/// Pays dues for the current round by transferring USDC to the vault.
pub fn handler(ctx: Context<PayDues>) -> Result<()> {
    let group = &mut ctx.accounts.group;
    let user = ctx.accounts.user.key();

    require!(group.is_active, ArisanError::GroupNotActive);
    require!(group.is_locked, ArisanError::GroupNotLocked);
    require!(group.current_round > 0, ArisanError::RoundNotStarted);

    // Find the member in the group
    let member_idx = group
        .members
        .iter()
        .position(|m| m.wallet == user)
        .ok_or(ArisanError::NotAMember)?;

    require!(
        !group.members[member_idx].paid_current_round,
        ArisanError::AlreadyPaidThisRound
    );

    let round = group.current_round;
    let dues = group.dues_amount;

    // Transfer USDC from user's token account to vault
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, dues)?;

    // Mark as paid
    group.members[member_idx].paid_current_round = true;

    // Update reputation: record successful payment
    let reputation = &mut ctx.accounts.reputation;
    reputation.record_success();

    msg!(
        "User {} paid dues {} for round {}. Rep score: {}",
        user,
        dues,
        round,
        reputation.score
    );
    Ok(())
}

#[derive(Accounts)]
pub struct PayDues<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = group.is_locked @ ArisanError::GroupNotLocked,
    )]
    pub group: Account<'info, ArisanGroup>,

    /// User's USDC token account (source of funds).
    #[account(
        mut,
        constraint = user_token_account.owner == user.key() @ ArisanError::InvalidTokenAccount,
        constraint = user_token_account.mint == group.usdc_mint @ ArisanError::InvalidMint,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// The vault token account (destination).
    #[account(
        mut,
        constraint = vault.key() == group.vault @ ArisanError::InvalidVault,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// User's reputation PDA — updated on each successful payment.
    #[account(
        mut,
        seeds = [b"reputation", user.key().as_ref()],
        bump = reputation.bump,
    )]
    pub reputation: Account<'info, UserReputation>,

    pub token_program: Program<'info, Token>,
}
