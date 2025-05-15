package externs.metaplex;

@:jsRequire("@metaplex-foundation/mpl-token-metadata")
extern class MplTokenMetadata {
    static function findMasterEditionPda(o1:Dynamic, o2:Dynamic):Dynamic;
    static function findMetadataPda(context:Dynamic, seeds:Dynamic):Dynamic;
  
    static function mplTokenMetadata():Dynamic;
    static var MPL_TOKEN_METADATA_PROGRAM_ID:Dynamic;
}