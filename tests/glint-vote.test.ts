import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintNft } from "../target/types/glint_nft";
import { GlintVote } from "../target/types/glint_vote";
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
  getAssociatedTokenAddress,
  getMint,
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

describe("vote", async () => {
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

  // Will change during the tests for different scenarios
  let roundId = new anchor.BN(0);
  let duration = new anchor.BN(30);
  // PDA Account for dynamic cases
  let winnersAccount: PublicKey;
  let dashboardAccount: PublicKey;
  let scoresAccount: PublicKey;
  let votersAccount: PublicKey;
  // NFT Minting related variables
  let mint: Keypair;
  let metadataAccount: any;
  let masterEditionAccount: any;
  let associatedTokenAccount: PublicKey;
  // Account for different scenarios
  let randomAccount: Keypair;

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

  // Helps increasing the compute unit limit (increase cost as well)
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1000000, // or any other appropriate value
  });

  async function createDashboardAccount(
    dashboardId: anchor.BN
  ): Promise<PublicKey> {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [dashboardId.toArrayLike(Buffer, "le", 16)],
      NFTProgram.programId
    )[0];
  }

  async function createWinnersAccount(roundId: anchor.BN): Promise<PublicKey> {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];
  }

  async function createScoresAccount(
    dashboardId: anchor.BN
  ): Promise<PublicKey> {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboardId.toArrayLike(Buffer, "le", 16),
      ],
      VoteProgram.programId
    )[0];
  }

  async function createVotersAccount(
    signerPkey: PublicKey
  ): Promise<PublicKey> {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), signerPkey.toBuffer()],
      VoteProgram.programId
    )[0];
  }

  async function createAccountAndFund(): Promise<PublicKey> {
    randomAccount = anchor.web3.Keypair.generate();
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: randomAccount.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL, // Convert SOL to lamports
      })
    );
    await provider.sendAndConfirm(transaction);
    return randomAccount.publicKey;
  }

  async function mintNFT(dashboardId: anchor.BN, recipient: PublicKey) {
    dashboardAccount = await createDashboardAccount(dashboardId);
    await NFTProgram.methods
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
  }

  beforeEach(async () => {
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

  it("Should initialize the vote program", async () => {
    await VoteProgram.methods
      .initialize(roundId)
      .accounts({
        config: config,
        roundAccount: roundAccount,
        signer: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .preInstructions([modifyComputeUnits])
      .rpc();

    // Fetch and check the accounts
    const roundAccountData = await VoteProgram.account.votingState.fetch(
      roundAccount
    );

    expect(roundAccountData.currRound.toNumber()).to.equal(0);
    expect(roundAccountData.isActive).to.be.false;
    expect(roundAccountData.votingEnd.toNumber()).to.equal(0);
  });

  it("Should not initialize the vote program twice", async () => {
    try {
      winnersAccount = await createWinnersAccount(roundId);
      await VoteProgram.methods
        .initialize(roundId)
        .accounts({
          config: config,
          roundAccount: roundAccount,
          signer: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .preInstructions([modifyComputeUnits])
        .rpc();
    } catch (error) {
      expect(error).to.exist;
    }
  });

  // round = 1 / voting_end > timestamp + duration / voting_is_active = true
  it("Should be able to initialize the voting period", async () => {
    await VoteProgram.methods
      .initVotePeriod(duration)
      .accounts({
        config: config,
        roundAccount: roundAccount,
        signer: provider.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const roundAccountData = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    expect(roundAccountData.isActive).to.be.true;
    expect(roundAccountData.votingEnd.toNumber()).to.be.greaterThan(
      Date.now() / 1000
    );
    expect(roundAccountData.currRound.toNumber()).to.equal(1);
  });

  it("Should not be able to initialize the voting period with another voting ongoing", async () => {
    try {
      await VoteProgram.methods
        .initVotePeriod(duration)
        .accounts({
          config: config,
          roundAccount: roundAccount,
          signer: provider.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      expect(error).to.exist;
    }
  });

  // mint nft / set dashboard id / has_voted = true / dashboard_score = 1
  // 1st winner = 1 score / 2nd winner = 0 score / 3rd winner = 0 score
  it("Should be able to vote on a dashboard (as provider.signer)", async () => {
    const dashboard_id = new anchor.BN(151);
    await mintNFT(dashboard_id, provider.publicKey);
    scoresAccount = await createScoresAccount(dashboard_id);
    votersAccount = await createVotersAccount(provider.publicKey);
    winnersAccount = await createWinnersAccount(roundId);
    await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: provider.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const scoresAccountData = await VoteProgram.account.scores.fetch(
      scoresAccount
    );
    const votersAccountData = await VoteProgram.account.voters.fetch(
      votersAccount
    );
    const winnersAccountData = await VoteProgram.account.winnersState.fetch(
      winnersAccount
    );
    // console.log("winners", winnersAccountData);
    expect(scoresAccountData.score.toNumber()).to.equal(1);
    expect(votersAccountData.hasVoted).to.be.true;
    expect(winnersAccountData.topThree[0].toNumber()).to.equal(
      dashboard_id.toNumber()
    );
  });

  it("Should not be able to vote twice (as provider.signer)", async () => {
    try {
      const dashboard_id = new anchor.BN(151);
      scoresAccount = await createScoresAccount(dashboard_id);
      votersAccount = await createVotersAccount(provider.publicKey);
      winnersAccount = await createWinnersAccount(roundId);
      await VoteProgram.methods
        .vote(dashboard_id, roundId)
        .accounts({
          scoresAccount: scoresAccount,
          votersAccount: votersAccount,
          roundAccount: roundAccount,
          winnersAccount: winnersAccount,
          dashboardAccount: dashboardAccount,
          config: config,
          signer: provider.publicKey,
          glintNft: NFTProgram.programId,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      expect(error.message).to.include(
        "This address has already voted in the current voting period"
      );
    }
  });

  // 1st winner = 1 score / 2nd winner = 1 score / 3rd winner = 0 score
  it("Should be able to vote on dashboard id (152) (as random account)", async () => {
    const dashboard_id = new anchor.BN(152);
    // Generate a new Solana account (Keypair)
    const newAccount = Keypair.generate();
    // Create a transaction to transfer SOL from the signer to the new account
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: newAccount.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL, // Convert SOL to lamports
      })
    );
    // Send and confirm the transaction
    await provider.sendAndConfirm(transaction);

    associatedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      newAccount.publicKey
    );

    // Generate the pda for the config account
    const seed = Buffer.from("config");
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      NFTProgram.programId
    )[0];
    // Generate the seed for the intitialization of the Dashboard Account
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 16)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      NFTProgram.programId
    )[0];

    // Mint the nft
    const tx = await NFTProgram.methods
      .mintNft(dashboard_id, "Au au", "Au Au", "Au Au")
      .accounts({
        signer: provider.publicKey,
        mint: mint.publicKey,
        config: config,
        dashboardAccount: dashboardAccount,
        recipientAccount: newAccount.publicKey,
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

    scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboard_id.toArrayLike(Buffer, "le", 16),
      ],
      VoteProgram.programId
    )[0];

    votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), newAccount.publicKey.toBuffer()],
      VoteProgram.programId
    )[0];

    winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];

    await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: newAccount.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newAccount])
      .rpc();

    const scoresAccountData = await VoteProgram.account.scores.fetch(
      scoresAccount
    );
    const votersAccountData = await VoteProgram.account.voters.fetch(
      votersAccount
    );
    const winnersAccountData = await VoteProgram.account.winnersState.fetch(
      winnersAccount
    );
    // console.log("winners", winnersAccountData);
    setTimeout(() => {
      expect(scoresAccountData.score.toNumber()).to.equal(1);
      expect(votersAccountData.hasVoted).to.be.true;
      expect(winnersAccountData.topThree[1].toNumber()).to.equal(
        dashboard_id.toNumber()
      );
    }, 1000);
  });

  // 1st winner = 1 score / 2nd winner = 1 score / 3rd winner = 1 score
  it("Should be able to vote on another dashboard id (153) (as random account)", async () => {
    const dashboard_id = new anchor.BN(153);
    // Generate a new Solana account (Keypair)
    const newAccount = Keypair.generate();
    // Create a transaction to transfer SOL from the signer to the new account
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: newAccount.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL, // Convert SOL to lamports
      })
    );
    // Send and confirm the transaction
    await provider.sendAndConfirm(transaction);

    associatedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      newAccount.publicKey
    );

    // Generate the pda for the config account
    const seed = Buffer.from("config");
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      NFTProgram.programId
    )[0];
    // Generate the seed for the intitialization of the Dashboard Account
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 16)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      NFTProgram.programId
    )[0];

    // Mint the nft
    const tx = await NFTProgram.methods
      .mintNft(dashboard_id, "Au au", "Au Au", "Au Au")
      .accounts({
        signer: provider.publicKey,
        mint: mint.publicKey,
        config: config,
        dashboardAccount: dashboardAccount,
        recipientAccount: newAccount.publicKey,
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

    scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboard_id.toArrayLike(Buffer, "le", 16),
      ],
      VoteProgram.programId
    )[0];

    votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), newAccount.publicKey.toBuffer()],
      VoteProgram.programId
    )[0];

    winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];

    await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: newAccount.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newAccount])
      .rpc();

    const scoresAccountData = await VoteProgram.account.scores.fetch(
      scoresAccount
    );
    const votersAccountData = await VoteProgram.account.voters.fetch(
      votersAccount
    );
    const winnersAccountData = await VoteProgram.account.winnersState.fetch(
      winnersAccount
    );
    // console.log("winners", winnersAccountData);
    setTimeout(() => {
      expect(scoresAccountData.score.toNumber()).to.equal(1);
      expect(votersAccountData.hasVoted).to.be.true;
      expect(winnersAccountData.topThree[2].toNumber()).to.equal(
        dashboard_id.toNumber()
      );
    }, 1000);
  });

  // mint nft / set dashboard id / has_voted = true / dashboard_score = 1
  // 1st winner = 1 score / 2nd winner = 1 score / 3rd winner = 1 score (enter in 4th position)
  it("Should be able to vote on another dashboard id (as random account)", async () => {
    const dashboard_id = new anchor.BN(154);
    // Generate a new Solana account (Keypair)
    const newAccount = Keypair.generate();
    // Create a transaction to transfer SOL from the signer to the new account
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: newAccount.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL, // Convert SOL to lamports
      })
    );
    // Send and confirm the transaction
    await provider.sendAndConfirm(transaction);

    associatedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      newAccount.publicKey
    );

    // Generate the pda for the config account
    const seed = Buffer.from("config");
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      NFTProgram.programId
    )[0];
    // Generate the seed for the intitialization of the Dashboard Account
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 16)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      NFTProgram.programId
    )[0];

    // Mint the nft
    const tx = await NFTProgram.methods
      .mintNft(dashboard_id, "Au au", "Au Au", "Au Au")
      .accounts({
        signer: provider.publicKey,
        mint: mint.publicKey,
        config: config,
        dashboardAccount: dashboardAccount,
        recipientAccount: newAccount.publicKey,
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

    scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboard_id.toArrayLike(Buffer, "le", 16),
      ],
      VoteProgram.programId
    )[0];

    votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), newAccount.publicKey.toBuffer()],
      VoteProgram.programId
    )[0];

    winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];

    await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: newAccount.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newAccount])
      .rpc();

    const scoresAccountData = await VoteProgram.account.scores.fetch(
      scoresAccount
    );
    const votersAccountData = await VoteProgram.account.voters.fetch(
      votersAccount
    );
    const winnersAccountData = await VoteProgram.account.winnersState.fetch(
      winnersAccount
    );
    // console.log("winners", winnersAccountData);
    expect(scoresAccountData.score.toNumber()).to.equal(1);
    expect(votersAccountData.hasVoted).to.be.true;
  });

  // 1st winner = 2 score / 2nd winner = 1 score / 3rd winner = 1 score
  it("Should be able to vote on 2nd dashboard and bring to 1st (as random account)", async () => {
    const dashboard_id = new anchor.BN(152);
    // Generate a new Solana account (Keypair)
    const newAccount = Keypair.generate();
    // Create a transaction to transfer SOL from the signer to the new account
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: signer.publicKey,
        toPubkey: newAccount.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL, // Convert SOL to lamports
      })
    );
    // Send and confirm the transaction
    await provider.sendAndConfirm(transaction);

    // Generate the seed for the intitialization of the Dashboard Account
    dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [dashboard_id.toArrayLike(Buffer, "le", 16)],
      NFTProgram.programId
    )[0];

    scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("voting_state_scores"),
        dashboard_id.toArrayLike(Buffer, "le", 16),
      ],
      VoteProgram.programId
    )[0];

    votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("voting_state_voters"), newAccount.publicKey.toBuffer()],
      VoteProgram.programId
    )[0];

    winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [roundId.toArrayLike(Buffer, "le", 8)],
      VoteProgram.programId
    )[0];

    await VoteProgram.methods
      .vote(dashboard_id, roundId)
      .accounts({
        scoresAccount: scoresAccount,
        votersAccount: votersAccount,
        roundAccount: roundAccount,
        winnersAccount: winnersAccount,
        dashboardAccount: dashboardAccount,
        config: config,
        signer: newAccount.publicKey,
        glintNft: NFTProgram.programId,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newAccount])
      .rpc();

    const scoresAccountData = await VoteProgram.account.scores.fetch(
      scoresAccount
    );
    const votersAccountData = await VoteProgram.account.voters.fetch(
      votersAccount
    );
    const winnersAccountData = await VoteProgram.account.winnersState.fetch(
      winnersAccount
    );
    // console.log("winners", winnersAccountData);
    expect(scoresAccountData.score.toNumber()).to.equal(2);
    expect(votersAccountData.hasVoted).to.be.true;
    expect(winnersAccountData.topThree[0].toNumber()).to.equal(
      dashboard_id.toNumber()
    );
  });

  it("Should be able to loop until, raising the scores randomly (as random account)", async () => {
    for (let i = 0; i <= 10; i++) {
      // pick a random between 151 and 154
      const random_dashboard_id = Math.floor(Math.random() * 3) + 151;
      const dashboard_id = new anchor.BN(random_dashboard_id);
      // Generate a new Solana account (Keypair)
      const newAccount = Keypair.generate();
      // Create a transaction to transfer SOL from the signer to the new account
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: newAccount.publicKey,
          lamports: 1 * LAMPORTS_PER_SOL, // Convert SOL to lamports
        })
      );
      // Send and confirm the transaction
      await provider.sendAndConfirm(transaction);

      dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
        [dashboard_id.toArrayLike(Buffer, "le", 16)],
        NFTProgram.programId
      )[0];

      scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("voting_state_scores"),
          dashboard_id.toArrayLike(Buffer, "le", 16),
        ],
        VoteProgram.programId
      )[0];

      votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("voting_state_voters"), newAccount.publicKey.toBuffer()],
        VoteProgram.programId
      )[0];

      winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
        [roundId.toArrayLike(Buffer, "le", 8)],
        VoteProgram.programId
      )[0];

      await VoteProgram.methods
        .vote(dashboard_id, roundId)
        .accounts({
          scoresAccount: scoresAccount,
          votersAccount: votersAccount,
          roundAccount: roundAccount,
          winnersAccount: winnersAccount,
          dashboardAccount: dashboardAccount,
          config: config,
          signer: newAccount.publicKey,
          glintNft: NFTProgram.programId,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([newAccount])
        .rpc();

      const winnersAccountData = await VoteProgram.account.winnersState.fetch(
        winnersAccount
      );
      console.log("voting for dashboard_id: ", dashboard_id);
      console.log("winners\n", winnersAccountData);
    }
  });

  it("Should not be able to vote on a dashboard that don't exist (as random accounts)", async () => {
    try {
      const dashboard_id = new anchor.BN(9999);
      // Generate a new Solana account (Keypair)
      const newAccount = Keypair.generate();
      // Create a transaction to transfer SOL from the signer to the new account
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: signer.publicKey,
          toPubkey: newAccount.publicKey,
          lamports: 1 * LAMPORTS_PER_SOL, // Convert SOL to lamports
        })
      );
      // Send and confirm the transaction
      await provider.sendAndConfirm(transaction);

      scoresAccount = anchor.web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from("voting_state_scores"),
          dashboard_id.toArrayLike(Buffer, "le", 16),
        ],
        VoteProgram.programId
      )[0];

      votersAccount = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("voting_state_voters"), newAccount.publicKey.toBuffer()],
        VoteProgram.programId
      )[0];

      winnersAccount = anchor.web3.PublicKey.findProgramAddressSync(
        [roundId.toArrayLike(Buffer, "le", 8)],
        VoteProgram.programId
      )[0];

      await VoteProgram.methods
        .vote(dashboard_id, roundId)
        .accounts({
          scoresAccount: scoresAccount,
          votersAccount: votersAccount,
          roundAccount: roundAccount,
          winnersAccount: winnersAccount,
          dashboardAccount: dashboardAccount,
          config: config,
          signer: newAccount.publicKey,
          glintNft: NFTProgram.programId,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([newAccount])
        .rpc();
    } catch (error) {
      expect(error.message).to.include("The dashboard account is invalid");
    }
  });

  it("Should not be able to vote when the voting period is over", async () => {
    try {
      const dashboard_id = new anchor.BN(151);
      scoresAccount = await createScoresAccount(dashboard_id);
      votersAccount = await createVotersAccount(provider.publicKey);
      winnersAccount = await createWinnersAccount(roundId);
      dashboardAccount = await createDashboardAccount(dashboard_id);
      // sleep 30 seconds
      await new Promise((resolve) => setTimeout(resolve, 30000));
      await VoteProgram.methods
        .vote(dashboard_id, roundId)
        .accounts({
          scoresAccount: scoresAccount,
          votersAccount: votersAccount,
          roundAccount: roundAccount,
          winnersAccount: winnersAccount,
          dashboardAccount: dashboardAccount,
          config: config,
          signer: provider.publicKey,
          glintNft: NFTProgram.programId,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
    } catch (error) {
      expect(error.message).to.include("Voting period has ended");
    }
  });

  it("Should be able to fetch previous round winners passing the round id", async () => {
    winnersAccount = await createWinnersAccount(roundId);
    const winner_account = await VoteProgram.account.winnersState.fetch(
      winnersAccount
    );
    // console.log("winner_account", winner_account);
  });

  it("Should be able to end the voting period", async () => {
    const voting_state = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    if (!voting_state.isActive) {
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
    await VoteProgram.methods
      .endVotePeriod()
      .accounts({
        roundAccount: roundAccount,
        config: config,
        signer: provider.publicKey,
      })
      .rpc();
    let roundAccountData = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    expect(roundAccountData.isActive).to.be.false;
  });

  it("Should not be able to set the voting duration if the round is inactive", async () => {
    const voting_state = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    if (voting_state.isActive) {
      await VoteProgram.methods
        .endVotePeriod()
        .accounts({
          roundAccount: roundAccount,
          config: config,
          signer: provider.publicKey,
        })
        .rpc();
    }
    try {
      await VoteProgram.methods
        .setVotingDuration(duration)
        .accounts({
          roundAccount: roundAccount,
          config: config,
          signer: provider.publicKey,
        })
        .rpc();
    } catch (error) {
      expect(error.message).to.include("There is no active voting period");
    }
  });

  it("Should be able to set the voting duration", async () => {
    const voting_state = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    if (!voting_state.isActive) {
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
    let roundAccountData = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    expect(roundAccountData.isActive).to.be.true;
    await VoteProgram.methods
      .setVotingDuration(new anchor.BN(5))
      .accounts({
        roundAccount: roundAccount,
        config: config,
        signer: provider.publicKey,
      })
      .rpc();
    await new Promise((resolve) => setTimeout(resolve, 10000));
    // Check if the voting has ended
    roundAccountData = await VoteProgram.account.votingState.fetch(
      roundAccount
    );
    expect(roundAccountData.votingEnd.toNumber()).to.be.lessThan(
      Date.now() / 1000
    );
  });
});
