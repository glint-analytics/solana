use std::mem::size_of;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
        CreateMetadataAccountsV3, Metadata, 
    }, 
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};
use mpl_token_metadata::{
    pda::{find_master_edition_account, find_metadata_account},
    state::DataV2,
};

declare_id!("7TQ26XbDSZMda68uSueTLGQ9zXEN3Tx5bMyoLMSzKSzN");
#[program]
pub mod glint_nft {
    use super::*;

    /**
     * Initialize the config account to set an admin.
     * Must be called once after the program is deployed.
     * The caller is set as the admin.
     */
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Fetch the config account
        let config = &mut ctx.accounts.config;
        // Set the caller as the admin
        config.admin = ctx.accounts.signer.key();
        Ok(())
    }

    /**
     * Transfer the ownership of the config account to a new admin.
     * Only the current admin can call this method.
     * @param new_admin: The new admin address.
     */
    pub fn transfer_ownership(ctx: Context<TransferOwnership>, new_admin: Pubkey) -> Result<()> {
        // Ensure the caller is the current admin
        if ctx.accounts.config.admin != ctx.accounts.signer.key() {
            return Err(ErrorCode::Unauthorized.into());
        }
        // Fetch the config account
        let config = &mut ctx.accounts.config;
        // Assign the new admin
        config.admin = new_admin;

        // Emit an event to notify the clients
        emit!(NewOwner {
            previous_admin: ctx.accounts.signer.key(),
            new_admin,
        });

        Ok(())
    }

    /**
     * NOTE: unsafe method. This is automatically called by `mint_nft`.
     * Sets the NFT that represents the Dashboard ID.
     * Only the admin can call this method.
     * @param _dashboard_id: The Dashboard ID as the seed key
     * @param nft_id: The NFT ID to set for the Dashboard ID
     */
    pub fn set_dashboard_id(ctx: Context<Dashboard>, _dashboard_id: u128, nft_id: Pubkey) -> Result<()> {
        // Ensure the caller is the admin
        if ctx.accounts.config.admin != ctx.accounts.signer.key() {
            return Err(ErrorCode::Unauthorized.into());
        }
        // Set the NFT ID for the Dashboard ID
        ctx.accounts.dashboard_account.nft_id = Some(nft_id);

        // Emit an event to notify the clients
        emit!(ChangedDashboardId {
            dashboard_id: _dashboard_id,
            new_nft_id: nft_id,
        });

        Ok(())
    }

    /**
     * Check the NFT ID associated with the Dashboard ID.
     * @param _dashboard_id: The Dashboard ID
     * @return The NFT ID if set, otherwise None.
     */
    pub fn require_dashboard_id(ctx: Context<Dashboard>) -> Result<()> {
        if ctx.accounts.dashboard_account.nft_id.is_none() {
            return Err(ErrorCode::InvalidDashboardAccount.into());
        }
        // Return the nft_id, which could be Some or None
        Ok(())
    }    

    /**
     * Mint an NFT for the `associated_token_account`.
     * Only the admin can call this method.
     * @param _dashboard_id: The dashboard id
     * @param name: The name of the NFT
     * @param symbol: The symbol of the NFT
     * @param uri: The URI of the NFT
     */
    pub fn mint_nft(
        ctx: Context<InitNFT>,
        _dashboard_id: u128,
        name: String,  
        symbol: String, 
        uri: String,
    ) -> Result<()> {
        // Ensure the caller is the admin
        if ctx.accounts.config.admin != ctx.accounts.signer.key() {
            return Err(ErrorCode::Unauthorized.into());
        }

        // Ensure the dashboard account is not already set
        if ctx.accounts.dashboard_account.nft_id.is_some() {
            return Err(ErrorCode::DashboardAlreadyExists.into());
        }
        // Set the NFT ID for the Dashboard ID
        ctx.accounts.dashboard_account.nft_id = Some(ctx.accounts.mint.key());

        // Create mint account
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(), // Load the token program
            MintTo {
                mint: ctx.accounts.mint.to_account_info(), // This is the NFT ID
                to: ctx.accounts.associated_token_account.to_account_info(), // The account holding the NFT
                authority: ctx.accounts.signer.to_account_info(), // The authority to mint the NFT
            },
        );

        // Mint the NFT
        mint_to(cpi_context, 1)?;

        // Create metadata account using Metaplex
        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.signer.to_account_info(),
                update_authority: ctx.accounts.signer.to_account_info(),
                payer: ctx.accounts.signer.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        // Set the NFT metadata
        let data_v2 = DataV2 {
            name: name,
            symbol: symbol,
            uri: uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        // Create metadata account using Metaplex
        create_metadata_accounts_v3(cpi_context, data_v2, false, true, None)?;

        // Create master edition account using Metaplex
        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                update_authority: ctx.accounts.signer.to_account_info(),
                mint_authority: ctx.accounts.signer.to_account_info(),
                payer: ctx.accounts.signer.to_account_info(),
                metadata: ctx.accounts.metadata_account.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        // Define the master edition using Metaplex
        create_master_edition_v3(cpi_context, None)?;

        emit!(NFTMinted {
            owner: ctx.accounts.associated_token_account.key(),
            dashboard_id: _dashboard_id,
            nft_id: ctx.accounts.mint.key(),
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
        seeds = [b"config"], // Fixed seed for PDA
        space = size_of::<Config>() + 8,
        bump,
    )]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
#[instruction(_dashboard_id: u128)]
pub struct InitNFT<'info> {
    /// CHECK: ok
    #[account(
        init,
        payer = signer,
        mint::decimals = 0,
        mint::authority = signer.key(),
        mint::freeze_authority = signer.key(),
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = signer,
        space = size_of::<DashboardId>() + 8,
        seeds=[&_dashboard_id.to_le_bytes().as_ref()],
        bump)]
    pub dashboard_account: Account<'info, DashboardId>,
    /// CHECK: ok
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = recipient_account
    )]
    pub associated_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub recipient_account: SystemAccount<'info>,
    
    /// CHECK: ok
    #[account(
        mut,
        address=find_metadata_account(&mint.key()).0,
    )]
    pub metadata_account: AccountInfo<'info>, 
    /// CHECK: ok
    #[account(
        mut,
        address=find_master_edition_account(&mint.key()).0,
    )]
    pub master_edition_account: AccountInfo<'info>,
    /// CHECK: ok
    #[account(mut)]
    pub config: Account<'info, Config>,

    /// CHECK: ok
    #[account(mut, signer)]
    pub signer: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
#[derive(Accounts)]
#[instruction(_dashboard_id: u128)]
pub struct Dashboard<'info> {
    #[account(
        init_if_needed,
        payer = signer,
        space = size_of::<DashboardId>() + 8,
        seeds=[&_dashboard_id.to_le_bytes().as_ref()],
        bump)]
    pub dashboard_account: Account<'info, DashboardId>,

    #[account(mut)]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub signer: Signer<'info>,
}

///////////////////// States /////////////////////

#[account]
pub struct DashboardId {
    pub nft_id: Option<Pubkey>,     // Store the NFT ID
}
#[account]
pub struct Config {
    pub admin: Pubkey,               // Store the admin address
}

///////////////////// Events /////////////////////

#[event]
pub struct NFTMinted {
    pub owner: Pubkey,
    pub dashboard_id: u128,
    pub nft_id: Pubkey,
}
#[event]
pub struct ChangedDashboardId {
    pub dashboard_id: u128,
    pub new_nft_id: Pubkey,
}
#[event]
pub struct NewOwner {
    pub previous_admin: Pubkey,
    pub new_admin: Pubkey,
}

///////////////////// Error Handling /////////////////////

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("Dashboard ID already exists.")]
    DashboardAlreadyExists,
    #[msg("The dashboard account is invalid.")]
    InvalidDashboardAccount,
}