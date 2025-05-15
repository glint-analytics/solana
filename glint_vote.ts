export type GlintVote = {
  "version": "0.1.0",
  "name": "glint_vote",
  "instructions": [
    {
      "name": "initialize",
      "docs": [
        "* Initialize the config account to set an admin.\n     * Must be called once after the program is deployed."
      ],
      "accounts": [
        {
          "name": "roundAccount",
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
          "name": "roundId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initVotePeriod",
      "docs": [
        "* Initialize a new voting period.\n     * @param _round_id: The round ID to initialize.\n     * @param duration: The duration of the voting period in seconds."
      ],
      "accounts": [
        {
          "name": "roundAccount",
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
          "name": "duration",
          "type": "u64"
        }
      ]
    },
    {
      "name": "endVotePeriod",
      "docs": [
        "* End the current voting period.\n     * The admin can force end the voting period before the duration ends.\n     * @param ctx: The context to end the voting period."
      ],
      "accounts": [
        {
          "name": "roundAccount",
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
      "args": []
    },
    {
      "name": "setVotingDuration",
      "docs": [
        "* Set the duration of the voting period.\n     * NOTE: unsafe method, admin can change the voting duration.\n     * @param ctx: The context to set the voting duration.\n     * @param new_duration: The new duration of the voting period in seconds."
      ],
      "accounts": [
        {
          "name": "roundAccount",
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
          "name": "newDuration",
          "type": "u64"
        }
      ]
    },
    {
      "name": "vote",
      "docs": [
        "* Vote for a dashboard ID.\n     * Requirements:\n     * - The voting period must have ended.\n     * - The voter must not have already voted.\n     * - The dashboard account must be exist.\n     * - All context accounts must be valid.\n     * @param ctx: The context to vote for a dashboard ID.\n     * @param _dashboard_id: The dashboard ID to vote for."
      ],
      "accounts": [
        {
          "name": "scoresAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "votersAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winnersAccount",
          "isMut": true,
          "isSigner": false
        },
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
          "name": "glintNft",
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
          "name": "dashboardId",
          "type": "u64"
        },
        {
          "name": "roundId",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "votingState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "currRound",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "votingEnd",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "winnersState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "topThree",
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          },
          {
            "name": "topThreeScores",
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "scores",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "score",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "voters",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hasVoted",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "NewVoteStarted",
      "fields": [
        {
          "name": "round",
          "type": "u64",
          "index": false
        },
        {
          "name": "roundEnd",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VoteEndByForce",
      "fields": [
        {
          "name": "round",
          "type": "u64",
          "index": false
        },
        {
          "name": "roundEnded",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VotingDurationChanged",
      "fields": [
        {
          "name": "round",
          "type": "u64",
          "index": false
        },
        {
          "name": "votingEnd",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VoteCasted",
      "fields": [
        {
          "name": "round",
          "type": "u64",
          "index": false
        },
        {
          "name": "voter",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "dashboard",
          "type": "u64",
          "index": false
        },
        {
          "name": "score",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "VotingAlreadyActive",
      "msg": "There is an active voting period."
    },
    {
      "code": 6001,
      "name": "NoActiveVoting",
      "msg": "There is no active voting period."
    },
    {
      "code": 6002,
      "name": "VotingPeriodEnded",
      "msg": "Voting period has ended."
    },
    {
      "code": 6003,
      "name": "AlreadyVoted",
      "msg": "This address has already voted in the current voting period."
    },
    {
      "code": 6004,
      "name": "InvalidDashboardAccount",
      "msg": "The dashboard account is invalid."
    },
    {
      "code": 6005,
      "name": "InvalidRoundAccount",
      "msg": "The round account is invalid."
    },
    {
      "code": 6006,
      "name": "InvalidWinnersAccount",
      "msg": "The winners account is invalid."
    },
    {
      "code": 6007,
      "name": "InvalidScoresAccount",
      "msg": "The scores account is invalid."
    },
    {
      "code": 6008,
      "name": "InvalidVotersAccount",
      "msg": "The voters account is invalid."
    },
    {
      "code": 6009,
      "name": "Unauthorized",
      "msg": "You are not authorized to perform this action."
    }
  ]
};

export const IDL: GlintVote = {
  "version": "0.1.0",
  "name": "glint_vote",
  "instructions": [
    {
      "name": "initialize",
      "docs": [
        "* Initialize the config account to set an admin.\n     * Must be called once after the program is deployed."
      ],
      "accounts": [
        {
          "name": "roundAccount",
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
          "name": "roundId",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initVotePeriod",
      "docs": [
        "* Initialize a new voting period.\n     * @param _round_id: The round ID to initialize.\n     * @param duration: The duration of the voting period in seconds."
      ],
      "accounts": [
        {
          "name": "roundAccount",
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
          "name": "duration",
          "type": "u64"
        }
      ]
    },
    {
      "name": "endVotePeriod",
      "docs": [
        "* End the current voting period.\n     * The admin can force end the voting period before the duration ends.\n     * @param ctx: The context to end the voting period."
      ],
      "accounts": [
        {
          "name": "roundAccount",
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
      "args": []
    },
    {
      "name": "setVotingDuration",
      "docs": [
        "* Set the duration of the voting period.\n     * NOTE: unsafe method, admin can change the voting duration.\n     * @param ctx: The context to set the voting duration.\n     * @param new_duration: The new duration of the voting period in seconds."
      ],
      "accounts": [
        {
          "name": "roundAccount",
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
          "name": "newDuration",
          "type": "u64"
        }
      ]
    },
    {
      "name": "vote",
      "docs": [
        "* Vote for a dashboard ID.\n     * Requirements:\n     * - The voting period must have ended.\n     * - The voter must not have already voted.\n     * - The dashboard account must be exist.\n     * - All context accounts must be valid.\n     * @param ctx: The context to vote for a dashboard ID.\n     * @param _dashboard_id: The dashboard ID to vote for."
      ],
      "accounts": [
        {
          "name": "scoresAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "votersAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "roundAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "winnersAccount",
          "isMut": true,
          "isSigner": false
        },
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
          "name": "glintNft",
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
          "name": "dashboardId",
          "type": "u64"
        },
        {
          "name": "roundId",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "votingState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "currRound",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          },
          {
            "name": "votingEnd",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "winnersState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "topThree",
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          },
          {
            "name": "topThreeScores",
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "scores",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "score",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "voters",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hasVoted",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "NewVoteStarted",
      "fields": [
        {
          "name": "round",
          "type": "u64",
          "index": false
        },
        {
          "name": "roundEnd",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VoteEndByForce",
      "fields": [
        {
          "name": "round",
          "type": "u64",
          "index": false
        },
        {
          "name": "roundEnded",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VotingDurationChanged",
      "fields": [
        {
          "name": "round",
          "type": "u64",
          "index": false
        },
        {
          "name": "votingEnd",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "VoteCasted",
      "fields": [
        {
          "name": "round",
          "type": "u64",
          "index": false
        },
        {
          "name": "voter",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "dashboard",
          "type": "u64",
          "index": false
        },
        {
          "name": "score",
          "type": "u64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "VotingAlreadyActive",
      "msg": "There is an active voting period."
    },
    {
      "code": 6001,
      "name": "NoActiveVoting",
      "msg": "There is no active voting period."
    },
    {
      "code": 6002,
      "name": "VotingPeriodEnded",
      "msg": "Voting period has ended."
    },
    {
      "code": 6003,
      "name": "AlreadyVoted",
      "msg": "This address has already voted in the current voting period."
    },
    {
      "code": 6004,
      "name": "InvalidDashboardAccount",
      "msg": "The dashboard account is invalid."
    },
    {
      "code": 6005,
      "name": "InvalidRoundAccount",
      "msg": "The round account is invalid."
    },
    {
      "code": 6006,
      "name": "InvalidWinnersAccount",
      "msg": "The winners account is invalid."
    },
    {
      "code": 6007,
      "name": "InvalidScoresAccount",
      "msg": "The scores account is invalid."
    },
    {
      "code": 6008,
      "name": "InvalidVotersAccount",
      "msg": "The voters account is invalid."
    },
    {
      "code": 6009,
      "name": "Unauthorized",
      "msg": "You are not authorized to perform this action."
    }
  ]
};
