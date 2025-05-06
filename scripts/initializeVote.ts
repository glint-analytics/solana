import { BN } from "@coral-xyz/anchor";
import {
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { createHash } from "crypto";
import { connect, log, logAccount, feePayer, logTx } from "./utils/utils";

// ---------- Accounts ----------
const PROGRAM_ID_VOTE = new PublicKey(
  "EyV27BM3gG2a9LozgN2cUL89gZ9SKQvq3PtaKiXQMyRe"
);

const PROGRAM_ID_NFT = new PublicKey(
  "7TQ26XbDSZMda68uSueTLGQ9zXEN3Tx5bMyoLMSzKSzN"
);

// ---- Setup connection ----
const { connection } = connect();

function getInstructionDiscriminator(ixName: string): Buffer {
  return Buffer.from(
    createHash("sha256").update(`global:${ixName}`).digest().slice(0, 8)
  );
}

const initialize = async () => {
  await logAccount(`Program ID VOTE ${PROGRAM_ID_VOTE.toBase58()}`);
  await logAccount(`Program ID NFT ${PROGRAM_ID_NFT.toBase58()}`);
  await logAccount(`Fee payer account ${feePayer.publicKey.toBase58()}`);

  const [configPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID_NFT
  );
  await logAccount(`Config PDA ${configPDA.toBase58()}`);

  const [roundPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("voting_state")],
    PROGRAM_ID_VOTE
  );
  await logAccount(`Round PDA ${roundPDA.toBase58()}`);

  const roundId = new BN(1);
  const roundIdBuffer = roundId.toArrayLike(Buffer, "le", 8);

  const discriminator = getInstructionDiscriminator("initialize");
  const instructionData = Buffer.concat([discriminator, roundIdBuffer]);

  const initializeIx = new TransactionInstruction({
    programId: PROGRAM_ID_VOTE,
    keys: [
      { pubkey: roundPDA, isSigner: false, isWritable: true },
      { pubkey: configPDA, isSigner: false, isWritable: true },
      { pubkey: feePayer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
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
