use anchor_lang::prelude::*;

/// On-chain reputation PDA — unique per user, portable across groups.
/// This is the "credit score" that determines delayed payout percentages.
#[account]
#[derive(Default)]
pub struct UserReputation {
    /// The user's wallet pubkey.
    pub user: Pubkey,
    /// Total arisan groups completed successfully.
    pub completed_groups: u16,
    /// Total rounds where the user paid on time.
    pub successful_rounds: u16,
    /// Total rounds where the user defaulted (missed payment).
    pub defaulted_rounds: u16,
    /// Reputation score (0 - 100). Higher = more trusted.
    pub score: u8,
    /// Bump seed for the PDA.
    pub bump: u8,
}

impl UserReputation {
    /// 8 (discriminator) + 32 + 2 + 2 + 2 + 1 + 1 = 48
    pub const SPACE: usize = 8 + 32 + 2 + 2 + 2 + 1 + 1;

    /// Get the reputation tier and its payout parameters.
    /// Returns (held_percentage, rounds_to_unlock)
    pub fn get_payout_params(&self) -> (u8, u8) {
        match self.score {
            80..=100 => (10, 1), // Veteran — only 10% held, unlock after 1 round
            50..=79  => (20, 2), // Good track record — 20% held, 2 rounds
            25..=49  => (30, 3), // Average — 30% held, 3 rounds
            _        => (45, 4), // New/Bad — 45% held, 4 rounds
        }
    }

    /// Recalculate the reputation score based on history.
    pub fn recalculate_score(&mut self) {
        let total = self.successful_rounds + self.defaulted_rounds;
        if total == 0 {
            self.score = 0;
            return;
        }

        // Base score from payment ratio (0-70 points)
        let payment_ratio = (self.successful_rounds as u32 * 70) / total as u32;

        // Bonus from completed groups (0-30 points, 10 per group, max 3 groups)
        let group_bonus = (self.completed_groups as u32 * 10).min(30);

        // Penalty for any defaults
        let penalty = (self.defaulted_rounds as u32 * 15).min(50);

        let raw_score = payment_ratio + group_bonus;
        let final_score = if raw_score > penalty {
            raw_score - penalty
        } else {
            0
        };

        self.score = final_score.min(100) as u8;
    }

    /// Record a successful on-time payment.
    pub fn record_success(&mut self) {
        self.successful_rounds = self.successful_rounds.saturating_add(1);
        self.recalculate_score();
    }

    /// Record a default (missed payment).
    pub fn record_default(&mut self) {
        self.defaulted_rounds = self.defaulted_rounds.saturating_add(1);
        self.recalculate_score();
    }

    /// Record a completed group.
    pub fn record_group_completion(&mut self) {
        self.completed_groups = self.completed_groups.saturating_add(1);
        self.recalculate_score();
    }
}
