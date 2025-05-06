use anchor_lang::prelude::*;
// extern crate glint_nft;
use glint_nft::{self, program::GlintNft, DashboardId, Config};
use std::mem::size_of;

declare_id!("7y85MrK95Z9cPVsdSbLKrsGPHjAxPA8HCpY13WFZs5nE");

#[program]
pub mod glint_vote {
    use super::*;

    /**
     * Initialize the config account to set an admin.
     * Must be called once after the program is deployed.
     */
    pub fn initialize(ctx: Context<Initialize>, _round_id: u64) -> Result<()> {
        // Ensure the caller is the current admin
        if ctx.accounts.config.admin != ctx.accounts.signer.key() {
            return Err(ErrorCode::Unauthorized.into());
        }
        // Fetch the round account
        let round_account: &mut Account<'_, VotingState> = &mut ctx.accounts.round_account;
        // Initialize the counter with a value of 0        
        round_account.curr_round = 0;
        Ok(())
    }

    /**
     * Initialize a new voting period.
     * @param _round_id: The round ID to initialize.
     * @param duration: The duration of the voting period in seconds.
     */
    pub fn init_vote_period(ctx: Context<InitVotePeriod>, duration: u64) -> Result<()> {
        // Ensure the caller is the current admin
        if ctx.accounts.config.admin != ctx.accounts.signer.key() {
            return Err(ErrorCode::Unauthorized.into());
        }

        // Fetch accounts from the ctx
        let round_account: &mut Account<'_, VotingState> = &mut ctx.accounts.round_account;
        
        //// Ensure the `round_account` is a valid ctx
        // Derive the PDA for the `round_account` in the `voting` program
        let round_account_pda: Pubkey = Pubkey::find_program_address(
            &[b"voting_state"], // Fixed seed for PDA
            &glint_vote::id(), // The glint_nft program ID
        ).0;
        if round_account_pda != round_account.key() {
            return Err(ErrorCode::InvalidRoundAccount.into());
        }
        // Ensure no voting is currently going on
        if round_account.voting_end > Clock::get()?.unix_timestamp {
            return Err(ErrorCode::VotingAlreadyActive.into());
        }
        // Increment the round counter
        round_account.curr_round += 1;
        // Initialize the voting round
        round_account.is_active = true;
        // Set the voting period end timestamp
        round_account.voting_end = Clock::get()?.unix_timestamp + duration as i64; // Duration in seconds

        // Emit the event to notify clients
        emit!(NewVoteStarted {
            round: round_account.curr_round,
            round_end: round_account.voting_end
        });

        Ok(())
    }

    /**
     * End the current voting period.
     * The admin can force end the voting period before the duration ends.
     * @param ctx: The context to end the voting period.
     */
    pub fn end_vote_period(ctx: Context<EndVotePeriod>) -> Result<()> {
        // Ensure the caller is the current admin
        if ctx.accounts.config.admin != ctx.accounts.signer.key() {
            return Err(ErrorCode::Unauthorized.into());
        }

        // Fetch the account from the ctx
        let round_account = &mut ctx.accounts.round_account;
        // Ensure voting is active
        if round_account.is_active == false {
            return Err(ErrorCode::NoActiveVoting.into());
        }
        // End the voting round
        round_account.is_active = false;
        round_account.voting_end = 0;

        // Emit the event to notify clients
        emit!(VoteEndByForce {
            round: round_account.curr_round,
            round_ended: Clock::get()?.unix_timestamp
        });

        Ok(())
    }

    /**
     * Set the duration of the voting period.
     * NOTE: unsafe method, admin can change the voting duration.
     * @param ctx: The context to set the voting duration.
     * @param new_duration: The new duration of the voting period in seconds.
     */
    pub fn set_voting_duration(ctx: Context<SetVotingDuration>, new_duration: u64) -> Result<()> {
        // Ensure the caller is the current admin
        if ctx.accounts.config.admin != ctx.accounts.signer.key() {
            return Err(ErrorCode::Unauthorized.into());
        }

        // Fetch the account from the ctx
        let round_account = &mut ctx.accounts.round_account;
        // Ensure voting is active
        if round_account.is_active == false {
            return Err(ErrorCode::NoActiveVoting.into());
        }
        // Set the new voting period duration
        round_account.voting_end = Clock::get()?.unix_timestamp + new_duration as i64;

        emit!(VotingDurationChanged {
            round: round_account.curr_round,
            voting_end: round_account.voting_end
        });
        Ok(())
    }
    
    /**
     * Vote for a dashboard ID.
     * Requirements:
     * - The voting period must have ended.
     * - The voter must not have already voted.
     * - The dashboard account must be exist.
     * - All context accounts must be valid.
     * @param ctx: The context to vote for a dashboard ID.
     * @param _dashboard_id: The dashboard ID to vote for.
     */
    pub fn vote(ctx: Context<Round>, _dashboard_id: u64, _round_id: u64) -> Result<()> {
        // Fetch the accounts from the context
        let voter_key: Pubkey = ctx.accounts.signer.key();
        let round_account: &Account<'_, VotingState> = &ctx.accounts.round_account;
        let winners_account: &mut Account<'_, WinnersState> = &mut ctx.accounts.winners_account;
        let scores_account: &mut Account<'_, Scores> = &mut ctx.accounts.scores_account;
        let voters_account: &mut Account<'_, Voters> = &mut ctx.accounts.voters_account;
        let dashboard_account: &Account<'_, DashboardId> = &ctx.accounts.dashboard_account;

        //// Ensures the `dashboard_account` is a valid ctx
        // Derive the PDA for the dashboard account in the `glint_nft` program
        let dashboard_account_pda: Pubkey = Pubkey::find_program_address(
            &[&_dashboard_id.to_le_bytes()], // Seed for PDA
            &glint_nft::id(), // The glint_nft program ID
        ).0;
        // Ensure the dashboard_account PDA matches the one passed via CPI
        if dashboard_account_pda != dashboard_account.key() {
            return Err(ErrorCode::InvalidDashboardAccount.into());
        }
        // Ensure the `dashboard_account` has an NFT ID associated with it
        if dashboard_account.nft_id.is_none() {
            return Err(ErrorCode::InvalidDashboardAccount.into());
        }


        //// Ensures the `scores_account` is a valid ctx
        // Derive the PDA for the scores_account in this program
        let scores_seed: &[&[u8]; 2] = &[
            b"voting_state_scores".as_ref(),     // Static string seed
            &_dashboard_id.to_le_bytes(),            // Convert _round_id to byte slice
        ];
        // Derive the PDA
        let scores_account_pda: Pubkey = Pubkey::find_program_address(
            scores_seed, // Seeds for PDA
            &glint_vote::id(), // The glint_nft program ID
        ).0;
        // Ensure the `scores_account` is a valid ctx
        if scores_account_pda != scores_account.key() {
            return Err(ErrorCode::InvalidScoresAccount.into());
        }
        
        //// Ensures the `voters_account` is a valid ctx
        // Derive the PDA for the scores_account in this program
        let voters_seed: &[&[u8]; 2] = &[
            b"voting_state_voters", // Static string seed
            &voter_key.as_ref() // Convert _round_id to byte slice
        ];
        // Derive the PDA
        let voters_account_pda: Pubkey = Pubkey::find_program_address(
            voters_seed, // Seeds for PDA
            &glint_vote::id(), // The glint_nft program ID
        ).0;
        // Ensure the `voters_account` is a valid ctx
        if voters_account_pda != voters_account.key() {
            return Err(ErrorCode::InvalidVotersAccount.into());
        }

        //// Ensures the `winners_account` is a valid ctx
        // Derive the PDA for the winners_account in this program
        let winners_seed: &[&[u8]; 1] = &[ // Static string seed
            &_round_id.to_le_bytes(), // Convert _round_id to byte slice
        ];
        // Derive the PDA
        let winners_account_pda: Pubkey = Pubkey::find_program_address(
            winners_seed, // Seeds for PDA
            &glint_vote::id(), // The glint_nft program ID
        ).0;
        // Ensure the `winners_account` is a valid ctx
        if winners_account_pda != winners_account.key() {
            return Err(ErrorCode::InvalidWinnersAccount.into());
        }

        // Validate this round's data
        is_voting_active(round_account)?;
        has_voting_period_ended(round_account)?;
        has_voter_already_voted(voters_account)?;

        // Increment the score for the dashboard ID 
        scores_account.score += 1;
        // Mark the voter as: voted
        voters_account.has_voted = true;

        // Now update the top three after both mutable borrows have been released
        update_top_three(winners_account, _dashboard_id, scores_account.score);

        emit!(VoteCasted {
            round: round_account.curr_round,
            voter: voter_key,
            dashboard: _dashboard_id,
            score: scores_account.score
        });

        Ok(())
    }
}

///////////////////// Internal Functions  /////////////////////

/**
 * Update the top three winners with the new dashboard ID and score.
 * @param winners_account: The winners account to update.
 * @param dashboard_id: The dashboard ID to update.
 * @param score: The score to update.
 */
fn update_top_three(winners_account: &mut Account<WinnersState>, dashboard_id: u64, score: u64) {
    let wa: &mut Account<'_, WinnersState> = winners_account;

    // First check if dashboard_id is already in top three
    for i in 0..3 {
        if wa.top_three[i] == dashboard_id {
            wa.top_three_scores[i] = score;
            
            // Reorder if necessary based on new score
            let mut j = i;
            while j > 0 && wa.top_three_scores[j] > wa.top_three_scores[j-1] {
                // Swap scores
                let temp_score = wa.top_three_scores[j-1];
                wa.top_three_scores[j-1] = wa.top_three_scores[j];
                wa.top_three_scores[j] = temp_score;
                
                // Swap dashboard ids
                let temp_id = wa.top_three[j-1];
                wa.top_three[j-1] = wa.top_three[j];
                wa.top_three[j] = temp_id;
                
                j -= 1;
            }
            return;
        }
    }

     // If dashboard_id is not in top three, proceed with regular insertion
    if score > wa.top_three_scores[0] {
        wa.top_three[2] = wa.top_three[1];
        wa.top_three[1] = wa.top_three[0];
        wa.top_three[0] = dashboard_id;
        wa.top_three_scores[2] = wa.top_three_scores[1];
        wa.top_three_scores[1] = wa.top_three_scores[0];
        wa.top_three_scores[0] = score;
    } else if score > wa.top_three_scores[1] {
        wa.top_three[2] = wa.top_three[1];
        wa.top_three[1] = dashboard_id;
        wa.top_three_scores[2] = wa.top_three_scores[1];
        wa.top_three_scores[1] = score;
    } else if score > wa.top_three_scores[2] {
        wa.top_three[2] = dashboard_id;
        wa.top_three_scores[2] = score;
    }
}

/**
 * Check if a voting period is active.
 * @param round_account: The voting state account.
 */
fn is_voting_active(round_account: &VotingState) -> Result<()> {
    if round_account.is_active == false {
        return Err(ErrorCode::NoActiveVoting.into());
    }
    Ok(())
}

/**
 * Check if the voting period has ended.
 * @param round_account: The voting state account.
 */
fn has_voting_period_ended(round_account: &VotingState) -> Result<()> {
    if Clock::get()?.unix_timestamp > round_account.voting_end {
        return Err(ErrorCode::VotingPeriodEnded.into());
    }
    Ok(())
}

/**
 * Check if a voter has already voted in the current round.
 * @param round_account: The voting state account.
 * @param voter_key: The public key of the voter.
 */
fn has_voter_already_voted(voters: &Voters) -> Result<()> {
    if voters.has_voted == true {
        return Err(ErrorCode::AlreadyVoted.into());
    }
    Ok(())
}

///////////////////// Account Contexts /////////////////////

#[derive(Accounts)]
#[instruction(_round_id: u64)]
pub struct Initialize<'info> {
    #[account(
        init_if_needed,
        payer = signer,
        seeds = [b"voting_state"], // Fixed seed for PDA
        space = size_of::<VotingState>() + 8,
        bump,)]
    pub round_account: Account<'info, VotingState>,

    #[account(mut, owner = glint_nft::id())]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
#[instruction(_dashboard_id: u64, _round_id: u64)]
pub struct Round<'info> {
    #[account(
        init_if_needed,
        payer = signer,
        space = size_of::<Scores>() + 8,
        seeds = [b"voting_state_scores".as_ref(), &_dashboard_id.to_le_bytes()],
        bump)]
    pub scores_account: Account<'info, Scores>,    

    #[account(
        init_if_needed,
        payer = signer,
        space = size_of::<Voters>() + 8,
        seeds = [b"voting_state_voters", signer.key().as_ref()],
        bump)]
    pub voters_account: Account<'info, Voters>,    
        
    #[account(mut)]
    pub round_account: Account<'info, VotingState>,

    #[account(
        init_if_needed,
        payer = signer,
        space = size_of::<WinnersState>() + 8,
        seeds = [&_round_id.to_le_bytes()],
        bump)]
    pub winners_account: Account<'info, WinnersState>,

    #[account(mut, owner = glint_nft::id())]
    pub dashboard_account: Account<'info, DashboardId>,

    #[account(mut, owner = glint_nft::id())]
    pub config: Account<'info, Config>,
    /// CHECK: ok
    #[account(mut)]
    pub signer: Signer<'info>,

    pub glint_nft: Program<'info, GlintNft>,
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct InitVotePeriod<'info> {
    #[account(mut)]
    pub round_account: Account<'info, VotingState>,   

    #[account(mut, owner = glint_nft::id())]
    pub config: Account<'info, Config>,

    /// CHECK: ok
    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct SetVotingDuration<'info> {
    #[account(mut)]
    pub round_account: Account<'info, VotingState>,

    #[account(mut, owner = glint_nft::id())]
    pub config: Account<'info, Config>,
    /// CHECK: ok
    #[account(mut)]
    pub signer: Signer<'info>,
}
#[derive(Accounts)]
pub struct EndVotePeriod<'info> {
    #[account(mut)]
    pub round_account: Account<'info, VotingState>,

    #[account(mut, owner = glint_nft::id())]
    pub config: Account<'info, Config>,
    /// CHECK: ok
    #[account(mut)]
    pub signer: Signer<'info>,
}

///////////////////// States /////////////////////

#[account]
pub struct VotingState {
    pub curr_round: u64,                    // The last round that was active
    pub is_active: bool,                    // Whether a voting period is active
    pub voting_end: i64,                    // Timestamp of when the voting period ends
}
#[account]
pub struct WinnersState {                   // Tracks which addresses have won               
    pub top_three: [u64; 3],                // The top 3 dashboard IDs
    pub top_three_scores: [u64; 3],         // The top 3 scores
}
#[account]
pub struct Scores {
    pub score: u64,                         // Stores the score for a dashboard ID
}
#[account]
pub struct Voters {
    pub has_voted: bool,                    // Stores if the voter already voted
}


///////////////////// Events /////////////////////

#[event]
pub struct NewVoteStarted {
    pub round: u64,                             // The round that was started
    pub round_end: i64,                         // The timestamp when the round ends
}
#[event]
pub struct VoteEndByForce {
    pub round: u64,                             // The round that was ended
    pub round_ended: i64,                       // The timestamp when the round ended
}
#[event]
pub struct VotingDurationChanged {
    pub round: u64,                             // The round that was changed
    pub voting_end: i64,                        // The new timestamp when the round ends
}
#[event]
pub struct VoteCasted {
    pub round: u64,                             // The round that was voted in
    pub voter: Pubkey,                          // The voter's public key
    pub dashboard: u64,                         // The dashboard ID that was voted for
    pub score: u64,                             // The new score for the dashboard ID
}

///////////////////// Error Handling /////////////////////

#[error_code]
pub enum ErrorCode {
    #[msg("There is an active voting period.")]
    VotingAlreadyActive,
    #[msg("There is no active voting period.")]
    NoActiveVoting,
    #[msg("Voting period has ended.")]
    VotingPeriodEnded,
    #[msg("This address has already voted in the current voting period.")]
    AlreadyVoted,
    #[msg("The dashboard account is invalid.")]
    InvalidDashboardAccount,
    #[msg("The round account is invalid.")]
    InvalidRoundAccount,
    #[msg("The winners account is invalid.")]
    InvalidWinnersAccount,
    #[msg("The scores account is invalid.")]
    InvalidScoresAccount,
    #[msg("The voters account is invalid.")]
    InvalidVotersAccount,
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}
