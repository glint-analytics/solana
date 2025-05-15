/*
@:jsRequire("@coral-xyz/anchor", "Program")
extern class Program<T> {
    public function new(o1:Dynamic, o2:Dynamic = null);

}*/



@:jsRequire("@metaplex-foundation/umi")
extern class Umi3 {
    static function publicKey(o:Dynamic):Dynamic;
}


@:jsRequire("@metaplex-foundation/umi-bundle-defaults")
extern class Umi {
    static function createUmi(uri:String):Dynamic;
}

@:jsRequire("@metaplex-foundation/umi-signer-wallet-adapters")
extern class Umi2 {
    static function walletAdapterIdentity(signer:Dynamic):Dynamic;
}

@:jsRequire("@metaplex-foundation/mpl-token-metadata")
extern class MplTokenMetadata {
  static function findMasterEditionPda(o1:Dynamic, o2:Dynamic):Dynamic;
  static function findMetadataPda(o1:Dynamic, o2:Dynamic):Dynamic;
  
    static function mplTokenMetadata():Dynamic;
    static var MPL_TOKEN_METADATA_PROGRAM_ID:Dynamic;
}

@:jsRequire("bs58") extern class Bs58 {
    public static function decode(o:Dynamic):Dynamic;
}