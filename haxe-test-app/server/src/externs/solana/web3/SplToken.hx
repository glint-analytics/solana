package externs.solana.web3;

import promises.Promise;

@:jsRequire("@solana/spl-token")
/* A Token program on the Solana blockchain.

This program defines a common implementation for Fungible and Non Fungible tokens. */
extern class SplToken {

    /**
    * Construct a CreateAssociatedTokenAccount instruction
    *
    * @param payer                    Payer of the initialization fees
    * @param associatedToken          New associated token account
    * @param owner                    Owner of the new account
    * @param mint                     Token mint account
    * @param programId                SPL Token program account
    * @param associatedTokenProgramId SPL Associated Token program account
    *
    * @return Instruction to add to a transaction
    */
    static function createAssociatedTokenAccountInstruction(payer:PublicKey, associatedToken:PublicKey, owner:PublicKey, 
        mint:PublicKey, ?programId:String,  ?associatedProgramId:String):TransactionInstruction;
    static function createTransferInstruction():Dynamic;
    static function getAssociatedTokenAddress(mintKey:Dynamic, signKey:Dynamic, ?bool:Bool):Promise<Dynamic>;
    static function getMint(connection:Connection, publiKey:PublicKey):Promise<Dynamic>;
    static function getAccountLenForMint(o1:Dynamic):Promise<Dynamic>;
    static var MINT_SIZE:Int;
    static var TOKEN_PROGRAM_ID:String;
    static var ASSOCIATED_TOKEN_PROGRAM_ID:String;
    
    static function createInitializeAccountInstruction(account: PublicKey, mint: PublicKey, owner: PublicKey,
        programId:String):TransactionInstruction;
    
    
    /**
    * Construct an InitializeMint instruction
    *
    * @param mint            Token mint account
    * @param decimals        Number of decimals in token account amounts
    * @param mintAuthority   Minting authority
    * @param freezeAuthority Optional authority that can freeze token accounts
    * @param programId       SPL Token program account
    *
    * @return Instruction to add to a transaction
    */
    static function createInitializeMintInstruction(mint:PublicKey, decimals:Dynamic, mintAuthority:PublicKey, ?freezeAuthority:PublicKey, programId:String):TransactionInstruction;
    

    /**
    * Construct a MintTo instruction
    *
    * @param mint         Public key of the mint
    * @param destination  Address of the token account to mint to
    * @param authority    The mint authority
    * @param amount       Amount to mint
    * @param multiSigners Signing accounts if `authority` is a multisig
    * @param programId    SPL Token program account
    *
    * @return Instruction to add to a transaction
    */
    static function createMintToInstruction(mint: PublicKey, destination: PublicKey,  authority: PublicKey,
    amount: Float, ?multiSigners: Array<PublicKey>, ?programId:String): TransactionInstruction ;

    /**
    * Construct a SetAuthority instruction
    *
    * @param account          Address of the token account
    * @param currentAuthority Current authority of the specified type
    * @param authorityType    Type of authority to set
    * @param newAuthority     New authority of the account
    * @param multiSigners     Signing accounts if `currentAuthority` is a multisig
    * @param programId        SPL Token program account
    *
    * @return Instruction to add to a transaction
    */
    static function createSetAuthorityInstruction(
        account: PublicKey,
        currentAuthority: PublicKey,
        authorityType: Dynamic, //AuthorityType,
        newAuthority: PublicKey,
        ?multiSigners: Array<PublicKey>,
        ?programId:String
    ): TransactionInstruction;
}
