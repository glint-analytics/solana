class Actions {

  static var ACTIONS_CORS_HEADERS: Map<String, String> = [
    "Access-Control-Allow-Origin" => "*",
    "Access-Control-Allow-Methods"=> "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers"=>
      "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
    "Access-Control-Expose-Headers"=> "X-Action-Version, X-Blockchain-Ids",
    "Content-Type"=> "application/json",
  ];

    static var pathActions =  "https://upload.wikimedia.org/";

    static var payload:Dynamic = {
        icon: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d7/Mirin_Dajo_promotional.jpg/250px-Mirin_Dajo_promotional.jpg",//new URL("/chainstack_square.png", baseURL).toString(),
        label: "Meteora",
        description: "Manage your SOL Vault liquidity",
        title: "Meteora Dynamic Vault Actions",
        links: {
          actions: [
            {
              label: "Deposit SOL",
              href: '${pathActions}?action=deposit&amount={amount}',
              parameters: [
                {
                  name: "amount",
                  label: "Amount",
                },
              ],
            },
            {
              label: "Withdraw SOL",
              href: '${pathActions}?action=withdraw&amount={amount}',
              parameters: [
                {
                  name: "amount",
                  label: "Amount",
                },
              ],
            },
          ],
        },
      };

    public static  function showActions() {
        return payload;

    }



}

