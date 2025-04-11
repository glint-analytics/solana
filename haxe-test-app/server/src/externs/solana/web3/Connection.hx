package externs.solana.web3;

import promises.Promise;


@:jsRequire("@solana/web3.js", "Connection")
extern class  Connection {
  public function new(o1:String, o2:String);
  public function getTokenAccountBalance(tokenAccount:PublicKey):Promise<Float>;
  public function getAccountInfo(account:PublicKey):Promise<String>;
  public function getLatestBlockhash():Promise<Dynamic>;
  public function sendTransaction(transaction:Dynamic, o1:Dynamic, o2:Dynamic):Promise<Dynamic>;
  public function confirmTransaction(transaction:Dynamic):Promise<Dynamic>;
  public function getMinimumBalanceForRentExemption(?accountDataLength:Int):Promise<Dynamic>;
}