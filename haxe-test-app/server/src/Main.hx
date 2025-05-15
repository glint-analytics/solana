package;

import externs.solana.web3.Transaction;
import js.Syntax;
import externs.solana.web3.PublicKey;
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
                    trace(actionResponse);
                    // response = actionResponse;

                    // response.write("" + actionResponse);
                    // trace(response);

                    // var s = Json.stringify(actionResponse, "  ");
                    // trace(s);
                    response.write(actionResponse);
                    // response.headers = Actions.ACTIONS_CORS_HEADERS;
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
                return mintNft();
            case "/initialize-erc":
                // return mintNft();
                return null;
            case "/unvote-ix":
                var dashboardId = params.dashboardId;
                var roundId = params.roundId;
                var voterPK = params.voter;
                return unvoteIx(dashboardId, roundId, voterPK);
            case "/vote-ix":
                var dashboardId = params.dashboardId;
                var roundId = params.roundId;
                var voterPK = params.voter;
                return voteIx(dashboardId, roundId, voterPK);
            case "/vote":
                var dashboardId = params.dashboardId;
                var roundId = params.roundId;
                return vote(dashboardId, roundId);
            case "/unvote":
                var dashboardId = params.dashboardId;
                var roundId = params.roundId;
                return unvote(dashboardId, roundId);
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
            Utils.airdrop(Utils.feePayer.publicKey, sols, connect.provider).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
            trace('Alice account ${Config.aliceAccount.publicKey.toBase58()}');
            Utils.airdrop(Config.aliceAccount.publicKey, sols, connect.provider).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function initializeNft() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            AdminActions.initializeNft(connect.provider, connect.connection).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function initializeVoteRound(votingRound:Int) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            AdminActions.initializeVoteRound(connect.provider, connect.connection, votingRound).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function initializeRewards() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            AdminActions.initializeReward(connect.provider, connect.connection).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function initVotePeriod(durationSec:Int) {
        return new Promise((resolve, reject) -> {
            trace("try connect");
            var connect = Utils.connect();
            trace("connected");

            var progs = new AdminActions();
            trace("inininiii ", durationSec);
            progs.initVotePeriod(connect.provider, durationSec).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function configRewards(rewards:Array<Float>) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new AdminActions();
            progs.configureRewards(connect.provider, rewards).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function mintNft() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new AdminActions();
            trace("mint nft");
            progs.mintNFT(connect.connection, connect.umi, 49, Config.aliceAccount.publicKey).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function initializeToken() {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new AdminActions();
            progs.initializeERC(connect.provider, connect.connection).then(_ -> {
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
            var progs = new UserPrograms();
            progs.vote(connect.connection, dashboardId, roundId, Config.aliceAccount).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function unvote(dashboardId:Int, roundId:Int) {
        return new Promise((resolve, reject) -> {
            var connect = Utils.connect();
            var progs = new UserPrograms();
            trace("unvote");
            progs.unvote(connect.connection, dashboardId, roundId, Config.aliceAccount).then(_ -> {
                resolve({});
            }, error -> {
                reject(error);
            });
        });
    }

    static function unvoteIx(dashboardId:Int, roundId:Int, voterPublicKeyString:String) {
        var transaction:Transaction = null;
        return new Promise((resolve, reject) -> {
            var voterPK = new PublicKey(voterPublicKeyString);
            transaction = UserTransactions.unvote(dashboardId, roundId, voterPK);
            var connect = Utils.connect();
            connect.connection.getLatestBlockhash().then(b -> {
                transaction.recentBlockhash = b.blockhash;
                transaction.feePayer = voterPK;
                externs.solana.Actions.createPostResponse({
                    fields: {
                        transaction: transaction,
                        message: 'unvote',
                    },
                });
            }).then(response -> {
                trace(response);
                resolve(response.transaction);
            }, error -> {
                trace(error);
            });
        });
    }

    static function voteIx(dashboardId:Int, roundId:Int, voterPublicKeyString:String) {
        trace('Alice account ${Config.aliceAccount.publicKey.toBase58()}');
        var transaction:Transaction = null;
        return new Promise((resolve, reject) -> {
            trace(voterPublicKeyString);
            var voterPK = new PublicKey(voterPublicKeyString);

            // var voterPK = Config.aliceAccount.publicKey;
            trace("voterPK", voterPK, roundId, dashboardId);
            transaction = UserTransactions.vote(dashboardId, roundId, voterPK);

            trace(transaction);
            var connect = Utils.connect();
            connect.connection.getLatestBlockhash().then(b -> {
                trace(b.blockhash);
                transaction.recentBlockhash = b.blockhash;
                trace(transaction);
                // untyped transaction.feePayer = voterPK;
                // Config.feePayer.publicKey;
                // transaction.sign(feePayer);
                // transaction.feePayer = Config.feePayer.publicKey;
                transaction.feePayer = voterPK;
                // return transaction.partialSign(Config.feePayer);
                // }).then (_ -> {

                // trace(transaction.serialize());
                externs.solana.Actions.createPostResponse({
                    fields: {
                        transaction: transaction,

                        message: 'vote',
                    },
                });
                // trace(a);
                // return null;
            }).then(response -> {
                trace(response);
                resolve(response.transaction);
            }, error -> {
                trace(error);
            });
        });
    }
}
