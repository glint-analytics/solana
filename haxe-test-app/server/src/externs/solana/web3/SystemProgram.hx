package externs.solana.web3;

import promises.Promise;

@:jsRequire("@solana/web3.js", "SystemProgram")
extern class  SystemProgram {
    public static var programId:PublicKey;
    public static function createAccount(o:Dynamic):Dynamic;

    /**
     * Generate a transaction instruction that transfers lamports from one account to another
     */
    public static function transfer(params: Dynamic): TransactionInstruction;
}