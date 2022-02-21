const {deploySetup} = require('../helpers/deployFullSetup');
const {
  toWei,
  increaseTo,
  advanceBlockTo,
  getBlockNumber
} = require('../../helpers/utils');
const {
  topUpActors,
  actorStakes,
  expectTickets,
  initRaffle,
  enterRaffle,
  draftWinner,
  getPrizeWinner,
  claimPrize,
  stakeNft,
  actorUntakes,
  assertPrizeOwner
} = require('./helpers');

contract('End to End test', accounts => {
  it('1 actor', async () => {
    const {
      raffleInstance,
      stakingInstance,
      mockPrizeInstance,
      ticketInstance,
      mockRewardInstance,
      VRFCoordinatorInstance,
      rarityRegisterInstance,
      actors
    } = await deploySetup(accounts);

    const {owner, alice} = actors;

    const {
      raffleIndex,
      raffleEndDate,
      prizes
    } = await initRaffle({raffleInstance, prizeInstance: mockPrizeInstance});

    const [prizeInstance1, prize1Index, prize1Id] = prizes[0];
    const [prizeInstance2, prize2Index, prize2Id] = prizes[1];

    await rarityRegisterInstance.storeNftRarity(prizeInstance1.address, prize1Id, 100);
    await rarityRegisterInstance.storeNftRarity(prizeInstance2.address, prize2Id, 200);

    await prizeInstance1.setApprovalForAll(stakingInstance.address, true, {from: alice});
    await prizeInstance2.setApprovalForAll(stakingInstance.address, true, {from: alice});

    const stakeIndex = {
      alice: 0,
      bob: 0,
      anna: 0
    };

    await topUpActors(actors, {mockRewardInstance, stakingInstance});

    // Alice Stakes 100 tokens
    const aliceStake1BlockNumber = await actorStakes({
      actor: alice,
      name: 'Alice',
      stakeAmount: toWei('100'),
      stakingInstance,
      lockIndex: 0,
      actorStakeIndex: stakeIndex.alice++
    });

    // Alice will receive 1 Raffle ticket
    await expectTickets({
      actorName: 'Alice',
      actor: alice,
      prevTickersBalance: 0,
      stakeAmount: toWei('100'),
      stakingInstance,
      lockIndex: 0,
      ticketInstance,
      expectedTickets: 1,
      actorStakeIndex: stakeIndex.alice - 1
    });

    // Alice Stakes another 200 tokens
    const aliceStake2BlockNumber = await actorStakes({
      actor: alice,
      name: 'Alice',
      stakeAmount: toWei('200'),
      stakingInstance,
      lockIndex: 0,
      actorStakeIndex: stakeIndex.alice++
    });

    // Alice will receive 2 Raffle ticket
    await expectTickets({
      actorName: 'Alice',
      actor: alice,
      prevTickersBalance: 1,
      stakeAmount: toWei('200'),
      stakingInstance,
      lockIndex: 0,
      ticketInstance,
      expectedTickets: 2,
      actorStakeIndex: stakeIndex.alice - 1
    });

    // Alice enters Raffle with Ticket 0
    await enterRaffle({
      raffleInstance,
      ticketInstance,
      raffleIndex,
      actor: alice,
      actorName: 'Alice',
      ticketId: '0' // ticket is always 0
    });

    await increaseTo(raffleEndDate);

    await draftWinner({
      owner,
      raffleIndex,
      raffleInstance,
      VRFCoordinatorInstance
    });

    // const winnerOfPrize1 = await getPrizeWinner({
    //   raffleInstance,
    //   raffleIndex,
    //   prizeIndex: prize1Index,
    //   expectedWinner: alice
    // });

    // const winnerOfPrize2 = await getPrizeWinner({
    //   raffleInstance,
    //   raffleIndex,
    //   prizeIndex: prize2Index,
    //   expectedWinner: alice
    // });

    await claimPrize({
      prizeInstance: prizeInstance1,
      raffleInstance,
      raffleIndex,
      prizeIndex: prize1Index,
      winnerAddress: alice,
      prizeTokenId: prize1Id
    });

    await claimPrize({
      prizeInstance: prizeInstance2,
      raffleInstance,
      raffleIndex,
      prizeIndex: prize2Index,
      winnerAddress: alice,
      prizeTokenId: prize2Id
    });

    await stakeNft({
      actor: alice,
      actorName: 'Alice',
      stakingInstance,
      stakeIndex: 0,
      tokenId: prize1Id,
      mockNftInstance: prizeInstance1
    });

    await advanceBlockTo(aliceStake1BlockNumber + 10);

    await actorUntakes({
      stakingInstance,
      actor: alice,
      unstakeAmount: toWei('100'),
      stakeIndex: 0
    });

    await assertPrizeOwner({
      prizeInstance: prizeInstance1,
      prizeTokenId: prize1Id,
      expectedOwner: alice
    });

    await advanceBlockTo(aliceStake2BlockNumber + 10);

    await actorUntakes({
      stakingInstance,
      actor: alice,
      unstakeAmount: toWei('200'),
      stakeIndex: 1
    });
  });

  it('2 actors', async () => {
    const {
      raffleInstance,
      stakingInstance,
      mockPrizeInstance,
      ticketInstance,
      mockRewardInstance,
      VRFCoordinatorInstance,
      rarityRegisterInstance,
      actors
    } = await deploySetup(accounts);

    const {owner, alice, bob} = actors;

    const {
      raffleIndex,
      raffleEndDate,
      prizes
    } = await initRaffle({raffleInstance, prizeInstance: mockPrizeInstance, prizeNumber: 1});

    const [prizeInstance1, prize1Index, prize1Id] = prizes[0];

    await rarityRegisterInstance.storeNftRarity(prizeInstance1.address, prize1Id, 100);

    await prizeInstance1.setApprovalForAll(stakingInstance.address, true, {from: alice});
    await prizeInstance1.setApprovalForAll(stakingInstance.address, true, {from: bob});

    const stakeIndex = {
      alice: 0,
      bob: 0,
      anna: 0
    };

    await topUpActors(actors, {mockRewardInstance, stakingInstance});

    // Alice Stakes 100 tokens
    await actorStakes({
      actor: alice,
      name: 'Alice',
      stakeAmount: toWei('100'),
      stakingInstance,
      lockIndex: 1,
      actorStakeIndex: stakeIndex.alice++,
      multiplier: 150
    });

    // Alice will receive 1 Raffle ticket
    await expectTickets({
      actorName: 'Alice',
      actor: alice,
      prevTickersBalance: 0,
      stakeAmount: toWei('100'),
      stakingInstance,
      lockIndex: 1,
      ticketInstance,
      expectedTickets: 1,
      actorStakeIndex: stakeIndex.alice - 1
    });

    // Alice Stakes another 200 tokens
    await actorStakes({
      actor: alice,
      name: 'Alice',
      stakeAmount: toWei('200'),
      stakingInstance,
      lockIndex: 1,
      actorStakeIndex: stakeIndex.alice++,
      multiplier: 150
    });

    // Alice will receive 2 Raffle ticket
    await expectTickets({
      actorName: 'Alice',
      actor: alice,
      prevTickersBalance: 1,
      stakeAmount: toWei('200'),
      stakingInstance,
      lockIndex: 1,
      ticketInstance,
      expectedTickets: 3,
      actorStakeIndex: stakeIndex.alice - 1
    });

    // Bob Stakes 500 tokens
    await actorStakes({
      actor: bob,
      name: 'Bob',
      stakeAmount: toWei('500'),
      stakingInstance,
      lockIndex: 2, // this gives a 2x multiplier
      actorStakeIndex: stakeIndex.bob++,
      multiplier: 200
    });

    // Bob will receive 10 Raffle ticket
    await expectTickets({
      actorName: 'Bob',
      actor: bob,
      prevTickersBalance: 0,
      stakeAmount: toWei('500'),
      stakingInstance,
      lockIndex: 2,
      ticketInstance,
      expectedTickets: 10,
      actorStakeIndex: stakeIndex.bob - 1
    });

    // Alice enters Raffle with Ticket 0
    await enterRaffle({
      raffleInstance,
      ticketInstance,
      raffleIndex,
      actor: alice,
      actorName: 'Alice',
      ticketId: '0' // ticket is always 0
    });

    // Bob enters Raffle with Ticket 0
    await enterRaffle({
      raffleInstance,
      ticketInstance,
      raffleIndex,
      actor: bob,
      actorName: 'Bob',
      ticketId: '0' // ticket is always 0
    });

    await increaseTo(raffleEndDate);

    await draftWinner({
      owner,
      raffleIndex,
      raffleInstance,
      VRFCoordinatorInstance
    });

    const winnerOfPrize1 = await getPrizeWinner({
      raffleInstance,
      raffleIndex,
      prizeIndex: prize1Index
    });

    await claimPrize({
      prizeInstance: prizeInstance1,
      raffleInstance,
      raffleIndex,
      prizeIndex: prize1Index,
      winnerAddress: winnerOfPrize1,
      prizeTokenId: prize1Id
    });

    if(winnerOfPrize1 === alice) {
      await stakeNft({
        actor: alice,
        actorName: 'Alice',
        stakingInstance,
        stakeIndex: 0,
        tokenId: prize1Id,
        mockNftInstance: prizeInstance1
      });

      const {lockedTill: aliceStake0LockedTill} = await stakingInstance.userStakes(alice, 0);
      if(await getBlockNumber() < aliceStake0LockedTill) {
        await advanceBlockTo(aliceStake0LockedTill);
      }

      await actorUntakes({
        stakingInstance,
        actor: alice,
        unstakeAmount: toWei('100'),
        stakeIndex: 0
      });

      await assertPrizeOwner({
        prizeInstance: prizeInstance1,
        prizeTokenId: prize1Id,
        expectedOwner: alice
      });

      const {lockedTill: aliceStake1LockedTill} = await stakingInstance.userStakes(alice, 1);
      if(await getBlockNumber() < aliceStake1LockedTill) {
        await advanceBlockTo(aliceStake1LockedTill);
      }

      await actorUntakes({
        stakingInstance,
        actor: alice,
        unstakeAmount: toWei('200'),
        stakeIndex: 1
      });
    }
    else if(winnerOfPrize1 === bob) {
      await stakeNft({
        actor: bob,
        actorName: 'Bob',
        stakingInstance,
        stakeIndex: 0,
        tokenId: prize1Id,
        mockNftInstance: prizeInstance1
      });

      const {lockedTill: bobStake0LockedTill} = await stakingInstance.userStakes(bob, 0);
      if(await getBlockNumber() < bobStake0LockedTill) {
        await advanceBlockTo(bobStake0LockedTill);
      }

      await actorUntakes({
        stakingInstance,
        actor: bob,
        unstakeAmount: toWei('100'),
        stakeIndex: 0
      });

      await assertPrizeOwner({
        prizeInstance: prizeInstance1,
        prizeTokenId: prize1Id,
        expectedOwner: bob
      });
    }
  });
});
