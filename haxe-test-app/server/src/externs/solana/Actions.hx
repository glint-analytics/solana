package externs.solana;

import promises.Promise;

@:jsRequire("@solana/actions")
extern class Actions {
  public static function createPostResponse(args:Dynamic, ?signers:Array<Dynamic>):Promise<Dynamic>;
  public static var ACTIONS_CORS_HEADERS:Map<String, String>;
}