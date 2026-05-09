use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::creator_lottery::{CreatorLottery, LotteryParticipant};
use crate::errors::ArisanError;

#[derive(Accounts)]
pub struct BuyLotteryTicket<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"creator_lottery", lottery.creator.as_ref(), &lottery.end_time.to_le_bytes()],
        bump = lottery.bump
    )]
    pub lottery: Account<'info, CreatorLottery>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == lottery.usdc_mint
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"lottery_vault", lottery.key().as_ref()],
        bump = lottery.vault_bump,
        constraint = vault.mint == lottery.usdc_mint
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<BuyLotteryTicket>, amount_usdc: u64) -> Result<()> {
    let lottery = &mut ctx.accounts.lottery;
    let current_time = Clock::get()?.unix_timestamp;

    require!(lottery.is_active, ArisanError::LotteryEnded);
    require!(current_time < lottery.end_time, ArisanError::LotteryEnded);
    
    // Validate amount is a multiple of ticket price
    require!(amount_usdc % lottery.ticket_price == 0, ArisanError::InvalidTicketAmount);
    let tickets_to_buy = amount_usdc / lottery.ticket_price;
    require!(tickets_to_buy > 0, ArisanError::InvalidTicketAmount);

    // Transfer USDC to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.buyer_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.buyer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount_usdc)?;

    // Update state
    lottery.total_pool = lottery.total_pool.checked_add(amount_usdc).ok_or(ArisanError::MathOverflow)?;
    lottery.total_tickets_sold = lottery.total_tickets_sold.checked_add(tickets_to_buy).ok_or(ArisanError::MathOverflow)?;

    // Update or add participant
    let buyer_key = ctx.accounts.buyer.key();
    if let Some(participant) = lottery.participants.iter_mut().find(|p| p.wallet == buyer_key) {
        participant.tickets_bought = participant.tickets_bought.checked_add(tickets_to_buy).ok_or(ArisanError::MathOverflow)?;
    } else {
        lottery.participants.push(LotteryParticipant {
            wallet: buyer_key,
            tickets_bought: tickets_to_buy,
        });
    }

    Ok(())
}
