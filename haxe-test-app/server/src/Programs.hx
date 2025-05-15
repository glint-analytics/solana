import externs.solana.web3.SplToken;
import externs.solana.web3.Connection;
import js.node.Crypto;
import promises.Promise;
import externs.anchor.BN;
import js.node.Buffer;
import externs.solana.web3.PublicKey;
import externs.anchor.AnchorProvider;
import externs.solana.web3.Transaction;
import externs.solana.web3.SystemProgram;
import externs.solana.web3.Keypair;
import externs.solana.web3.TransactionInstruction;

class Programs {
	/*
		Program Derived Addresses (PDAs) are addresses that, instead of being public keys, are calculated (or 'found') based on a combination of:

		The program ID
		A set of "seeds" determined by the programmer.

		More on this later, but these seeds will play a role in using PDAs for data storage and retrieval.

		PDAs serve two main functions:

		Provide a deterministic way to find a given item of data for a program
		Authorize the program that owns a PDA to sign on the PDAs behalf, just like a user signs for their own account using their secret key.
	 */
	public function new() {}

	public var configNft = PublicKey.findProgramAddressSync([Buffer.from("config")], untyped externs.anchor.Anchor.workspace.GlintNft.programId)[0];

	public var roundAccount = PublicKey.findProgramAddressSync([Buffer.from("voting_state")], untyped externs.anchor.Anchor.workspace.GlintVote.programId)[0];

	public var rewardDistribution = PublicKey.findProgramAddressSync([Buffer.from("authority_seed")],
		untyped externs.anchor.Anchor.workspace.GlintReward.programId)[0];

	public var glintRewards:GlintRewards = untyped externs.anchor.Anchor.workspace.GlintReward.methods;
	public var glintVote:GlintVote = untyped externs.anchor.Anchor.workspace.GlintVote.methods;

	/////   ------------------------------      Intialization functions
	// We have to initialize all accounts that are the glint apps with
	//  - my_storage: the struct  of type MyStorage
	//  - signer: the wallet that is paying for the “gas” for storage of the struct
	//  - system_program: a program that is built into the Solana runtime  that transfers SOL from one account to another

	/*
		The discriminator is defined by the first 8 bytes of the Sha256 hash of the account's Rust identifier--i.e., the struct type name--and ensures no account can be substituted for another. It lets Anchor know what type of account it should deserialize the data as.
		example:
		Say a Program has two types of accounts that are owned by itself (Account A and Account B). Both have identical fields. Instruction foo is meant to take Account A, but a user passes Account B, which is still owned by the program and has the same fields. How will the program know to throw an Error?
	 */
	public function getInstructionDiscriminator(ixName:String):Buffer {
		return Buffer.from(Crypto.createHash("sha256").update('global:${ixName}').digest().slice(0, 8));
	}

	public function initializeNft(connection:Connection) {
		return new Promise((resolve, reject) -> {
			var discriminator = getInstructionDiscriminator("initialize");
			var initializeIx = new TransactionInstruction({
				programId: untyped externs.anchor.Anchor.workspace.GlintNft.programId,
				keys: [
					{pubkey: configNft, isSigner: false, isWritable: true},
					{pubkey: Utils.feePayer.publicKey, isSigner: true, isWritable: true},
					{pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
				],
				data: discriminator,
			});
			var transaction = new Transaction().add(initializeIx);

			connection.sendTransaction(transaction, [Utils.feePayer], {skipPreflight: false}).then(_ -> {
				connection.confirmTransaction(_);
			}).then(_ -> {
				resolve(_);
			}, error -> {
				reject(error);
			});
		});
	}

	public function initializeVoteRound(connection:Connection, roundId:Int) {
		return new Promise((resolve, reject) -> {
			var roundIdBuffer = untyped new BN(roundId).toArrayLike(Buffer, "le", 8);
			var discriminator = getInstructionDiscriminator("initialize");
			var instructionData = Buffer.concat([discriminator, roundIdBuffer]);

			var initializeIx = new TransactionInstruction({
				programId: untyped externs.anchor.Anchor.workspace.GlintVote.programId, // PROGRAM_ID_VOTE,
				keys: [
					{pubkey: roundAccount, isSigner: false, isWritable: true},
					{pubkey: configNft, isSigner: false, isWritable: true},
					{pubkey: Utils.feePayer.publicKey, isSigner: true, isWritable: true},
					{pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
				],
				data: instructionData,
			});
			var transaction = new Transaction().add(initializeIx);
			connection.sendTransaction(transaction, [Utils.feePayer], {skipPreflight: false}).then(_ -> {
				connection.confirmTransaction(_);
			}).then(_ -> {
				resolve(_);
			}, error -> {
				trace(error);
			});
		});
	}

	public function initializeReward(connection:Connection) {
		return new Promise((resolve, reject) -> {
			var discriminator = getInstructionDiscriminator("initialize");

			var initializeIx = new TransactionInstruction({
				programId: untyped externs.anchor.Anchor.workspace.GlintReward.programId, // PROGRAM_ID_VOTE,
				keys: [
					{pubkey: rewardDistribution, isSigner: false, isWritable: true},
					{pubkey: configNft, isSigner: false, isWritable: true},
					{pubkey: Utils.feePayer.publicKey, isSigner: true, isWritable: true},
					{pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
				],
				data: discriminator,
			});

			var transaction = new Transaction().add(initializeIx);

			connection.getLatestBlockhash().then(_ -> {
				trace(_);
				transaction.recentBlockhash = _.blockhash;
				transaction.feePayer = Utils.feePayer.publicKey;
				// preflightCommitment is the commitment used for the preflight transaction, AKA the transaction simulation https://solana.com/fr/docs/rpc#configuring-state-commitment
				return connection.sendTransaction(transaction, [Utils.feePayer], {
					skipPreflight: false,
					maxRetries: 3,
					preflightCommitment: "confirmed"
				});
			}).then(_ -> {
				trace(_);
				/*

					  
					const confirmation = await connection.confirmTransaction(
						  confirmationStrategy
					);
					  
					if (confirmation.value.err) {
						  throw new Error(
					`Transaction failed: ${JSON.stringify(confirmation.value.err)}`
						  ); */
				/*
					var confirmationStrategy = {
					  signature,
					  blockhash,
					  lastValidBlockHeight,
						};
					trace(a);




				 */
			}, error -> {
				trace(error);
			});
		});
	}

	/*
		  public var PROGRAM_ID_VOTE = new PublicKey("8TXZnvZDgkWFVk8vmTGxdCqvTA8pjiu6gjVjGbwcAyfq");

		public var PROGRAM_ID_NFT = new PublicKey("9q2DR84bJri6Xoryq95RBsFKjo9kKecwSAZ5ptbSjrNu"); */
	////  --------------------------------       Program functions

	public function configureRewards(provider:AnchorProvider, rewardAmounts:Array<Float>) {
		return new Promise((resolve, reject) -> {
			var bNRewards = [];
			for (n in rewardAmounts) {
				bNRewards.push(new BN(n));
			}
			glintRewards.configureRewards(bNRewards).accounts({
				rewardDistribution: rewardDistribution,
				config: configNft,
				signer: provider.publicKey,
			}).rpc().then(_ -> {
				trace(_);
				resolve(_);
			}, error -> {
				trace(error);
				reject(error);
			});
		});
	}

	public function initVotePeriod(provider:AnchorProvider, durationSec:Float) {
		return new Promise((resolve, reject) -> {
			glintVote.initVotePeriod(new BN(durationSec)).accounts({
				roundAccount: roundAccount,
				config: configNft
			}).rpc().then(_ -> {
				trace(_);
				resolve(_);
			}, error -> {
				reject(error);
			});
		});
	}

	/*

		  
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
	};*/
	public function initializeERC(provider:AnchorProvider, connection:Connection) {
		var adminERC20 = provider.wallet;
		var mintERC20 = Keypair.fromSecretKey(Externs.Bs58.decode("4pNBnYYQKHA7HAgU4dJjQo4fiNi3Pz4e4SQeAjc7zP7P7dGeXVDEeSdSkqPWZuPL1E3B64sUHgXedZWUKKmsUiqk"));
		var splTokenAccount = Keypair.fromSecretKey(Externs.Bs58.decode("FGuiwhg2R5jhDsR7MkgywL58D2WrurV9ehzbEnK8phaa4THUXtTEzeSWAuGHwqGZ1Yvnr5iy5wUS6W3ZRe5r832"));


		var mintSpace = null;
		return new Promise((resolve, reject) -> {
			SplToken.getAssociatedTokenAddress(mintERC20.publicKey, splTokenAccount.publicKey, true);
		}).then(_ -> {
			return connection.getMinimumBalanceForRentExemption(SplToken.MINT_SIZE);
		}).then(lamports -> {
			/*
				trace('Fee payer account ${Utils.feePayer.publicKey.toBase58()}');
									trace('Admin ERC20 account ${adminERC20.publicKey.toBase58()}');
									trace('Mint ERC20 account ${mintERC20.publicKey.toBase58()}');
									 trace('SPL Token Account ${splTokenAccount.publicKey.toBase58()}');
			 */
			trace("Creating ERC20 tokens for the rewards");
			var createMintAccount = new Transaction().add(SystemProgram.createAccount({
				fromPubkey: adminERC20.publicKey,
				newAccountPubkey: mintERC20.publicKey,
				space: SplToken.MINT_SIZE,
				lamports: lamports,
				programId: SplToken.TOKEN_PROGRAM_ID,
			}),
				SplToken.createInitializeMintInstruction(mintERC20.publicKey, 9, adminERC20.publicKey, adminERC20.publicKey, SplToken.TOKEN_PROGRAM_ID));

			return untyped provider.sendAll([{tx: createMintAccount, signers: [mintERC20]}]);
		}).then(_ -> {
			trace( 'Created Mint Account Tx ${_}');

			return SplToken.getMint(connection, mintERC20.publicKey); //provider.connection
		}).then(mintState -> {
			return SplToken.getAccountLenForMint(mintState); //provider.connection
		}).then(space -> {
			return connection.getMinimumBalanceForRentExemption(space);
		}).then(lamports -> {
			var createSPLAccount = new Transaction().add(
			SystemProgram.createAccount({
				fromPubkey: adminERC20.publicKey,
			  newAccountPubkey: splTokenAccount.publicKey,
			  space: mintSpace,
			  lamports: lamports,
			  programId: SplToken.TOKEN_PROGRAM_ID,
			}),
			SplToken.createInitializeAccountInstruction(
			  splTokenAccount.publicKey,
			  mintERC20.publicKey,
			  adminERC20.publicKey,
			  SplToken.TOKEN_PROGRAM_ID
			));
			//return connection.getMinimumBalanceForRentExemption(space);

			return untyped provider.sendAll([{tx: createSPLAccount, signers: [splTokenAccount]}]);
		}).then(tx -> {
			trace( 'Created SPL Token Account Tx ${tx}');
			return null; //SplToken.getSplTokenATA();
		}).then(splTokenATA -> {
				//SPL Token Associated Token Address (ATA) ${splTokenATA.toBase58()}`
			var createSPLATA  =  new Transaction().add(
				SplToken.createAssociatedTokenAccountInstruction(
				  adminERC20.publicKey,
				  splTokenATA,
				  splTokenAccount.publicKey,
				  mintERC20.publicKey,
				  SplToken.TOKEN_PROGRAM_ID,
				  SplToken.ASSOCIATED_TOKEN_PROGRAM_ID
				)
				  );
		}, error ->{
			trace(error);
		});

/*
			  const tx2 = await provider.sendAll([{ tx: createSPLATA }]);
			  await logTx(`Created SPL Token Tx ${tx2}`);
			  const mintTokensToATA: Transaction = new Transaction().add(
			createMintToInstruction(
			  mintERC20.publicKey,
			  splTokenATA,
			  adminERC20.publicKey,
			  100000000000
			)
			  ); */
	}

	// SendTransactionError: Simulation failed.
	// Message: Transaction simulation failed: Attempt to debit an account but found no record of a prior credit..
	// Prgrams weree not deployed
	// TypeError: src.toArrayLike is not a function
	// e parameters I was passing to the program.methods function had the wrong order.
}

extern class GlintRewards {
	public function configureRewards(rewardAmounts:Array<Dynamic>):Dynamic;
}

extern class GlintVote {
	public function initialize(n:Float):Dynamic;

	public function initVotePeriod(duration:Dynamic):Dynamic;
}
