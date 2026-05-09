use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::creator_lottery::CreatorLottery;

#[derive(Accounts)]
#[instruction(ticket_price: u64, creator_share_pct: u8, winner_shares_pct: Vec<u8>, end_time: i64)]
pub struct InitCreatorLottery<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + CreatorLottery::MAX_SIZE,
        seeds = [b"creator_lottery", creator.key().as_ref(), &end_time.to_le_bytes()],
        bump
    )]
    pub lottery: Account<'info, CreatorLottery>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        seeds = [b"lottery_vault", lottery.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = lottery
    )]
    pub vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitCreatorLottery>,
    ticket_price: u64,
    creator_share_pct: u8,
    winner_shares_pct: Vec<u8>,
    end_time: i64,
) -> Result<()> {
    require!(creator_share_pct >= 20 && creator_share_pct <= 70, crate::errors::ArisanError::InvalidCreatorShare);
    require!(ticket_price >= 100_000, crate::errors::ArisanError::TicketPriceTooLow); // min 0.1 USDC
    require!(winner_shares_pct.len() <= 5, crate::errors::ArisanError::TooManyWinners);
    
    let mut total_pct: u8 = creator_share_pct;
    for share in winner_shares_pct.iter() {
        total_pct = total_pct.checked_add(*share).ok_or(crate::errors::ArisanError::MathOverflow)?;
    }
    require!(total_pct == 100, crate::errors::ArisanError::InvalidPercentageSum);

    let current_time = Clock::get()?.unix_timestamp;
    require!(end_time > current_time, crate::errors::ArisanError::InvalidEndTime);

    let lottery = &mut ctx.accounts.lottery;
    lottery.creator = ctx.accounts.creator.key();
    lottery.usdc_mint = ctx.accounts.usdc_mint.key();
    lottery.vault = ctx.accounts.vault.key();
    lottery.ticket_price = ticket_price;
    lottery.creator_share_pct = creator_share_pct;
    lottery.winner_shares_pct = winner_shares_pct;
    lottery.end_time = end_time;
    lottery.total_tickets_sold = 0;
    lottery.total_pool = 0;
    lottery.participants = Vec::new();
    lottery.is_active = true;
    lottery.winning_wallets = Vec::new();
    lottery.bump = ctx.bumps.lottery;
    lottery.vault_bump = ctx.bumps.vault;

    Ok(())
}

