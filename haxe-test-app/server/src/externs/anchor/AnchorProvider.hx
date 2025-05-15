package externs.anchor;

@:jsRequire("@coral-xyz/anchor", "AnchorProvider")
extern class AnchorProvider {
    static function env():Dynamic; // ANCHOR_PROVIDER_URL
    static function local():Dynamic;
    public function new(connection:Dynamic, anchorWallet:Dynamic = null, o:Dynamic);
    public var wallet:Wallet;
    public var publicKey:Dynamic;
}