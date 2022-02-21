const {deployStaking, deployMockNftToken, deployEthersStakingInstance} = require('../../helpers/deploy');
const {getExpectedNextHistoryAverageRewardAfterEvent, expectAllValuesAreCorrect, DEFAULT_STAKER_AMOUNT} = require('../../helpers/staking');
const {tokenBalanceDeltaAfterAction, topUpUser} = require('../../helpers/erc20');
const {getRaffleActors} = require('../../../helpers/address');
const {
  shouldFailWithMessage,
  toWei,
  toBN,
  getBlockNumber,
  advanceBlockTo
} = require('../../../helpers/utils');
const {findEventInTransaction} = require('../../../helpers/events');
const {expectBignumberEqual, getExpectedTicketsAtStake} = require('../../../helpers');
const {numberToBytes32, hexToNumberString, createCallData} = require('../../helpers/bytes');
const {batchTransactionsInBlock} = require('../../helpers/network');

contract('Stake: stake', accounts => {
  it('should apply the correct multiplier when user stake');
  it('should let the user stake correctly and update state accordingly', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    // eslint-disable-next-line max-len
    const expectedNextHistoryAverageRewardAfterEvent = await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    const {receipt: {blockNumber: aliceStakeBlock}} = await stakingInstance
      .stake(stakeAmount, numberToBytes32(0), {from: alice});

    const aliceStakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.historyAverageReward(),
      await expectedNextHistoryAverageRewardAfterEvent
    );

    await expectAllValuesAreCorrect(
      stakingInstance,
      {stakedAmount: stakeAmount.add(DEFAULT_STAKER_AMOUNT), lastActionBlock: aliceStakeBlock}
    );

    const expectedEndBlock = aliceStakeBlock - 1;
    const historyEndBlock = await stakingInstance.historyEndBlock();

    // check values are correct
    expect(historyEndBlock.toNumber()).to.equal(expectedEndBlock); // 7

    const aliceUserStakes = await stakingInstance.userStakes(alice, aliceStakeIndex);

    expectBignumberEqual(aliceUserStakes.amountStaked, stakeAmount);
    expectBignumberEqual(aliceUserStakes.stakingUnits, stakeAmount);
    expectBignumberEqual(aliceUserStakes.historyAverageRewardWhenEntered, toBN(toWei('10')));
    expectBignumberEqual(aliceUserStakes.enteredAtBlock, aliceStakeBlock);
  });

  it('should transferFrom the correct amount when user stakes', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    const delta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      stakingInstance.address,
      () => stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice})
    );

    expectBignumberEqual(delta, stakeAmount);
  });

  it('should revert if the user has not approved enough tokens', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);

    await topUpUser(user, {mockRewardInstance});

    await shouldFailWithMessage(
      stakingInstance.stake(toWei('100'), numberToBytes32(0), {from: user}),
      'ERC20: transfer amount exceeds balance or allowance'
    );
  });

  it('should update the totalStaked correctly', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const aliceStakeAmount = toBN(toWei('100'));

    await stakingInstance.stake(aliceStakeAmount, numberToBytes32(0), {from: alice});

    const totalStakedAmount = await stakingInstance.totalCurrentlyStaked();

    const expectedTotalStakedAmount = DEFAULT_STAKER_AMOUNT.add(aliceStakeAmount);

    expectBignumberEqual(totalStakedAmount, expectedTotalStakedAmount);
  });

  it('should update the user amountStaked correctly', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);
    const amountToStake = toWei('100');

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(amountToStake, numberToBytes32(0), {from: user});

    const aliceStakeIndex = 0;

    const userStakes = await stakingInstance.userStakes(user, aliceStakeIndex);
    expect(userStakes.amountStaked.toString()).to.equal(amountToStake);
  });

  it('should count the correct reward from current period', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('99'));

    const {receipt: {blockNumber: aliceStakeBlock}} = await stakingInstance
      .stake(stakeAmount, numberToBytes32(0), {from: alice});

    await expectAllValuesAreCorrect(
      stakingInstance,
      {stakedAmount: stakeAmount.add(DEFAULT_STAKER_AMOUNT), lastActionBlock: aliceStakeBlock}
    );

    const aliceStakeIndex = 0;

    const rewardFromCurrentPeriod = await stakingInstance
      .getStakerRewardFromCurrent(alice, aliceStakeIndex);

    const expectedRewardFromPeriod = async () => {
      const totalRewardInCurrentPeriod = await stakingInstance.getTotalRewardInCurrentPeriod();
      const totalCurrentlyStaked = await stakingInstance.totalCurrentlyStaked();

      return totalRewardInCurrentPeriod
        .mul(stakeAmount)
        .div(totalCurrentlyStaked);
    };

    expectBignumberEqual(rewardFromCurrentPeriod, await expectedRewardFromPeriod());
  });

  it('should count the correct reward from current period is user enters and leaves', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('99'));

    const {receipt: {blockNumber: aliceStakeBlock}} = await stakingInstance
      .stake(stakeAmount, numberToBytes32(0), {from: alice});

    await expectAllValuesAreCorrect(
      stakingInstance,
      {stakedAmount: stakeAmount.add(DEFAULT_STAKER_AMOUNT), lastActionBlock: aliceStakeBlock}
    );

    const aliceStakeIndex = 0;

    const rewardFromCurrentPeriod = await stakingInstance
      .getStakerRewardFromCurrent(alice, aliceStakeIndex);

    const expectedRewardFromPeriod = async () => {
      const totalRewardInCurrentPeriod = await stakingInstance.getTotalRewardInCurrentPeriod();
      const totalCurrentlyStaked = await stakingInstance.totalCurrentlyStaked();

      return totalRewardInCurrentPeriod
        .mul(stakeAmount)
        .div(totalCurrentlyStaked);
    };

    expectBignumberEqual(rewardFromCurrentPeriod, await expectedRewardFromPeriod());
  });

  it('should emit Staked event', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);
    const amountToStake = toBN(toWei('100'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    const stakeResult = stakingInstance.stake(amountToStake, numberToBytes32(0), {from: user});

    const {args} = await findEventInTransaction(
      stakeResult,
      'Staked'
    );

    expect(args.user).to.equal(user);
    expectBignumberEqual(args.amount, amountToStake);
    expectBignumberEqual(args.total, amountToStake.add(DEFAULT_STAKER_AMOUNT));
    expect(hexToNumberString(args.data)).to.equal('0');
  });

  it('should emit Staked event with correct stake index', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);
    const amountToStake = toBN(toWei('100'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    const stakeResult = stakingInstance.stake(amountToStake, numberToBytes32(0), {from: user});

    const {args} = await findEventInTransaction(
      stakeResult,
      'Staked'
    );

    expect(args.user).to.equal(user);
    expectBignumberEqual(args.amount, amountToStake);
    expectBignumberEqual(args.total, amountToStake.add(DEFAULT_STAKER_AMOUNT));
    expect(hexToNumberString(args.data)).to.equal('0');

    const stakeResult2 = stakingInstance.stake(amountToStake, numberToBytes32(0), {from: user});

    const {args: args2} = await findEventInTransaction(
      stakeResult2,
      'Staked'
    );

    expect(args2.user).to.equal(user);
    expectBignumberEqual(args2.amount, amountToStake);
    expectBignumberEqual(args2.total, amountToStake.add(amountToStake).add(DEFAULT_STAKER_AMOUNT));
    expect(hexToNumberString(args2.data)).to.equal('1');
  });

  it('should revert if wrong data is passed', async () => {
    const [stakingInstance] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const stakeAmount = toBN(toWei('150', 'ether'));

    await shouldFailWithMessage(
      stakingInstance.stake(stakeAmount, '0x0', {from: alice}),
      'Stake: data should by at least 32 bytes'
    );
  });

  it('should revert if wrong index is passed in data bytes', async () => {
    const [stakingInstance] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const stakeAmount = toBN(toWei('150', 'ether'));

    await shouldFailWithMessage(
      stakingInstance.stake(stakeAmount, numberToBytes32(10), {from: alice}),
      'Stake: lock index out of bounds'
    );
  });

  it('should set the correct lockedTill duration', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const stakeAmount = toBN(toWei('150', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(stakeAmount, numberToBytes32(1), {from: alice});
    const aliceStakeIndex = 0;

    const currentBlock = await getBlockNumber();

    const aliceStakes = await stakingInstance.userStakes(alice, aliceStakeIndex);
    const lockDuration = await stakingInstance.locks(1);

    expectBignumberEqual(toBN(currentBlock).add(lockDuration), aliceStakes.lockedTill);
  });

  it('should mint tickets to user lock=4 year', async () => {
    const [stakingInstance, {mockRewardInstance, ticketInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const stakeAmount = toBN(toWei('150', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const lockIndex = 3;

    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});

    const expectedTicketsAmount = getExpectedTicketsAtStake(
      await stakingInstance.userStakes(alice, 0)
    );

    const aliceTicketBalance = await ticketInstance
      .balanceOf(alice, 0); // 0 is the tokenId of the tickets

    expectBignumberEqual(expectedTicketsAmount, aliceTicketBalance);
  });

  it('should mint tickets correct amount of tickets after updating minting ratio', async () => {
    const [stakingInstance, {mockRewardInstance, ticketInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const stakeAmount = toBN(toWei('100', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const lockIndex = 3;

    // default ticket minting ratio = 100 BURP
    // staked 100 BURP, with a 3x multiplier -> mint immediately 3 tickets
    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});

    const mintedTickets1 = getExpectedTicketsAtStake(
      await stakingInstance.userStakes(alice, 0)
    );

    const aliceTicketBalance = await ticketInstance
      .balanceOf(alice, 0);

    expectBignumberEqual(aliceTicketBalance, mintedTickets1);
    expectBignumberEqual(3, mintedTickets1);

    await stakingInstance.setTicketsMintingRatio(toWei('50', 'ether'));

    // new ticket minting ratio = 50 BURP
    // staked 100 BURP, with a 3x multiplier -> mint immediately 6 tickets
    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});

    const mintedTickets2 = getExpectedTicketsAtStake(
      await stakingInstance.userStakes(alice, 1)
    );
    expectBignumberEqual(
      await ticketInstance.balanceOf(alice, 0),
      mintedTickets1 + mintedTickets2
    );
    expectBignumberEqual(
      9, // 6 + 3
      mintedTickets1 + mintedTickets2
    );
  });

  it('should add multiple stakes correctly', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const stakeAmount = toBN(toWei('150', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const lockIndex = 0;
    const lockIndex2 = 1;

    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});
    const stake1Block = await getBlockNumber();

    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex2), {from: alice});
    const stake2Block = await getBlockNumber();

    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex2), {from: alice});
    const stake3Block = await getBlockNumber();

    const lockDuration1 = await stakingInstance.locks(lockIndex);
    const lockDuration2 = await stakingInstance.locks(lockIndex2);
    const stakesCount = await stakingInstance.getUserStakes(alice);
    expectBignumberEqual(stakesCount, toBN(3));

    const userStake1 = await stakingInstance.userStakes(alice, 0);
    const userStake2 = await stakingInstance.userStakes(alice, 1);
    const userStake3 = await stakingInstance.userStakes(alice, 2);

    expectBignumberEqual(userStake1.enteredAtBlock, toBN(stake1Block));
    expectBignumberEqual(userStake1.lockedTill, toBN(stake1Block).add(lockDuration1));

    expectBignumberEqual(userStake2.enteredAtBlock, toBN(stake2Block));
    expectBignumberEqual(userStake2.lockedTill, toBN(stake2Block).add(lockDuration2));

    expectBignumberEqual(userStake3.enteredAtBlock, toBN(stake3Block));
    expectBignumberEqual(userStake3.lockedTill, toBN(stake3Block).add(lockDuration2));

    await advanceBlockTo(stake2Block + lockDuration2.toNumber() + 1);

    await stakingInstance.unstake(stakeAmount, numberToBytes32(1), {from: alice});

    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex2), {from: alice});
    const stake4Block = await getBlockNumber();

    const stakesCount3 = await stakingInstance.getUserStakes(alice);
    expectBignumberEqual(stakesCount3, toBN(4));

    const deletedStake = await stakingInstance.userStakes(alice, 1);
    const userStake4 = await stakingInstance.userStakes(alice, 3);

    expectBignumberEqual(
      deletedStake.enteredAtBlock,
      toBN(0)
    ); // The values are 0 after unstake because we deleted the stake
    expectBignumberEqual(deletedStake.lockedTill, toBN(0));

    expectBignumberEqual(userStake4.enteredAtBlock, toBN(stake4Block));
    expectBignumberEqual(userStake4.lockedTill, toBN(stake4Block).add(lockDuration2));
  });

  it('should stake with nft', async () => {
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
      .stake(stakeAmount, createCallData(0, mockNftInstance.address, 1), {from: alice});
    const stakeIndex = 0;

    const userStakedTokenAfter = await stakingInstance.userStakedTokens(alice, stakeIndex);

    expect(userStakedTokenAfter.tokenAddress).to.equal(mockNftInstance.address);
    expectBignumberEqual(userStakedTokenAfter.tokenId, 1);
  });

  it('should stake with nft if user has other stakes without NFT', async () => {
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
      .stake(stakeAmount, createCallData(0, mockNftInstance.address, 1), {from: alice});
    const stakeIndex = 0;

    const userStakedTokenAfter = await stakingInstance.userStakedTokens(alice, stakeIndex);

    expect(userStakedTokenAfter.tokenAddress).to.equal(mockNftInstance.address);
    expectBignumberEqual(userStakedTokenAfter.tokenId, 1);
  });

  it('should work correctly if more than one user stakes in the same block', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployEthersStakingInstance();

    const [_, alice, bob] = await ethers.getSigners();

    await topUpUser(alice.address, {mockRewardInstance, stakingInstance});
    await topUpUser(bob.address, {mockRewardInstance, stakingInstance});
    const stakeAmount = toWei('100');

    await batchTransactionsInBlock([
      // eslint-disable-next-line array-element-newline
      () => stakingInstance.connect(alice).stake(stakeAmount, numberToBytes32(0)),
      () => stakingInstance.connect(bob).stake(stakeAmount, numberToBytes32(0))
    ]);

    const stakeIndex = 0;

    const aliceStakes = await stakingInstance.userStakes(alice.address, stakeIndex);
    const bobStakes = await stakingInstance.userStakes(bob.address, stakeIndex);

    expectBignumberEqual(aliceStakes.amountStaked, bobStakes.amountStaked);
    expectBignumberEqual(aliceStakes.stakingUnits, bobStakes.stakingUnits);
    expectBignumberEqual(aliceStakes.enteredAtBlock, bobStakes.enteredAtBlock);
    expectBignumberEqual(aliceStakes.lockedTill, bobStakes.lockedTill);
    expectBignumberEqual(aliceStakes.rewardCredit, bobStakes.rewardCredit);
    expectBignumberEqual(aliceStakes.stakingUnits, bobStakes.amountStaked);
    expectBignumberEqual(
      aliceStakes.historyAverageRewardWhenEntered,
      bobStakes.historyAverageRewardWhenEntered
    );
    expectBignumberEqual(aliceStakes.historyAverageRewardWhenEntered, toBN(toWei('10')));
  });
});
