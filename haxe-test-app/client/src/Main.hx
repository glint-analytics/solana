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
            blabla();
        });
    }

    static function blabla() {

        var httpClient:HttpClient = new HttpClient();
        httpClient.get('http://localhost').then(response -> {
                if (response.httpStatus != 200) {
                    trace("error http" + response.httpStatus);
                    throw("error http" + response.httpStatus);
                    //reject("error http" + response.httpStatus);
                    //return null;
                }
               // blabla();
                trace("responsee", response.httpStatus);
                trace(response.body.length);
                //resolve(jsonResponse);
            }, error -> {
                trace(" httpclient error", error);
                //reject(error);
            });

    }

}
