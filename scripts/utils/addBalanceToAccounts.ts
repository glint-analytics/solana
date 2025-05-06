/**
 * !Only for testing purposes
 * Airdrops the given amount of SOL to the given accounts
 */
import { airdrop, connect, aliceAccount } from "./utils";

const { provider } = connect();

airdrop(provider.publicKey, 100, provider);
airdrop(aliceAccount.publicKey, 100, provider);
