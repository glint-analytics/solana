import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintNft } from "../target/types/glint_nft";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";
import {
  findMasterEditionPda,
  findMetadataPda,
  mplTokenMetadata,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey } from "@metaplex-foundation/umi";
import {
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert, expect } from "chai";

describe("glint-nft", async () => {
  // Configured the client to use the devnet cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  // Load the program from the IDL.
  const program = anchor.workspace.GlintNft as Program<GlintNft>;

  // Get the signer wallet from the provider
  const signer = provider.wallet;

  // Create a UMI client
  const umi = createUmi("http://127.0.0.1:8899")
    .use(walletAdapterIdentity(signer))
    .use(mplTokenMetadata());

  // Prepare accounts for tests
  let mint: Keypair;
  let associatedTokenAccount: PublicKey;
  let metadataAccount: any;
  let masterEditionAccount: any;
  let newAccount: Keypair;

  // Create new mint data for each test (fail when using duplicates)
  beforeEach(async () => {
    // Generate a new mint keypair
    mint = anchor.web3.Keypair.generate();

    // Derive the associated token address account for the mint and signer
    associatedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      signer.publicKey
    );

    // derive the metadata account
    metadataAccount = findMetadataPda(umi, {
      mint: publicKey(mint.publicKey),
    })[0];

    //derive the master edition PDA
    masterEditionAccount = findMasterEditionPda(umi, {
      mint: publicKey(mint.publicKey),
    })[0];
  });

  // Metadata for the NFT
  const metadata = {
    name: "Glint",
    symbol: "GLINT",
    uri: "https://raw.githubusercontent.com/687c/solana-nft-native-client/main/metadata.json", // Random URI
  };

  it("Should not be able to mint before initialization", async () => {
    // Generate the seed for the intitialization of the Dashboard Account
    const dashboard_id = new anchor.BN(777);
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 8)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    )[0];
    // Generate the fixed seed for the config account
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    )[0];
    // Attempt to mint an NFT before initialization
    let error_message = "";
    try {
      await program.methods
        .mintNft(dashboard_id, metadata.name, metadata.symbol, metadata.uri)
        .accounts({
          signer: provider.publicKey,
          mint: mint.publicKey,
          config: config,
          dashboardAccount: dashboardAccount,
          recipientAccount: provider.publicKey,
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
    } catch (error) {
      error_message = error.message;
    }
    expect(error_message).to.exist;
  });

  it("Should not be able to set dashboard id before initialization", async () => {
    // Generate the seed for the intitialization of the Dashboard Account
    const dashboard_id = new anchor.BN(777);
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 8)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    )[0];
    // Generate a new account as key to test setting the dashboard id
    const receiver = anchor.web3.Keypair.generate();
    // Generate the fixed seed for the config account
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    )[0];
    // Attempt to set the dashboard id before initialization
    let error_message = "";
    try {
      await program.methods
        .setDashboardId(dashboard_id, receiver.publicKey)
        .accounts({
          signer: provider.publicKey,
          config: config,
          dashboardAccount: dashboardAccount,
        })
        .rpc();
    } catch (error) {
      error_message = error.message;
    }
    expect(error_message).to.exist;
  });

  // All functions require the config account, therefore we need to initialize the program
  it("Should be able to initialize the program", async () => {
    // Generate the fixed seed for the config account
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    )[0];

    // Initialize the PDA account for the caller. Signer becomes admin
    await program.methods
      .initialize()
      .accounts({ signer: provider.publicKey, config: config })
      .rpc();
  });

  it("Should not be able to transfer ownership of the program as the random user", async () => {
    // Generate the fixed seed for the config account
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    )[0];

    // Current admin (fake one, generated)
    const currentAdmin = anchor.web3.Keypair.generate();
    // Generate a new keypair for the new admin
    const newAdmin = anchor.web3.Keypair.generate();

    // Attempt to hijack the program by transferring ownership
    let error_message = "";
    try {
      await program.methods
        .transferOwnership(newAdmin.publicKey) // Transfer ownership to the new admin
        .accounts({
          config: config,
          signer: currentAdmin.publicKey, // The fake admin should sign this transaction
        })
        .rpc();
    } catch (error) {
      error_message = error.message;
    }
    expect(error_message).to.exist;
  });

  it("Should be able to transfer ownership of the program as the admin", async () => {
    // Generate the fixed seed for the config account
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    )[0];

    // Current admin (who initialized the program)
    const currentAdmin = provider.wallet.publicKey;

    // Generate a new keypair for the new admin
    const newAdmin = anchor.web3.Keypair.generate();

    // Step 1: Transfer ownership from current admin to new admin
    await program.methods
      .transferOwnership(newAdmin.publicKey) // Transfer ownership to the new admin
      .accounts({
        config: config,
        signer: currentAdmin, // The current admin must sign this transaction
      })
      .rpc();

    // Fetch the updated config account to verify that the admin has changed
    const configAccount = await program.account.config.fetch(config);
    assert.equal(
      configAccount.admin.toBase58(),
      newAdmin.publicKey.toBase58(),
      "Ownership should be transferred to the new admin"
    );

    // Step 2: Transfer ownership back to the original admin
    await program.methods
      .transferOwnership(currentAdmin) // Transfer ownership to the new admin
      .accounts({
        config: config,
        signer: newAdmin.publicKey, // The current admin must sign this transaction
      })
      .signers([newAdmin])
      .rpc();
  });

  it("Should be able to mint an NFT", async () => {
    // Generate the pda for the config account
    const seed = Buffer.from("config");
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      program.programId
    )[0];
    // Generate the seed for the intitialization of the Dashboard Account
    const dashboard_id = new anchor.BN(777);
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 8)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    )[0];

    // Mint the nft
    const tx = await program.methods
      .mintNft(dashboard_id, metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        signer: provider.publicKey,
        mint: mint.publicKey,
        config: config,
        dashboardAccount: dashboardAccount,
        recipientAccount: provider.publicKey,
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

    // Verify that the NFT was minted
    const mintInfo = await getMint(program.provider.connection, mint.publicKey);
    expect(mintInfo.address.toBase58()).to.equal(mint.publicKey.toBase58());
  });

  it("Should not be able to mint an NFT a second time with the same dashboard Id", async () => {
    // Generate the pda for the config account
    const seed = Buffer.from("config");
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      program.programId
    )[0];
    // Generate the seed for the intitialization of the Dashboard Account
    const dashboard_id = new anchor.BN(777);
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 8)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    )[0];

    // Attempt to mint the same NFT a second time with the same dashboard Id
    let error_message = "";
    try {
      await program.methods
        .mintNft(dashboard_id, metadata.name, metadata.symbol, metadata.uri)
        .accounts({
          signer: provider.publicKey,
          mint: mint.publicKey,
          config: config,
          dashboardAccount: dashboardAccount,
          recipientAccount: provider.publicKey,
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
    } catch (error) {
      error_message = error.message;
    }
    expect(error_message).to.exist;
  });

  it("Should be able to mint an NFT with a diferent dashboard Id", async () => {
    // Generate the pda for the config account
    const seed = Buffer.from("config");
    const config = anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      program.programId
    )[0];
    // Generate the seed for the intitialization of the Dashboard Account
    const dashboard_id = new anchor.BN(888);
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 8)];
    const dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    )[0];

    // Mint the nft
    const tx = await program.methods
      .mintNft(dashboard_id, metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        signer: provider.publicKey,
        mint: mint.publicKey,
        config: config,
        dashboardAccount: dashboardAccount,
        recipientAccount: provider.publicKey,
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

    // Verify that the NFT was minted
    const mintInfo = await getMint(program.provider.connection, mint.publicKey);
    expect(mintInfo.address.toBase58()).to.equal(mint.publicKey.toBase58());
  });

  it("Should be able to set the dashboard id, then fetch it", async () => {
    // Generate the pda for the config account
    const seed = Buffer.from("config");
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      program.programId
    )[0];
    // Generate the seed for the intitialization of the Dashboard Account
    const dashboard_id = new anchor.BN(888);
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 8)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    )[0];

    // Generate a new keypair to set the dashboard id
    const randomNFT = anchor.web3.Keypair.generate();

    // Set the generated public key as the dashboard id
    await program.methods
      .setDashboardId(dashboard_id, randomNFT.publicKey)
      .accounts({
        signer: provider.publicKey,
        config: config,
        dashboardAccount: dashboardAccount,
      })
      .rpc();

    // Read the dashboard id from the account and expect to match the mint public key
    let result = await program.account.dashboardId.fetch(dashboardAccount);
    assert.equal(
      result.nftId.toBase58(),
      randomNFT.publicKey.toBase58(),
      "Dashboard Id should be set to the receiver public key"
    );
  });

  it("Should be able to fetch the admin of the program", async () => {
    const seed = Buffer.from("config");
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      program.programId
    )[0];
    const configAccount = await program.account.config.fetch(config);
    expect(configAccount.admin.toBase58()).to.equal(
      provider.publicKey.toBase58()
    );
  });

  it("Should not be able to transfer not owned NFT", async () => {
    // Generate the pda for the config account
    const seed = Buffer.from("config");
    let config = anchor.web3.PublicKey.findProgramAddressSync(
      [seed],
      program.programId
    )[0];
    // Generate the seed for the intitialization of the Dashboard Account
    const dashboard_id = new anchor.BN(891);
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 8)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    )[0];

    // Mint the nft
    const tx = await program.methods
      .mintNft(dashboard_id, metadata.name, metadata.symbol, metadata.uri)
      .accounts({
        signer: provider.publicKey,
        mint: mint.publicKey,
        config: config,
        dashboardAccount: dashboardAccount,
        recipientAccount: provider.publicKey,
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

    const fakeSender = anchor.web3.Keypair.generate();
    const receiver = anchor.web3.Keypair.generate();

    const fakeSenderAta = await getAssociatedTokenAddress(
      mint.publicKey,
      fakeSender.publicKey
    );
    // Transfer the NFT to a new account
    const receiverAta = await getAssociatedTokenAddress(
      mint.publicKey,
      receiver.publicKey
    );

    // Ensure the receiver's Associated Token Account exists
    const createAtaIx = createAssociatedTokenAccountInstruction(
      fakeSender.publicKey,
      receiverAta,
      receiver.publicKey,
      mint.publicKey
    );

    const transferIx = createTransferInstruction(
      fakeSenderAta, // source
      receiverAta, // destination
      fakeSender.publicKey, // owner
      1 // amount
    );

    const transaction = new anchor.web3.Transaction().add(
      createAtaIx,
      transferIx
    );

    let transferTx = "";
    let errorMessage = "";
    try {
      // Sign and send the transaction
      transferTx = await provider.sendAndConfirm(transaction);
      console.log("Transfer Tx:", transferTx);
    } catch (error) {
      errorMessage = error.message;
    }
    expect(errorMessage).to.exist;
  });

  it("Should be able to mint the NFT as admin with 'to' as an user", async () => {
    // Generate a new Solana account (Keypair)
    newAccount = Keypair.generate();
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
      program.programId
    )[0];
    // Generate the seed for the intitialization of the Dashboard Account
    const dashboard_id = new anchor.BN(1000);
    const seeds = [dashboard_id.toArrayLike(Buffer, "le", 8)];
    let dashboardAccount = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    )[0];

    // Mint the nft
    const tx = await program.methods
      .mintNft(dashboard_id, metadata.name, metadata.symbol, metadata.uri)
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

    // Verify that the NFT was minted
    const mintInfo = await getMint(program.provider.connection, mint.publicKey);
    expect(mintInfo.address.toBase58()).to.equal(mint.publicKey.toBase58());
  });
});
