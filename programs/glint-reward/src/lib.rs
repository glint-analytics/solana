use std::mem::size_of;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, Token, TokenAccount};
use anchor_spl::{
    associated_token::AssociatedToken,
    associated_token::get_associated_token_address };
use glint_vote::{self, WinnersState, VotingState};
use glint_nft::{self, DashboardId, Config};

declare_id!("EyV27BM3gG2a9LozgN2cUL89gZ9SKQvq3PtaKiXQMyRe");

#[program]
pub mod glint_reward {
    use super::*;

    /**
     * Must be called once after the program is deployed.
     * The caller must be the admin.
     */
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Ensure the caller is the current admin
        if ctx.accounts.config.admin != ctx.accounts.signer.key() {
            return Err(ErrorCode::Unauthorized.into());
        }
        Ok(())
    }

    /**
     * Configure the reward amounts for the top three winners.
     * The amounts are stored in the reward_distribution account.
     */
    pub fn configure_rewards(ctx: Context<ConfigureRewards>, reward_amounts: [u64; 3]) -> Result<()> {
        // Ensure the caller is the current admin
        if ctx.accounts.config.admin != ctx.accounts.signer.key() {
            return Err(ErrorCode::Unauthorized.into());
        }
        // Fetch the reward distribution account
        let distribution: &mut Account<'_, RewardDistribution> = &mut ctx.accounts.reward_distribution;
        // Set the reward amounts
        distribution.reward_amounts = reward_amounts;

        // Emit an event to notify the clients
        emit!(NewRewards {
            first_place: reward_amounts[0],
            second_place: reward_amounts[1],
            third_place: reward_amounts[2],
        });

        Ok(())
    }

    /**
     * Claim the reward for the given round and position.
     * The reward is transferred to the claimant's associated token account.
     * Requirements:
     * - The round must be over.
     * - The round must have winners.
     * - The claimant must be the winner. (holds the NFT)
     * - The claimant must not have claimed the reward.
     * - All ctx accounts must be valid.
     * @param _round_id: The round ID.
     * @param position: The position of the claimant.
     */
    pub fn claim_reward(ctx: Context<ClaimReward>, _round_id: u64, bumps: u8, position: i8) -> Result<()> {
        // Bring accounts into scope
        let claimant_key: &Pubkey = &ctx.accounts.signer.key();
        let distribution: & Account<'_, RewardDistribution> = &ctx.accounts.reward_distribution;
        let round_account: & Account<'_, VotingState> = &ctx.accounts.round_account;
        let winners_account: & Account<'_, WinnersState> = &ctx.accounts.winners_account;
        let dashboard_account: &Account<'_, DashboardId> = &ctx.accounts.dashboard_account;
        let associated_token_account: &Account<'_, TokenAccount> = &ctx.accounts.nft_token_account;
        let claim_status: &mut Account<'_, ClaimStatus> = &mut ctx.accounts.claim_status;

        //// Ensure the given `_round_id` has winners
        // Derive the PDA for the `winners_account` in the `vote` program
        let winners_pda: Pubkey = Pubkey::find_program_address(
            &[&_round_id.to_le_bytes()], // Seed for PDA
            &glint_vote::id(), // The program ID of the vote program
        ).0;
        // Ensure the `winners_account` PDA matches the one passed via ctx
        if winners_pda != winners_account.key() {
            return Err(ErrorCode::InvalidWinnersAccount.into());
        }
        // Get the top three winners
        let top_three: [u64; 3] = winners_account.top_three;

        //// Ensure that the round is over
        // Derive the PDA for the `round_account` in the `vote` program   
        let round_pda: Pubkey = Pubkey::find_program_address(
            &[b"voting_state"], // Fixed seed for PDA
            &glint_vote::id(), // The program ID of the vote program
        ).0;
        // Ensure the `round_account` PDA matches the one passed via ctx
        if round_pda != round_account.key() {
            return Err(ErrorCode::InvalidRoundAccount.into());
        }
        // Ensure the round is over
        if round_account.is_active == true && round_account.curr_round <= _round_id {
            return Err(ErrorCode::InvalidRound.into());
        }

        //// Fetches the `dashboard_id` that wins the given position
        // Position must be valid (1st, 2nd, or 3rd)
        if position > 2 {
            return Err(ErrorCode::InvalidPosition.into());
        }
        // Get the `dashboard_id` for the given winner position
        let claimant_dashboard_id: u64 = top_three[position as usize];
        // Ensure there is a winner. The round might not have winners.
        if claimant_dashboard_id == 0 {
            return Err(ErrorCode::InvalidWinner.into());
        }
        // Derive the PDA for the `dashboard_account` in the `glint_nft` program
        let dashboard_account_pda: Pubkey = Pubkey::find_program_address(
            &[&claimant_dashboard_id.to_le_bytes()], // Seed for PDA
            &glint_nft::id(), // The glint_nft program ID
        ).0;
        // Ensure the `dashboard_account PDA` matches the one passed via ctx
        if dashboard_account_pda != dashboard_account.key() {
            return Err(ErrorCode::InvalidDashboardAccount.into());
        }

        //// Ensure the winner is the signer
        // Fetch the `token_id` (mint)
        let token_id: Pubkey = dashboard_account.nft_id.unwrap();
        // Derive the associated token account for the claimant
        let ata: Pubkey = get_associated_token_address(&claimant_key, &associated_token_account.mint);
        // Ensure the `associated_token_account` was created by the claimant 
        if ata != associated_token_account.key() { 
            return Err(ErrorCode::InvalidATA.into());
        }
        // Ensure the `token_id` matches the `associated_token_account` mint
        if token_id != associated_token_account.mint {
            return Err(ErrorCode::InvalidTokenId.into());
        }
        // Ensure that the `claimant` is current the owner of the `associated_token_account`
        if associated_token_account.owner != *claimant_key {
            return Err(ErrorCode::Unauthorized.into());
        }
        // Ensure the `associated_token_account` has the token in it
        if associated_token_account.amount == 0 {
            return Err(ErrorCode::InvalidTokenBalance.into());
        }

        //// Update the `claim_status` account for the claimant
        // Prepare the seeds for the PDA authority
        let claim_seeds: &[&[u8]; 3] = &[
            b"claim",                 // Static string seed
            claimant_key.as_ref(),       // The signer's public key in byte form
            &_round_id.to_le_bytes(),          // The round ID as bytes (little-endian)
        ];
        // Derive the PDA
        let claim_status_pda: Pubkey = Pubkey::find_program_address(
            claim_seeds, // Seeds for PDA
            &glint_reward::id(), // The glint_nft program ID
        ).0;
        // Ensure the `claim_status` PDA matches the one passed via ctx
        if claim_status_pda != claim_status.key() {
            return Err(ErrorCode::InvalidClaimStatusAccount.into());
        }
        // Ensure that reward was not been previously claimed
        if claim_status.claimed {
            return Err(ErrorCode::AlreadyClaimed.into());
        }
        // Update the `claim_status` account
        claim_status.claimant = *claimant_key; // Set the claimant
        claim_status.positions = position as u8; // Set the position
        claim_status.round_id = _round_id as u32; // Set the round ID
        claim_status.claimed = true; // Mark as claimed
        
        //// Transfer the reward tokens to the claimant
        //  Load the cpi accounts
        let cpi_accounts: Transfer<'_> = Transfer {
            from: ctx.accounts.reward_source.to_account_info(),
            to: ctx.accounts.claimant_token_account.to_account_info(),
            authority: distribution.to_account_info(),
        };
        // Prepare the seeds for the PDA authority
        let pda_seeds: &[&[u8]] = &[b"authority_seed", &[bumps]];
        // Binding the seeds to extend its lifetime beyond this scope
        let seeds_binding: [&[&[u8]]; 1] = [pda_seeds];
        // Create the CPI context and pass the seeds directly
        let cpi_ctx: CpiContext<'_, '_, '_, '_, Transfer<'_>> = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(), // Pass the token program
            cpi_accounts, // Pass the cpi accounts
            &seeds_binding // Pass seeds as expected by `new_with_signer`
        );
        // Fetch the reward amount for the given position
        let claim_amount: u64 = distribution.reward_amounts[position as usize];        
        // Call the transfer function from the SPL token program to transfer the tokens
        token::transfer(cpi_ctx, claim_amount)?;

        // Emit an event to notify the clients
        emit!(ClaimEvent {
            claimant: ctx.accounts.signer.key(),
            round_id: _round_id,
            position,
            amount: claim_amount,
        });
        
        Ok(())
    }
}

///////////////////// Account Contexts /////////////////////

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = signer,
        seeds = [b"authority_seed"], // Fixed seed for PDA
        space = size_of::<RewardDistribution>() + 8,
        bump
    )]
    pub reward_distribution: Account<'info, RewardDistribution>,

    #[account(mut, owner = glint_nft::id())]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
#[instruction(_round_id: u64)]
pub struct ClaimReward<'info> {
    #[account(
        init_if_needed, // We can have multiple winners on a lifetime
        payer = signer, // Claimant is the payer
        space = 8 + size_of::<ClaimStatus>(),
        seeds = [b"claim", signer.key().as_ref(), &_round_id.to_le_bytes()],
        bump,
    )]
    pub claim_status: Account<'info, ClaimStatus>,

    #[account(mut)]
    pub reward_distribution: Account<'info, RewardDistribution>, // Authority to distribute rewards

    #[account(mut)]
    pub nft_token_account: Account<'info, TokenAccount>,  // The winner NFT token account

    #[account(mut)]
    pub reward_source: Account<'info, TokenAccount>,  // Source of the reward tokens

    #[account(mut)]
    pub claimant_token_account: Account<'info, TokenAccount>,

    #[account(mut, owner = glint_vote::id())]
    pub winners_account: Account<'info, WinnersState>, // From the `glint_vote` program

    #[account(mut, owner = glint_vote::id())]
    pub round_account: Account<'info, VotingState>, // From the `glint_vote` program

    #[account(mut, owner = glint_nft::id())]
    pub dashboard_account: Account<'info, DashboardId>, // From the `glint_nft` program

    #[account(mut)]
    pub signer: Signer<'info>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>, // SPL Token program
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct ConfigureRewards<'info> {
    #[account(mut)]
    pub reward_distribution: Account<'info, RewardDistribution>,

    #[account(mut, owner = glint_nft::id())]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub signer: Signer<'info>,
}

///////////////////// States /////////////////////

#[account]
pub struct ClaimStatus {
    pub claimant: Pubkey,           // The user claiming the reward
    pub positions: u8,              // The user winner position
    pub round_id: u32,              // The round ID
    pub claimed: bool,              // Whether the user has claimed the reward for this round
}
#[account]
pub struct RewardDistribution {
    pub reward_amounts: [u64; 3],   // Amount for 1st, 2nd, 3rd place
}

///////////////////// Events /////////////////////

#[event]
pub struct ClaimEvent {
    pub claimant: Pubkey,
    pub round_id: u64,
    pub position: i8,
    pub amount: u64,
}
#[event]
pub struct NewRewards {
    pub first_place: u64,
    pub second_place: u64,
    pub third_place: u64,
}

///////////////////// Error Handling /////////////////////

#[error_code]
pub enum ErrorCode {
    #[msg("Reward already claimed for this round.")]
    AlreadyClaimed,
    #[msg("Invalid position.")]
    InvalidPosition,
    #[msg("The claim status account is invalid.")]
    InvalidClaimStatusAccount,
    #[msg("The dashboard account is invalid.")]
    InvalidDashboardAccount,
    #[msg("The winners account is invalid.")]
    InvalidWinnersAccount,
    #[msg("The round account is invalid.")]
    InvalidRoundAccount,
    #[msg("The associated token account is invalid.")]
    InvalidATA,
    #[msg("The ATA is not holding any tokens.")]
    InvalidTokenBalance,
    #[msg("The Token ID does not match the mint key.")]
    InvalidTokenId,
    #[msg("There is no winners for the given round.")]
    InvalidWinner,
    #[msg("The round is invalid or not over yet.")]
    InvalidRound,
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
}
