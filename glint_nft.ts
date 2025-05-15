export type GlintNft = {
  "version": "0.1.0",
  "name": "glint_nft",
  "instructions": [
    {
      "name": "initialize",
      "docs": [
        "* Initialize the config account to set an admin.\n     * Must be called once after the program is deployed.\n     * The caller is set as the admin."
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "transferOwnership",
      "docs": [
        "* Transfer the ownership of the config account to a new admin.\n     * Only the current admin can call this method.\n     * @param new_admin: The new admin address."
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "setDashboardId",
      "docs": [
        "* NOTE: unsafe method. This is automatically called by `mint_nft`.\n     * Sets the NFT that represents the Dashboard ID.\n     * Only the admin can call this method.\n     * @param _dashboard_id: The Dashboard ID as the seed key\n     * @param nft_id: The NFT ID to set for the Dashboard ID"
      ],
      "accounts": [
        {
          "name": "dashboardAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "dashboardId",
          "type": "u64"
        },
        {
          "name": "nftId",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "requireDashboardId",
      "docs": [
        "* Check the NFT ID associated with the Dashboard ID.\n     * @param _dashboard_id: The Dashboard ID\n     * @return The NFT ID if set, otherwise None."
      ],
      "accounts": [
        {
          "name": "dashboardAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "mintNft",
      "docs": [
        "* Mint an NFT for the `associated_token_account`.\n     * Only the admin can call this method.\n     * @param _dashboard_id: The dashboard id\n     * @param name: The name of the NFT\n     * @param symbol: The symbol of the NFT\n     * @param uri: The URI of the NFT"
      ],
      "accounts": [
        {
          "name": "mint",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "dashboardAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "associatedTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "masterEditionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "dashboardId",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "dashboardId",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftId",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "NFTMinted",
      "fields": [
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "dashboardId",
          "type": "u64",
          "index": false
        },
        {
          "name": "nftId",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "ChangedDashboardId",
      "fields": [
        {
          "name": "dashboardId",
          "type": "u64",
          "index": false
        },
        {
          "name": "newNftId",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "NewOwner",
      "fields": [
        {
          "name": "previousAdmin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newAdmin",
          "type": "publicKey",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "You are not authorized to perform this action."
    },
    {
      "code": 6001,
      "name": "DashboardAlreadyExists",
      "msg": "Dashboard ID already exists."
    },
    {
      "code": 6002,
      "name": "InvalidDashboardAccount",
      "msg": "The dashboard account is invalid."
    }
  ]
};

export const IDL: GlintNft = {
  "version": "0.1.0",
  "name": "glint_nft",
  "instructions": [
    {
      "name": "initialize",
      "docs": [
        "* Initialize the config account to set an admin.\n     * Must be called once after the program is deployed.\n     * The caller is set as the admin."
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "transferOwnership",
      "docs": [
        "* Transfer the ownership of the config account to a new admin.\n     * Only the current admin can call this method.\n     * @param new_admin: The new admin address."
      ],
      "accounts": [
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "setDashboardId",
      "docs": [
        "* NOTE: unsafe method. This is automatically called by `mint_nft`.\n     * Sets the NFT that represents the Dashboard ID.\n     * Only the admin can call this method.\n     * @param _dashboard_id: The Dashboard ID as the seed key\n     * @param nft_id: The NFT ID to set for the Dashboard ID"
      ],
      "accounts": [
        {
          "name": "dashboardAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "dashboardId",
          "type": "u64"
        },
        {
          "name": "nftId",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "requireDashboardId",
      "docs": [
        "* Check the NFT ID associated with the Dashboard ID.\n     * @param _dashboard_id: The Dashboard ID\n     * @return The NFT ID if set, otherwise None."
      ],
      "accounts": [
        {
          "name": "dashboardAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "mintNft",
      "docs": [
        "* Mint an NFT for the `associated_token_account`.\n     * Only the admin can call this method.\n     * @param _dashboard_id: The dashboard id\n     * @param name: The name of the NFT\n     * @param symbol: The symbol of the NFT\n     * @param uri: The URI of the NFT"
      ],
      "accounts": [
        {
          "name": "mint",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "dashboardAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "associatedTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "metadataAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "masterEditionAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "config",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenMetadataProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "dashboardId",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "dashboardId",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nftId",
            "type": {
              "option": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "NFTMinted",
      "fields": [
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "dashboardId",
          "type": "u64",
          "index": false
        },
        {
          "name": "nftId",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "ChangedDashboardId",
      "fields": [
        {
          "name": "dashboardId",
          "type": "u64",
          "index": false
        },
        {
          "name": "newNftId",
          "type": "publicKey",
          "index": false
        }
      ]
    },
    {
      "name": "NewOwner",
      "fields": [
        {
          "name": "previousAdmin",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "newAdmin",
          "type": "publicKey",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "Unauthorized",
      "msg": "You are not authorized to perform this action."
    },
    {
      "code": 6001,
      "name": "DashboardAlreadyExists",
      "msg": "Dashboard ID already exists."
    },
    {
      "code": 6002,
      "name": "InvalidDashboardAccount",
      "msg": "The dashboard account is invalid."
    }
  ]
};
