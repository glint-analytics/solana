## For using metaplex programs in localnet
soft-fork:
	solana config set --url https://api.mainnet-beta.solana.com
	mkdir -p test-programs
	solana program dump TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA test-programs/token_program.so
	solana program dump ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL test-programs/associated_token_program.so
	solana program dump metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s test-programs/metaplex_token_metadata_program.so
	solana account -u m 7FTdQdMqkk5Xc2oFsYR88BuJt2yyCPReTpqr3viH6b6C --output-file test-programs/account.json --output json-compact
	solana account -u m 4tSgNWeqtgp2kwRgjTqgpenP4wxfPaVCvganMR2gnd8W --output-file test-programs/metaplex_token_metadata_program.json --output json-compact
	solana config set --url localhost

## Run the localnet node with the metaplex programs
node:
	export COPYFILE_DISABLE=1
	solana-test-validator \
	--ledger test-ledger \
	--bpf-program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA test-programs/token_program.so \
	--bpf-program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL test-programs/associated_token_program.so \
	--bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s test-programs/metaplex_token_metadata_program.so \
	--reset

## Build the programs and generate the deployable binaries
deploy-build:
	anchor build
	solana program deploy target/deploy/glint_nft.so
	solana program deploy target/deploy/glint_vote.so
	solana program deploy target/deploy/glint_reward.so

## Change the Program Ids below from `deploy-build` for their respective addresses and re-deploy
deploy:
	solana program deploy --program-id 7TQ26XbDSZMda68uSueTLGQ9zXEN3Tx5bMyoLMSzKSzN target/deploy/glint_nft.so
	solana program deploy --program-id EyV27BM3gG2a9LozgN2cUL89gZ9SKQvq3PtaKiXQMyRe target/deploy/glint_vote.so
	solana program deploy --program-id 7y85MrK95Z9cPVsdSbLKrsGPHjAxPA8HCpY13WFZs5nE target/deploy/glint_reward.so

## Test the life cycle
test:
	yarn add-balance
	yarn init-all
	yarn init-vote-period
	yarn config-rewards
	yarn mint-nft
	yarn vote
	yarn end-vote
	yarn claim-rewards

## Test all scripts
test-all:
	yarn add-balance
	yarn init-all
	yarn mint-nft 
	yarn init-vote-period 
	yarn vote 
	yarn set-voting-duration 
	yarn end-vote 
	yarn config-rewards 
	yarn claim-rewards
	yarn set-dashboard-id 
	yarn transfer-ownership
