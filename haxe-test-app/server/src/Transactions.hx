import js.node.Crypto;
import js.node.Buffer;
import externs.solana.web3.PublicKey;

class Transactions {

    public static var configAccountPubKey = PublicKey.findProgramAddressSync([Buffer.from("config")], Config.glintNftProgramId)[0];
	public static var voteAccountPubKey  = PublicKey.findProgramAddressSync([Buffer.from("voting_state")], Config.glintVoteProgramId)[0];
	public static var rewardAccountPubKey = PublicKey.findProgramAddressSync([Buffer.from("authority_seed")],
		Config.glintRewardProgramId)[0];

	//public var glintRewards:GlintRewards = untyped externs.anchor.Anchor.workspace.GlintReward.methods;
	//public var glintVote:GlintVote = untyped externs.anchor.Anchor.workspace.GlintVote.methods;

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
	public static function getInstructionDiscriminator(ixName:String):Buffer {
		return Buffer.from(Crypto.createHash("sha256").update('global:${ixName}').digest().slice(0, 8));
	}



    

}