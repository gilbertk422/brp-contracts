const {deployStaking} = require('../helpers/deploy');
const {getHistoryAverageForStake, DEFAULT_STAKER_AMOUNT} = require('../helpers/staking');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, toBN, advanceBlock} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: getHistoryAverageForStake', accounts => {
  it('should return zero if staker is not in block', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    const {user} = getRaffleActors(accounts);

    // for default staker
    expectBignumberEqual(
      await stakingInstance.getHistoryAverageForStake(owner, 0),
      await getHistoryAverageForStake(owner, stakingInstance, 0, {
        expectedHistoryAverageReward: toBN(0),
        expectedHistoryAverageRewardWhenEntered: toBN(0),
        expectedHistoryLength: toBN(0),
        expectedBlocksParticipatedInHistory: toBN(0),
        expectedHistoryAverageForStaker: toBN(0),
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT
      })
    );

    // for non existing staker
    expectBignumberEqual(
      await stakingInstance.getHistoryAverageForStake(user, 0),
      await getHistoryAverageForStake(user, stakingInstance, 0, {
        expectedHistoryAverageReward: toBN(0),
        expectedHistoryAverageRewardWhenEntered: toBN(0),
        expectedHistoryLength: toBN(0),
        expectedBlocksParticipatedInHistory: toBN(0),
        expectedHistoryAverageForStaker: toBN(0),
        expectedAmountStaked: toBN(0)
      })
    );
  });

  it('should get the correct history period reward at block for stakers', async () => {
    const [stakingInstance, {mockRewardInstance, owner, deployedAtBlock}] = await deployStaking();

    expectBignumberEqual(
      await stakingInstance.getHistoryAverageForStake(owner, 0),
      await getHistoryAverageForStake(owner, stakingInstance, 0, {
        expectedHistoryAverageReward: toBN(0),
        expectedHistoryAverageRewardWhenEntered: toBN(0),
        expectedHistoryLength: toBN(0),
        expectedBlocksParticipatedInHistory: toBN(0),
        expectedHistoryAverageForStaker: toBN(0),
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT
      })
    );

    // default staker + alice
    const aliceStakeAmount = toBN(toWei('99'));
    const bobStakeAmount = toBN(toWei('200'));

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    const {receipt: {blockNumber: aliceEnterBlock}} = await stakingInstance
      .stake(aliceStakeAmount, numberToBytes32(0), {from: alice});

    const aliceStakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.getHistoryAverageForStake(alice, aliceStakeIndex),
      await getHistoryAverageForStake(alice, stakingInstance, aliceStakeIndex, {
        expectedHistoryAverageReward: toBN(toWei('10')),
        expectedHistoryAverageRewardWhenEntered: toBN(toWei('10')),
        expectedHistoryLength: toBN(aliceEnterBlock - deployedAtBlock - 1),
        expectedBlocksParticipatedInHistory: toBN(0),
        expectedHistoryAverageForStaker: toBN(0),
        expectedAmountStaked: aliceStakeAmount
      })
    );

    expectBignumberEqual(
      await stakingInstance.getHistoryAverageForStake(owner, 0),
      await getHistoryAverageForStake(owner, stakingInstance, 0, {
        expectedHistoryAverageReward: toBN(toWei('10')),
        expectedHistoryAverageRewardWhenEntered: toBN(0),
        expectedHistoryLength: toBN(aliceEnterBlock - deployedAtBlock - 1),
        expectedBlocksParticipatedInHistory: toBN(aliceEnterBlock - deployedAtBlock - 1),
        expectedHistoryAverageForStaker: toBN(toWei('10')),
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT
      })
    );

    // default staker + alice + bob
    const {receipt: {blockNumber: bobStakeBlock}} = await stakingInstance
      .stake(bobStakeAmount, numberToBytes32(0), {from: bob});

    const bobStakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.getHistoryAverageForStake(owner, 0),
      await getHistoryAverageForStake(owner, stakingInstance, 0, {
        expectedHistoryAverageReward: toBN(toWei('9.01')),
        expectedHistoryAverageRewardWhenEntered: toBN(0),
        expectedHistoryLength: toBN(bobStakeBlock - deployedAtBlock - 1),
        expectedBlocksParticipatedInHistory: toBN(bobStakeBlock - deployedAtBlock - 1),
        expectedHistoryAverageForStaker: toBN(toWei('9.01'))
      })
    );

    expectBignumberEqual(
      await stakingInstance.getHistoryAverageForStake(alice, aliceStakeIndex),
      await getHistoryAverageForStake(alice, stakingInstance, aliceStakeIndex, {
        expectedHistoryAverageReward: toBN(toWei('9.01')),
        expectedHistoryAverageRewardWhenEntered: toBN(toWei('10')),
        expectedHistoryLength: toBN(bobStakeBlock - deployedAtBlock - 1),
        expectedBlocksParticipatedInHistory: toBN(bobStakeBlock - aliceEnterBlock),
        expectedHistoryAverageForStaker: toBN(toWei('0.1'))
      })
    );

    expectBignumberEqual(
      await stakingInstance.getHistoryAverageForStake(bob, bobStakeIndex),
      await getHistoryAverageForStake(bob, stakingInstance, bobStakeIndex, {
        expectedHistoryAverageReward: toBN(toWei('9.01')),
        expectedHistoryAverageRewardWhenEntered: toBN(toWei('9.01')),
        expectedHistoryLength: toBN(bobStakeBlock - deployedAtBlock - 1),
        expectedBlocksParticipatedInHistory: toBN(0),
        expectedHistoryAverageForStaker: toBN(0)
      })
    );
  });

  it('should return zero if user has unstaked', async () => {
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

    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getHistoryAverageForStake(alice, stakeIndex),
      0
    );
  });
});
