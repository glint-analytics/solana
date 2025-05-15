package ;

import http.HttpClient;
import haxe.ui.focus.FocusManager;
import haxe.ui.HaxeUIApp;

class Main {
    public static function main() {
        var app = new HaxeUIApp();
        app.ready(function() {
            FocusManager.instance.autoFocus = false;
            app.addComponent(new MainView());

            app.start();
        });
    }
}
