package externs.metaplex;


/*
extern class Umi {
    @:native("UmiFull.publicKey") static function publicKey(o:Dynamic):Dynamic;
}

*/
@:jsRequire("@metaplex-foundation/umi")
extern class Umi {
    static function publicKey(o:Dynamic):Dynamic;
}