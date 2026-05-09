use anchor_lang::prelude::*;

use crate::state::{ArisanGroup, MemberStatus, UserReputation};
use crate::errors::ArisanError;

/// Joins an existing arisan group. Auto-creates reputation PDA if user is new.
pub fn handler(ctx: Context<JoinGroup>) -> Result<()> {
    let group = &mut ctx.accounts.group;
    let user = ctx.accounts.user.key();

    require!(group.is_active, ArisanError::GroupNotActive);
    require!(!group.is_locked, ArisanError::GroupAlreadyLocked);
    require!(!group.is_member(&user), ArisanError::AlreadyMember);
    require!(
        group.member_count < group.max_members,
        ArisanError::GroupFull
    );

    // Add the member to the group
    group.members.push(MemberStatus {
        wallet: user,
        paid_current_round: false,
        has_won: false,
    });
    group.member_count += 1;

    // Initialize reputation if this is a new PDA (score starts at 0 = "new user")
    let reputation = &mut ctx.accounts.reputation;
    if reputation.user == Pubkey::default() {
        reputation.user = user;
        reputation.score = 0;
        reputation.bump = ctx.bumps.reputation;
    }

    // Auto-lock group when full
    if group.member_count == group.max_members {
        group.is_locked = true;
        group.current_round = 1;
        msg!("Group is full and locked! Round 1 begins.");
    }

    msg!("User {} joined group. Members: {}/{}", user, group.member_count, group.max_members);
    Ok(())
}

#[derive(Accounts)]
pub struct JoinGroup<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = group.is_active @ ArisanError::GroupNotActive,
    )]
    pub group: Account<'info, ArisanGroup>,

    /// User reputation PDA — init_if_needed so new users get one automatically.
    #[account(
        init_if_needed,
        payer = user,
        space = UserReputation::SPACE,
        seeds = [b"reputation", user.key().as_ref()],
        bump,
    )]
    pub reputation: Account<'info, UserReputation>,

    pub system_program: Program<'info, System>,
}
