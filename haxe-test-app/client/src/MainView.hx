package ;

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
    </grid>
</vbox>
')
class MainView extends VBox {
    public function new() {
        super();
    }

    

    @:bind(initializeNftButton, MouseEvent.CLICK)
    private function onInitializeButton(_) {
        var client = new HttpClient();
        client.post("http://localhost:2345/initialize-nft", {}).then(response -> {
            trace(response);
            return null;
        }, error -> {
            trace("error", error.transactionLogs);
        });
    }

    @:bind(initializeRewardsButton, MouseEvent.CLICK)
    private function onInitializeRewardsButton(_) {
        var client = new HttpClient();
        client.post("http://localhost:2345/initialize-rewards", {}).then(response -> {
            trace(response);
            return null;
        }, error -> {
            trace("error", error.transactionLogs);
        });
    }

    @:bind(setRewardsButton, MouseEvent.CLICK)
    private function onSetRewardsButton(_) {
        var client = new HttpClient();
        var a = Json.stringify({ rewards:[reward1.value, reward2.value, reward3.value]});

        client.post("http://localhost:2345/set-rewards", a).then(response -> {
            trace(response);
            return null;
        }, error -> {
            trace("error", error.transactionLogs);
        });
    }

    @:bind(votingRoundField, UIEvent.SUBMIT)
    private function onVotingRoundField(_) {
        var client = new HttpClient();
        client.post("http://localhost:2345/init-vote-round", Json.stringify({ votingRound: voteDurationField.text })).then(response -> {
            trace(response);
            return null;
        }, error -> {
            trace("error", error.transactionLogs);
        });
    }

    @:bind(airdropAmountInputField, UIEvent.SUBMIT)
    private function onAirdropAmountInputField(_) {
        var client = new HttpClient();
        client.post("http://localhost:2345/airdrop", Json.stringify({ amount: airdropAmountInputField.text })).then(response -> {
            trace(response);
            return null;
        }, error -> {
            trace("error", error.transactionLogs);
        });
    }

    @:bind(voteDurationField, UIEvent.SUBMIT)
    private function onVoteDurationField(_) {
        var client = new HttpClient();
        client.post("http://localhost:2345/init-vote-period", Json.stringify({ durationSec: voteDurationField.text })).then(response -> {
            trace(response);
            return null;
        }, error -> {
            trace("error", error.transactionLogs);
        });
    }
}