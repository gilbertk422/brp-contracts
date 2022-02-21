/* eslint-disable max-len */
const {deployStaking} = require('../helpers/deploy');
const {topUpUser} = require('../helpers/erc20');
const {getExpectedNextHistoryAverageRewardAfterEvent, DEFAULT_STAKER_AMOUNT, getExpectedCurrentPeriodLength} = require('../helpers/staking');
const {getRaffleActors} = require('../../helpers/address');
const {
  toWei,
  toBN,
  getBlockNumber,
  advanceBlock
} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: getNewHistoryAverageReward', accounts => {
  it('should set the correct historyAverageReward when a user stakes', async () => {
    const [stakingInstance, {mockRewardInstance, owner, deployedAtBlock}] = await deployStaking();

    const {
      amountStaked: ownerAmountStaked,
      historyAverageRewardWhenEntered: ownerHistoryAverageRewardWhenEntered,
      enteredAtBlock: ownerStartBlock
    } = await stakingInstance.userStakes(owner, 0);

    const aliceStake = toBN(toWei('99'));

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    expectBignumberEqual(ownerStartBlock, deployedAtBlock + 1);
    expectBignumberEqual(ownerAmountStaked, DEFAULT_STAKER_AMOUNT);
    expectBignumberEqual(ownerHistoryAverageRewardWhenEntered, 0);

    const expectedHistoryAverageRewardForAlice = await getExpectedNextHistoryAverageRewardAfterEvent(
      stakingInstance, {
        expectedCurrentPeriodLength: await getExpectedCurrentPeriodLength(stakingInstance),
        expectedHistoryLength: 0,
        expectedNewHistoryLength: await getBlockNumber() - deployedAtBlock,
        expectedCurrentAverageReward: toBN(toWei(10)),
        expectedHistoryAverageReward: 0,
        expectedNextHistoryAverageRewardAfterEvent: toBN(toWei(10))
      }
    );

    await stakingInstance.stake(aliceStake, numberToBytes32(0), {from: alice});

    const {
      historyAverageRewardWhenEntered: aliceHistoryAverageRewardWhenEntered
    } = await stakingInstance.userStakes(alice, 0);

    expectBignumberEqual(
      await stakingInstance.historyAverageReward(),
      toBN(toWei(10))
    );

    expectBignumberEqual(
      aliceHistoryAverageRewardWhenEntered,
      expectedHistoryAverageRewardForAlice
    );

    const expectedHistoryAverageRewardForBob = await getExpectedNextHistoryAverageRewardAfterEvent(
      stakingInstance, {
        expectedCurrentPeriodLength: 1,
        expectedHistoryLength: await getBlockNumber() - deployedAtBlock - 1,
        expectedNewHistoryLength: await getBlockNumber() - deployedAtBlock,
        expectedCurrentAverageReward: toBN(toWei(0.1)),
        expectedHistoryAverageReward: toBN(toWei(10)),
        expectedNextHistoryAverageRewardAfterEvent: toBN(toWei('9.01'))
      }
    );
    const bobStake = toBN(toWei('200'));

    await stakingInstance.stake(bobStake, numberToBytes32(0), {from: bob});
    const bobnStakeIndex = 0;
    const {
      historyAverageRewardWhenEntered: bobHistoryAverageRewardWhenEntered
    } = await stakingInstance.userStakes(bob, bobnStakeIndex);

    expectBignumberEqual(
      await stakingInstance.historyAverageReward(),
      toBN(toWei('9.01'))
    );

    expectBignumberEqual(
      bobHistoryAverageRewardWhenEntered,
      expectedHistoryAverageRewardForBob
    );
  });

  it('should update the values correctly after a user unstakes', async () => {
    const [stakingInstance, {mockRewardInstance, owner, deployedAtBlock}] = await deployStaking();

    const {
      amountStaked: ownerAmountStaked,
      historyAverageRewardWhenEntered: ownerHistoryAverageRewardWhenEntered,
      enteredAtBlock: ownerStartBlock
    } = await stakingInstance.userStakes(owner, 0);

    const aliceStake = toBN(toWei('99'));

    const {user: alice} = getRaffleActors(accounts);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    expectBignumberEqual(ownerStartBlock, deployedAtBlock + 1);
    expectBignumberEqual(ownerAmountStaked, DEFAULT_STAKER_AMOUNT);
    expectBignumberEqual(ownerHistoryAverageRewardWhenEntered, 0);

    const expectedHistoryAverageRewardForAlice = await getExpectedNextHistoryAverageRewardAfterEvent(
      stakingInstance, {
        expectedCurrentPeriodLength: await getExpectedCurrentPeriodLength(stakingInstance),
        expectedHistoryLength: 0,
        expectedNewHistoryLength: await getBlockNumber() - deployedAtBlock,
        expectedCurrentAverageReward: toBN(toWei(10)),
        expectedHistoryAverageReward: 0,
        expectedNextHistoryAverageRewardAfterEvent: toBN(toWei(10))
      }
    );

    await stakingInstance.stake(aliceStake, numberToBytes32(4), {from: alice});

    const {
      historyAverageRewardWhenEntered: aliceHistoryAverageRewardWhenEntered
    } = await stakingInstance.userStakes(alice, 0);

    expectBignumberEqual(
      await stakingInstance.historyAverageReward(),
      toBN(toWei(10))
    );

    expectBignumberEqual(
      aliceHistoryAverageRewardWhenEntered,
      expectedHistoryAverageRewardForAlice
    );

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    const expectedHistoryAverageReward = await getExpectedNextHistoryAverageRewardAfterEvent(
      stakingInstance, {
        expectedCurrentPeriodLength: await getExpectedCurrentPeriodLength(stakingInstance),
        expectedHistoryLength: 0,
        expectedNewHistoryLength: await getBlockNumber() - deployedAtBlock,
        expectedCurrentAverageReward: toBN(toWei('0.1')),
        expectedHistoryAverageReward: 0,
        expectedNextHistoryAverageRewardAfterEvent: toBN(toWei('5.875'))
      }
    );
    await stakingInstance
      .unstake(aliceStake, numberToBytes32(0), {from: alice});

    const historyAverageReward = await stakingInstance.historyAverageReward();

    expectBignumberEqual(historyAverageReward, expectedHistoryAverageReward);
  });
});
