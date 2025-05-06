import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintVote } from "../target/types/glint_vote";
import { GlintNft } from "../target/types/glint_nft";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { log, connect, logTx } from "./utils/utils";

// ---------- Setup ----------
const { provider } = connect();

// Get the voteProgram from IDL
const voteProgram = anchor.workspace.GlintVote as Program<GlintVote>;
const nftProgram = anchor.workspace.GlintNft as Program<GlintNft>;

// Get config PDA
const [config] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  nftProgram.programId
);

// Get round account PDA
const [roundAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from("voting_state")],
  voteProgram.programId
);

async function initVotePeriod(duration: number) {
  await log(`initVotePeriod ${duration}`);
  try {
    const tx = await voteProgram.methods
      .initVotePeriod(new anchor.BN(duration))
      .accounts({
        config,
        roundAccount,
        signer: provider.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await logTx(`Vote period initialized ${tx}`);
    return roundAccount;
  } catch (error) {
    await log(`Error initializing vote period ${error}`);
    throw error;
  }
}

async function main() {
  const votingDurationSeconds = 60 * 60 * 24 * 7; // 1 week
  await initVotePeriod(votingDurationSeconds);
}

if (require.main === module) {
  main();
}
