# Glint

## Table of Contents

- [Install Rust](#1-install-rust)
- [Install Solana CLI](#2-install-solana-cli)
- [Set Up Solana Config](#3-set-up-solana-config)
- [Set Up Anchor](#4-set-up-anchor)
- [Install Dependencies for Solana and Anchor Interaction](#5-install-dependencies-for-solana-and-anchor-interaction)
- [Configuring the tsconfig.json](#6-configuring-the-tsconfigjson)
- [Configure Localnet](#7-configure-localnet)
- [Start tests on Anchor](#8-start-tests-on-anchor)
- [Start the validator on localnet](#9-start-the-validator-on-localnet)
- [Fixing errors on macOS](#10-fixing-errors-on-macos)
- [Deploy the programs](#11-deploy-the-programs)

## System Prerequisites and dependencies

### 1. Install Rust

Rust is required for building Solana programs. You can install Rust by using the following command:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

Once installed, make sure Rust is set up in your environment by adding it to your PATH and configuring it:

```bash
source $HOME/.cargo/env
```

To verify the installation:

```bash
rustc --version
```

### 2. Install Solana CLI

First, you need to install the Solana CLI, which will allow you to interact with the Solana blockchain.

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

After installation, add Solana to your PATH:

```bash
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

To verify the installation:

```bash
solana --version
```

### 3. Set Up Solana Config

To create a new wallet keypair:

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

If you want to use devnet and not just localnet
Make sure your Solana CLI is pointing to the correct network (either localnet, devnet, or mainnet). For development, it's usually best to use Devnet:

```bash
solana config set --url https://api.devnet.solana.com
```

To fund your wallet on Devnet:

```bash
solana airdrop 2
```

Check your balance with:

```bash
solana balance
```

Check your own public key with:

```bash
solana address
```

### 4. Set Up Anchor

Next, install the Anchor framework, which will help you develop, test, and deploy Solana programs easily.

```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.27.0 anchor-cli --locked
```

After installing Anchor, confirm the installation with:

```bash
anchor --version
```

## Workspace setup

git clone this repo.

### 5. Install Dependencies for Solana and Anchor Interaction

From within your Anchor project directory, install the required packages:

```bash
npm install -g ts-node
yarn add @project-serum/anchor
yarn add @solana/web3.js
yarn add @types/node
yarn add dotenv
```

Create a `.env` file and place the following:

```shell
ANCHOR_WALLET=/Users/your_username/.config/solana/id.json
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
```

### 6. Configuring the tsconfig.json (can skip if repo is cloned)

Next, you'll want to configure your TypeScript setup. Create a `tsconfig.json` file in the root of your project:

```typescript
{
  "compilerOptions": {
    "types": ["mocha", "chai"],
    "typeRoots": ["./node_modules/@types"],
    "lib": ["es2015"],
    "module": "commonjs",
    "target": "es6",
    "esModuleInterop": true
  }
}
```

### 7. Configure Localnet (can skip if repo is cloned)

Make equivalent: `make soft-fork`

Skip already done

NOTE: custom programs are not available on localnet, so jump to the Soft Fork Metaplex section if you want to test the programs.

To interact with NFTs on Solana, you'll need the Metaplex Token Metadata program. This program isn’t native to Solana, so to use it on your localnet, you'll need to clone it from Mainnet. Run the command below to export the program’s bytecode, which you can then deploy to your localnet:

First connect to mainnet:

```bash
solana config set --url https://api.mainnet-beta.solana.com
```

Then, dump the programs:

```bash
# Dump Token Program
solana program dump TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA test-programs/token_program.so

# Dump Associated Token Program
solana program dump ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL test-programs/associated_token_program.so

# Dump Metaplex Token Metadata Program
solana program dump metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s test-programs/metaplex_token_metadata_program.so
```

- `-u m`: Specifies the cluster (Mainnet Beta).
- First argument: Program ID.
- Second argument: Filename to store the bytecode.

To test with existing accounts on localnet, clone the account data:

```bash
solana account -u m 7FTdQdMqkk5Xc2oFsYR88BuJt2yyCPReTpqr3viH6b6C --output-file test-programs/account.json --output json-compact
```

To get the NFT’s metadata, clone the metadata account as well:

```bash
solana account -u m 4tSgNWeqtgp2kwRgjTqgpenP4wxfPaVCvganMR2gnd8W --output-file test-programs/metaplex_token_metadata_program.json --output json-compact
```

We will only need the metadata program and the NFT account data for running local tests with chai and mocha. Add the programs to the Anchor.toml file:

```toml
[[test.genesis]]
address = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
program = "test-programs/metaplex_token_metadata_program.so"

[[test.validator.account]]
address = "7FTdQdMqkk5Xc2oFsYR88BuJt2yyCPReTpqr3viH6b6C"
filename = "test-programs/account.json"
```

## Testing 

### 8. Start tests on Anchor

Configure Anchor to use on localnet: By default, Anchor uses Devnet, but you can configure it to use localnet by editing the Anchor.toml file in your project directory. Change the cluster option to localnet (no need if cloned):

```toml
cluster = "localnet"
wallet = "~/.config/solana/id.json"
```

Build the program:

```bash
anchor build
```

Start the tests:

```bash
anchor test
```

## Running and deploying

### 9. Start the validator on localnet

Make equivalent: `make node`

Set the url to localhost and start the validator after:

```bash
solana config set --url localhost
```

This will spin up a local Solana blockchain on your machine. The default RPC URL for the local network is `http://127.0.0.1:8899`.

Start the validator with the following command:

```bash
solana-test-validator \
  --ledger test-ledger \
  --bpf-program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA test-programs/token_program.so \
  --bpf-program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL test-programs/associated_token_program.so \
  --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s test-programs/metaplex_token_metadata_program.so \
  --reset
```

After setting up the local node, you need to build, deploy programs and run scripts.

### 10. Deploy Programs

#### 10.1 Build Programs

Make equivalent: `make deploy-build`

```bash
anchor build
```

#### 10.2 Deploy

Make equivalent: `make deploy-build`

Deploy the programs (this will use the ID on declare_id! inside each program `lib.rs` file):

```bash
solana program deploy target/deploy/glint_nft.so
solana program deploy target/deploy/glint_vote.so
solana program deploy target/deploy/glint_reward.so
```

Make equivalent: `make deploy`
Get the Program ID displayed on the terminal and update the contract, build (anchor build) and deploy again.

```bash
solana program deploy --program-id <TOKEN_PROGRAM_ID> target/deploy/glint_nft.so
solana program deploy --program-id <TOKEN_PROGRAM_ID> target/deploy/glint_vote.so
solana program deploy --program-id <TOKEN_PROGRAM_ID> target/deploy/glint_reward.so
```

IMPORTANT: If you end up generating new Program IDs, you'll need to update the Anchor.toml file with the new IDs. And in some cases, you'll need to update the `declare_id!` on each corresponding program `lib.rs` file.

You also need tu update the make file  and the test-programs initialization file

```bash 
$ solana program deploy --program-id 9q2DR84bJri6Xoryq95RBsFKjo9kKecwSAZ5ptbSjrNu target/deploy/glint_nft.so
Error: Initial deployments require a keypair be provided for the program id
```

Or you can theoritically sync the keys but the command doesn't exist for me:

```bash
anchor keys sync
```

### 11. Run tests on node and makefile

```bash
make soft-fork
make node
make deploy-build
make deploy


make test
```

### 12. Fixing errors on macOS

In some cases, could have errors to run tests on macOS. If so, try running the following command:

```bash
export COPYFILE_DISABLE=1
```
