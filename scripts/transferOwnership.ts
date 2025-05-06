import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintNft } from "../target/types/glint_nft";
import { PublicKey } from "@solana/web3.js";
import { connect, logTx } from "./utils/utils";
import { log, aliceAccount } from "./utils/utils";

// ---- Setup connection ----
const { provider } = connect();

// Get the program from IDL
const program = anchor.workspace.GlintNft as Program<GlintNft>;

// Get configPDA PDA
const [configPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  program.programId
);

const transferOwnership = async (newOwner: PublicKey) => {
  await log(`Transferring ownership to ${newOwner.toBase58()}`);
  const tx = await program.methods
    .transferOwnership(newOwner)
    .accounts({
      signer: provider.publicKey,
      config: configPDA,
    })
    .rpc();
  await logTx(`Transferred ownership to ${newOwner.toBase58()}: ${tx}`);
};

transferOwnership(new PublicKey(aliceAccount.publicKey));
