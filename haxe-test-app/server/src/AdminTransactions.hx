import externs.solana.web3.TransactionInstruction;
import externs.solana.web3.Transaction;
import promises.Promise;
import externs.solana.web3.AuthorityType;
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
import externs.metaplex.MplTokenMedata;
import externs.metaplex.Umi;
import Externs.Bs58;

/**
	Admin transaction are transactions that should only be used by Glint admin
	which means we could use Anchor instead of a normal wallet, depending on the interface we want.

**/
class AdminTransactions extends Transactions {
	public static var configNft = PublicKey.findProgramAddressSync([Buffer.from("config")], Config.glintNftProgramId)[0];

	public static function initializeNft(adminKey:PublicKey):Transaction {
		var discriminator = Transactions.getInstructionDiscriminator("initialize");
		trace(PublicKey.findProgramAddressSync([Buffer.from("config")], Config.glintNftProgramId)[0], configNft, Transactions.configAccountPubKey);
		var initializeIx = new TransactionInstruction({
			programId: Config.glintNftProgramId,
			keys: [
				{pubkey: Transactions.configAccountPubKey, isSigner: false, isWritable: true},
				{pubkey: adminKey, isSigner: true, isWritable: true},
				{pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
			],
			data: discriminator,
		});
		var transaction = new Transaction().add(initializeIx);
		return transaction;
	}

	public static function initializeVoteRound(adminKey:PublicKey, roundId:Int):Transaction {
		var roundIdBuffer = new BN(roundId).toArrayLike(Buffer, "le", 8);
		var discriminator = Transactions.getInstructionDiscriminator("initialize");
		var instructionData = Buffer.concat([discriminator, roundIdBuffer]);

		var initializeIx = new TransactionInstruction({
			programId: Config.glintVoteProgramId,
			keys: [
				{pubkey: Transactions.voteAccountPubKey, isSigner: false, isWritable: true},
				{pubkey: Transactions.configAccountPubKey, isSigner: false, isWritable: true},
				{pubkey: adminKey, isSigner: true, isWritable: true},
				{pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
			],
			data: instructionData,
		});
		return new Transaction().add(initializeIx);
	}

	public static function initializeReward(adminKey:PublicKey):Transaction {
		var discriminator = Transactions.getInstructionDiscriminator("initialize");

		var initializeIx = new TransactionInstruction({
			programId: Config.glintRewardProgramId,
			keys: [
				{pubkey: Transactions.rewardAccountPubKey, isSigner: false, isWritable: true},
				{pubkey: Transactions.configAccountPubKey, isSigner: false, isWritable: true},
				{pubkey: Config.feePayer.publicKey, isSigner: true, isWritable: true},
				{pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
			],
			data: discriminator,
		});

		var transaction = new Transaction().add(initializeIx);
		transaction.feePayer = adminKey;
		return transaction;
	}

    public static function mintNFT(umi:Dynamic, mint:Keypair, dashboardId:Int, recipientPubKey:PublicKey) {
        // return new Promise((resolve, reject) -> {
        var dashboardPDA = PublicKey.findProgramAddressSync([new BN(dashboardId).toArrayLike(Buffer, "le", 16)], Config.glintNftProgramId)[0];

        trace('Dashboard PDA ${dashboardPDA.toBase58()}');
        trace(recipientPubKey);
        trace(mint);

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
        trace(mint.publicKey, recipientPubKey);
        var associatedTokenAccount = SplToken.getAssociatedTokenAddressSync( mint.publicKey, recipientPubKey); // .then(associatedTokenAccount -> {
        trace(associatedTokenAccount );
        // You can calculate the discriminator by hashing the namespace and the instruction name. For instructions, the namespace is typically "global"

        var discriminator = Transactions.getInstructionDiscriminator("mint_nft");
        // Serialize dashboardId (assuming it's a u64)
        var dashboardIdBuffer = new BN(dashboardId).toArrayLike(Buffer, 'le', 16);

        // Serialize name ("Glint")
        var name = "Glint";
        var nameBuffer = Buffer.from(name, 'utf8');
        var nameLengthBuffer = Buffer.alloc(4);
        nameLengthBuffer.writeUInt32LE(nameBuffer.length, 0);

        // Serialize symbol ("GLINT")
        var symbol = "GLINT";
        var symbolBuffer = Buffer.from(symbol, 'utf8');
        var symbolLengthBuffer = Buffer.alloc(4);
        symbolLengthBuffer.writeUInt32LE(symbolBuffer.length, 0);

        // Serialize uri ("https://your-metadata-url.com")
        var uri = "https://your-metadata-url.com";
        var uriBuffer = Buffer.from(uri, 'utf8');
        var uriLengthBuffer = Buffer.alloc(4);
        uriLengthBuffer.writeUInt32LE(uriBuffer.length, 0);

        // Combine all buffers
        var data = Buffer.concat([
            discriminator,
            dashboardIdBuffer,
            nameLengthBuffer,
            nameBuffer,
            symbolLengthBuffer,
            symbolBuffer,
            uriLengthBuffer,
            uriBuffer,
        ]);
        trace(data);
        trace(associatedTokenAccount);
        // trace(js.Syntax.code('anchor.web3.SYSVAR_RENT_PUBKEY'));
        // Create the instruction
        var keys = [
            {pubkey: mint.publicKey, isSigner: true, isWritable: true}, // mint
            {pubkey: dashboardPDA, isSigner: false, isWritable: true}, // dashboardAccount
            {pubkey: associatedTokenAccount, isSigner: false, isWritable: true}, // associatedTokenAccount
            {pubkey: recipientPubKey, isSigner: false, isWritable: true}, // recipientAccount
            {pubkey: new PublicKey(metadataPDA), isSigner: false, isWritable: true}, // metadataAccount
            {pubkey: new PublicKey(masterEditionPDA), isSigner: false, isWritable: true}, // masterEditionAccount
            {pubkey: AdminTransactions.configNft, isSigner: false, isWritable: true}, // config
            {pubkey: Config.feePayer.publicKey, isSigner: true, isWritable: true}, // signer
            {pubkey: new PublicKey(SplToken.TOKEN_PROGRAM_ID), isSigner: false, isWritable: false}, // tokenProgram
            {pubkey: new PublicKey(SplToken.ASSOCIATED_TOKEN_PROGRAM_ID), isSigner: false, isWritable: false}, // associatedTokenProgram
            {pubkey: new PublicKey(MplTokenMetadata.MPL_TOKEN_METADATA_PROGRAM_ID), isSigner: false, isWritable: false}, // tokenMetadataProgram
            {pubkey: SystemProgram.programId, isSigner: false, isWritable: false}, // systemProgram

            {pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false}, // rent
        ];

        trace(keys);

        var mintNftInstruction = new TransactionInstruction({
            programId: Config.glintNftProgramId,
            keys: keys,
            data: data
        });
        trace(mintNftInstruction);

        var transaction = new Transaction().add(mintNftInstruction);
        return transaction;
    }


    /*
	public static function mintNFT(umi:Dynamic, mint:Keypair, dashboardId:Int, recipientPubKey:PublicKey) {
		//return new Promise((resolve, reject) -> {
			var dashboardPDA = PublicKey.findProgramAddressSync([new BN(dashboardId).toArrayLike(Buffer, "le", 16)], Config.glintNftProgramId)[0];

			trace('Dashboard PDA ${dashboardPDA.toBase58()}');

			

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
			var associatedTokenAccount = SplToken.getAssociatedTokenAddressSync(mint.publicKey, recipientPubKey);//.then(associatedTokenAccount -> {
				// You can calculate the discriminator by hashing the namespace and the instruction name. For instructions, the namespace is typically "global"

                var discriminator = Transactions.getInstructionDiscriminator("mint_nft");
				// Serialize dashboardId (assuming it's a u64)
				var dashboardIdBuffer = new BN(dashboardId).toArrayLike(Buffer, 'le', 16);

				// Serialize name ("Glint")
				var name = "Glint";
				var nameBuffer = Buffer.from(name, 'utf8');
				var nameLengthBuffer = Buffer.alloc(4);
				nameLengthBuffer.writeUInt32LE(nameBuffer.length, 0);

				// Serialize symbol ("GLINT")
				var symbol = "GLINT";
				var symbolBuffer = Buffer.from(symbol, 'utf8');
				var symbolLengthBuffer = Buffer.alloc(4);
				symbolLengthBuffer.writeUInt32LE(symbolBuffer.length, 0);

				// Serialize uri ("https://your-metadata-url.com")
				var uri = "https://your-metadata-url.com";
				var uriBuffer = Buffer.from(uri, 'utf8');
				var uriLengthBuffer = Buffer.alloc(4);
				uriLengthBuffer.writeUInt32LE(uriBuffer.length, 0);

				// Combine all buffers
				var data = Buffer.concat([
					discriminator,
					dashboardIdBuffer,
					nameLengthBuffer,
					nameBuffer,
					symbolLengthBuffer,
					symbolBuffer,
					uriLengthBuffer,
					uriBuffer,
				]);
                trace(data);
                trace( associatedTokenAccount);
                //trace(js.Syntax.code('anchor.web3.SYSVAR_RENT_PUBKEY'));
				// Create the instruction
				var keys= [
                    { pubkey: mint.publicKey, isSigner: true, isWritable: true }, // mint
                    { pubkey: dashboardPDA, isSigner: false, isWritable: true }, // dashboardAccount
                    { pubkey: associatedTokenAccount, isSigner: false, isWritable: true }, // associatedTokenAccount
                    { pubkey: recipientPubKey, isSigner: false, isWritable: true }, // recipientAccount
                    { pubkey: new PublicKey(metadataPDA), isSigner: false, isWritable: true }, // metadataAccount
                    { pubkey: new PublicKey(masterEditionPDA), isSigner: false, isWritable: true }, // masterEditionAccount
                    { pubkey: AdminTransactions.configNft, isSigner: false, isWritable: true }, // config
                    { pubkey: Config.feePayer.publicKey, isSigner: true, isWritable: true }, // signer
                    { pubkey: new PublicKey(SplToken.TOKEN_PROGRAM_ID), isSigner: false, isWritable: false }, // tokenProgram
                    { pubkey: new PublicKey(SplToken.ASSOCIATED_TOKEN_PROGRAM_ID), isSigner: false, isWritable: false }, // associatedTokenProgram
                    { pubkey: new PublicKey(MplTokenMetadata.MPL_TOKEN_METADATA_PROGRAM_ID), isSigner: false, isWritable: false }, // tokenMetadataProgram
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
                    
                    { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false }, // rent
				];

                trace(keys);

				var mintNftInstruction = new TransactionInstruction({
					programId: Config.glintNftProgramId,
					keys: keys,
					data: data
				});
                trace(mintNftInstruction);

				var transaction = new Transaction().add(mintNftInstruction);
                return transaction;
	}*/
	/*
		public static function configureRewards(provider:AnchorProvider, rewardAmounts:Array<Float>) {
			return new Promise((resolve, reject) -> {
				var bNRewards = [];
				for (n in rewardAmounts) {
					bNRewards.push(new BN(n));
				}

				var discriminator = Transactions.getInstructionDiscriminator("configureRewards");

				var initializeIx = new TransactionInstruction({
					programId: Config.glintRewardProgramId,
					keys: [
						{pubkey: Transactions.rewardAccountPubKey, isSigner: false, isWritable: true},
						{pubkey: Transactions.configAccountPubKey, isSigner: false, isWritable: true},
						{pubkey: Config.feePayer.publicKey, isSigner: true, isWritable: true},
						{pubkey: SystemProgram.programId, isSigner: false, isWritable: false},
					],
					data: discriminator,
				});

				var transaction = new Transaction().add(initializeIx);
				transaction.feePayer = adminKey;
				return transaction;


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
	}*/
	/*
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
	}*/
	/*Every transaction requires a recent blockhash that serves two purposes:

		Acts as a timestamp
		Prevents duplicate transactions

		A blockhash expires after 150 blocks (about 1 minute assuming 400ms block times), after which the transaction cannot be processed. */
}
