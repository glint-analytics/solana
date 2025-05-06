const fs = require('fs');
const solanaWeb3 = require('@solana/web3.js');
const bs58 = require('bs58');

const keypairPath = process.argv[2] || "/Users/user/.config/solana/id.json";

async function main() {
    try {
        const secretKey = JSON.parse(fs.readFileSync(keypairPath));
        const keypair = solanaWeb3.Keypair.fromSecretKey(Uint8Array.from(secretKey));
        console.log("Public Key:", keypair.publicKey.toString());
        console.log("Secret Key:", bs58.default.encode(keypair.secretKey));
    } catch (error) {
        console.error("Error loading keypair:", error);
    }
}

main();
