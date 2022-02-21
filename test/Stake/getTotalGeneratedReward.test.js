const {deployStaking, STAKING_LOCKS} = require('../helpers/deploy');
const {REWARD_PER_BLOCK, getExpectedTotalGeneratedReward} = require('../helpers/staking');
const {
  toBN,
  advanceBlock,
  advanceBlockTo,
  toWei,
  getBlockNumber
} = require('../../helpers/utils');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: getTotalGeneratedReward', accounts => {
  it('should return the correct number of all generated rewards', async () => {
    const [stakingInstance, {deployedAtBlock}] = await deployStaking();

    expectBignumberEqual(
      await stakingInstance.getTotalGeneratedReward(),
      await getExpectedTotalGeneratedReward(stakingInstance, {
        expectedStartBlock: deployedAtBlock,
        expeectedBlocksElapsed: (await getBlockNumber()) - deployedAtBlock,
        expectedTotalGeneratedReward: REWARD_PER_BLOCK.mul(toBN(1))
      })
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getTotalGeneratedReward(),
      await getExpectedTotalGeneratedReward(stakingInstance, {
        expectedStartBlock: deployedAtBlock,
        expeectedBlocksElapsed: (await getBlockNumber()) - deployedAtBlock,
        expectedTotalGeneratedReward: REWARD_PER_BLOCK.mul(toBN(2))
      })
    );
  });

  it('should return the correct number of all generated rewards after someone withdraws', async () => {
    const [stakingInstance, {deployedAtBlock, mockRewardInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));
    const lockIndex = 0;

    expectBignumberEqual(
      await stakingInstance.getTotalGeneratedReward(),
      await getExpectedTotalGeneratedReward(stakingInstance, {
        expectedStartBlock: deployedAtBlock,
        expeectedBlocksElapsed: (await getBlockNumber()) - deployedAtBlock,
        expectedTotalGeneratedReward: REWARD_PER_BLOCK.mul(toBN(1))
      })
    );

    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});
    const stakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.getTotalGeneratedReward(),
      await getExpectedTotalGeneratedReward(stakingInstance, {
        expectedStartBlock: deployedAtBlock,
        expeectedBlocksElapsed: (await getBlockNumber()) - deployedAtBlock,
        expectedTotalGeneratedReward: REWARD_PER_BLOCK.mul(toBN(2))
      })
    );

    const {enteredAtBlock} = await stakingInstance.userStakes(alice, stakeIndex);
    await advanceBlockTo(toBN(enteredAtBlock).add(toBN(STAKING_LOCKS[lockIndex] + 3)));

    await stakingInstance.unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getTotalGeneratedReward(),
      await getExpectedTotalGeneratedReward(stakingInstance, {
        expectedStartBlock: deployedAtBlock,
        expeectedBlocksElapsed: (await getBlockNumber()) - deployedAtBlock,
        expectedTotalGeneratedReward: REWARD_PER_BLOCK.mul(toBN(STAKING_LOCKS[lockIndex] + 3))
      })
    );
  });
});
