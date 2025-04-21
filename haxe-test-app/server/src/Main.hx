package;

import promises.PromiseUtils;
import externs.solana.web3.Keypair;
import http.HttpClient;
import js.html.Client;
import js.node.Fs;
import haxe.Json;
import promises.Promise;
import http.server.HttpServer;

class Main {

    

      
    static function main() {
        var server = new HttpServer();
        server.onRequest = (request, response) -> {
            return new Promise((resolve, reject) -> {
                performAction(request.url.path, request.body).then(actionResponse -> {
                    var s = Json.stringify(actionResponse, "  ");
                    trace(s);
                    response.write(s);
                    //response.headers = Actions.ACTIONS_CORS_HEADERS;
                    resolve(response);
                }, error -> {
                    trace("error", error);
                    reject(error);
                });
            });
        };
        server.start(2345);
    }

    static function performAction(action:String, params:Dynamic):Promise<Dynamic> {
        if (params == null) {
            params = "{}";
        }
        params = Json.parse(params);
        switch (action) {
            case "/show-actions":
                return PromiseUtils.promisify(Actions.showActions());
            case "/airdrop":
                return addBalance(Std.parseFloat(params.amount));
            case "/initialize-nft":
                return initializeNft();
            case "/initialize-rewards":
                return initializeRewards();
            case "/init-vote-round":
                return initializeVoteRound(Std.parseInt(params.votingRound));
            case "/init-vote-period":
                return initVotePeriod(Std.parseInt(params.durationSec));
            case "/set-rewards":
                var rewards = params.rewards;
                return configRewards(rewards);
            case "/mint-nft":
                //return mintNft();
                return null;
            case "/initialize-erc":
                //return mintNft();
                return null;
            case "/vote":
                //var dashboardId = params.dashboardId;
                //var roundId = params.roundId;
                //return vote(dashboardId, roundId);
                return null;
            case "/end-vote":
                return null;
            case "/call-rewards":
                return null;
            case "/set-vote-duration":
                return null;
            case "/set-dashboard-id":
                return null;
            case "/transfer-ownership":
                return null;
            case _:
                {
                    return new Promise((resolve, reject) -> {
                        resolve({});
                    });
                }
        }
    }


    static function addBalance(sols:Float) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            trace('Airdropping $sols sols to ${Utils.feePayer}');
            Utils.airdrop(Utils.feePayer.publicKey, sols, connect.provider).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
	}

    static function initializeNft() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            AdminActions.initializeNft(connect.provider, connect.connection).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
	}

    static function initializeVoteRound(votingRound:Int) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new Programs();
            progs.initializeVoteRound(connect.connection, votingRound).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
	}

    static function initializeRewards() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new Programs();
            progs.initializeReward(connect.connection).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
	}

    static function initVotePeriod(durationSec:Int) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new Programs();
            progs.initVotePeriod(connect.provider,durationSec ).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
	}

    static function configRewards(rewards:Array<Float>) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new Programs();
            progs.configureRewards(connect.provider, rewards).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
	}

    /*

    static function addBalance(sols:Float) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            trace('Airdropping $sols sols to ${Config.feePayer}');
            Utils.airdrop(Config.feePayer.publicKey, sols, connect.provider).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function initializeNft() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();

            var progs = new Programs();

            progs.initializeNft(connect.connection).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
            
        });
    }

    static function initializeVoteRound(votingRound:Int) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new Programs();

            progs.initializeVoteRound(connect.connection, votingRound).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });


        });
    }

    static function initializeRewards() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            Aa.initializeReward(connect.provider, connect.connection).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function initVotePeriod(durationSec:Int) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new Programs();

            progs.initVotePeriod(connect.provider, durationSec).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function configRewards(rewards:Array<Float>) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            Aa.configureRewards(connect.provider, rewards).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function initializeToken() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            Aa.initializeERC(connect.provider, connect.connection).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function mintNft() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            Aa.mintNFT(connect.provider, connect.umi, 1, Config.aliceAccount.publicKey).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function vote(dashboardId:Int, roundId:Int) {
        trace('Alice account ${Config.aliceAccount.publicKey.toBase58()}');
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            UserPrograms.vote(dashboardId, roundId, Config.aliceAccount).then (_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    */
}
