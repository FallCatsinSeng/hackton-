use anchor_lang::prelude::*;

#[error_code]
pub enum ArisanError {
    #[msg("Member count must be between 3 and 20")]
    InvalidMemberCount,
    #[msg("Dues amount must be greater than 0")]
    InvalidDuesAmount,
    #[msg("Group is not active")]
    GroupNotActive,
    #[msg("Group is already locked, no new members")]
    GroupAlreadyLocked,
    #[msg("User is already a member of this group")]
    AlreadyMember,
    #[msg("Group is full")]
    GroupFull,
    #[msg("Group is not locked yet")]
    GroupNotLocked,
    #[msg("Round has not started")]
    RoundNotStarted,
    #[msg("User is not a member of this group")]
    NotAMember,
    #[msg("Already paid dues for this round")]
    AlreadyPaidThisRound,
    #[msg("Not all members have paid dues for this round")]
    NotAllPaid,
    #[msg("All rounds are complete")]
    ArisanComplete,
    #[msg("No eligible members for the draw")]
    NoEligibleMembers,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid vault")]
    InvalidVault,
    #[msg("Invalid group")]
    InvalidGroup,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Payout already resolved")]
    PayoutAlreadyResolved,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Must pay dues first before claiming")]
    MustPayDuesFirst,
    #[msg("Member already paid, cannot slash")]
    MemberDidPay,
    #[msg("Nothing to slash")]
    NothingToSlash,
    #[msg("No active members to distribute to")]
    NoActiveMembers,
    
    // Creator Lottery Errors
    #[msg("Creator share must be between 20% and 70%")]
    InvalidCreatorShare,
    #[msg("Ticket price must be at least 0.1 USDC")]
    TicketPriceTooLow,
    #[msg("Maximum 5 winners allowed")]
    TooManyWinners,
    #[msg("Sum of all percentages must equal 100")]
    InvalidPercentageSum,
    #[msg("End time must be in the future")]
    InvalidEndTime,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Amount sent is not a multiple of ticket price")]
    InvalidTicketAmount,
    #[msg("Lottery has already ended")]
    LotteryEnded,
    #[msg("Lottery is still active, wait until end time")]
    LotteryStillActive,
    #[msg("Lottery already drawn")]
    LotteryAlreadyDrawn,
}
