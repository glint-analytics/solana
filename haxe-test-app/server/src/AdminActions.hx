import js.Syntax;
import externs.metaplex.Umi;
import js.node.Buffer;
import externs.metaplex.MplTokenMedata;
import externs.anchor.Keypair;
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
}

//// ------------------------------------------------------------------------------

extern class GlintRewardsProgram {
	public function configureRewards(rewardAmounts:Array<Dynamic>):Dynamic;
}

extern class GlintVoteProgram {
	public function initialize(n:Float):Dynamic;

	public function initVotePeriod(duration:Dynamic):Dynamic;
}

extern class GlintNftProgram {
	public function initialize(n:Float):Dynamic;

	public function mintNft(dashboardId:BN, name:String, symbol:String, URI:String):Dynamic;
}