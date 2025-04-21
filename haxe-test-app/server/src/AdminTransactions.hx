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
        var transaction =  new Transaction().add(initializeIx);
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

A blockhash expires after 150 blocks (about 1 minute assuming 400ms block times), after which the transaction cannot be processed.*/

}