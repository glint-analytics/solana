import externs.anchor.BN;
import js.node.Buffer;
import externs.solana.web3.PublicKey;
import externs.solana.web3.Transaction;
import externs.solana.web3.SystemProgram;
import externs.solana.web3.TransactionInstruction;


/**
    Admin transaction are transactions that should only be used by Glint admin
    which means we could use Anchor instead of a normal wallet, depending on the interface we want.

**/
class UserTransactions extends Transactions {


    public static var configNft = PublicKey.findProgramAddressSync([Buffer.from("config")], Config.glintNftProgramId)[0];
    public static function vote(dashboardId:Int, roundId:Int, voterPK: PublicKey):Transaction {



        trace(voterPK);
        trace('Fee payer account ${voterPK.toBase58()}');
		
	  
		trace('Voting on dashboard ID ${dashboardId} for Round ${roundId}');

        var dashboardAccount = PublicKey.findProgramAddressSync(
        [new BN(dashboardId).toArrayLike(Buffer, "le", 8)],
        Config.glintNftProgramId
        )[0];
        trace('Dashboard PDA ${dashboardAccount.toBase58()}');

        var scoresAccount = PublicKey.findProgramAddressSync(
            [
            Buffer.from("voting_state_scores"),
            new BN(dashboardId).toArrayLike(Buffer, "le", 8),
            ],
            Config.glintVoteProgramId
        )[0];
        trace('Scores PDA ${scoresAccount.toBase58()}');

        var votersAccount = PublicKey.findProgramAddressSync(
            [Buffer.from("voting_state_voters"), untyped voterPK.toBuffer()],
            Config.glintVoteProgramId
        )[0];
        trace('Voters PDA ${votersAccount.toBase58()}');

        var winnersAccount = PublicKey.findProgramAddressSync(
            [new BN(roundId).toArrayLike(Buffer, "le", 8)],
            Config.glintVoteProgramId
        )[0];


        // Step 3: Define the instruction data

        //You can calculate the discriminator by hashing the namespace and the instruction name. For instructions, the namespace is typically "global"
        var discriminator = Transactions.getInstructionDiscriminator("vote");

        var dashboardIdBN = new BN(dashboardId).toArrayLike(Buffer, 'le', 8); // Replace with the actual dashboard ID
        var roundIdBN = new BN(roundId).toArrayLike(Buffer, 'le', 8); // Replace with the actual round ID

        var data = Buffer.concat([discriminator, dashboardIdBN, roundIdBN]); // Assuming 0 is the discriminator for the vote instruction

        // Step 4: Create the instruction
        var keys = [
        { pubkey: scoresAccount, isSigner: false, isWritable: true },
        { pubkey: votersAccount, isSigner: false, isWritable: true },
        { pubkey: Transactions.voteAccountPubKey, isSigner: false, isWritable: true },
        { pubkey: winnersAccount, isSigner: false, isWritable: true },
        { pubkey: dashboardAccount, isSigner: false, isWritable: true },
        { pubkey: Transactions.configAccountPubKey, isSigner: false, isWritable: true },
        { pubkey: voterPK, isSigner: true, isWritable: true },
        { pubkey: Config.glintNftProgramId, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ];

        var voteInstruction = new TransactionInstruction({
            programId: Config.glintVoteProgramId,
            keys: keys,
            data: data
          });

        var transaction =  new Transaction().add(voteInstruction);
        return transaction;
	}
}