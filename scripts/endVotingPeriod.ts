import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintVote } from "../target/types/glint_vote";
import { GlintNft } from "../target/types/glint_nft";
import { PublicKey } from "@solana/web3.js";
import {
  log,
  connect,
  logTx,
} from "./utils/utils";

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

async function endVotePeriod() {
  await log("endVotePeriod");
  try {
    const tx = await voteProgram.methods
      .endVotePeriod()
      .accounts({
        roundAccount,
        config,
        signer: provider.publicKey,
      })
      .rpc();

    await logTx(`Vote period ended ${tx}`);
  } catch (error) {
    await log(`Error ending vote period ${error}`);
    throw error;
  }
}


async function main() {
  // End voting period
  await endVotePeriod();
}

if (require.main === module) {
  main();
}
