package externs.solana.web3;

enum abstract AuthorityType(Int) {
    var MintTokens = 0;
    var FreezeAccount = 1;
    var AccountOwner = 2;
    var CloseAccount = 3;
}