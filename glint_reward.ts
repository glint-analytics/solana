export type GlintReward = {
  "version": "0.1.0",
  "name": "glint_reward",
  "instructions": [
    {
      "name": "initialize",
      "docs": [
        "* Must be called once after the program is deployed.\n     * The caller must be the admin."
      ],
      "accounts": [
        {
          "name": "rewardDistribution",
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
      "name": "configureRewards",
      "docs": [
        "* Configure the reward amounts for the top three winners.\n     * The amounts are stored in the reward_distribution account."
      ],
      "accounts": [
        {
          "name": "rewardDistribution",
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
        }
      ],
      "args": [
        {
          "name": "rewardAmounts",
          "type": {
            "array": [
              "u64",
              3
            ]
          }
        }
      ]
    },
    {
      "name": "claimReward",
      "docs": [
        "* Claim the reward for the given round and position.\n     * The reward is transferred to the claimant's associated token account.\n     * Requirements:\n     * - The round must be over.\n     * - The round must have winners.\n     * - The claimant must be the winner. (holds the NFT)\n     * - The claimant must not have claimed the reward.\n     * - All ctx accounts must be valid.\n     * @param _round_id: The round ID.\n     * @param position: The position of the claimant."
      ],
      "accounts": [
        {
          "name": "claimStatus",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardDistribution",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "claimantTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winnersAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "dashboardAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "roundId",
          "type": "u64"
        },
        {
          "name": "bumps",
          "type": "u8"
        },
        {
          "name": "position",
          "type": "i8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "claimStatus",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "claimant",
            "type": "publicKey"
          },
          {
            "name": "positions",
            "type": "u8"
          },
          {
            "name": "roundId",
            "type": "u32"
          },
          {
            "name": "claimed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "rewardDistribution",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rewardAmounts",
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "ClaimEvent",
      "fields": [
        {
          "name": "claimant",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "roundId",
          "type": "u64",
          "index": false
        },
        {
          "name": "position",
          "type": "i8",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "NewRewards",
      "fields": [
        {
          "name": "firstPlace",
          "type": "u64",
          "index": false
        },
        {
          "name": "secondPlace",
          "type": "u64",
          "index": false
        },
        {
          "name": "thirdPlace",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "AlreadyClaimed",
      "msg": "Reward already claimed for this round."
    },
    {
      "code": 6001,
      "name": "InvalidPosition",
      "msg": "Invalid position."
    },
    {
      "code": 6002,
      "name": "InvalidClaimStatusAccount",
      "msg": "The claim status account is invalid."
    },
    {
      "code": 6003,
      "name": "InvalidDashboardAccount",
      "msg": "The dashboard account is invalid."
    },
    {
      "code": 6004,
      "name": "InvalidWinnersAccount",
      "msg": "The winners account is invalid."
    },
    {
      "code": 6005,
      "name": "InvalidRoundAccount",
      "msg": "The round account is invalid."
    },
    {
      "code": 6006,
      "name": "InvalidATA",
      "msg": "The associated token account is invalid."
    },
    {
      "code": 6007,
      "name": "InvalidTokenBalance",
      "msg": "The ATA is not holding any tokens."
    },
    {
      "code": 6008,
      "name": "InvalidTokenId",
      "msg": "The Token ID does not match the mint key."
    },
    {
      "code": 6009,
      "name": "InvalidWinner",
      "msg": "There is no winners for the given round."
    },
    {
      "code": 6010,
      "name": "InvalidRound",
      "msg": "The round is invalid or not over yet."
    },
    {
      "code": 6011,
      "name": "Unauthorized",
      "msg": "You are not authorized to perform this action."
    }
  ]
};

export const IDL: GlintReward = {
  "version": "0.1.0",
  "name": "glint_reward",
  "instructions": [
    {
      "name": "initialize",
      "docs": [
        "* Must be called once after the program is deployed.\n     * The caller must be the admin."
      ],
      "accounts": [
        {
          "name": "rewardDistribution",
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
      "name": "configureRewards",
      "docs": [
        "* Configure the reward amounts for the top three winners.\n     * The amounts are stored in the reward_distribution account."
      ],
      "accounts": [
        {
          "name": "rewardDistribution",
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
        }
      ],
      "args": [
        {
          "name": "rewardAmounts",
          "type": {
            "array": [
              "u64",
              3
            ]
          }
        }
      ]
    },
    {
      "name": "claimReward",
      "docs": [
        "* Claim the reward for the given round and position.\n     * The reward is transferred to the claimant's associated token account.\n     * Requirements:\n     * - The round must be over.\n     * - The round must have winners.\n     * - The claimant must be the winner. (holds the NFT)\n     * - The claimant must not have claimed the reward.\n     * - All ctx accounts must be valid.\n     * @param _round_id: The round ID.\n     * @param position: The position of the claimant."
      ],
      "accounts": [
        {
          "name": "claimStatus",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardDistribution",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "nftTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rewardSource",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "claimantTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winnersAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "dashboardAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "associatedTokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "roundId",
          "type": "u64"
        },
        {
          "name": "bumps",
          "type": "u8"
        },
        {
          "name": "position",
          "type": "i8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "claimStatus",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "claimant",
            "type": "publicKey"
          },
          {
            "name": "positions",
            "type": "u8"
          },
          {
            "name": "roundId",
            "type": "u32"
          },
          {
            "name": "claimed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "rewardDistribution",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rewardAmounts",
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "ClaimEvent",
      "fields": [
        {
          "name": "claimant",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "roundId",
          "type": "u64",
          "index": false
        },
        {
          "name": "position",
          "type": "i8",
          "index": false
        },
        {
          "name": "amount",
          "type": "u64",
          "index": false
        }
      ]
    },
    {
      "name": "NewRewards",
      "fields": [
        {
          "name": "firstPlace",
          "type": "u64",
          "index": false
        },
        {
          "name": "secondPlace",
          "type": "u64",
          "index": false
        },
        {
          "name": "thirdPlace",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "AlreadyClaimed",
      "msg": "Reward already claimed for this round."
    },
    {
      "code": 6001,
      "name": "InvalidPosition",
      "msg": "Invalid position."
    },
    {
      "code": 6002,
      "name": "InvalidClaimStatusAccount",
      "msg": "The claim status account is invalid."
    },
    {
      "code": 6003,
      "name": "InvalidDashboardAccount",
      "msg": "The dashboard account is invalid."
    },
    {
      "code": 6004,
      "name": "InvalidWinnersAccount",
      "msg": "The winners account is invalid."
    },
    {
      "code": 6005,
      "name": "InvalidRoundAccount",
      "msg": "The round account is invalid."
    },
    {
      "code": 6006,
      "name": "InvalidATA",
      "msg": "The associated token account is invalid."
    },
    {
      "code": 6007,
      "name": "InvalidTokenBalance",
      "msg": "The ATA is not holding any tokens."
    },
    {
      "code": 6008,
      "name": "InvalidTokenId",
      "msg": "The Token ID does not match the mint key."
    },
    {
      "code": 6009,
      "name": "InvalidWinner",
      "msg": "There is no winners for the given round."
    },
    {
      "code": 6010,
      "name": "InvalidRound",
      "msg": "The round is invalid or not over yet."
    },
    {
      "code": 6011,
      "name": "Unauthorized",
      "msg": "You are not authorized to perform this action."
    }
  ]
};
