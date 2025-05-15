package externs.anchor;


// TODO should maybe use web3 instead
@:jsRequire("@coral-xyz/anchor", "web3.Keypair")
extern class Keypair {
    static function generate():Dynamic;
}