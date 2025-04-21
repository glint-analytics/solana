import Externs.Bs58;
import externs.solana.web3.Keypair;
import externs.solana.web3.PublicKey;

class Config {
    public static var useAnchor:Bool = false;

    /*
    public static var glintNftProgramId = untyped externs.anchor.Anchor.workspace.GlintNft.programId;
    public static var glintVoteProgramId = untyped externs.anchor.Anchor.workspace.GlintVote.programId;
    public static var glintRewardProgramId = untyped externs.anchor.Anchor.workspace.GlintReward.programId;
    */
    public static var glintNftProgramId:PublicKey = new PublicKey("7TQ26XbDSZMda68uSueTLGQ9zXEN3Tx5bMyoLMSzKSzN");
    public static var glintVoteProgramId:PublicKey = new PublicKey("7y85MrK95Z9cPVsdSbLKrsGPHjAxPA8HCpY13WFZs5nE");
    public static var glintRewardProgramId:PublicKey = new PublicKey("EyV27BM3gG2a9LozgN2cUL89gZ9SKQvq3PtaKiXQMyRe");


    public static inline var ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";

    public static var feePayer = Keypair.fromSecretKey(Reflect.field(Bs58, "default")
		.decode("588FU4PktJWfGfxtzpAAXywSNt74AvtroVzGfKkVN1LwRuvHwKGr851uH8czM5qm4iqLbs1kKoMKtMJG4ATR7Ld2" /*
			process.env.ENVIRONMENT =="local"
				? "588FU4PktJWfGfxtzpAAXywSNt74AvtroVzGfKkVN1LwRuvHwKGr851uH8czM5qm4iqLbs1kKoMKtMJG4ATR7Ld2"
				: process.env.FEE_PAYER_SECRET_KEY
		 */
		));

    public static var mintERC20 = Keypair.fromSecretKey(Reflect.field(Bs58, "default")
			.decode("4pNBnYYQKHA7HAgU4dJjQo4fiNi3Pz4e4SQeAjc7zP7P7dGeXVDEeSdSkqPWZuPL1E3B64sUHgXedZWUKKmsUiqk"));

    public static var aliceAccount = Keypair.fromSecretKey(
      Reflect.field(Bs58, "default").decode("4NMwxzmYj2uvHuq8xoqhY8RXg63KSVJM1DXkpbmkUY7YQWuoyQgFnnzn6yo3CMnqZasnNPNuAT2TLwQsCaKkUddp"
      )
    );
}