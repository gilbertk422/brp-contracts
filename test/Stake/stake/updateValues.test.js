/* eslint-disable max-len */
const {deployStaking} = require('../../helpers/deploy');
const {getExpectedNextHistoryAverageRewardAfterEvent, DEFAULT_STAKER_AMOUNT, REWARD_PER_BLOCK} = require('../../helpers/staking');
const {topUpUser} = require('../../helpers/erc20');
const {getRaffleActors} = require('../../../helpers/address');
const {toWei, toBN} = require('../../../helpers/utils');
const {numberToBytes32} = require('../../helpers/bytes');
const {expectBignumberEqual} = require('../../../helpers');

contract('Stake: stake/updateValues', accounts => {
  it('should update the staker values correctly after a user stakes', async () => {
    const [stakingInstance, {mockRewardInstance, owner, deployedAtBlock}] = await deployStaking();
    const aliceStakeIndex = 0;
    const {
      amountStaked: ownerAmountStaked,
      historyAverageRewardWhenEntered: ownerHistoryAverageRewardWhenEntered,
      enteredAtBlock: ownerStartBlock
    } = await stakingInstance.userStakes(owner, aliceStakeIndex);

    const stakeAmount = toBN(toWei('100', 'ether'));

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    expectBignumberEqual(ownerStartBlock, deployedAtBlock + 1);
    expectBignumberEqual(ownerAmountStaked, DEFAULT_STAKER_AMOUNT);
    expectBignumberEqual(ownerHistoryAverageRewardWhenEntered, 0);

    const expectedHistoryAverageRewardForAlice = await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);

    const {receipt: {blockNumber: aliceStakeBlock}} = await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});
    const {
      amountStaked: aliceAmountStaked,
      historyAverageRewardWhenEntered: aliceHistoryAverageRewardWhenEntered,
      enteredAtBlock: aliceStartBlock
    } = await stakingInstance.userStakes(alice, aliceStakeIndex);

    expectBignumberEqual(aliceStartBlock, aliceStakeBlock);
    expectBignumberEqual(aliceAmountStaked, stakeAmount);
    expectBignumberEqual(aliceHistoryAverageRewardWhenEntered, expectedHistoryAverageRewardForAlice);

    const expectedHistoryAverageRewardForBob = await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    const {receipt: {blockNumber: bobStakeBlock}} = await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: bob});
    const bobStakeIndex = 0;
    const {
      amountStaked: bobAmountStaked,
      historyAverageRewardWhenEntered: bobHistoryAverageRewardWhenEntered,
      enteredAtBlock: bobStartBlock
    } = await stakingInstance.userStakes(bob, bobStakeIndex);

    expectBignumberEqual(bobStartBlock, bobStakeBlock);
    expectBignumberEqual(bobAmountStaked, stakeAmount);
    expectBignumberEqual(bobHistoryAverageRewardWhenEntered, expectedHistoryAverageRewardForBob);
  });

  it('should update the history average correctly after a user stakes', async () => {
    const [stakingInstance, {mockRewardInstance, owner}] = await deployStaking();
    const aliceStakeIndex = 0;
    const {
      historyAverageRewardWhenEntered: ownerHistoryAverageRewardWhenEntered
    } = await stakingInstance.userStakes(owner, aliceStakeIndex);

    const stakeAmount = toBN(toWei('100', 'ether'));

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    expectBignumberEqual(
      ownerHistoryAverageRewardWhenEntered,
      await stakingInstance.historyAverageReward()
    );

    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});

    const {
      historyAverageRewardWhenEntered: aliceHistoryAverageRewardWhenEntered
    } = await stakingInstance.userStakes(alice, aliceStakeIndex);

    expectBignumberEqual(
      aliceHistoryAverageRewardWhenEntered,
      await stakingInstance.historyAverageReward()
    );

    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: bob});
    const bobStakeIndex = 0;
    const {
      historyAverageRewardWhenEntered: bobHistoryAverageRewardWhenEntered
    } = await stakingInstance.userStakes(bob, bobStakeIndex);

    expectBignumberEqual(
      bobHistoryAverageRewardWhenEntered,
      await stakingInstance.historyAverageReward()
    );
  });

  it('should update the history pot correctly after a user stakes', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    expectBignumberEqual(
      await stakingInstance.historyRewardPot(),
      0
    );

    const stakeAmount = toBN(toWei('100', 'ether'));

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});

    expectBignumberEqual(
      await stakingInstance.historyRewardPot(),
      (await stakingInstance.getHistoryLength()).mul(REWARD_PER_BLOCK)
    );

    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: bob});

    expectBignumberEqual(
      await stakingInstance.historyRewardPot(),
      (await stakingInstance.getHistoryLength()).mul(REWARD_PER_BLOCK)
    );
  });
});
