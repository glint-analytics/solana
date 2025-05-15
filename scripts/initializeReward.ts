import {
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { createHash } from "crypto";
import { log, logAccount, feePayer, connect, logTx } from "./utils/utils";

// ---------- Accounts ----------
const PROGRAM_ID_REWARD = new PublicKey(
  "7y85MrK95Z9cPVsdSbLKrsGPHjAxPA8HCpY13WFZs5nE"
);

const PROGRAM_ID_NFT = new PublicKey(
  "7TQ26XbDSZMda68uSueTLGQ9zXEN3Tx5bMyoLMSzKSzN"
);


glint_nft = "7TQ26XbDSZMda68uSueTLGQ9zXEN3Tx5bMyoLMSzKSzN"
glint_vote = "EyV27BM3gG2a9LozgN2cUL89gZ9SKQvq3PtaKiXQMyRe"
glint_reward = "7y85MrK95Z9cPVsdSbLKrsGPHjAxPA8HCpY13WFZs5nE"

// ---- Setup connection ----
const { connection } = connect();

function getInstructionDiscriminator(ixName: string): Buffer {
  return Buffer.from(
    createHash("sha256").update(`global:${ixName}`).digest().slice(0, 8)
  );
}

const initialize = async () => {
  await logAccount(`Program ID REWARD ${PROGRAM_ID_REWARD.toBase58()}`);
  await logAccount(`Program ID NFT ${PROGRAM_ID_NFT.toBase58()}`);
  await logAccount(`Fee payer account ${feePayer.publicKey.toBase58()}`);

  // Get the PDAs
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")], // Changed back to "config"
    PROGRAM_ID_NFT
  );
  await logAccount(`Config PDA ${configPDA.toBase58()}`);

  const [rewardDistribution, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("authority_seed")],
    PROGRAM_ID_REWARD
  );
  await logAccount(`Reward Distribution PDA ${rewardDistribution.toBase58()}`);

  // Add this to check if the account exists
  const configInfo = await connection.getAccountInfo(configPDA);
  if (!configInfo) {
    await log("Config account does not exist!");
    return;
  }
  await log("Config account exists");

  const discriminator = getInstructionDiscriminator("initialize");

  const initializeIx = new TransactionInstruction({
    programId: PROGRAM_ID_REWARD,
    keys: [
      { pubkey: rewardDistribution, isSigner: false, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });

  try {
    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const transaction = new Transaction().add(initializeIx);
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = feePayer.publicKey;

    const signature = await connection.sendTransaction(
      transaction,
      [feePayer],
      {
        skipPreflight: false,
        maxRetries: 3,
        preflightCommitment: "confirmed",
      }
    );

    await log("Waiting for confirmation...");

    const confirmationStrategy = {
      signature,
      blockhash,
      lastValidBlockHeight,
    };

    const confirmation = await connection.confirmTransaction(
      confirmationStrategy
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    await logTx(`Transaction successful! Signature: ${signature}`);
  } catch (error) {
    await log(`Detailed error: ${error}`);
    if (error.logs) {
      await log(`Program logs: ${error.logs}`);
    }
  }
};

(async () => {
  await initialize();
})();
