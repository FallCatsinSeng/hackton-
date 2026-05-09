use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::creator_lottery::CreatorLottery;
use crate::errors::ArisanError;

#[derive(Accounts)]
pub struct ClaimLotteryPrize<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

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

    #[account(
        mut,
        constraint = destination_token_account.owner == claimer.key(),
        constraint = destination_token_account.mint == lottery.usdc_mint
    )]
    pub destination_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimLotteryPrize>) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;
    let claimer_key = ctx.accounts.claimer.key();

    require!(!lottery.is_active, ArisanError::LotteryStillActive);

    let mut payout_pct = 0u8;
    let mut is_valid_claimer = false;

    // Check if claimer is creator
    if claimer_key == lottery.creator {
        payout_pct += lottery.creator_share_pct;
        // prevent double claim by zeroing out the creator share pct
        lottery.creator_share_pct = 0;
        is_valid_claimer = true;
    }

    // Check if claimer is a winner
    for i in 0..lottery.winning_wallets.len() {
        if lottery.winning_wallets[i] == claimer_key {
            payout_pct += lottery.winner_shares_pct[i];
            // prevent double claim
            lottery.winner_shares_pct[i] = 0;
            is_valid_claimer = true;
        }
    }

    require!(is_valid_claimer && payout_pct > 0, ArisanError::NothingToClaim);

    let payout_amount = (lottery.total_pool as u128)
        .checked_mul(payout_pct as u128)
        .ok_or(ArisanError::MathOverflow)?
        .checked_div(100)
        .ok_or(ArisanError::MathOverflow)? as u64;

    // Transfer from vault to claimer
    let lottery_key = lottery.key();
    let seeds = &[
        b"lottery_vault",
        lottery_key.as_ref(),
        &[lottery.vault_bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.destination_token_account.to_account_info(),
        authority: lottery.to_account_info(), 
    };

    let lottery_creator = lottery.creator;
    let end_time = lottery.end_time.to_le_bytes();
    let lottery_bump = lottery.bump;

    let lottery_seeds = &[
        b"creator_lottery",
        lottery_creator.as_ref(),
        end_time.as_ref(),
        &[lottery_bump],
    ];
    let lottery_signer = &[&lottery_seeds[..]];

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, lottery_signer);
    
    token::transfer(cpi_ctx, payout_amount)?;

    Ok(())
}
