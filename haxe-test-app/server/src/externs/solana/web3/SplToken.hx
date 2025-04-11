package externs.solana.web3;

import promises.Promise;

@:jsRequire("@solana/spl-token")
/* A Token program on the Solana blockchain.

This program defines a common implementation for Fungible and Non Fungible tokens. */
extern class SplToken {
    static function createAssociatedTokenAccountInstruction(o1:Dynamic, o2:Dynamic, o3:Dynamic, o4:Dynamic, o5:Dynamic,  o6:Dynamic):Dynamic;
    static function createTransferInstruction():Dynamic;
    static function getAssociatedTokenAddress(mintKey:Dynamic, signKey:Dynamic, ?bool:Bool):Promise<Dynamic>;
    static function getMint(connection:Connection, publiKey:PublicKey):Promise<Dynamic>;
    static function getAccountLenForMint(o1:Dynamic):Promise<Dynamic>;
    static function getSplTokenATA():Promise<Dynamic>;
    static var MINT_SIZE:Int;
    static var TOKEN_PROGRAM_ID:String;
    static var ASSOCIATED_TOKEN_PROGRAM_ID:String;
    static function createInitializeAccountInstruction(o1:Dynamic, o2:Dynamic, o3:Dynamic, o4:Dynamic, ?o5:Dynamic):Dynamic;
    static function createInitializeMintInstruction(o1:Dynamic, o2:Dynamic, o3:Dynamic, o4:Dynamic, o5:Dynamic):Dynamic;
    
}
