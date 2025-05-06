import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import * as anchor from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";

// ---- Load environment variables ----
dotenv.config();

// ---- Test accounts ----
export const feePayer = Keypair.fromSecretKey(
  bs58.decode(
    process.env.ENVIRONMENT === "local"
      ? "588FU4PktJWfGfxtzpAAXywSNt74AvtroVzGfKkVN1LwRuvHwKGr851uH8czM5qm4iqLbs1kKoMKtMJG4ATR7Ld2"
      : process.env.FEE_PAYER_SECRET_KEY
  )
);
export const aliceAccount = Keypair.fromSecretKey(
  bs58.decode(
    process.env.ENVIRONMENT === "local"
      ? "4NMwxzmYj2uvHuq8xoqhY8RXg63KSVJM1DXkpbmkUY7YQWuoyQgFnnzn6yo3CMnqZasnNPNuAT2TLwQsCaKkUddp"
      : process.env.ALICE_SECRET_KEY
  )
);

/**
 * Connect to the network and return the connection, provider and Umi instance
 * @returns {connection, provider, umi}
 */
export const connect = () => {
  const URL = process.env[`${process.env.ENVIRONMENT}_URL`];
  console.log(`Connecting to ${URL}`);
  const connection = new Connection(URL, "confirmed");
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(feePayer),
    {
      commitment: "confirmed",
    }
  );
  anchor.setProvider(provider);
  const umi = createUmi(URL).use(walletAdapterIdentity(provider.wallet));
  return { connection, provider, umi };
};

export const checkTokenBalance = async (
  tokenAccount: PublicKey,
  connection: Connection
) => {
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    await log(`Token balance: ${balance.value.amount}`);
    return balance.value.amount;
  } catch (error) {
    await log(`Error checking balance: ${error}`);
    return "0";
  }
};

export const airdrop = async (
  address: PublicKey,
  amount: number,
  provider: any
) => {
  try {
    const signature = await provider.connection.requestAirdrop(
      address,
      amount * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);

    const balance = await provider.connection.getBalance(address);
    await log(
      `${address.toBase58()} balance: ${balance / LAMPORTS_PER_SOL} SOL`
    );
  } catch (error) {
    await log(`Error airdropping ${error}`);
  }
};

export async function checkPrograms(connection: Connection) {
  const metadataProgramId = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  await logAccount(`Metadata Program ID: ${metadataProgramId.toBase58()}`);
  const programInfo = await connection.getAccountInfo(metadataProgramId);

  if (!programInfo) {
    await log(`Token Metadata Program not found!`);
    return false;
  }

  await log(`Token Metadata Program details:`);
  await log(`- Is executable: ${programInfo.executable}`);
  await log(`- Owner: ${programInfo.owner.toBase58()}`);
  await log(`- Data length: ${programInfo.data.length}`);
  await log(`- Lamports: ${programInfo.lamports}`);

  // Check if the program is actually executable
  if (!programInfo.executable) {
    await log(`Warning: Token Metadata Program is not marked as executable!`);
    return false;
  }

  return true;
}

// ---- Logging ----
const logDir = path.join("./scripts/logs");
async function ensureLogDirExists() {
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (err) {
    console.error("Error creating log directory:", err);
  }
}

async function appendToFile(filePath: string, message: string) {
  await fs.appendFile(
    `./scripts/logs/${filePath}`,
    `${new Date().toISOString()} - ${message}\n`,
    "utf-8"
  );
}

export async function logTx(message: string) {
  console.log(message);
  await ensureLogDirExists();
  await Promise.all([
    appendToFile("transactions.txt", message),
    appendToFile("log.txt", message),
  ]);
}

export async function logAccount(message: string) {
  console.log(message);
  await ensureLogDirExists();
  await Promise.all([
    appendToFile("accounts.txt", message),
    appendToFile("log.txt", message),
  ]);
}

export async function log(message: string) {
  console.log(message);
  await ensureLogDirExists();
  await appendToFile("log.txt", message);
}
