package externs.solana.web3;

@:jsRequire("@solana/web3.js", "Keypair")
extern class  Keypair {
  public static function fromSecretKey(secretKey:String):Keypair;
  public var publicKey:PublicKey;
  static function generate():Dynamic;
}