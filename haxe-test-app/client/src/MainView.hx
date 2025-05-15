package;

import js.Browser;
import haxe.ui.Toolkit;
import haxe.Timer;
import haxe.ui.containers.TreeViewNode;
import haxe.ui.components.Button;
import haxe.ui.containers.HBox;
import haxe.ui.components.Label;
import haxe.ui.events.UIEvent;
import haxe.Json;
import http.HttpClient;
import haxe.ui.containers.VBox;
import haxe.ui.events.MouseEvent;
import haxe.io.UInt8Array;
import js.html.TextEncoder;

using StringTools;

@:xml('
<vbox width="100%" height="100%" style="padding: 10px">
    <grid width="100%" height="100%" style="spacing:10px" columns="3">
        <label text="airdrop to feepayer for now" />
        <textfield id="airdropAmountInputField" placeholder="type number and press enter"/>
        <label text="Localnet: airdrop to feepayer. Needs to have money to do the rest" />
        
        <label text="initializeNft" />
        <button text="initialize Nft" id="initializeNftButton" />
        <label text="..." />

        <label text="initialize vote round" />
        <textfield id="votingRoundField" placeholder="type number and press enter"/>
        <label text="intialize voting round, needs to have initialized Nft" />
        
        <label text="initialize vote duration" />
        <textfield id="voteDurationField" placeholder="type duration in sec and press enter"/>
        <label text="Intialiaz vote duration for the round.... cannot change it for now" />

        <label text="initializeRewards" />
        <button text="initialize Rewards" id="initializeRewardsButton" />
        <label text="..." />

        <label text="set rewards" />
        <hbox>
            <number-stepper id="reward1"/>
            <number-stepper id="reward2"/>
            <number-stepper id="reward3"/>
        </hbox>
        <button id="setRewardsButton" />


        <label text="mint nft" />
        <textfield id="mintNftField" placeholder="type number and press enter"/>
        <label text="..." />

        <label text="vote" />
        <textfield id="votingField" placeholder="type number and press enter"/>
        <label text="..." />
        <label text="unvote" />
        <textfield id="unvotingField" placeholder="type number and press enter"/>
        <label text="..." />

        <label text="voteIx" />
        <textfield id="votingIxField" placeholder="type number and press enter"/>
        <label text="..." />

        <label text="unvoteIx" />
        <textfield id="unvotingIxField" placeholder="type number and press enter"/>
        <label text="..." />
    </grid>
</vbox>
')
class MainView extends VBox {
	public function new() {
		super();
		subscribe();
	}

	var wallets = [];

	private function subscribe():Void {
		var event = new js.html.CustomEvent("wallet-standard:app-ready", {
			detail: {
				register: function f(wallet:OfficialSolanaWallet) {
					if (Reflect.hasField(wallet.features, "standard:connect")
						&& Reflect.hasField(wallet.features, "solana:signAndSendTransaction")) {
						trace(wallet.features);
						wallets.push(wallet);
						var w = Reflect.field(wallets[0].features, "standard:connect");
						w.connect().then(response -> {}, error -> {
							throw "cannot receive public address from wallet";
						});
					}
				}
			},
		});
		js.Browser.window.dispatchEvent(event);
	}

	@:bind(initializeNftButton, MouseEvent.CLICK)
	private function onInitializeButton(_) {
		var client = new HttpClient();
		client.post("http://localhost:2345/initialize-nft", {}).then(response -> {
			trace(response);
			return null;
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(initializeRewardsButton, MouseEvent.CLICK)
	private function onInitializeRewardsButton(_) {
		var client = new HttpClient();
		client.post("http://localhost:2345/initialize-rewards", {}).then(response -> {
			trace(response);
			return null;
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(setRewardsButton, MouseEvent.CLICK)
	private function onSetRewardsButton(_) {
		var client = new HttpClient();
		var a = Json.stringify({rewards: [reward1.value, reward2.value, reward3.value]});

		client.post("http://localhost:2345/set-rewards", a).then(response -> {
			trace(response);
			return null;
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(votingRoundField, UIEvent.SUBMIT)
	private function onVotingRoundField(_) {
		var client = new HttpClient();
		client.post("http://localhost:2345/init-vote-round", Json.stringify({votingRound: votingRoundField.text})).then(response -> {
			trace(response);
			return null;
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(airdropAmountInputField, UIEvent.SUBMIT)
	private function onAirdropAmountInputField(_) {
		var client = new HttpClient();
		client.post("http://localhost:2345/airdrop", Json.stringify({amount: airdropAmountInputField.text})).then(response -> {
			trace(response);
			return null;
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(voteDurationField, UIEvent.SUBMIT)
	private function onVoteDurationField(_) {
		var client = new HttpClient();
		client.post("http://localhost:2345/init-vote-period", Json.stringify({durationSec: voteDurationField.text})).then(response -> {
			trace(response);
			return null;
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(mintNftField, UIEvent.SUBMIT)
	private function onMintNftField(_) {
		var client = new HttpClient();
		var params = {durationSec: voteDurationField.text};
		client.post("http://localhost:2345/mint-nft", Json.stringify({durationSec: voteDurationField.text})).then(response -> {
			trace(response);
			return null;
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(votingField, UIEvent.SUBMIT)
	private function onVotingField(_) {
		var client = new HttpClient();
		var params = {roundId: 1, dashboardId: Std.parseInt(votingField.value)};
		client.post("http://localhost:2345/vote", Json.stringify(params)).then(response -> {
			trace(response);
			return null;
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(unvotingField, UIEvent.SUBMIT)
	private function onUnVotingField(_) {
		var client = new HttpClient();
		var params = {roundId: 1, dashboardId: Std.parseInt(unvotingField.value)};
		client.post("http://localhost:2345/unvote", Json.stringify(params)).then(response -> {
			trace(response);
			return null;
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(votingIxField, UIEvent.SUBMIT)
	private function onVotingIxField(_) {
		var client = new HttpClient();
		var params = {roundId: 49, dashboardId: Std.parseInt(votingIxField.value), voter: "8QtpADh7fawpm1AVsXPxsqjk5GR3cGSZsRCGDiCJMzV2"};
		client.post("http://localhost:2345/vote-ix", Json.stringify(params)).then(response -> {
			var txString = response.bodyAsString;

			var r = new EReg("^A-Za-z0-9+/=", "g");
			var txString = r.replace(txString, "");
			var connection = js.Syntax.code(" new solanaWeb3.Connection({0}, {1})", "https://api.devnet.solana.com", "confirmed");

			var transactionBytes = base64ToBytes(txString);
			var transaction = js.Syntax.code("solanaWeb3.Transaction.from({0})", transactionBytes);
			var w = Reflect.field(wallets[0].features, "solana:signTransaction");

			var w = Reflect.field(Browser.window, "solflare");
			return w.signAndSendTransaction(transaction);
		}).then(_ -> {
			trace(_);
		}, error -> {
			trace("error", error);
		});
	}

	@:bind(unvotingIxField, UIEvent.SUBMIT)
	private function onUnVotingIxField(_) {
		var client = new HttpClient();
		var params = {roundId: 49, dashboardId: Std.parseInt(unvotingIxField.value), voter: "8QtpADh7fawpm1AVsXPxsqjk5GR3cGSZsRCGDiCJMzV2"};
		client.post("http://localhost:2345/unvote-ix", Json.stringify(params)).then(response -> {
			// trace(response.transaction);
			var txString = response.bodyAsString;

			var r = new EReg("^A-Za-z0-9+/=", "g");
			var txString = r.replace(txString, "");
			trace(txString.charAt(0));

			var connection = js.Syntax.code(" new solanaWeb3.Connection({0}, {1})", "https://api.devnet.solana.com", "confirmed");

			var transactionBytes = base64ToBytes(txString);
			var transaction = js.Syntax.code("solanaWeb3.Transaction.from({0})", transactionBytes);
			var w = Reflect.field(wallets[0].features, "solana:signTransaction");
			var w = Reflect.field(Browser.window, "solflare");
			var utf8Msg = new TextEncoder().encode("lala");

			return w.signAndSendTransaction(transaction);
		}).then(_ -> {
			trace(_);
		}, error -> {
			trace("error", error);
		});
	}

	function base64ToBytes(base64) {
		var binaryString = js.Browser.window.atob(base64);
		var len = binaryString.length;
		var bytes = new js.lib.Uint8Array(len);

		for (i in 0...len) {
			bytes[i] = binaryString.charCodeAt(i);
		}

		return bytes;
	}
}

typedef OfficialSolanaWallet = {
	uuid:String, // Unique identifier of the wallet extension announcement, keep in mind it changes on every request-announcement cycle

	version:Dynamic,

	name:String, // Name of the wallet extension
	icon:String, // Icon for the wallet extension

	chains:Dynamic,
	features:Dynamic,
	accounts:Array<Dynamic>
}
