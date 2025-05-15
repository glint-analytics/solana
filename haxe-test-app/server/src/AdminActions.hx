import js.Syntax;
import externs.metaplex.Umi;
import js.node.Buffer;
import externs.metaplex.MplTokenMedata;
import externs.solana.web3.Keypair;
import externs.solana.web3.PublicKey;
import externs.solana.web3.SplToken;
import externs.solana.web3.Transaction;
import externs.anchor.BN;
import externs.anchor.AnchorProvider;
import externs.solana.web3.Connection;
import promises.Promise;
import externs.solana.web3.SystemProgram;

class AdminActions {
    public static function initializeNft(provider:AnchorProvider, connection:Connection) {
		return new Promise((resolve, reject) -> {
			var transaction = AdminTransactions.initializeNft(provider.publicKey);
            
			connection.sendTransaction(transaction, [Config.feePayer], {skipPreflight: false}).then(_ -> {
				connection.confirmTransaction(_);
			}).then(_ -> {
				resolve(_);
			}, error -> {
				trace(error);
				reject(error);
			});
		});
	}

	public static function initializeVoteRound(provider:AnchorProvider, connection:Connection, roundId:Int) {
		return new Promise((resolve, reject) -> {
			var transaction = AdminTransactions.initializeVoteRound(provider.publicKey, roundId);
			connection.sendTransaction(transaction, [Config.feePayer], {skipPreflight: false}).then(_ -> {
				trace(_);
				connection.confirmTransaction(_);
			}).then(_ -> {
				trace(_);
				resolve(_);
			}, error -> {
				trace(error);
			});
		});
	}

	public static function initializeReward(provider:AnchorProvider, connection:Connection) {
		return new Promise((resolve, reject) -> {
			var transaction = AdminTransactions.initializeReward(provider.publicKey);

			connection.getLatestBlockhash().then(_ -> {
				transaction.recentBlockhash = _.blockhash;
				transaction.feePayer = Config.feePayer.publicKey;
				// preflightCommitment is the commitment used for the preflight transaction, AKA the transaction simulation https://solana.com/fr/docs/rpc#configuring-state-commitment
				return connection.sendTransaction(transaction, [Config.feePayer], {
					skipPreflight: false,
					maxRetries: 3,
					preflightCommitment: "confirmed"
				});
			}).then(_ -> {
				trace(_);
				resolve(_);
			}, error -> {
				trace(error);
			});
		});
	}

	// ------------------------------------------------------------------------------------------------


	public var glintNft:GlintNftProgram = untyped externs.anchor.Anchor.workspace.GlintNft.methods;
	public var glintRewards:GlintRewardsProgram = untyped externs.anchor.Anchor.workspace.GlintReward.methods;
	public var glintVote:GlintVoteProgram = untyped externs.anchor.Anchor.workspace.GlintVote.methods;



	public function new(){

	}
	public function initVotePeriod(provider:AnchorProvider, durationSec:Float) {
		return new Promise((resolve, reject) -> {
			glintVote.initVotePeriod(new BN(durationSec)).accounts({
				roundAccount: Transactions.voteAccountPubKey,
				config: Transactions.configAccountPubKey,
			}).rpc().then(_ -> {
				trace(_);
				resolve(_);
			}, error -> {
				reject(error);
			});
		});
	}

	public function configureRewards(provider:AnchorProvider, rewardAmounts:Array<Float>) {
		return new Promise((resolve, reject) -> {
			var bNRewards = [];
			for (n in rewardAmounts) {
				bNRewards.push(new BN(n));
			}
			glintRewards.configureRewards(bNRewards).accounts({
				rewardDistribution: Transactions.rewardAccountPubKey,
				config: Transactions.configAccountPubKey,
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

	public function mintNFT(connection:Connection, umi:Dynamic, dashboardId:Int, recipientPK: PublicKey):Promise<Bool> {

		return new Promise((resolve, reject) -> {

			// In Solana, each token is uniquely identified by a Mint Address
			var mint = Keypair.generate();
			trace('Mint account ${mint.publicKey.toBase58()}');


		  var transaction = AdminTransactions.mintNFT(umi, mint, dashboardId, recipientPK);
				
		  connection.sendTransaction(transaction, [Config.feePayer, mint], {skipPreflight: false}).then(_ -> {
			connection.confirmTransaction(_);
		  }).then(_ -> {
			resolve(_);
		  }, error -> {
			trace(error);
			reject(error);
		  });
		});
	  }

	public function mintNFTAnchor(provider:AnchorProvider, umi:Dynamic, dashboardId:Int, recipientPubKey:PublicKey) {
		return new Promise((resolve, reject) -> {
			trace('Fee payer account ${provider.publicKey.toBase58()}');
			trace('Recipient account ${recipientPubKey.toBase58()}');
			
			trace('Config account ${Transactions.configAccountPubKey.toBase58()}');

			trace('Dashboard ID ${dashboardId}');

			var dashboardPDA = PublicKey.findProgramAddressSync(
				[new BN(dashboardId).toArrayLike(Buffer, "le", 16)],
				Config.glintNftProgramId
			)[0];

			trace('Dashboard PDA ${dashboardPDA.toBase58()}');

			// In Solana, each token is uniquely identified by a Mint Address
			var mint = Keypair.generate();
			trace('Mint account ${mint.publicKey.toBase58()}');


			// The Token Metadata account holds properties of the token such as name, off chain metadata uri, description of the token, and the tokens symbol
			var metadataPDA = MplTokenMetadata.findMetadataPda(umi, {
				mint: Umi.publicKey(mint.publicKey),
			})[0];

			// While the Mint account of stores initial minting details of Mint such as number of decimals, the total supply, and mint and freeze authorities
			
			var masterEditionPDA = MplTokenMetadata.findMasterEditionPda(umi, {
				mint: Umi.publicKey(mint.publicKey),
			})[0];


			// If we are minting the tokens straight away then we need a place to store the tokens in someones wallet.
			// To do this we mathematically generate an address based on both the wallet and mint address which is called a Associated Token Account (ATA) 
			// or sometimes just referred to as just a Token Account.
			// This Token Account (ATA) belongs to the wallet and stores our tokens for us.
			SplToken.getAssociatedTokenAddress(
				mint.publicKey,
				recipientPubKey
			).then (associatedTokenAccount -> {
				trace('Associated token account ${associatedTokenAccount.toBase58()}');
				glintNft.mintNft(
					new BN(dashboardId),
					"Glint",
					"GLINT",
					"https://your-metadata-url.com"
				).accounts({
					signer: provider.publicKey,
					mint: mint.publicKey,
					config: AdminTransactions.configNft,
					dashboardAccount: dashboardPDA,
					recipientAccount: recipientPubKey,
					associatedTokenAccount: associatedTokenAccount,
					metadataAccount: metadataPDA,
					masterEditionAccount: masterEditionPDA,
					tokenProgram: SplToken.TOKEN_PROGRAM_ID,
					associatedTokenProgram: SplToken.ASSOCIATED_TOKEN_PROGRAM_ID,
					tokenMetadataProgram: MplTokenMetadata.MPL_TOKEN_METADATA_PROGRAM_ID,
					systemProgram: SystemProgram.programId,
					//rent: Syntax.code('anchor.web3.SYSVAR_RENT_PUBKEY'),
				}).signers([mint]).rpc({ skipPreflight: true });
			}).then (tx -> {
				trace('Mint transaction successful: ${tx}');
				resolve(mint.publicKey);
			}, error -> {
				trace('Error minting NFT: ${error}');
				if (untyped error.logs) {
					untyped trace('Detailed logs: ${error.logs}');
				}
				reject(error);
			});
		});
	}


	public function initializeERC(provider:AnchorProvider, connection:Connection) {
		var adminERC20 = provider.wallet;
		/*
		var splTokenAccount = Keypair.fromSecretKey(Reflect.field(Bs58, "default")
			.decode("FGuiwhg2R5jhDsR7MkgywL58D2WrurV9ehzbEnK8phaa4THUXtTEzeSWAuGHwqGZ1Yvnr5iy5wUS6W3ZRe5r832"));

		trace('Fee payer account ${Config.feePayer.publicKey.toBase58()}');
		trace('Admin ERC20 account ${adminERC20.publicKey.toBase58()}');
		trace('Mint ERC20 account ${adminERC20.publicKey.toBase58()}');
		trace('SPL Token account ${adminERC20.publicKey.toBase58()}');
		var mintSpace = null;
		var splTokenATA = null;*/

		/**
		Token Program handles tokens in separate “accounts” known as “mint accounts”, while user tokens are stored in individual “token accounts”.
		
		
		In Solana, each token is uniquely identified by a Mint Address. The underlying idea is similar—this is the on-chain pointer for that specific token


		 On Solana, each user already has an ATA(Associated token accounts) recognized by the Token Program
		
		
		Creating The Mint Account and Token Metadata

While the Mint account of stores initial minting details of Mint such as number of decimals, the total supply, and mint and freeze authorities, the Token Metadata account holds properties of the token such as name, off chain metadata uri, description of the token, and the tokens symbol. Together these accounts provide all the information for a SPL Token on Solana.
		
		 **/

		 /*
		return new Promise((resolve, reject) -> {
			connection.getMinimumBalanceForRentExemption(SplToken.MINT_SIZE)
				.then(lamports -> {
					
					//	trace('Fee payer account ${Config.feePayer.publicKey.toBase58()}');
					//						trace('Admin ERC20 account ${adminERC20.publicKey.toBase58()}');
					//						trace('Mint ERC20 account ${Config.mintERC20.publicKey.toBase58()}');
				//							 trace('SPL Token Account ${splTokenAccount.publicKey.toBase58()}');
					
					trace("Creating ERC20 tokens for the rewards");
					var createMintAccount = new Transaction().add(SystemProgram.createAccount({
						fromPubkey: adminERC20.publicKey,
						newAccountPubkey: Config.mintERC20.publicKey,
						space: SplToken.MINT_SIZE,
						lamports: lamports,
						programId: SplToken.TOKEN_PROGRAM_ID,
					}),
						SplToken.createInitializeMintInstruction(Config.mintERC20.publicKey, 9, adminERC20.publicKey, adminERC20.publicKey,
							SplToken.TOKEN_PROGRAM_ID));

					return untyped provider.sendAll([{tx: createMintAccount, signers: [Config.mintERC20]}]);
				})
				.then(_ -> {
					trace('Created Mint Account Tx ${_}');

					return SplToken.getMint(connection, Config.mintERC20.publicKey); // provider.connection
				})
				.then(mintState -> {
					trace('Created Mint State $mintState');
					return SplToken.getAccountLenForMint(mintState); // provider.connection
				})
				.then(space -> {
					mintSpace = space;
					return connection.getMinimumBalanceForRentExemption(space);
				})
				.then(lamports -> {
					trace('Lamports $lamports');
					var createSPLAccount = new Transaction().add(SystemProgram.createAccount({
						fromPubkey: adminERC20.publicKey,
						newAccountPubkey: splTokenAccount.publicKey,
						space: mintSpace,
						lamports: lamports,
						programId: SplToken.TOKEN_PROGRAM_ID,
					}),
						SplToken.createInitializeAccountInstruction(splTokenAccount.publicKey, Config.mintERC20.publicKey, adminERC20.publicKey,
							SplToken.TOKEN_PROGRAM_ID));
					return untyped provider.sendAll([{tx: createSPLAccount, signers: [splTokenAccount]}]);
				})
				.then(tx -> {
					trace('Created SPL Token Account Tx ${tx}');
					return SplToken.getAssociatedTokenAddress(Config.mintERC20.publicKey, splTokenAccount.publicKey, true);
				})
				.then(_splTokenATA -> {
					trace('SPL Token Associated Token Address (ATA) ${splTokenATA.toBase58()}');
					// SPL Token Associated Token Address (ATA) ${splTokenATA.toBase58()}`
					splTokenATA = _splTokenATA;
					var createSPLATA = new Transaction().add(
						SplToken.createAssociatedTokenAccountInstruction(
							adminERC20.publicKey,
							splTokenATA,
							splTokenAccount.publicKey,
							Config.mintERC20.publicKey,
							SplToken.TOKEN_PROGRAM_ID,
							SplToken.ASSOCIATED_TOKEN_PROGRAM_ID));
					return untyped provider.sendAll([{ tx: createSPLATA }]);
				}).then(tx2 -> {
					trace('Created SPL Token Tx ${tx2}');
					var mintTokensToATA: Transaction = new Transaction().add(
						SplToken.createMintToInstruction(
						  Config.mintERC20.publicKey,
						  cast splTokenATA,
						  adminERC20.publicKey,
						  100000000000
						)
					  );
					  return untyped provider.sendAll([{ tx: mintTokensToATA }]);
				}).then(tx3 -> {
					trace('Created SPL Token Tx ${tx3}');
					trace('Minted 100.00000000 Tokens to ATA Tx ${tx3}');

					return SplToken.getMint(connection, Config.mintERC20.publicKey); // provider.connection
				}).then(tokenERC20  -> {
					trace('ERC20 Mint Address ${tokenERC20.address.toBase58()}');
					trace('ERC20 Total Supply ${tokenERC20.supply.toString()}');
					trace('ERC20 Decimals ${tokenERC20.decimals}');
					return connection.getTokenAccountBalance(
						cast splTokenATA
					  );
				}).then(splATAInfo  -> {
					//trace('SPL ATA Balance ${splATAInfo.value.amount}');
					trace("Transferring ATA authority to Reward Program...");
					trace(rewardDistribution.toBase58());
					trace('Reward Distribution PDA ${rewardDistribution.toBase58()}');
					var transferAuth = new Transaction().add(
						SplToken.createSetAuthorityInstruction(
						  cast splTokenATA,
						  splTokenAccount.publicKey,
						  AuthorityType.AccountOwner,
						  rewardDistribution
						)
					  );
					trace('Transfer Authority Tx ${transferAuth}}');
					return  untyped provider.sendAll([
						{ tx: transferAuth, signers: [splTokenAccount] },
					  ]);
				}).then(tx4 -> {
					trace('Transferred authority to Reward Program ${tx4}');
				}, error -> {
					trace(error);
				});
		});*/
		return null;
	}
}

//// ------------------------------------------------------------------------------

extern class GlintRewardsProgram {
	public function configureRewards(rewardAmounts:Array<Dynamic>):Dynamic;
}

extern class GlintVoteProgram {
	public function initialize(n:Float):Dynamic;

	public function initVotePeriod(duration:Dynamic):Dynamic;
	public function vote(dashboardId:BN, roundId:BN):Dynamic;
}

extern class GlintNftProgram {
	public function initialize(n:Float):Dynamic;

	public function mintNft(dashboardId:BN, name:String, symbol:String, URI:String):Dynamic;
}