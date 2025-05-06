import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintVote } from "../target/types/glint_vote";
import { GlintNft } from "../target/types/glint_nft";
import { GlintReward } from "../target/types/glint_reward";
import {
  Transaction,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  mintERC20,
  adminERC20,
  getSplTokenATA,
} from "./initializeERC20";
import {
  aliceAccount,
  log,
  logAccount,
  logTx,
  connect,
} from "./utils/utils";

// ---------- Setup connection and provider ----------
const { provider } = connect();

// Get the voteProgram from IDL
const voteProgram = anchor.workspace.GlintVote as Program<GlintVote>;
const nftProgram = anchor.workspace.GlintNft as Program<GlintNft>;
const rewardProgram = anchor.workspace.GlintReward as Program<GlintReward>;

const [configNft] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  nftProgram.programId
);

const [roundAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from("voting_state")],
  voteProgram.programId
);

const [rewardDistribution, bumps] = PublicKey.findProgramAddressSync(
  [Buffer.from("authority_seed")],
  rewardProgram.programId
);

async function claimReward(
  roundId: number,
  position: number,
  claimant: Keypair,
) {
  await log(`Claiming reward for round ${roundId}, position ${position}`);
  await logAccount(`Claimant Account Address ${claimant.publicKey.toBase58()}`);

  //// Create an Account for Alice
  const claimantATA = await getAssociatedTokenAddress(
    mintERC20.publicKey,
    claimant.publicKey,
    false
  );
  await logAccount(`Claimant ATA Address ${claimantATA.toBase58()}`);
  const createAliceATA = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      adminERC20.publicKey,
      claimantATA,
      claimant.publicKey,
      mintERC20.publicKey
    )
  );
  const tx6 = await provider.sendAll([{ tx: createAliceATA }]);
  await logTx(`Created ATA for Claimant Tx ${tx6}`);

  //// Funding the claimant just to make sure they have some SOL
  const sendFunds = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: adminERC20.publicKey,
      toPubkey: claimant.publicKey,
      lamports: 1 * LAMPORTS_PER_SOL,
    })
  );
  const tx7 = await provider.sendAndConfirm(sendFunds);
  await logTx(`Funded Alice with 1 SOL Tx ${tx7}`);

  // Handle NFT Minting
  // Handle Voting
  // Handle the winners account
  // Get winners account
  const [claimStatus] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("claim"),
      claimant.publicKey.toBuffer(),
      new anchor.BN(roundId).toArrayLike(Buffer, "le", 8),
    ],
    rewardProgram.programId
  );

  // Get winners data to find the dashboard ID
  const [winnersAccount] = PublicKey.findProgramAddressSync(
    [new anchor.BN(roundId).toArrayLike(Buffer, "le", 8)],
    voteProgram.programId
  );
  await logAccount(`Winners Account PDA: ${winnersAccount.toBase58()}`);
  const winners = await voteProgram.account.winnersState.fetch(
    winnersAccount
  );
  const dashboardId = winners.topThree[position];

  // Get the dashboard account
  const [dashboardAccount] = PublicKey.findProgramAddressSync(
    [new anchor.BN(dashboardId).toArrayLike(Buffer, "le", 8)],
    nftProgram.programId
  );
  await logAccount(
    `Dashboard Account PDA: ${dashboardAccount.toBase58()}`
  );

  // Get NFT token account
  const dashboard = await nftProgram.account.dashboardId.fetch(
    dashboardAccount
  );
  const nftTokenAccount = await getAssociatedTokenAddress(
    dashboard.nftId,
    claimant.publicKey
  );
  await logAccount(
    `NFT Associated Token Account Address: ${nftTokenAccount.toBase58()}`
  );

  // Get the SPL ATA
  const splTokenATA = await getSplTokenATA();
  await logAccount(`SPL Token ATA Address: ${splTokenATA.toBase58()}`);

  try {
    const tx = await rewardProgram.methods
      .claimReward(new anchor.BN(roundId), bumps, position)
      .accounts({
        claimStatus,
        rewardDistribution,
        nftTokenAccount,
        rewardSource: splTokenATA,
        claimantTokenAccount: claimantATA,
        winnersAccount,
        roundAccount,
        dashboardAccount,
        signer: claimant.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([claimant])
      .rpc();

    await logTx(`Reward claimed: ${tx}`);
    let tokenAccountInfo = await provider.connection.getTokenAccountBalance(
      splTokenATA
    );
    await logAccount(`SPL ATA Address: ${splTokenATA.toBase58()}`);
    await log(`SPL ATA Balance: ${tokenAccountInfo.value.amount}`);
    tokenAccountInfo = await provider.connection.getTokenAccountBalance(
      claimantATA
    );
    await logAccount(`Claimant ATA Address: ${claimantATA.toBase58()}`);
    await log(`Claimant ATA Balance: ${tokenAccountInfo.value.amount}`);
  } catch (error) {
    await log(`Error claiming reward: ${error}`);
    throw error;
  }
}

async function main() {
  await logAccount(`Round Account Address: ${roundAccount.toBase58()}`);
  await logAccount(`Config NFT Address: ${configNft.toBase58()}`);
  await logAccount(
    `Reward Distribution Address: ${rewardDistribution.toBase58()}`
  );

  const roundId = 1; // Get this from the voting state
  const position = 0; // 0 for 1st place, 1 for 2nd place, 2 for 3rd place
  await claimReward(roundId, position, aliceAccount); // Claim 1st place reward
}

if (require.main === module) {
  main();
}
