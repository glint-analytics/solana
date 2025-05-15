import AdminActions.GlintVoteProgram;
import externs.solana.web3.AuthorityType;
import externs.solana.web3.SplToken;
import externs.solana.web3.Connection;
import js.node.Crypto;
import promises.Promise;
import externs.anchor.BN;
import js.node.Buffer;
import externs.solana.web3.PublicKey;
import externs.anchor.AnchorProvider;
import externs.solana.web3.Transaction;
import externs.solana.web3.SystemProgram;
import externs.solana.web3.Keypair;
import externs.solana.web3.TransactionInstruction;
import Externs.Bs58;

class UserPrograms {

  public var glintVote:GlintVoteProgram = untyped externs.anchor.Anchor.workspace.GlintVote.methods;

    public function new() {

    }

    /*const dashboardId = new anchor.BN(123).toArrayLike(Buffer, 'le', 8); // Replace with the actual dashboard ID
const roundId = new anchor.BN(456).toArrayLike(Buffer, 'le', 8); // Replace with the actual round ID

const data = Buffer.concat([Buffer.from([0]), dashboardId, roundId]); // Assuming 0 is the discriminator for the vote instruction*/



public function vote(connection:Connection, dashboardId:Int, roundId:Int, voter: Keypair):Promise<Bool> {

  return new Promise((resolve, reject) -> {
    var transaction = UserTransactions.vote(dashboardId, roundId, voter.publicKey);
          
    connection.sendTransaction(transaction, [voter], {skipPreflight: false}).then(_ -> {
      connection.confirmTransaction(_);
    }).then(_ -> {
      resolve(_);
    }, error -> {
      trace(error);
      reject(error);
    });
  });
}

public function unvote(connection:Connection, dashboardId:Int, roundId:Int, voter: Keypair):Promise<Bool> {

  return new Promise((resolve, reject) -> {
    var transaction = UserTransactions.unvote(dashboardId, roundId, voter.publicKey);
          
    connection.sendTransaction(transaction, [voter], {skipPreflight: false}).then(_ -> {
      connection.confirmTransaction(_);
    }).then(_ -> {
      resolve(_);
    }, error -> {
      trace(error);
      reject(error);
    });
  });
}

/*
    public function vote(dashboardId:Int, roundId:Int, voter: Keypair):Promise<Bool> {
		trace('Fee payer account ${Config.feePayer.publicKey.toBase58()}');
		
	  
		trace('Voting on dashboard ID ${dashboardId} for Round ${roundId}');

		return new Promise((resolve, reject) -> {
			var dashboardAccount = PublicKey.findProgramAddressSync(
			[new BN(dashboardId).toArrayLike(Buffer, "le", 8)],
			Config.glintNftProgramId
			)[0];
			trace('Dashboard PDA ${dashboardAccount.toBase58()}');

			var scoresAccount = PublicKey.findProgramAddressSync(
				[
				Buffer.from("voting_state_scores"),
				new BN(dashboardId).toArrayLike(Buffer, "le", 8),
				],
				Config.glintVoteProgramId
			)[0];
			trace('Scores PDA ${scoresAccount.toBase58()}');

			var votersAccount = PublicKey.findProgramAddressSync(
				[Buffer.from("voting_state_voters"), untyped voter.publicKey.toBuffer()],
				Config.glintVoteProgramId
			)[0];
			trace('Voters PDA ${votersAccount.toBase58()}');

			var winnersAccount = PublicKey.findProgramAddressSync(
				[new BN(roundId).toArrayLike(Buffer, "le", 8)],
				Config.glintVoteProgramId
			)[0];

			glintVote.vote(new BN(dashboardId), new BN(roundId)).accounts( {
				scoresAccount: scoresAccount,
				votersAccount: votersAccount,
				roundAccount: Transactions.voteAccountPubKey,
				winnersAccount: winnersAccount,
				dashboardAccount: dashboardAccount,
				config: Transactions.configAccountPubKey,
				signer: voter.publicKey,
				glintNft: Config.glintNftProgramId,
				systemProgram: SystemProgram.programId
			}).signers([voter]).rpc().then( tx -> {
				trace('Vote transaction successful ${tx}');
				resolve(true);
			}, error -> {
				trace(error);
				reject(error);
			});
		});
	}*/


    public function claimReward(roundId:Int, position:Int, claimant: Keypair):Promise<Bool> {

        trace('Claiming reward for round ${roundId}, position ${position}');
        trace('Claimant Account Address ${claimant.publicKey.toBase58()}');

        return null;

/*
		return new Promise((resolve, reject) -> {

              //// Create an Account for Alice
            //var claimantATA = 
            var adminERC20 = provider.wallet;
            SplToken.getAssociatedTokenAddress(
                Config.mintERC20.publicKey,
                claimant.publicKey,
                false
            ).then (claimantATA -> {
                trace('Claimant ATA Address ${untyped claimantATA.toBase58()}');
                var createAliceATA = new Transaction().add(
                    SplToken.createAssociatedTokenAccountInstruction(
                    adminERC20.publicKey,
                    claimantATA,
                    claimant.publicKey,
                    Config.mintERC20.publicKey
                    )
                );
                return provider.sendAll([{ tx: createAliceATA }]);
            }).then (tx6 -> {
                var LAMPORTS_PER_SOL = 1000000000;
                trace('Created ATA for Claimant Tx ${tx6}');
                //// Funding the claimant just to make sure they have some SOL
                var sendFunds = new Transaction().add(
                    SystemProgram.transfer({
                      fromPubkey: adminERC20.publicKey,
                      toPubkey: claimant.publicKey,
                      lamports: 1 * LAMPORTS_PER_SOL,
                    })
                  );
                return provider.sendAndConfirm(sendFunds);
            }).then (tx7 -> {
                trace('Funded Alice with 1 SOL Tx ${tx7}');
            });

             // Handle NFT Minting
            // Handle Voting
            // Handle the winners account
            // Get winners account
            var claimStatus = PublicKey.findProgramAddressSync(
                [
                Buffer.from("claim"),
                untyped claimant.publicKey.toBuffer(),
                new BN(roundId).toArrayLike(Buffer, "le", 8),
                ],
                Config.glintRewardProgramId
            )[0];

            // Get winners data to find the dashboard ID
            var winnersAccount = PublicKey.findProgramAddressSync(
                [new BN(roundId).toArrayLike(Buffer, "le", 8)],
                Config.glintVoteProgramId
            )[0];
            trace('Winners Account PDA: ${winnersAccount.toBase58()}');
            voteProgram.account.winnersState.fetch(
                winnersAccount
            ).then (winners -> {
                var dashboardId = winners.topThree[position];
                var dashboardAccount = PublicKey.findProgramAddressSync(
                    [new BN(dashboardId).toArrayLike(Buffer, "le", 8)],
                    Config.glintNftProgramId
                    )[0];
                    trace('Dashboard PDA ${dashboardAccount.toBase58()}');
                var scoresAccount = PublicKey.findProgramAddressSync(
                    [
                    Buffer.from("voting_state_scores"),
                    new BN(dashboardId).toArrayLike(Buffer, "le", 8),
                    ],
                    Config.glintVoteProgramId
                )[0];
                trace('Scores PDA ${scoresAccount.toBase58()}');
            });
			

			

			var votersAccount = PublicKey.findProgramAddressSync(
				[Buffer.from("voting_state_voters"), untyped voter.publicKey.toBuffer()],
				Config.glintVoteProgramId
			);
			trace('Voters PDA ${votersAccount.toBase58()}');

			var winnersAccount = PublicKey.findProgramAddressSync(
				[new BN(roundId).toArrayLike(Buffer, "le", 8)],
				Config.glintVoteProgramId
			);

			untyped glintVote.methods.vote(new BN(dashboardId), new BN(roundId)).then ( _ -> {
				scoresAccount: scoresAccount,
				votersvotersAccount: votersAccount,
				roundAccount: roundAccount,
				winnersAccount: winnersAccount,
				dashodashboardAccount: dashboardAccount,
				config: configNft,
				signer: voter.publicKey,
				glintNft: Config.glintNftProgramId,
				systemProgram: SystemProgram.programId
			}).signers([voter]).rpc().then( tx -> {
				trace('Vote transaction successful ${tx}');
				resolve(true);
			}, error -> {
				trace(error);
				reject(error);
			});
		});*/
	}

    /*

async function claimReward(

  

  // Get the dashboard account
  const [dashboardAccount] = PublicKey.findProgramAddressSync(
    [new anchor.BN(dashboardId).toArrayLike(Buffer, "le", 8)],
    nftProgram.programId
  );
  await logAccount(
    `Dashboard Account PDA: ${dashboardAccount.toBase58()}`
  );

  // Get NFT token account
  const dashboard = await nftProgram.account.dashboardId.fetch(
    dashboardAccount
  );
  const nftTokenAccount = await getAssociatedTokenAddress(
    dashboard.nftId,
    claimant.publicKey
  );
  await logAccount(
    `NFT Associated Token Account Address: ${nftTokenAccount.toBase58()}`
  );

  // Get the SPL ATA
  const splTokenATA = await getSplTokenATA();
  await logAccount(`SPL Token ATA Address: ${splTokenATA.toBase58()}`);

  try {
    const tx = await rewardProgram.methods
      .claimReward(new anchor.BN(roundId), bumps, position)
      .accounts({
        claimStatus,
        rewardDistribution,
        nftTokenAccount,
        rewardSource: splTokenATA,
        claimantTokenAccount: claimantATA,
        winnersAccount,
        roundAccount,
        dashboardAccount,
        signer: claimant.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([claimant])
      .rpc();

    await logTx(`Reward claimed: ${tx}`);
    let tokenAccountInfo = await provider.connection.getTokenAccountBalance(
      splTokenATA
    );
    await logAccount(`SPL ATA Address: ${splTokenATA.toBase58()}`);
    await log(`SPL ATA Balance: ${tokenAccountInfo.value.amount}`);
    tokenAccountInfo = await provider.connection.getTokenAccountBalance(
      claimantATA
    );
    await logAccount(`Claimant ATA Address: ${claimantATA.toBase58()}`);
    await log(`Claimant ATA Balance: ${tokenAccountInfo.value.amount}`);
  } catch (error) {
    await log(`Error claiming reward: ${error}`);
    throw error;
  }
}

async function main() {
  await logAccount(`Round Account Address: ${roundAccount.toBase58()}`);
  await logAccount(`Config NFT Address: ${configNft.toBase58()}`);
  await logAccount(
    `Reward Distribution Address: ${rewardDistribution.toBase58()}`
  );

  const roundId = 1; // Get this from the voting state
  const position = 0; // 0 for 1st place, 1 for 2nd place, 2 for 3rd place
  await claimReward(roundId, position, aliceAccount); // Claim 1st place reward
}

if (require.main === module) {
  main();
}
*/



}