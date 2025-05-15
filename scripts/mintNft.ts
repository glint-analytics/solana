import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintNft } from "../target/types/glint_nft";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  findMetadataPda,
  findMasterEditionPda,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import {
  checkPrograms,
  log,
  logAccount,
  feePayer,
  aliceAccount,
  connect,
  logTx,
} from "./utils/utils";

// ---- Setup connection ----
const { connection, provider, umi } = connect();

// Get the program from IDL
const program = anchor.workspace.GlintNft as Program<GlintNft>;

// Get configPDA PDA
const [configPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  program.programId
);

export async function mintNFT(
  dashboardId: number | undefined,
  recipientPubkey: PublicKey
) {
  await logAccount(`Fee payer account ${feePayer.publicKey.toBase58()}`);
  await logAccount(`Alice ERC20 account ${aliceAccount.publicKey.toBase58()}`);
  await logAccount(`Config account ${configPDA.toBase58()}`);

  const mint = Keypair.generate();
  await logAccount(`Mint account ${mint.publicKey.toBase58()}`);

  const randomDashboardId =
    dashboardId ?? Math.floor(Math.random() * 1000000);
  await log(`Random dashboard ID ${randomDashboardId}`);
  const [dashboardPDA] = PublicKey.findProgramAddressSync(
    [new anchor.BN(randomDashboardId).toArrayLike(Buffer, "le", 16)],
    program.programId
  );
  await logAccount(`Dashboard PDA ${dashboardPDA.toBase58()}`);

  const metadataPDA = findMetadataPda(umi, {
    mint: publicKey(mint.publicKey.toBase58()),
  })[0];

  const masterEditionAccount = findMasterEditionPda(umi, {
    mint: publicKey(mint.publicKey.toBase58()),
  })[0];

  const associatedTokenAccount = await getAssociatedTokenAddress(
    mint.publicKey,
    recipientPubkey
  );
  await logAccount(
    `Associated token account ${associatedTokenAccount.toBase58()}`
  );

  try {
    // Add compute budget instruction - might need
    // const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
    //   units: 400000,
    // });
    const tx = await program.methods
      .mintNft(
        new anchor.BN(randomDashboardId),
        "Glint",
        "GLINT",
        "https://your-metadata-url.com"
      )
      .accounts({
        signer: provider.publicKey,
        mint: mint.publicKey,
        config: configPDA,
        dashboardAccount: dashboardPDA,
        recipientAccount: recipientPubkey,
        associatedTokenAccount,
        metadataAccount: metadataPDA,
        masterEditionAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      // .preInstructions([modifyComputeUnits])
      .signers([mint])
      .rpc({ skipPreflight: true });

    await logTx(`Mint transaction successful: ${tx}`);
    return mint.publicKey;
  } catch (error) {
    await log(`Error minting NFT: ${error}`);
    if (error.logs) {
      await log(`Detailed logs: ${error.logs}`);
    }
    throw error;
  }
}

async function main() {
  // Check programs first
  const programsOk = await checkPrograms(connection);
  if (!programsOk) {
    await log("Required programs are not properly deployed");
    return;
  }

  // Mint an NFT with dashboard random ID
  await mintNFT(1, aliceAccount.publicKey);
}

if (require.main === module) {
  main();
}
