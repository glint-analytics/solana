package externs.solana.web3;

@:jsRequire("@solana/web3.js", "PublicKey")
extern class  PublicKey {
  public function new(s:String);
  public function toBase58():String;
  public static function findProgramAddressSync(o1:Dynamic, o2:PublicKey):Dynamic;
}
