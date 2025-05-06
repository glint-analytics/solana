import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintVote } from "../target/types/glint_vote";
import { GlintNft } from "../target/types/glint_nft";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  log,
  connect,
  feePayer,
  logAccount,
  aliceAccount,
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

async function vote(dashboardId: number, roundId: number, voter: Keypair) {
  await logAccount(`Fee payer account ${feePayer.publicKey.toBase58()}`);
  await logAccount(`Alice account ${aliceAccount.publicKey.toBase58()}`);

  await log(`Voting on dashboard ID ${dashboardId} for Round ${roundId}`);
  const [dashboardAccount] = PublicKey.findProgramAddressSync(
    [new anchor.BN(dashboardId).toArrayLike(Buffer, "le", 8)],
    nftProgram.programId
  );
  await logAccount(`Dashboard PDA ${dashboardAccount.toBase58()}`);

  const [scoresAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("voting_state_scores"),
      new anchor.BN(dashboardId).toArrayLike(Buffer, "le", 8),
    ],
    voteProgram.programId
  );
  await logAccount(`Scores PDA ${scoresAccount.toBase58()}`);

  const [votersAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("voting_state_voters"), voter.publicKey.toBuffer()],
    voteProgram.programId
  );
  await logAccount(`Voters PDA ${votersAccount.toBase58()}`);

  const [winnersAccount] = PublicKey.findProgramAddressSync(
    [new anchor.BN(roundId).toArrayLike(Buffer, "le", 8)],
    voteProgram.programId
  );
  await logAccount(`Winners PDA ${winnersAccount.toBase58()}`);

  try {
    const tx = await voteProgram.methods
      .vote(new anchor.BN(dashboardId), new anchor.BN(roundId))
      .accounts({
        scoresAccount,
        votersAccount,
        roundAccount,
        winnersAccount,
        dashboardAccount,
        config,
        signer: voter.publicKey,
        glintNft: nftProgram.programId,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    await logTx(`Vote transaction successful ${tx}`);
  } catch (error) {
    console.error("Error voting, probably already voted", error);
  }
}

async function main() {
  const dashboardId = 1;
  const roundId = 1;
  await vote(dashboardId, roundId, aliceAccount);
}

if (require.main === module) {
  main();
}
