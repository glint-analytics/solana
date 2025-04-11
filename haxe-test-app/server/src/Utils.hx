import Externs.Bs58;
import externs.solana.web3.Connection;
import externs.anchor.Wallet as AnchorWallet;
import externs.anchor.Anchor;
import externs.anchor.AnchorProvider;
import Externs.Umi;
import Externs.Umi2;
import externs.solana.web3.PublicKey;
import externs.solana.web3.Keypair;
import promises.Promise;

class Utils {
	public static inline var ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";

	// var bs58 = Reflect.field(Bs58, "default");
	public static var feePayer = Keypair.fromSecretKey(Reflect.field(Bs58, "default")
		.decode("588FU4PktJWfGfxtzpAAXywSNt74AvtroVzGfKkVN1LwRuvHwKGr851uH8czM5qm4iqLbs1kKoMKtMJG4ATR7Ld2" /*
			process.env.ENVIRONMENT =="local"
				? "588FU4PktJWfGfxtzpAAXywSNt74AvtroVzGfKkVN1LwRuvHwKGr851uH8czM5qm4iqLbs1kKoMKtMJG4ATR7Ld2"
				: process.env.FEE_PAYER_SECRET_KEY
		 */
		));

	/**
	 * Connect to the network and return the connection, provider and Umi instance
	 * @returns {connection, provider, umi}
	 */
	public static function connect() {
		trace('Connecting to ${ANCHOR_PROVIDER_URL}');
		var connection = new Connection(ANCHOR_PROVIDER_URL, "confirmed");

		var provider = new AnchorProvider(connection, new AnchorWallet(feePayer), {
			commitment: "confirmed",
		});
		Anchor.setProvider(provider);
		var umi = Umi.createUmi(ANCHOR_PROVIDER_URL).use(Umi2.walletAdapterIdentity(provider.wallet));
		return {connection: connection, provider: provider, umi: umi};
	}

	// works only on dev and main net?
	public static function checkTokenBalance(tokenAccount:PublicKey, connection:Connection):Promise<Float> {
		return new Promise((resolve, reject) -> {
			trace(tokenAccount);
			connection.getTokenAccountBalance(tokenAccount).then(balance -> {
				trace(balance);
				resolve(balance);
			}, error -> {
				trace(error);
				return "0";
			});
		});
	}

	public static function airdrop(address:PublicKey, amountSol:Float, provider:Dynamic) {

		return new Promise((resolve, reject) -> {
			var signature = provider.connection.requestAirdrop(address, amountSol * 1000000000);
			signature.then(sig -> {
				trace(sig);
				return provider.connection.confirmTransaction(sig);
			}).then (_-> {
				trace(_);
				resolve(_);
			}, error-> {
				trace(error);
				return "0";
			});
		});
	}

	public static function checkPrograms(connection:Connection) {
		var metadataProgramId = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
		// var logAccount(`Metadata Program ID: ${metadataProgramId.toBase58()}`);
		connection.getAccountInfo(metadataProgramId).then(_ -> {
			trace(_);
		});

		/*

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
		}*/

		return true;
	}
}
