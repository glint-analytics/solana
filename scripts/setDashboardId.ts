import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintNft } from "../target/types/glint_nft";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { log, connect, logTx } from "./utils/utils";

// ---- Setup connection ----
const { provider } = connect();

// Get the program from IDL
const program = anchor.workspace.GlintNft as Program<GlintNft>;

// Get configPDA PDA
const [configPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  program.programId
);

const setDashboardId = async (dashboardId: number, mint: PublicKey) => {
  await log(`Setting dashboard ID ${dashboardId}`);
  const [dashboardPDA] = PublicKey.findProgramAddressSync(
    [new anchor.BN(dashboardId).toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  const tx = await program.methods
    .setDashboardId(new anchor.BN(dashboardId), mint)
    .accounts({
      dashboardAccount: dashboardPDA,
      signer: provider.publicKey,
      config: configPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  await logTx(`Set dashboard ID ${dashboardId}: ${tx}`);
};

async function main() {
  const dashboardId = 1;
  const randomMintAddress = anchor.web3.Keypair.generate();
  await setDashboardId(dashboardId, randomMintAddress.publicKey);
}

if (require.main === module) {
  main();
}
