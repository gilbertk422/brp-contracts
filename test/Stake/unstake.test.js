const {deployStaking, deployMockNftToken, deployEthersStakingInstance} = require('../helpers/deploy');
const {getExpectedNextHistoryAverageRewardAfterEvent, DEFAULT_STAKER_AMOUNT, addStake} = require('../helpers/staking');
const {tokenBalanceDeltaAfterAction, topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {
  shouldFailWithMessage,
  toWei,
  toBN,
  getBlockNumber,
  advanceBlock
} = require('../../helpers/utils');
const {findEventInTransaction} = require('../../helpers/events');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32, hexToNumberString, createCallData} = require('../helpers/bytes');
const {batchTransactionsInBlock} = require('../helpers/network');

contract('Stake: unstake', accounts => {
  it('should not allow to unstake before the lock period', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('99'));

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    await shouldFailWithMessage(
      stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice}),
      'Staking: Stake is still locked'
    );

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice});
  });

  it('should revert if there is nothing to unstake', async () => {
    const [stakingInstance] = await deployStaking();

    const {user} = getRaffleActors(accounts);

    const stakeAmount = toBN(toWei('0'));

    // the user has not staked
    await shouldFailWithMessage(
      stakingInstance
        .unstake(stakeAmount, numberToBytes32(0), {from: user}),
      'Staking: Nothing to unstake'
    );
  });

  it('should revert if already unstaked', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('99'));

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    await advanceBlock();
    await advanceBlock();

    const balanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    expectBignumberEqual(
      balanceDelta,
      stakeAmount.add(toBN(toWei('29.7')))
    );

    await shouldFailWithMessage(
      stakingInstance
        .unstake(stakeAmount, numberToBytes32(0), {from: alice}),
      'Staking: Nothing to unstake'
    );
  });

  it('should return the correct reward and stake', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('99'));

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    await advanceBlock();
    await advanceBlock();

    const balanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    expectBignumberEqual(
      balanceDelta,
      stakeAmount.add(toBN(toWei('29.7')))
    );
  });

  it('should allow to claim leftover tickets even after unstake', async () => {
    const [stakingInstance, {mockRewardInstance, ticketInstance}] = await deployStaking();
    await stakingInstance.setTicketsMintingRatio(toWei('500'));

    const {user: alice} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    const stakeAmount = toWei('100');
    const {stakeIndex: aliceStakeIndex} = await addStake(stakingInstance, {
      lockIndex: 0, // 10 blocks, no multiplier
      staker: alice,
      amount: stakeAmount
    });

    // the ticket minting threshold is 500

    // ticketMintingChillPeriod is 1 block
    // we expect the user to print 2 tickets
    // because 10 periods * 100 = 1000 => 2 tickets

    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      0
    );

    // after 5 blocks (5 periods) we should have 15000 ghost shares (5 * 3000), which should
    // equal to 3 tickets (at 5000 BURP threshold)
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      0
    );
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      1
    );

    // other 5 blocks and we should see 2 tickets
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      1
    );
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      2
    );
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    // still 2
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      2
    );

    expectBignumberEqual(
      await ticketInstance.balanceOf(alice, 0),
      0
    );

    await stakingInstance.unstake(1, numberToBytes32(0), {from: alice});

    expectBignumberEqual(
      await ticketInstance.balanceOf(alice, 0),
      2
    );

    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      0
    );
  });

  it('should emit Unstaked Event', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    await advanceBlock();
    await advanceBlock();

    const unstakeResult = await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    const {args} = await findEventInTransaction(
      unstakeResult,
      'Unstaked'
    );

    const expectedAmount = toBN(toWei('29.7'));

    expect(args.user).to.equal(user);
    expectBignumberEqual(args.amount, expectedAmount);
    expectBignumberEqual(args.total, DEFAULT_STAKER_AMOUNT);
    expect(hexToNumberString(args.data)).to.equal(String(stakeIndex));
  });

  it('should update the totalCurrentlyStaked', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.totalCurrentlyStaked(),
      DEFAULT_STAKER_AMOUNT.add(stakeAmount)
    );

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    expectBignumberEqual(
      await stakingInstance.totalCurrentlyStaked(),
      DEFAULT_STAKER_AMOUNT
    );
  });

  it('should update the historyEndBlock', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    const previousHistoryEndBlock = await stakingInstance.historyEndBlock();

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    expectBignumberEqual(
      await stakingInstance.historyEndBlock(),
      (await getBlockNumber()) - 1
    );

    expectBignumberEqual(
      await stakingInstance.historyEndBlock(),
      previousHistoryEndBlock.add(toBN(3)) // 2 advance block + unstake block
    );
  });

  it('should update the historyRewardPot', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    await advanceBlock();
    await advanceBlock();

    const previousHistoryRewardPot = await stakingInstance.historyRewardPot();
    const previousCurrentPeriodReward = await stakingInstance.getTotalRewardInCurrentPeriod();

    const aliceUnstakeResult = await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    const newHistoryRewardPot = await stakingInstance.historyRewardPot();

    const {args} = await findEventInTransaction(
      aliceUnstakeResult,
      'Unstaked'
    );

    expectBignumberEqual(
      newHistoryRewardPot,
      previousHistoryRewardPot.add(previousCurrentPeriodReward).sub(args.amount)
    );
  });

  it('should update the historyAverageReward', async () => {
    const [stakingInstance, {mockRewardInstance, blocksDelta}] = await deployStaking();

    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    await advanceBlock();
    const expectedAverageReward = await getExpectedNextHistoryAverageRewardAfterEvent(
      stakingInstance, {
        expectedCurrentPeriodLength: 2,
        expectedHistoryLength: blocksDelta + 2,
        expectedNewHistoryLength: blocksDelta + 2 + 2, // adding the current period
        expectedCurrentAverageReward: toBN(toWei('0.1')),
        expectedNextHistoryAverageRewardAfterEvent: toBN(toWei('7.8'))
      }
    );
    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    const historyAverageReward = await stakingInstance.historyAverageReward();

    expectBignumberEqual(
      historyAverageReward,
      expectedAverageReward
    );
  });

  it('should consume all the rewards in contract if all stakers unstake after all reward periods are finished', async () => {
    const [
      stakingInstance,
      {
        deployedAtBlock,
        mockRewardInstance,
        owner
      }
    ] = await deployStaking({skipMinting: true});

    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});
    await mockRewardInstance
      .approve(stakingInstance.address, toWei('1000000', 'ether'), {from: owner});

    const rewardsStructure = [[toWei('10'), deployedAtBlock + 15]]; // a total of 100 reward, that's it.

    await Promise.all(
      rewardsStructure
        .map(([rewPerBlock, endReward]) => stakingInstance
          .addRewardStream(0, rewPerBlock, endReward, {from: owner}))
    );

    expectBignumberEqual(
      (await mockRewardInstance.balanceOf(stakingInstance.address)).toString(),
      toWei(150)
    );

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const aliceStakeAmount = toBN(toWei('99'));

    await stakingInstance
      .stake(aliceStakeAmount, numberToBytes32(4), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, aliceStakeAmount);

    await topUpUser(bob, {mockRewardInstance, stakingInstance});
    const bobStakeAmount = toBN(toWei('100'));
    await stakingInstance
      .stake(bobStakeAmount, numberToBytes32(4), {from: bob});

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    // we need to transfer 1 extra token because the default
    // staker stakes without any amount

    const aliceBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(aliceStakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    await mockRewardInstance
      .transfer(stakingInstance.address, toWei('1'), {from: owner});

    await advanceBlock();

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    const bobBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      bob,
      () => stakingInstance
        .unstake(bobStakeAmount, numberToBytes32(stakeIndex), {from: bob})
    );

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    const ownerBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      owner,
      () => stakingInstance
        .unstake(aliceStakeAmount, numberToBytes32(stakeIndex), {from: owner})
    );

    expectBignumberEqual(
      aliceBalanceDelta.add(ownerBalanceDelta).add(bobBalanceDelta),
      toBN('349999999999999998374') // rounding due to decimal precision
    );
  });
  
  it('should consume all the rewards in contract if same-block stakers unstake after all reward periods are finished', async () => {
    const [
      stakingInstance,
      {
        deployedAtBlock,
        mockRewardInstance,
        owner
      }
    ] = await deployEthersStakingInstance({skipMinting: true});

    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});
    await mockRewardInstance
      .approve(stakingInstance.address, toWei('1000000', 'ether'), {from: owner});

    const rewardsStructure = [[toWei('10'), deployedAtBlock + 15]]; // a total of 100 reward, that's it.

    await Promise.all(
      rewardsStructure
        .map(([rewPerBlock, endReward]) => stakingInstance
          .addRewardStream(0, rewPerBlock, endReward, {from: owner}))
    );

    expectBignumberEqual(
      (await mockRewardInstance.balanceOf(stakingInstance.address)).toString(),
      toWei(150)
    );

    const [ethersOwner, ethersAlice, ethersBob] = await ethers.getSigners();

    await topUpUser(ethersAlice.address, {mockRewardInstance, stakingInstance});
    await topUpUser(ethersBob.address, {mockRewardInstance, stakingInstance});
    
    const stakeAmount = toWei('100');

    await batchTransactionsInBlock([
      // eslint-disable-next-line array-element-newline
      () => stakingInstance.connect(ethersAlice).stake(stakeAmount, numberToBytes32(0)),
      () => stakingInstance.connect(ethersBob).stake(stakeAmount, numberToBytes32(0))
    ]);

    const stakeIndex = 0;

    {
      const {amountStaked} = await stakingInstance.userStakes(ethersAlice.address, stakeIndex);
      expectBignumberEqual(amountStaked, stakeAmount);
    }
    
    {
      const {amountStaked} = await stakingInstance.userStakes(ethersBob.address, stakeIndex);
      expectBignumberEqual(amountStaked, stakeAmount);
    }

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    // we need to transfer 1 extra token because the default
    // staker stakes without any amount
    await mockRewardInstance
      .transfer(stakingInstance.address, toWei('1'), {from: owner});

    await batchTransactionsInBlock([
      // eslint-disable-next-line array-element-newline
      () => stakingInstance.connect(ethersAlice).unstake(0, numberToBytes32(stakeIndex)),
      () => stakingInstance.connect(ethersBob).unstake(0, numberToBytes32(stakeIndex)),
      () => stakingInstance.connect(ethersOwner).unstake(0, numberToBytes32(stakeIndex))
    ]);

    expectBignumberEqual(
      await mockRewardInstance.balanceOf(ethersAlice.address),
      toBN('1029850746268656716417')
      );
      
      expectBignumberEqual(
        await mockRewardInstance.balanceOf(ethersBob.address),
        toBN('1029850746268656714800') // some small difference due to rounding
    );
    
    expectBignumberEqual(
      await mockRewardInstance.balanceOf(stakingInstance.address),
      1632 // small dust due to rounding
    );
  });

  it('should return the full stake if no reward was added', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking({skipMinting: true});

    expectBignumberEqual(
      (await mockRewardInstance.balanceOf(stakingInstance.address)).toString(),
      0
    );

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const aliceStakeAmount = toBN(toWei('100'));

    await stakingInstance
      .stake(aliceStakeAmount, numberToBytes32(4), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, aliceStakeAmount);

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    const aliceBalanceAfterStake = await mockRewardInstance.balanceOf(alice);

    await stakingInstance.unstake(0, numberToBytes32(stakeIndex), {from: alice});

    const aliceBalanceAfterUnstake = await mockRewardInstance.balanceOf(alice);

    expectBignumberEqual(
      aliceBalanceAfterStake.add(aliceStakeAmount),
      aliceBalanceAfterUnstake
    );
  });

  it('should consume all the rewards in contract if stakers unstake after the reward period finishes ', async () => {
    const [
      stakingInstance,
      {
        deployedAtBlock,
        mockRewardInstance,
        owner
      }
    ] = await deployStaking({skipMinting: true});

    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});
    await mockRewardInstance
      .approve(stakingInstance.address, toWei('1000000', 'ether'), {from: owner});

    const rewardsStructure = [[toWei('10'), deployedAtBlock + 15]]; // a total of 150 reward, that's it.

    await Promise.all(
      rewardsStructure
        .map(([rewPerBlock, endReward]) => stakingInstance
          .addRewardStream(0, rewPerBlock, endReward, {from: owner}))
    );

    expectBignumberEqual(
      (await mockRewardInstance.balanceOf(stakingInstance.address)).toString(),
      toWei(150)
    );

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const aliceStakeAmount = toBN(toWei('99'));

    await stakingInstance
      .stake(aliceStakeAmount, numberToBytes32(4), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, aliceStakeAmount);

    await topUpUser(bob, {mockRewardInstance, stakingInstance});
    const bobStakeAmount = toBN(toWei('100'));
    await stakingInstance
      .stake(bobStakeAmount, numberToBytes32(4), {from: bob});

    // we need to transfer 1 extra token because the default
    // staker stakes without any amount

    const aliceBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(aliceStakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    await mockRewardInstance
      .transfer(stakingInstance.address, toWei('1'), {from: owner});

    await advanceBlock();

    // await advanceBlock();
    const bobBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      bob,
      () => stakingInstance
        .unstake(bobStakeAmount, numberToBytes32(stakeIndex), {from: bob})
    );

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    const ownerBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      owner,
      () => stakingInstance
        .unstake(aliceStakeAmount, numberToBytes32(stakeIndex), {from: owner})
    );

    // some dust is lost due to rounding
    expectBignumberEqual(
      await mockRewardInstance.balanceOf(stakingInstance.address),
      620
    );

    const amountsStaked = aliceStakeAmount.add(bobStakeAmount).add(toBN(toWei('1'))); // 1 is the default staker
    expectBignumberEqual(
      aliceBalanceDelta
        .add(ownerBalanceDelta)
        .add(bobBalanceDelta)
        .sub(amountsStaked), // lets not count the amounts staked
      toBN('149999999999999999380') // rounding due to decimal precision
    );
  });

  it('should count the reward correctly across multiple reward periods ', async () => {
    const [
      stakingInstance,
      {
        deployedAtBlock,
        mockRewardInstance,
        owner
      }
    ] = await deployStaking({skipMinting: true});

    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});
    await mockRewardInstance
      .approve(stakingInstance.address, toWei('1000000', 'ether'), {from: owner});

    const rewardsStructure = [[toWei('10'), deployedAtBlock + 10], [toWei('20'), deployedAtBlock + 20]]; // a total of 300 reward, that's it.

    await Promise.all(
      rewardsStructure
        .map(([rewPerBlock, endReward]) => stakingInstance
          .addRewardStream(0, rewPerBlock, endReward, {from: owner}))
    );

    expectBignumberEqual(
      (await mockRewardInstance.balanceOf(stakingInstance.address)).toString(),
      toWei(300)
    );

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const aliceStakeAmount = toBN(toWei('99'));

    await stakingInstance
      .stake(aliceStakeAmount, numberToBytes32(4), {from: alice});
    const stakeIndex = 0;
    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, aliceStakeAmount);

    await topUpUser(bob, {mockRewardInstance, stakingInstance});
    const bobStakeAmount = toBN(toWei('100'));
    await stakingInstance
      .stake(bobStakeAmount, numberToBytes32(4), {from: bob});

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    const aliceBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(aliceStakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    // we need to transfer 1 extra token because the default
    // staker stakes without any amount
    await mockRewardInstance
      .transfer(stakingInstance.address, toWei('1'), {from: owner});

    await advanceBlock();

    const bobBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      bob,
      () => stakingInstance
        .unstake(bobStakeAmount, numberToBytes32(stakeIndex), {from: bob})
    );

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    const ownerBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      owner,
      () => stakingInstance
        .unstake(aliceStakeAmount, numberToBytes32(stakeIndex), {from: owner})
    );
    expectBignumberEqual(
      ownerBalanceDelta.sub(DEFAULT_STAKER_AMOUNT),
      toBN(toWei('121.394059405940594038')) // rounding due to decimal precision
    );
    expectBignumberEqual(
      aliceBalanceDelta.sub(aliceStakeAmount),
      toBN(toWei('79.199999999999999010')) // rounding due to decimal precision
    );
    expectBignumberEqual(
      bobBalanceDelta.sub(bobStakeAmount),
      toBN(toWei('99.405940594059405940')) // rounding due to decimal precision
    );

    expectBignumberEqual(
      aliceBalanceDelta
        .add(ownerBalanceDelta).add(bobBalanceDelta)
        .sub(aliceStakeAmount)
        .sub(bobStakeAmount)
        .sub(toBN(toWei('1'))), // owner's stake
      toBN(toWei('299.999999999999998988')) // rounding due to decimal precision
    );
  });

  it('should unstake with nft correctly', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 111);

    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    // eslint-disable-next-line max-len
    await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    await stakingInstance
      .stake(stakeAmount, createCallData(4, mockNftInstance.address, 1), {from: alice});
    const stakeIndex = 0;

    const userStakedTokenAfter = await stakingInstance.userStakedTokens(alice, stakeIndex);

    expect(userStakedTokenAfter.tokenAddress).to.equal(mockNftInstance.address);
    expectBignumberEqual(userStakedTokenAfter.tokenId, 1);

    const tokenOwnerBeforeUnstake = await mockNftInstance.ownerOf(1, {from: owner});

    expect(tokenOwnerBeforeUnstake).to.equal(stakingInstance.address);

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice});

    const tokenOwner = await mockNftInstance.ownerOf(1, {from: owner});

    expect(tokenOwner).to.equal(alice);
  });

  it('should calculate correctly for users that staked in same block', async () => {
    const [
      stakingInstance,
      {
        mockRewardInstance,
        NO_LOCK_INDEX
      }
    ] = await deployEthersStakingInstance();

    const [_, alice, bob] = await ethers.getSigners();

    await topUpUser(alice.address, {mockRewardInstance, stakingInstance});
    await topUpUser(bob.address, {mockRewardInstance, stakingInstance});
    const aliceStakeAmount = toWei('99');
    const bobStakeAmount = toWei('100');

    await batchTransactionsInBlock([
      // eslint-disable-next-line array-element-newline
      () => stakingInstance.connect(alice).stake(aliceStakeAmount, NO_LOCK_INDEX),
      () => stakingInstance.connect(bob).stake(bobStakeAmount, NO_LOCK_INDEX)
    ]);

    const stakeIndex = 0;

    await advanceBlock();
    await advanceBlock();

    const aliceBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice.address,
      () => stakingInstance
        .connect(alice)
        .unstake(aliceStakeAmount, numberToBytes32(stakeIndex))
    );

    // await advanceBlock();
    const bobBalanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      bob.address,
      () => stakingInstance
        .connect(bob)
        .unstake(bobStakeAmount, numberToBytes32(stakeIndex))
    );

    expectBignumberEqual(
      aliceBalanceDelta.sub(toBN(aliceStakeAmount)),
      toBN('14850000000000000000')
    );

    expectBignumberEqual(
      bobBalanceDelta.sub(toBN(bobStakeAmount)),
      toBN('24900990099009900990')
    );
  });

  it('should calculate correctly for users that staked and unstake in same block', async () => {
    const [
      stakingInstance,
      {
        mockRewardInstance,
        NO_LOCK_INDEX
      }
    ] = await deployEthersStakingInstance();

    const [_, alice, bob] = await ethers.getSigners();

    await topUpUser(alice.address, {mockRewardInstance, stakingInstance});
    await topUpUser(bob.address, {mockRewardInstance, stakingInstance});
    const aliceStakeAmount = toWei('99');
    const bobStakeAmount = toWei('100');

    await batchTransactionsInBlock([
      // eslint-disable-next-line array-element-newline
      () => stakingInstance.connect(alice).stake(aliceStakeAmount, NO_LOCK_INDEX),
      () => stakingInstance.connect(bob).stake(bobStakeAmount, NO_LOCK_INDEX)
    ]);

    const stakeIndex = 0;

    await advanceBlock();
    await advanceBlock();

    const aliceBalanceBefore = await mockRewardInstance.balanceOf(alice.address);
    const bobBalanceBefore = await mockRewardInstance.balanceOf(bob.address);

    await batchTransactionsInBlock([
      () => stakingInstance
        .connect(alice)
        .unstake(aliceStakeAmount, numberToBytes32(stakeIndex)),
      () => stakingInstance
        .connect(bob)
        .unstake(bobStakeAmount, numberToBytes32(stakeIndex))
    ]);

    const aliceBalanceAfter = await mockRewardInstance.balanceOf(alice.address);
    const bobBalanceAfter = await mockRewardInstance.balanceOf(bob.address);

    expectBignumberEqual(
      aliceBalanceAfter.sub(aliceBalanceBefore).sub(toBN(aliceStakeAmount)),
      toBN('14850000000000000000')
    );

    expectBignumberEqual(
      bobBalanceAfter.sub(bobBalanceBefore).sub(toBN(bobStakeAmount)),
      toBN('15000000000000000000')
    );
  });
});
