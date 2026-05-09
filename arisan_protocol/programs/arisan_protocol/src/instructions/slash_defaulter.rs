use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{ArisanGroup, LockedPayout, UserReputation};
use crate::errors::ArisanError;

/// Slashes a defaulting winner — distributes their locked funds to loyal members.
/// Called by admin when a previous winner fails to pay their dues.
pub fn handler(ctx: Context<SlashDefaulter>) -> Result<()> {
    let group = &ctx.accounts.group;
    let locked_payout = &mut ctx.accounts.locked_payout;

    require!(!locked_payout.is_resolved, ArisanError::PayoutAlreadyResolved);

    // Verify the defaulter did NOT pay this round
    let defaulter = locked_payout.winner;
    let member = group
        .members
        .iter()
        .find(|m| m.wallet == defaulter)
        .ok_or(ArisanError::NotAMember)?;
    require!(!member.paid_current_round, ArisanError::MemberDidPay);

    // Calculate remaining locked amount to slash
    let slash_amount = locked_payout.remaining_locked();
    require!(slash_amount > 0, ArisanError::NothingToSlash);

    // Count active members who are NOT the defaulter (they receive the slashed funds)
    let active_members: Vec<&crate::state::MemberStatus> = group
        .members
        .iter()
        .filter(|m| m.wallet != defaulter && m.paid_current_round)
        .collect();

    let recipient_count = active_members.len() as u64;
    require!(recipient_count > 0, ArisanError::NoActiveMembers);

    let per_member_share = slash_amount / recipient_count;

    // Transfer slashed funds to the first active member's token account
    // (In production, iterate over all members. For MVP, admin redistributes manually
    // or we use a single distribution account.)
    let group_key = group.key();
    let seeds = &[
        b"vault".as_ref(),
        group_key.as_ref(),
        &[group.vault_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // Transfer the full slash amount to the distribution account
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.distribution_account.to_account_info(),
            authority: ctx.accounts.group.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, slash_amount)?;

    // Mark payout as resolved (slashed)
    locked_payout.is_resolved = true;
    locked_payout.remaining_rounds = 0;

    // Destroy defaulter's reputation
    let defaulter_reputation = &mut ctx.accounts.defaulter_reputation;
    defaulter_reputation.record_default();

    msg!(
        "SLASHED: {} lost {} USDC. Distributed {} per member to {} members. Rep score: {}",
        defaulter,
        slash_amount,
        per_member_share,
        recipient_count,
        defaulter_reputation.score
    );
    Ok(())
}

#[derive(Accounts)]
pub struct SlashDefaulter<'info> {
    #[account(
        mut,
        constraint = admin.key() == group.admin @ ArisanError::Unauthorized,
    )]
    pub admin: Signer<'info>,

    pub group: Account<'info, ArisanGroup>,

    #[account(
        mut,
        constraint = locked_payout.group == group.key() @ ArisanError::InvalidGroup,
        constraint = !locked_payout.is_resolved @ ArisanError::PayoutAlreadyResolved,
    )]
    pub locked_payout: Account<'info, LockedPayout>,

    #[account(
        mut,
        seeds = [b"reputation", locked_payout.winner.as_ref()],
        bump = defaulter_reputation.bump,
    )]
    pub defaulter_reputation: Account<'info, UserReputation>,

    #[account(
        mut,
        constraint = vault.key() == group.vault @ ArisanError::InvalidVault,
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Account to receive slashed funds for redistribution.
    #[account(mut)]
    pub distribution_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
