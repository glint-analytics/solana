import {
  Keypair,
  Transaction,
  SystemProgram,
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import * as bs58 from "bs58";
import { Buffer } from "buffer";
import { createHash } from "crypto";
import { log, logAccount, connect, feePayer, logTx } from "./utils/utils";

// ---------- Accounts ----------
const PROGRAM_ID = new PublicKey(
  "7TQ26XbDSZMda68uSueTLGQ9zXEN3Tx5bMyoLMSzKSzN"
);

// ---- Setup connection ----
const { connection } = connect();

// Function to generate a discriminator for the instruction
function getInstructionDiscriminator(ixName: string): Buffer {
  return Buffer.from(
    createHash("sha256").update(`global:${ixName}`).digest().slice(0, 8)
  );
}

const initialize = async () => {
  await logAccount(`Program ID ${PROGRAM_ID.toBase58()}`);
  await logAccount(`Fee payer account ${feePayer.publicKey.toBase58()}`);

  // Find the PDA for the config account
  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  await logAccount(`Config PDA ${configPDA.toBase58()}`);

  // Generate the discriminator for the instruction
  const discriminator = getInstructionDiscriminator("initialize");

  const initializeIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });

  const transaction = new Transaction().add(initializeIx);

  try {
    const signature = await connection.sendTransaction(
      transaction,
      [feePayer],
      { skipPreflight: false }
    );

    await connection.confirmTransaction(signature);
    await logTx(`Transaction signature ${signature}`);
  } catch (error) {
    await log(`Error in transaction: ${error}`);
  }
};

(async () => {
  await initialize();
})();
