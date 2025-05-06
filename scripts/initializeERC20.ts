import * as anchor from "@coral-xyz/anchor";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  AuthorityType,
  createAssociatedTokenAccountInstruction,
  createInitializeAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAccountLenForMint,
  getAssociatedTokenAddress,
  getMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { log, logAccount, logTx } from "./utils/utils";
import { feePayer, connect } from "./utils/utils";
import { GlintReward } from "../target/types/glint_reward";
import { Program } from "@coral-xyz/anchor";

// ---------- Accounts ----------
export const mintERC20 = Keypair.fromSecretKey(
  bs58.decode(
    "4pNBnYYQKHA7HAgU4dJjQo4fiNi3Pz4e4SQeAjc7zP7P7dGeXVDEeSdSkqPWZuPL1E3B64sUHgXedZWUKKmsUiqk"
  )
);
export const splTokenAccount = Keypair.fromSecretKey(
  bs58.decode(
    "FGuiwhg2R5jhDsR7MkgywL58D2WrurV9ehzbEnK8phaa4THUXtTEzeSWAuGHwqGZ1Yvnr5iy5wUS6W3ZRe5r832"
  )
);

// ---- Setup connection and provider ----
const { provider } = connect();

// ---- Wallet ----
export const adminERC20 = provider.wallet;

// ---- Variables ----
let splTokenATA: PublicKey;
let lamports: number;

const rewardProgram = anchor.workspace.GlintReward as Program<GlintReward>;
const [rewardDistribution, bumps] = PublicKey.findProgramAddressSync(
  [Buffer.from("authority_seed")],
  rewardProgram.programId
);

export const getSplTokenATA = async () => {
  return await getAssociatedTokenAddress(
    mintERC20.publicKey,
    splTokenAccount.publicKey,
    true
  );
};

const main = async () => {
  await logAccount(`Fee payer account ${feePayer.publicKey.toBase58()}`);
  await logAccount(`Admin ERC20 account ${adminERC20.publicKey.toBase58()}`);
  await logAccount(`Mint ERC20 account ${mintERC20.publicKey.toBase58()}`);
  await logAccount(`SPL Token Account ${splTokenAccount.publicKey.toBase58()}`);

  await log("Creating ERC20 tokens for the rewards");
  lamports = await provider.connection.getMinimumBalanceForRentExemption(
    MINT_SIZE
  );
  const createMintAccount = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: adminERC20.publicKey,
      newAccountPubkey: mintERC20.publicKey,
      space: MINT_SIZE,
      lamports: lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintERC20.publicKey,
      9,
      adminERC20.publicKey,
      adminERC20.publicKey,
      TOKEN_PROGRAM_ID
    )
  );
  const tx0 = await provider.sendAll([
    { tx: createMintAccount, signers: [mintERC20] },
  ]);
  await logTx(`Created Mint Account Tx ${tx0}`);
  const mintState = await getMint(provider.connection, mintERC20.publicKey);
  const space = await getAccountLenForMint(mintState);
  lamports = await provider.connection.getMinimumBalanceForRentExemption(space);
  const createSPLAccount = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: adminERC20.publicKey,
      newAccountPubkey: splTokenAccount.publicKey,
      space: space,
      lamports: lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeAccountInstruction(
      splTokenAccount.publicKey,
      mintERC20.publicKey,
      adminERC20.publicKey,
      TOKEN_PROGRAM_ID
    )
  );
  const tx1 = await provider.sendAll([
    { tx: createSPLAccount, signers: [splTokenAccount] },
  ]);
  await logTx(`Created SPL Token Account Tx ${tx1}`);
  splTokenATA = await getSplTokenATA();
  await logTx(
    `SPL Token Associated Token Address (ATA) ${splTokenATA.toBase58()}`
  );
  const createSPLATA = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      adminERC20.publicKey,
      splTokenATA,
      splTokenAccount.publicKey,
      mintERC20.publicKey,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );
  const tx2 = await provider.sendAll([{ tx: createSPLATA }]);
  await logTx(`Created SPL Token Tx ${tx2}`);
  const mintTokensToATA: Transaction = new Transaction().add(
    createMintToInstruction(
      mintERC20.publicKey,
      splTokenATA,
      adminERC20.publicKey,
      100000000000
    )
  );
  const tx3 = await provider.sendAll([{ tx: mintTokensToATA }]);
  await logTx(`Minted 100.00000000 Tokens to ATA Tx ${tx3}`);

  const tokenERC20 = await getMint(provider.connection, mintERC20.publicKey);
  await logAccount(`ERC20 Mint Address ${tokenERC20.address.toBase58()}`);
  await log(`ERC20 Total Supply ${tokenERC20.supply.toString()}`);
  await log(`ERC20 Decimals ${tokenERC20.decimals}`);
  let splATAInfo = await provider.connection.getTokenAccountBalance(
    splTokenATA
  );
  await log(`SPL ATA Balance ${splATAInfo.value.amount}`);
  await log(`SPL ATA Balance ${splATAInfo.value.amount}`);

  await log("Transferring ATA authority to Reward Program...");
  console.log(rewardDistribution.toBase58());
  await logAccount(`Reward Distribution PDA ${rewardDistribution.toBase58()}`);
  const transferAuth = new Transaction().add(
    createSetAuthorityInstruction(
      splTokenATA,
      splTokenAccount.publicKey,
      AuthorityType.AccountOwner,
      rewardDistribution
    )
  );
  await logTx(`Transfer Authority Tx ${transferAuth}}`);
  const tx4 = await provider.sendAll([
    { tx: transferAuth, signers: [splTokenAccount] },
  ]);
  await logTx(`Transferred authority to Reward Program ${tx4}`);
};

if (require.main === module) {
  main();
}
