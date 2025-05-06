import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GlintVote } from "../target/types/glint_vote";
import { GlintNft } from "../target/types/glint_nft";
import { GlintReward } from "../target/types/glint_reward";
import {
  PublicKey,
} from "@solana/web3.js";
import {
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

/**
 * @param rewardAmounts - The amount of rewards to configure
 * @description Configures the rewards
 * @example rewardAmounts = [1000000000, 500000000, 250000000] - 1 token, 0.5 token, 0.25 token
 */
async function configureRewards(rewardAmounts: [number, number, number]) {
  await log(`Configuring rewards: ${rewardAmounts}`);
  try {
    const tx = await rewardProgram.methods
      .configureRewards(rewardAmounts.map((amount) => new anchor.BN(amount)))
      .accounts({
        rewardDistribution,
        config: configNft,
        signer: provider.publicKey,
      })
      .rpc();

    await logTx(`Rewards configured: ${tx}`);
  } catch (error) {
    await log(`Error configuring rewards: ${error}`);
    throw error;
  }
}

async function main() {
  await logAccount(`Round Account Address: ${roundAccount.toBase58()}`);
  await logAccount(`Config NFT Address: ${configNft.toBase58()}`);

  // Configure rewards (in token smallest units)
  const rewardAmounts: [number, number, number] = [
    1000000000, // 1st place: 1 token
    500000000, // 2nd place: 0.5 token
    250000000, // 3rd place: 0.25 token
  ];

  await configureRewards(rewardAmounts);
}

if (require.main === module) {
  main();
}
