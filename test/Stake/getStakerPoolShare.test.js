const {deployStaking} = require('../helpers/deploy');
const {DEFAULT_STAKER_AMOUNT, getExpectedStakerPeriodPoolShare} = require('../helpers/staking');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, toBN, advanceBlock} = require('../../helpers/utils');
const {numberToBytes32} = require('../helpers/bytes');
const {expectBignumberEqual} = require('../../helpers');

contract('Stake: getStakerReward', accounts => {
  it('should return zero if staker is not in block', async () => {
    const [stakingInstance] = await deployStaking();

    const {user} = getRaffleActors(accounts);

    expectBignumberEqual(
      await stakingInstance.getStakerPoolShare(user, 0),
      await getExpectedStakerPeriodPoolShare(user, stakingInstance, 0, {
        expectedAmountStaked: 0,
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT,
        expectedStakerPoolShare: 0
      })
    );
  });

  it('should get the correct staker share', async () => {
    const [stakingInstance, {mockRewardInstance, owner}] = await deployStaking();

    await stakingInstance.userStakes(owner, 0);

    expectBignumberEqual(
      await stakingInstance.getStakerPoolShare(owner, 0),
      await getExpectedStakerPeriodPoolShare(owner, stakingInstance, 0, {
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT,
        expectedStakerPoolShare: toBN(toWei(1))
      })
    );

    const aliceStakeAmount = toBN(toWei('99'));
    const bobStakeAmount = toBN(toWei('200'));

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(aliceStakeAmount, numberToBytes32(0), {from: alice});
    const aliceStakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.getStakerPoolShare(owner, aliceStakeIndex),
      await getExpectedStakerPeriodPoolShare(owner, stakingInstance, aliceStakeIndex, {
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT.add(aliceStakeAmount),
        expectedStakerPoolShare: toBN(toWei(0.01))
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerPoolShare(alice, aliceStakeIndex),
      await getExpectedStakerPeriodPoolShare(alice, stakingInstance, aliceStakeIndex, {
        expectedAmountStaked: aliceStakeAmount,
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT.add(aliceStakeAmount),
        expectedStakerPoolShare: toBN(toWei(0.99))
      })
    );

    await stakingInstance.stake(bobStakeAmount, numberToBytes32(0), {from: bob});
    const bobStakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.getStakerPoolShare(owner, bobStakeIndex),
      await getExpectedStakerPeriodPoolShare(owner, stakingInstance, bobStakeIndex, {
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT
          .add(aliceStakeAmount)
          .add(bobStakeAmount),
        expectedStakerPoolShare: toBN(toWei('0.003333333333333333'))
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerPoolShare(alice, aliceStakeIndex),
      await getExpectedStakerPeriodPoolShare(alice, stakingInstance, aliceStakeIndex, {
        expectedAmountStaked: aliceStakeAmount,
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT
          .add(aliceStakeAmount)
          .add(bobStakeAmount),
        expectedStakerPoolShare: toBN(toWei(0.33))
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerPoolShare(bob, bobStakeIndex),
      await getExpectedStakerPeriodPoolShare(bob, stakingInstance, bobStakeIndex, {
        expectedAmountStaked: bobStakeAmount,
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT
          .add(aliceStakeAmount)
          .add(bobStakeAmount),
        expectedStakerPoolShare: toBN('666666666666666666') // hardcoding to don't lose precision during conversion
      })
    );

    // sumcheck
    const ownerShare = await stakingInstance.getStakerPoolShare(owner, 0);
    const aliceShare = await stakingInstance.getStakerPoolShare(alice, aliceStakeIndex);
    const bobShare = await stakingInstance.getStakerPoolShare(bob, bobStakeIndex);

    const sum = ownerShare.add(aliceShare).add(bobShare);

    expectBignumberEqual(
      sum,
      toBN('999999999999999999') // 1 wei is expected to be lost due to decimal precision
    );
  });

  it('should return zero if user has unstaked', async () => {
    const [stakingInstance, {mockRewardInstance, owner}] = await deployStaking();

    await stakingInstance.userStakes(owner, 0);

    expectBignumberEqual(
      await stakingInstance.getStakerPoolShare(owner, 0),
      await getExpectedStakerPeriodPoolShare(owner, stakingInstance, 0, {
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT,
        expectedStakerPoolShare: toBN(toWei(1))
      })
    );

    const aliceStakeAmount = toBN(toWei('99'));

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(aliceStakeAmount, numberToBytes32(4), {from: alice});
    const aliceStakeIndex = 0;

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(aliceStakeAmount, numberToBytes32(aliceStakeIndex), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getStakerPoolShare(alice, aliceStakeIndex),
      0
    );
  });
});
