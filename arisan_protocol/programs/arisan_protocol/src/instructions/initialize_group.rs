use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::ArisanGroup;
use crate::errors::ArisanError;

/// Creates a new arisan group with a USDC vault.
pub fn handler(ctx: Context<InitializeGroup>, dues_amount: u64, max_members: u8) -> Result<()> {
    require!(max_members >= 3 && max_members <= 20, ArisanError::InvalidMemberCount);
    require!(dues_amount > 0, ArisanError::InvalidDuesAmount);

    let group = &mut ctx.accounts.group;
    group.admin = ctx.accounts.admin.key();
    group.usdc_mint = ctx.accounts.usdc_mint.key();
    group.vault = ctx.accounts.vault.key();
    group.dues_amount = dues_amount;
    group.max_members = max_members;
    group.member_count = 0;
    group.current_round = 0; // Becomes 1 when group is locked and play starts
    group.total_rounds = max_members;
    group.is_active = true;
    group.is_locked = false;
    group.bump = ctx.bumps.group;
    group.vault_bump = ctx.bumps.vault;
    group.members = Vec::new();

    msg!("Arisan group initialized: dues={}, max_members={}", dues_amount, max_members);
    Ok(())
}

#[derive(Accounts)]
#[instruction(dues_amount: u64, max_members: u8)]
pub struct InitializeGroup<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = ArisanGroup::SPACE,
        seeds = [b"arisan_group", admin.key().as_ref(), &[max_members]],
        bump,
    )]
    pub group: Account<'info, ArisanGroup>,

    /// The USDC mint (or any SPL token mint).
    pub usdc_mint: Account<'info, Mint>,

    /// The vault token account (PDA-owned) to hold USDC deposits.
    #[account(
        init,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = group,
        seeds = [b"vault", group.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
