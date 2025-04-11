package externs.anchor;

import externs.solana.web3.PublicKey;

@:jsRequire("@coral-xyz/anchor", "Wallet")
extern class Wallet {
    public function new(keyPair:Dynamic); // keypair or anchorKeypair the same
    public var publicKey:PublicKey;
}
