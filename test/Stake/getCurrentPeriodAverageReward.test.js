const {deployStaking, STAKING_LOCKS} = require('../helpers/deploy');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {getExpectedCurrentPeriodAverageReward, DEFAULT_STAKER_AMOUNT, REWARD_PER_BLOCK} = require('../helpers/staking');
const {toBN, advanceBlockTo, toWei} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: getCurrentPeriodAverageReward', accounts => {
  it('should return the correct value after users stake', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    await stakingInstance.historyStartBlock();

    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodAverageReward(),
      await getExpectedCurrentPeriodAverageReward(stakingInstance, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT,
        expectedCurrentPeriodLength: 2,
        expectedCurrentPeriodReward: REWARD_PER_BLOCK.mul(toBN(2)),
        expectedCurrentPeriodAverageReward: REWARD_PER_BLOCK.div(DEFAULT_STAKER_AMOUNT).div(toBN(2))
      })
    );

    const stakeAmount = toBN(toWei('99', 'ether'));

    const {user: alice} = getRaffleActors(accounts);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodAverageReward(),
      await getExpectedCurrentPeriodAverageReward(stakingInstance, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT.add(stakeAmount),
        expectedCurrentPeriodLength: 1, // resets after stake
        expectedCurrentPeriodReward: REWARD_PER_BLOCK.mul(toBN(1)),
        expectedCurrentPeriodAverageReward: REWARD_PER_BLOCK
          .div(DEFAULT_STAKER_AMOUNT.add(stakeAmount))
          .div(toBN(1))
      })
    );
  });

  it('should update when an unstake happens', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const lockIndex = 0;
    await stakingInstance.historyStartBlock();

    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodAverageReward(),
      await getExpectedCurrentPeriodAverageReward(stakingInstance, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT,
        expectedCurrentPeriodLength: 2,
        expectedCurrentPeriodReward: REWARD_PER_BLOCK.mul(toBN(2)),
        expectedCurrentPeriodAverageReward: REWARD_PER_BLOCK.div(DEFAULT_STAKER_AMOUNT).div(toBN(2))
      })
    );

    const stakeAmount = toBN(toWei('99', 'ether'));

    const {user: alice} = getRaffleActors(accounts);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});
    const aliceStakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodAverageReward(),
      await getExpectedCurrentPeriodAverageReward(stakingInstance, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT.add(stakeAmount),
        expectedCurrentPeriodLength: 1, // resets after stake
        expectedCurrentPeriodReward: REWARD_PER_BLOCK.mul(toBN(1)),
        expectedCurrentPeriodAverageReward: REWARD_PER_BLOCK
          .div(DEFAULT_STAKER_AMOUNT.add(stakeAmount))
          .div(toBN(1))
      })
    );

    const {enteredAtBlock} = await stakingInstance.userStakes(alice, aliceStakeIndex);
    await advanceBlockTo(toBN(enteredAtBlock).add(toBN(STAKING_LOCKS[lockIndex] + 3)));

    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodAverageReward(),
      await getExpectedCurrentPeriodAverageReward(stakingInstance, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT,
        expectedCurrentPeriodLength: 1, // resets after stake
        expectedCurrentPeriodReward: REWARD_PER_BLOCK.mul(toBN(1)),
        expectedCurrentPeriodAverageReward: REWARD_PER_BLOCK
          .div(DEFAULT_STAKER_AMOUNT.add(stakeAmount))
          .div(toBN(1))
      })
    );
  });
});
