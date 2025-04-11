package externs.solana.web3;

import promises.Promise;

@:jsRequire("@solana/web3.js", "SystemProgram")
extern class  SystemProgram {
    public static var programId:PublicKey;
    public static function createAccount(o:Dynamic):Dynamic;
}