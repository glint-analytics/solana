package externs.solana.web3;

@:jsRequire("@solana/web3.js", "Transaction")
extern class  Transaction {
    public function new();
    public function add(o:Dynamic, ?o2:Dynamic):Dynamic;
    public static var programId:PublicKey;
}