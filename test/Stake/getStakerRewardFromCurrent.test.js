const {deployStaking} = require('../helpers/deploy');
const {topUpUser} = require('../helpers/erc20');
const {
  getStakerRewardFromCurrent,
  DEFAULT_STAKER_AMOUNT,
  REWARD_PER_BLOCK,
  getExpectedCurrentPeriodLength
} = require('../helpers/staking');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, advanceBlock, toBN} = require('../../helpers/utils');
const {numberToBytes32} = require('../helpers/bytes');
const {expectBignumberEqual} = require('../../helpers');

contract('Stake: getStakerRewardFromCurrent', accounts => {
  it('should return zero if staker is not in block', async () => {
    const [stakingInstance] = await deployStaking();

    const {user} = getRaffleActors(accounts);

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(user, 0),
      0
    );
  });

  it('should get the current period reward at block with a single staked', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(owner, 0),
      await getStakerRewardFromCurrent(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT,
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK.mul(
          await getExpectedCurrentPeriodLength(stakingInstance)
        )
      })
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(owner, 0),
      await getStakerRewardFromCurrent(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT,
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK
          .mul(
            await getExpectedCurrentPeriodLength(stakingInstance)
          )
      })
    );
  });

  it('should get the current period reward at block with a multiple users staked', async () => {
    const [stakingInstance, {mockRewardInstance, owner}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});
    const aliceStakeAmount = toBN(toWei('99'));
    const bobStakeAmount = toBN(toWei('200'));

    await stakingInstance.stake(aliceStakeAmount, numberToBytes32(0), {from: alice});
    const aliceStakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(owner, 0),
      await getStakerRewardFromCurrent(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT.add(aliceStakeAmount),
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK, // just one because an event just happened
        expectedStakerRewardFromCurrent: toBN(toWei('0.1')) // 1% of current
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(alice, aliceStakeIndex),
      await getStakerRewardFromCurrent(alice, stakingInstance, aliceStakeIndex, {
        expectedTotalCurrentlyStaked: toBN(toWei('100')),
        expectedAmountStaked: aliceStakeAmount,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK, // just one because an event just happened
        expectedStakerRewardFromCurrent: toBN(toWei('9.9')) // 99% of current
      })
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(owner, 0),
      await getStakerRewardFromCurrent(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT.add(aliceStakeAmount),
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK.mul(toBN(2)),
        expectedStakerRewardFromCurrent: toBN(toWei('0.1')).mul(toBN(2))
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(alice, aliceStakeIndex),
      await getStakerRewardFromCurrent(alice, stakingInstance, aliceStakeIndex, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT.add(aliceStakeAmount),
        expectedAmountStaked: aliceStakeAmount,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK.mul(toBN(2)),
        expectedStakerRewardFromCurrent: toBN(toWei('9.9')).mul(toBN(2))
      })
    );

    await stakingInstance.stake(bobStakeAmount, numberToBytes32(0), {from: bob});
    const bobStakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(owner, 0),
      await getStakerRewardFromCurrent(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT
          .add(aliceStakeAmount)
          .add(bobStakeAmount),
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK, // just one because an event just happened
        expectedStakerRewardFromCurrent: toBN(toWei('0.033333333333333333')) // 0.33% of current
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(alice, aliceStakeIndex),
      await getStakerRewardFromCurrent(alice, stakingInstance, aliceStakeIndex, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT
          .add(aliceStakeAmount)
          .add(bobStakeAmount),
        expectedAmountStaked: aliceStakeAmount,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK, // just one because an event just happened
        expectedStakerRewardFromCurrent: toBN(toWei('3.3')) // 33% of current
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(bob, bobStakeIndex),
      await getStakerRewardFromCurrent(bob, stakingInstance, bobStakeIndex, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT
          .add(aliceStakeAmount)
          .add(bobStakeAmount),
        expectedAmountStaked: bobStakeAmount,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK, // just one because an event just happened
        expectedStakerRewardFromCurrent: toBN(toWei('6.666666666666666666')) // 66.666% of current
      })
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(owner, 0),
      await getStakerRewardFromCurrent(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT
          .add(aliceStakeAmount)
          .add(bobStakeAmount),
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK.mul(toBN(2)),
        expectedStakerRewardFromCurrent: toBN(toWei('0.033333333333333333')).mul(toBN(2))
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(alice, aliceStakeIndex),
      await getStakerRewardFromCurrent(alice, stakingInstance, aliceStakeIndex, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT
          .add(aliceStakeAmount)
          .add(bobStakeAmount),
        expectedAmountStaked: aliceStakeAmount,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK.mul(toBN(2)),
        expectedStakerRewardFromCurrent: toBN(toWei('3.3')).mul(toBN(2))
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(bob, bobStakeIndex),
      await getStakerRewardFromCurrent(bob, stakingInstance, bobStakeIndex, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT
          .add(aliceStakeAmount)
          .add(bobStakeAmount),
        expectedAmountStaked: bobStakeAmount,
        expectedRewardInCurrentPeriod: REWARD_PER_BLOCK.mul(toBN(2)),
        expectedStakerRewardFromCurrent: toBN('13333333333333333333') // ~ 6.66666 x 2 - expected loss of precision
      })
    );
  });

  it('should return zero if user has unstaked', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});
    const aliceStakeAmount = toBN(toWei('99'));

    await stakingInstance.stake(aliceStakeAmount, numberToBytes32(4), {from: alice});
    const aliceStakeIndex = 0;

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(aliceStakeAmount, numberToBytes32(aliceStakeIndex), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromCurrent(alice, aliceStakeIndex),
      0
    );
  });
});
