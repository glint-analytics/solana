import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintNft } from "../target/types/glint_nft";
import { GlintVote } from "../target/types/glint_vote";
import { GlintReward } from "../target/types/glint_reward";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  findMasterEditionPda,
  findMetadataPda,
  mplTokenMetadata,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
  createAccount,
  createAssociatedTokenAccountInstruction,
  createInitializeAccountInstruction,
  createInitializeMintInstruction,
  createMint,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAccountLenForMint,
  getAssociatedTokenAddress,
  getMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  
} from "@solana/spl-token";
import { expect } from "chai";
import {
  Keypair,
  PublicKey,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { publicKey } from "@metaplex-foundation/umi";
import { min } from "bn.js";

// We named the file vrewards so that the vote tests would happend prior to rewards
// since tests have the same environment and share the same blockchain states
// we dont have to initialize once again
describe("rewards", async () => {
  // Configured the client to use the devnet cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  // Get the signer wallet from the provider
  const signer = provider.wallet;
  // Create a UMI client
  const umi = createUmi("http://127.0.0.1:8899")
    .use(walletAdapterIdentity(signer))
    .use(mplTokenMetadata());
  // Load the program from the IDL.
  const NFTProgram = anchor.workspace.GlintNft as Program<GlintNft>;
  const VoteProgram = anchor.workspace.GlintVote as Program<GlintVote>;
  const RewardProgram = anchor.workspace.GlintReward as Program<GlintReward>;

  // Will change during the tests for different scenarios
  let roundId = new anchor.BN(0);
  let duration = new anchor.BN(120);
  // PDA Account for dynamic cases
  let winnersAccount: PublicKey;
  let dashboardAccount: PublicKey;
  let scoresAccount: PublicKey;
  let votersAccount: PublicKey;
  let rewardDistribution: PublicKey;
  let bumps: number;
  // NFT Minting related variables
  let mint: Keypair;
  let metadataAccount: any;
  let masterEditionAccount: any;
  let associatedTokenAccount: PublicKey;
  // ERC20 token related variables
  let mintERC20: Keypair;
  let adminERC20: any;
  let splTokenAccount: Keypair;
  let splTokenATA: PublicKey;
  let lamports: number;

  // Config is a fixed PDA for a global state
  let config: PublicKey = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    NFTProgram.programId // TODO verificar programId
  )[0];

  // Round Account is a fixed PDA for a global state
  let roundAccount: PublicKey = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("voting_state")],
    VoteProgram.programId
  )[0];

  async function mintNFT(dashboardId: anchor.BN, recipient: PublicKey) {
    dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [dashboardId.toArrayLike(Buffer, "le", 8)],
      NFTProgram.programId
    )[0];
    associatedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      recipient
    );
    const tx = await NFTProgram.methods
      .mintNft(dashboardId, "Glint", "GLINT", "url")
      .accounts({
        signer: provider.publicKey,
        mint: mint.publicKey,
        config: config,
        dashboardAccount: dashboardAccount,
        recipientAccount: recipient,
        associatedTokenAccount,
        metadataAccount,
        masterEditionAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mint])
      .rpc();
    console.log("NFT Minted for %s Tx", recipient, tx);
  }

  before(async () => {
    //// Increase the duration of the voting period otherwise initialize
    try {
      console.log("Increasing the voting duration...");
      await VoteProgram.methods
      .setVotingDuration(new anchor.BN(500))
      .accounts({
        roundAccount: roundAccount,
        config: config,
        signer: provider.publicKey,
      })
      .rpc();
    } catch (error) {
      console.log("Initializing the voting period...");
      await VoteProgram.methods
      .initVotePeriod(duration)
      .accounts({
        config: config,
        roundAccount: roundAccount,
        signer: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    }

    //// Handle the ERC20 Reward token
    console.log("Creating ERC20 tokens for the rewards");
    mintERC20 = Keypair.generate();
    console.log("mintERC20 account", mintERC20.publicKey.toBase58());
    adminERC20 = provider.wallet;
    console.log("adminERC20 account", adminERC20.publicKey.toBase58());

    lamports = await provider.connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const createMintAccount = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: adminERC20.publicKey,
        newAccountPubkey: mintERC20.publicKey,
        space: MINT_SIZE,
        lamports: lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintERC20.publicKey,
        9,
        adminERC20.publicKey,
        adminERC20.publicKey,
        TOKEN_PROGRAM_ID,
      ),
    );
    const tx0 = await provider.sendAll([{ tx: createMintAccount, signers: [mintERC20] }]);
    console.log("Created Mint Account Tx", tx0);
    splTokenAccount = Keypair.generate();
    console.log("SPL Token Account", splTokenAccount.publicKey.toBase58());
    const mintState = await getMint(provider.connection, mintERC20.publicKey);
    const space = await getAccountLenForMint(mintState);
    lamports = await provider.connection.getMinimumBalanceForRentExemption(space);
    const createSPLAccount = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: adminERC20.publicKey,
        newAccountPubkey: splTokenAccount.publicKey,
        space: space,
        lamports: lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeAccountInstruction(
        splTokenAccount.publicKey,
        mintERC20.publicKey,
        adminERC20.publicKey,
        TOKEN_PROGRAM_ID,
      ),
    );
    const tx1 = await provider.sendAll([{ tx: createSPLAccount, signers: [splTokenAccount] }]);
    console.log("Created SPL Token Account Tx", tx1);
    splTokenATA = await getAssociatedTokenAddress(
      mintERC20.publicKey,
      splTokenAccount.publicKey,
      true,
    );
    console.log("SPL Token Associated Token Address (ATA) Tx", splTokenATA.toBase58());
    const createSPLATA = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        adminERC20.publicKey,
        splTokenATA,
        splTokenAccount.publicKey,
        mintERC20.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
    );
    const tx2 = await provider.sendAll([{ tx: createSPLATA }]);
    console.log("Created SPL Token ATA Tx", tx2);
    const mintTokensToATA: Transaction = new Transaction().add(
      createMintToInstruction(
        mintERC20.publicKey, 
        splTokenATA, 
        adminERC20.publicKey, 
        100000000000,
      ),
    );
    const tx3 = await provider.sendAll([{ tx: mintTokensToATA }]);
    console.log('Minted 100.00000000 Tokens to ATA Tx', tx3);

    const tokenERC20 = await getMint(provider.connection, mintERC20.publicKey);
    console.log('ERC20 Mint Address:', tokenERC20.address.toBase58());
    console.log('ERC20 Total Supply:', tokenERC20.supply.toString());
    console.log('ERC20 Decimals:', tokenERC20.decimals);
    let splATAInfo = await provider.connection.getTokenAccountBalance(splTokenATA);
    console.log('SPL ATA Address:', splTokenATA.toBase58());
    console.log('SPL ATA Balance:', splATAInfo.value.amount);

    //// Transfer the authority of the ATA to the Reward Contract
    console.log("Transferring ATA authority to Reward Program...");
    [rewardDistribution, bumps] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("authority_seed")],
      RewardProgram.programId
    );
    const transferAuth = new Transaction().add(
      createSetAuthorityInstruction(
        splTokenATA,
        splTokenAccount.publicKey,
        AuthorityType.AccountOwner,
        rewardDistribution,
      )
    );
    const tx5 = await provider.sendAll([{ tx: transferAuth, signers: [splTokenAccount] }]);
    console.log("Transferred authority to Reward Program", tx5);
  });

  beforeEach(async () => {
    //// Handle NFT Mint related data
    // Generate a new mint keypair for every test
    mint = anchor.web3.Keypair.generate();
    // derive the metadata account
    metadataAccount = findMetadataPda(umi, {
      mint: publicKey(mint.publicKey),
    })[0];
    //derive the master edition PDA
    masterEditionAccount = findMasterEditionPda(umi, {
      mint: publicKey(mint.publicKey),
    })[0];
    // Derive the associated token address account for the mint and signer
    associatedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      signer.publicKey
    );
  });

  it("Should initialize the program", async () => {
    let reward_dist_pda: PublicKey =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("authority_seed")],
        RewardProgram.programId
      )[0];
    const tx = await RewardProgram.methods
      .initialize()
      .accounts({
        rewardDistribution: reward_dist_pda,
        signer: provider.publicKey,
        config: config,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Program Initialized Tx", tx);
  });

  it("Should configure the rewards", async () => {
    let reward_dist_pda: PublicKey =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("authority_seed")],
        RewardProgram.programId
      )[0];

    const reward_1 = new anchor.BN(1);
    const reward_2 = new anchor.BN(2);
    const reward_3 = new anchor.BN(3);

    const tx = await RewardProgram.methods
      .configureRewards([reward_1, reward_2, reward_3])
      .accounts({
        rewardDistribution: reward_dist_pda,
        signer: provider.publicKey,
        config: config,
      })
      .rpc();
    console.log("Rewards Configured Tx", tx);
  });

  it("Should claim the rewards", async () => {
    //// Handle the voting period
    let voting_state = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    const isActive = voting_state.votingEnd.toNumber() > Date.now() / 1000;
    console.log("Vote period is active?", isActive);
    if(!isActive){
      console.log("Initializing the vote period...");
      await VoteProgram.methods
      .initVotePeriod(duration)
      .accounts({
        config: config,
        roundAccount: roundAccount,
        signer: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      voting_state = await VoteProgram.account.votingState.fetch(
        roundAccount
      );
      console.log("Round ID", roundId.toNumber());
    } else {
      console.log("Vote period already initialized...");
    }
    roundId = voting_state.currRound;
    console.log("Round ID", roundId.toNumber());

    //// Create an Account for Alice
    const alice = Keypair.generate();
    console.log("Alice Account Address", alice.publicKey.toBase58());
    const createAliceAccount = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: adminERC20.publicKey,
        newAccountPubkey: alice.publicKey,
        space: 0,
        lamports: lamports,
        programId: SystemProgram.programId,
      }),
    );
    const tx4 = await provider.sendAll([{ tx: createAliceAccount, signers: [alice] }]);
    console.log("Created Account for Alice Tx", tx4);
    const aliceATA = await getAssociatedTokenAddress(
      mintERC20.publicKey,
      alice.publicKey,
      false,
    );
    console.log("Alice ATA Address", aliceATA.toBase58());
    const createAliceATA = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        adminERC20.publicKey,
        aliceATA,
        alice.publicKey,
        mintERC20.publicKey,
      ),
    );
    const tx6 = await provider.sendAll([{ tx: createAliceATA }]);
    console.log("Created ATA for Alice Tx", tx6);
    const sendFunds = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: alice.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL,
      })
    );
    const tx7 = await provider.sendAndConfirm(sendFunds);
    console.log("Funded Alice with 1 SOL Tx", tx7);

    //// Handle the NFT Minting
    const dashboard_id = new anchor.BN(200);
    console.log("Minting NFT with dashboard ID", dashboard_id.toNumber());
    await mintNFT(dashboard_id, alice.publicKey);

    /// Handle the Voting
    scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboard_id.toArrayLike(Buffer, "le", 8),
      ],
      VoteProgram.programId
    )[0];
    votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), alice.publicKey.toBuffer()],
      VoteProgram.programId
    )[0];
    winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];
    const tx8 = await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: alice.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([alice])
      .rpc();
    console.log("Voted for dashboard ID Tx", dashboard_id.toNumber(), tx8);
    const tx = await VoteProgram.methods
      .endVotePeriod()
      .accounts({
        roundAccount: roundAccount,
        config: config,
        signer: provider.publicKey,
      })
      .rpc();
    console.log("Finalized the voting period Tx", tx);
    
    //// Handling the Winners
    const winners_account = await VoteProgram.account.winnersState.fetch(winnersAccount);
    console.log("Dashboard ID of the Winner", winners_account.topThree[0].toNumber());
    expect(winners_account.topThree[0].toNumber()).to.be.equal(dashboard_id.toNumber());
    const dashboard_account = await NFTProgram.account.dashboardId.fetch(dashboardAccount);
    console.log("Token ID of the Winner", dashboard_account.nftId.toBase58());
    expect(dashboard_account.nftId.toBase58()).to.be.equal(mint.publicKey.toString());

    //// Claiming the Rewards
    const claimStatus = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("claim"),
        alice.publicKey.toBuffer(),
        roundId.toArrayLike(Buffer, "le", 8),
      ],
      RewardProgram.programId
    )[0];
    const tx9 = await RewardProgram.methods
      .claimReward(roundId, bumps, 0) // 0 for first place
      .accounts({
        claimStatus,
        rewardDistribution,
        rewardSource: splTokenATA,
        claimantTokenAccount: aliceATA,
        nftTokenAccount: associatedTokenAccount,
        winnersAccount,
        roundAccount,
        dashboardAccount,
        signer: alice.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([alice])
      .rpc();
    console.log("Claimed the Rewards Tx", tx9);

    let tokenAccountInfo = await provider.connection.getTokenAccountBalance(splTokenATA);
    console.log('SPL ATA Address:', splTokenATA.toBase58());
    console.log('SPL ATA Balance:', tokenAccountInfo.value.amount);
    expect(Number(tokenAccountInfo.value.amount)).to.be.equal(100000000000 - 1);
    tokenAccountInfo = await provider.connection.getTokenAccountBalance(aliceATA);
    console.log('Alice ATA Address:', aliceATA.toBase58());
    console.log('Alice ATA Balance:', tokenAccountInfo.value.amount);
    expect(Number(tokenAccountInfo.value.amount)).to.be.equal(1);
  });

  it("Should not claim the rewards a second time", async () => {
    //// Handle the voting period
    let voting_state = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    const isActive = voting_state.votingEnd.toNumber() > Date.now() / 1000;
    console.log("Vote period is active?", isActive);
    if(!isActive){
      console.log("Initializing the vote period...");
      await VoteProgram.methods
      .initVotePeriod(duration)
      .accounts({
        config: config,
        roundAccount: roundAccount,
        signer: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      voting_state = await VoteProgram.account.votingState.fetch(
        roundAccount
      );
      console.log("Round ID", roundId.toNumber());
    } else {
      console.log("Vote period already initialized...");
    }
    roundId = voting_state.currRound;
    console.log("Round ID", roundId.toNumber());

    //// Create an Account for Alice
    const alice = Keypair.generate();
    console.log("Alice Account Address", alice.publicKey.toBase58());
    const createAliceAccount = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: adminERC20.publicKey,
        newAccountPubkey: alice.publicKey,
        space: 0,
        lamports: lamports,
        programId: SystemProgram.programId,
      }),
    );
    const tx4 = await provider.sendAll([{ tx: createAliceAccount, signers: [alice] }]);
    console.log("Created Account for Alice Tx", tx4);
    const aliceATA = await getAssociatedTokenAddress(
      mintERC20.publicKey,
      alice.publicKey,
      false,
    );
    console.log("Alice ATA Address", aliceATA.toBase58());
    const createAliceATA = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        adminERC20.publicKey,
        aliceATA,
        alice.publicKey,
        mintERC20.publicKey,
      ),
    );
    const tx6 = await provider.sendAll([{ tx: createAliceATA }]);
    console.log("Created ATA for Alice Tx", tx6);
    const sendFunds = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: alice.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL,
      })
    );
    const tx7 = await provider.sendAndConfirm(sendFunds);
    console.log("Funded Alice with 1 SOL Tx", tx7);

    //// Handle the NFT Minting
    const dashboard_id = new anchor.BN(201);
    console.log("Minting NFT with dashboard ID", dashboard_id.toNumber());
    await mintNFT(dashboard_id, alice.publicKey);

    /// Handle the Voting
    scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboard_id.toArrayLike(Buffer, "le", 8),
      ],
      VoteProgram.programId
    )[0];
    votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), alice.publicKey.toBuffer()],
      VoteProgram.programId
    )[0];
    winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];
    const tx8 = await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: alice.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([alice])
      .rpc();
    console.log("Voted for dashboard ID Tx", dashboard_id.toNumber(), tx8);
    const tx = await VoteProgram.methods
      .endVotePeriod()
      .accounts({
        roundAccount: roundAccount,
        config: config,
        signer: provider.publicKey,
      })
      .rpc();
    console.log("Finalized the voting period Tx", tx);
    
    //// Handling the Winners
    const winners_account = await VoteProgram.account.winnersState.fetch(winnersAccount);
    console.log("Dashboard ID of the Winner", winners_account.topThree[0].toNumber());
    expect(winners_account.topThree[0].toNumber()).to.be.equal(dashboard_id.toNumber());
    const dashboard_account = await NFTProgram.account.dashboardId.fetch(dashboardAccount);
    console.log("Token ID of the Winner", dashboard_account.nftId.toBase58());
    expect(dashboard_account.nftId.toBase58()).to.be.equal(mint.publicKey.toString());

    //// Claiming the Rewards
    const claimStatus = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("claim"),
        alice.publicKey.toBuffer(),
        roundId.toArrayLike(Buffer, "le", 8),
      ],
      RewardProgram.programId
    )[0];
    const tx9 = await RewardProgram.methods
      .claimReward(roundId, bumps, 0) // 0 for first place
      .accounts({
        claimStatus,
        rewardDistribution,
        rewardSource: splTokenATA,
        claimantTokenAccount: aliceATA,
        nftTokenAccount: associatedTokenAccount,
        winnersAccount,
        roundAccount,
        dashboardAccount,
        signer: alice.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([alice])
      .rpc();
    console.log("Claimed the Rewards Tx", tx9);

    try{
      await RewardProgram.methods
      .claimReward(roundId, bumps, 0) // 0 for first place
      .accounts({
        claimStatus,
        rewardDistribution,
        rewardSource: splTokenATA,
        claimantTokenAccount: aliceATA,
        nftTokenAccount: associatedTokenAccount,
        winnersAccount,
        roundAccount,
        dashboardAccount,
        signer: alice.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([alice])
      .rpc();
    console.log("Claimed the Rewards Tx", tx9);
    } catch (error) {
      expect(error.message).to.contain("Reward already claimed for this round");
    }
  });

  it("Should not claim if the round is not over", async () => {
    //// Handle the voting period
    let voting_state = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    const isActive = voting_state.votingEnd.toNumber() > Date.now() / 1000;
    console.log("Vote period is active?", isActive);
    if(!isActive){
      console.log("Initializing the vote period...");
      await VoteProgram.methods
      .initVotePeriod(duration)
      .accounts({
        config: config,
        roundAccount: roundAccount,
        signer: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      voting_state = await VoteProgram.account.votingState.fetch(
        roundAccount
      );
      console.log("Round ID", roundId.toNumber());
    } else {
      console.log("Vote period already initialized...");
    }
    roundId = voting_state.currRound;
    console.log("Round ID", roundId.toNumber());

    //// Create an Account for Alice
    const alice = Keypair.generate();
    console.log("Alice Account Address", alice.publicKey.toBase58());
    const createAliceAccount = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: adminERC20.publicKey,
        newAccountPubkey: alice.publicKey,
        space: 0,
        lamports: lamports,
        programId: SystemProgram.programId,
      }),
    );
    const tx4 = await provider.sendAll([{ tx: createAliceAccount, signers: [alice] }]);
    console.log("Created Account for Alice Tx", tx4);
    const aliceATA = await getAssociatedTokenAddress(
      mintERC20.publicKey,
      alice.publicKey,
      false,
    );
    console.log("Alice ATA Address", aliceATA.toBase58());
    const createAliceATA = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        adminERC20.publicKey,
        aliceATA,
        alice.publicKey,
        mintERC20.publicKey,
      ),
    );
    const tx6 = await provider.sendAll([{ tx: createAliceATA }]);
    console.log("Created ATA for Alice Tx", tx6);
    const sendFunds = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: alice.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL,
      })
    );
    const tx7 = await provider.sendAndConfirm(sendFunds);
    console.log("Funded Alice with 1 SOL Tx", tx7);

    //// Handle the NFT Minting
    const dashboard_id = new anchor.BN(202);
    console.log("Minting NFT with dashboard ID", dashboard_id.toNumber());
    await mintNFT(dashboard_id, alice.publicKey);

    /// Handle the Voting
    scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboard_id.toArrayLike(Buffer, "le", 8),
      ],
      VoteProgram.programId
    )[0];
    votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), alice.publicKey.toBuffer()],
      VoteProgram.programId
    )[0];
    winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];
    const tx8 = await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: alice.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([alice])
      .rpc();
    console.log("Voted for dashboard ID Tx", dashboard_id.toNumber(), tx8);
    console.log("Not finalizing the voting period to test the rever...");
    
    //// Handling the Winners
    const winners_account = await VoteProgram.account.winnersState.fetch(winnersAccount);
    console.log("Dashboard ID of the Winner", winners_account.topThree[0].toNumber());
    expect(winners_account.topThree[0].toNumber()).to.be.equal(dashboard_id.toNumber());
    const dashboard_account = await NFTProgram.account.dashboardId.fetch(dashboardAccount);
    console.log("Token ID of the Winner", dashboard_account.nftId.toBase58());
    expect(dashboard_account.nftId.toBase58()).to.be.equal(mint.publicKey.toString());

    //// Claiming the Rewards
    const claimStatus = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("claim"),
        alice.publicKey.toBuffer(),
        roundId.toArrayLike(Buffer, "le", 8),
      ],
      RewardProgram.programId
    )[0];
    try {
      await RewardProgram.methods
        .claimReward(roundId, bumps, 0) // 0 for first place
        .accounts({
          claimStatus,
          rewardDistribution,
          rewardSource: splTokenATA,
          claimantTokenAccount: aliceATA,
          nftTokenAccount: associatedTokenAccount,
          winnersAccount,
          roundAccount,
          dashboardAccount,
          signer: alice.publicKey,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc();
    } catch (error) {
      expect(error.message).to.contain("The round is invalid or not over yet");
    }
  });

  it("Should not be able to claim not-owned prizes (1st) and should be able to claim 2nd prizes, there is no 4th prize", async () => {
    //// Handle the voting period
    let voting_state = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    const isActive = voting_state.votingEnd.toNumber() > Date.now() / 1000;
    console.log("Vote period is active?", isActive);
    if(!isActive){
      console.log("Initializing the vote period...");
      await VoteProgram.methods
      .initVotePeriod(duration)
      .accounts({
        config: config,
        roundAccount: roundAccount,
        signer: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      voting_state = await VoteProgram.account.votingState.fetch(
        roundAccount
      );
      console.log("Round ID", roundId.toNumber());
    } else {
      console.log("Vote period already initialized...");
    }
    roundId = voting_state.currRound;
    console.log("Round ID", roundId.toNumber());

    //// Create an Account for Alice
    const alice = Keypair.generate();
    console.log("Alice Account Address", alice.publicKey.toBase58());
    const createAliceAccount = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: adminERC20.publicKey,
        newAccountPubkey: alice.publicKey,
        space: 0,
        lamports: lamports,
        programId: SystemProgram.programId,
      }),
    );
    const tx4 = await provider.sendAll([{ tx: createAliceAccount, signers: [alice] }]);
    console.log("Created Account for Alice Tx", tx4);
    const aliceATA = await getAssociatedTokenAddress(
      mintERC20.publicKey,
      alice.publicKey,
      false,
    );
    console.log("Alice ATA Address", aliceATA.toBase58());
    const createAliceATA = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        adminERC20.publicKey,
        aliceATA,
        alice.publicKey,
        mintERC20.publicKey,
      ),
    );
    const tx6 = await provider.sendAll([{ tx: createAliceATA }]);
    console.log("Created ATA for Alice Tx", tx6);
    const sendFunds = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: alice.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL,
      })
    );
    const tx7 = await provider.sendAndConfirm(sendFunds);
    console.log("Funded Alice with 1 SOL Tx", tx7);

    //// Handle the NFT Minting
    const dashboard_id = new anchor.BN(203);
    console.log("Minting NFT with dashboard ID", dashboard_id.toNumber());
    await mintNFT(dashboard_id, alice.publicKey);

    /// Handle the Voting
    scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboard_id.toArrayLike(Buffer, "le", 8),
      ],
      VoteProgram.programId
    )[0];
    votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), alice.publicKey.toBuffer()],
      VoteProgram.programId
    )[0];
    winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];
    const tx8 = await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: alice.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([alice])
      .rpc();
    console.log("Voted for dashboard ID Tx", dashboard_id.toNumber(), tx8);
    const tx = await VoteProgram.methods
      .endVotePeriod()
      .accounts({
        roundAccount: roundAccount,
        config: config,
        signer: provider.publicKey,
      })
      .rpc();
    console.log("Finalized the voting period Tx", tx);
    
    //// Handling the Winners
    const winners_account = await VoteProgram.account.winnersState.fetch(winnersAccount);
    console.log("Dashboard ID of the Winner", winners_account.topThree[0].toNumber());
    expect(winners_account.topThree[1].toNumber()).to.be.equal(dashboard_id.toNumber());
    const dashboard_account = await NFTProgram.account.dashboardId.fetch(dashboardAccount);
    console.log("Token ID of the Winner", dashboard_account.nftId.toBase58());
    expect(dashboard_account.nftId.toBase58()).to.be.equal(mint.publicKey.toString());

    //// Claiming the Rewards
    const claimStatus = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("claim"),
        alice.publicKey.toBuffer(),
        roundId.toArrayLike(Buffer, "le", 8),
      ],
      RewardProgram.programId
    )[0];
    try {
      await RewardProgram.methods
        .claimReward(roundId, bumps, 0) // 0 for first place
        .accounts({
          claimStatus,
          rewardDistribution,
          rewardSource: splTokenATA,
          claimantTokenAccount: aliceATA,
          nftTokenAccount: associatedTokenAccount,
          winnersAccount,
          roundAccount,
          dashboardAccount,
          signer: alice.publicKey,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc();
    } catch (error) {
      expect(error.message).to.contain("The dashboard account is invalid");
    }

    try {
      await RewardProgram.methods
        .claimReward(roundId, bumps, 4) // 0 for first place
        .accounts({
          claimStatus,
          rewardDistribution,
          rewardSource: splTokenATA,
          claimantTokenAccount: aliceATA,
          nftTokenAccount: associatedTokenAccount,
          winnersAccount,
          roundAccount,
          dashboardAccount,
          signer: alice.publicKey,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([alice])
        .rpc();
    } catch (error) {
      expect(error.message).to.contain("Invalid position");
    }

    const tx9 = await RewardProgram.methods
    .claimReward(roundId, bumps, 1) // 0 for first place
    .accounts({
      claimStatus,
      rewardDistribution,
      rewardSource: splTokenATA,
      claimantTokenAccount: aliceATA,
      nftTokenAccount: associatedTokenAccount,
      winnersAccount,
      roundAccount,
      dashboardAccount,
      signer: alice.publicKey,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([alice])
    .rpc();
    console.log("Claimed the Rewards Tx", tx9);
  });

  it("Should be able to claim from past rounds", async () => {
    //// Handle the voting period
    let voting_state = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    const isActive = voting_state.votingEnd.toNumber() > Date.now() / 1000;
    console.log("Vote period is active?", isActive);
    if(!isActive){
      console.log("Initializing the vote period...");
      await VoteProgram.methods
      .initVotePeriod(duration)
      .accounts({
        config: config,
        roundAccount: roundAccount,
        signer: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      voting_state = await VoteProgram.account.votingState.fetch(
        roundAccount
      );
      console.log("Round ID", roundId.toNumber());
    } else {
      console.log("Vote period already initialized...");
    }
    roundId = voting_state.currRound;
    console.log("Round ID", roundId.toNumber());

    //// Create an Account for Alice
    const alice = Keypair.generate();
    console.log("Alice Account Address", alice.publicKey.toBase58());
    const createAliceAccount = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: adminERC20.publicKey,
        newAccountPubkey: alice.publicKey,
        space: 0,
        lamports: lamports,
        programId: SystemProgram.programId,
      }),
    );
    const tx4 = await provider.sendAll([{ tx: createAliceAccount, signers: [alice] }]);
    console.log("Created Account for Alice Tx", tx4);
    const aliceATA = await getAssociatedTokenAddress(
      mintERC20.publicKey,
      alice.publicKey,
      false,
    );
    console.log("Alice ATA Address", aliceATA.toBase58());
    const createAliceATA = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        adminERC20.publicKey,
        aliceATA,
        alice.publicKey,
        mintERC20.publicKey,
      ),
    );
    const tx6 = await provider.sendAll([{ tx: createAliceATA }]);
    console.log("Created ATA for Alice Tx", tx6);
    const sendFunds = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: alice.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL,
      })
    );
    const tx7 = await provider.sendAndConfirm(sendFunds);
    console.log("Funded Alice with 1 SOL Tx", tx7);

    //// Handle the NFT Minting
    const dashboard_id = new anchor.BN(206);
    console.log("Minting NFT with dashboard ID", dashboard_id.toNumber());
    await mintNFT(dashboard_id, alice.publicKey);

    /// Handle the Voting
    scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboard_id.toArrayLike(Buffer, "le", 8),
      ],
      VoteProgram.programId
    )[0];
    votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), alice.publicKey.toBuffer()],
      VoteProgram.programId
    )[0];
    winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];
    const tx8 = await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: alice.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([alice])
      .rpc();
    console.log("Voted for dashboard ID Tx", dashboard_id.toNumber(), tx8);
    const tx = await VoteProgram.methods
      .endVotePeriod()
      .accounts({
        roundAccount: roundAccount,
        config: config,
        signer: provider.publicKey,
      })
      .rpc();
    console.log("Finalized the voting period Tx", tx);
    
    //// Handling the Winners
    const winners_account = await VoteProgram.account.winnersState.fetch(winnersAccount);
    console.log("Dashboard ID of the Winner", winners_account.topThree[0].toNumber());
    expect(winners_account.topThree[0].toNumber()).to.be.equal(dashboard_id.toNumber());
    const dashboard_account = await NFTProgram.account.dashboardId.fetch(dashboardAccount);
    console.log("Token ID of the Winner", dashboard_account.nftId.toBase58());
    expect(dashboard_account.nftId.toBase58()).to.be.equal(mint.publicKey.toString());

    //// Claiming the Rewards
    const claimStatus = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("claim"),
        alice.publicKey.toBuffer(),
        roundId.toArrayLike(Buffer, "le", 8),
      ],
      RewardProgram.programId
    )[0];
    const tx9 = await RewardProgram.methods
      .claimReward(roundId, bumps, 0) // 0 for first place
      .accounts({
        claimStatus,
        rewardDistribution,
        rewardSource: splTokenATA,
        claimantTokenAccount: aliceATA,
        nftTokenAccount: associatedTokenAccount,
        winnersAccount,
        roundAccount,
        dashboardAccount,
        signer: alice.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([alice])
      .rpc();
    console.log("Claimed the Rewards Tx", tx9);

    let tokenAccountInfo = await provider.connection.getTokenAccountBalance(splTokenATA);
    console.log('SPL ATA Address:', splTokenATA.toBase58());
    console.log('SPL ATA Balance:', tokenAccountInfo.value.amount);
    tokenAccountInfo = await provider.connection.getTokenAccountBalance(aliceATA);
    console.log('Alice ATA Address:', aliceATA.toBase58());
    console.log('Alice ATA Balance:', tokenAccountInfo.value.amount);
    expect(Number(tokenAccountInfo.value.amount)).to.be.equal(1);
  });
});
