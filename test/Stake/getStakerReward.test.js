const {advanceBlock} = require('@openzeppelin/test-helpers/src/time');
const {deployStaking} = require('../helpers/deploy');
const {
  getExpectedStakerReward, DEFAULT_STAKER_AMOUNT, REWARD_PER_BLOCK
} = require('../helpers/staking');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, toBN} = require('../../helpers/utils');
const {numberToBytes32} = require('../helpers/bytes');
const {expectBignumberEqual} = require('../../helpers');

contract('Stake: getStakerReward', accounts => {
  it('should return zero if staker has not staked yet', async () => {
    const [stakingInstance] = await deployStaking();

    const {user} = getRaffleActors(accounts);

    expectBignumberEqual(
      await stakingInstance.getStakerReward(user, 0),
      await getExpectedStakerReward(user, stakingInstance, 0, {
        expectedTotalCurrentlyStaked: DEFAULT_STAKER_AMOUNT,
        expectedAmountStaked: 0,
        expectedStakerRewardFromCurrent: 0,
        expectedStakerRewardFromHistory: 0,
        expectedBlocksParticipatedInHistory: 0,
        expectedStakerReward: 0
      })
    );
  });

  it('should get the correct total reward at block for stakers', async () => {
    const [
      stakingInstance,
      {
        blocksDelta,
        mockRewardInstance,
        owner,
        deployedAtBlock
      }
    ] = await deployStaking();

    let expectedTotalCurrentlyStaked = DEFAULT_STAKER_AMOUNT;

    expectBignumberEqual(
      await stakingInstance.getStakerReward(owner, 0),
      await getExpectedStakerReward(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked,
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedStakerRewardFromCurrent: toBN(toWei(10 * blocksDelta)), // owner is alone
        expectedStakerRewardFromHistory: 0,
        expectedBlocksParticipatedInHistory: 0,
        expectedStakerReward: toBN(toWei(10 * blocksDelta))
      })
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getStakerReward(owner, 0),
      await getExpectedStakerReward(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked,
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedStakerRewardFromCurrent: toBN(toWei(10 * (blocksDelta + 1))),
        expectedStakerRewardFromHistory: 0,
        expectedBlocksParticipatedInHistory: 0,
        expectedStakerReward: toBN(toWei(10 * (blocksDelta + 1)))
      })
    );

    const aliceStakeAmount = toBN(toWei('99'));
    const bobStakeAmount = toBN(toWei('200'));

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    const {receipt: {blockNumber: aliceEnterBlock}} = await stakingInstance
      .stake(aliceStakeAmount, numberToBytes32(0), {from: alice});
    const aliceStakeIndex = 0;

    let ownerTimeInHistory = aliceEnterBlock - deployedAtBlock - 1;
    let ownerExpectedRewardFromCurrent = toBN(toWei(0.1));
    let ownerExpectedRewardFromHistory = REWARD_PER_BLOCK.mul(toBN(ownerTimeInHistory));
    let ownerExpectedStakerReward = ownerExpectedRewardFromCurrent
      .add(ownerExpectedRewardFromHistory);

    let aliceTimeInHistory = 0;
    let aliceExpectedRewardFromCurrent = toBN(toWei(9.9));
    let aliceExpectedRewardFromHistory = toBN(0);
    let aliceExpectedStakerReward = aliceExpectedRewardFromCurrent
      .add(aliceExpectedRewardFromHistory);

    expectedTotalCurrentlyStaked = DEFAULT_STAKER_AMOUNT.add(aliceStakeAmount);

    expectBignumberEqual(
      await stakingInstance.getStakerReward(owner, 0),
      await getExpectedStakerReward(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked,
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedStakerRewardFromCurrent: ownerExpectedRewardFromCurrent,
        expectedStakerRewardFromHistory: ownerExpectedRewardFromHistory,
        PexpectedBlocksParticipatedInHistory: ownerTimeInHistory,
        expectedStakerReward: ownerExpectedStakerReward
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerReward(alice, aliceStakeIndex),
      await getExpectedStakerReward(alice, stakingInstance, aliceStakeIndex, {
        expectedTotalCurrentlyStaked,
        expectedAmountStaked: aliceStakeAmount,
        expectedStakerRewardFromCurrent: aliceExpectedRewardFromCurrent,
        expectedStakerRewardFromHistory: 0,
        expectedBlocksParticipatedInHistory: aliceTimeInHistory,
        expectedStakerReward: aliceExpectedStakerReward
      })
    );

    const {receipt: {blockNumber: bobEnterBlock}} = await stakingInstance
      .stake(bobStakeAmount, numberToBytes32(0), {from: bob});
    const bobStakeIndex = 0;

    ownerTimeInHistory = bobEnterBlock - deployedAtBlock - 1;
    ownerExpectedRewardFromHistory = toBN(toWei('100.1')); // ~80.01 little loss of precision is expected
    ownerExpectedRewardFromCurrent = toBN(toWei('0.033333333333333333')); // 0.33% of current
    ownerExpectedStakerReward = ownerExpectedRewardFromCurrent
      .add(ownerExpectedRewardFromHistory);

    aliceTimeInHistory = bobEnterBlock - aliceEnterBlock;
    aliceExpectedRewardFromHistory = aliceExpectedRewardFromCurrent;
    aliceExpectedRewardFromCurrent = toBN(toWei(3.3)); // 33% of current
    aliceExpectedStakerReward = toBN(toWei('13.2'));

    const bobTimeInHistory = bobEnterBlock - bobEnterBlock;
    const bobExpectedRewardFromCurrent = toBN(toWei('6.666666666666666666')); // 66.6666666% of current
    const bobExpectedRewardFromHistory = toBN(0);
    const bobExpectedStakerReward = bobExpectedRewardFromCurrent
      .add(bobExpectedRewardFromHistory);

    expectedTotalCurrentlyStaked = expectedTotalCurrentlyStaked
      .add(bobStakeAmount);

    expectBignumberEqual(
      await stakingInstance.getStakerReward(owner, 0),
      await getExpectedStakerReward(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked,
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedStakerRewardFromCurrent: ownerExpectedRewardFromCurrent,
        expectedStakerRewardFromHistory: ownerExpectedRewardFromHistory,
        expectedBlocksParticipatedInHistory: ownerTimeInHistory,
        expectedStakerReward: ownerExpectedStakerReward
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerReward(alice, aliceStakeIndex),
      await getExpectedStakerReward(alice, stakingInstance, aliceStakeIndex, {
        expectedTotalCurrentlyStaked,
        expectedAmountStaked: aliceStakeAmount,
        expectedStakerRewardFromCurrent: aliceExpectedRewardFromCurrent,
        expectedStakerRewardFromHistory: 0,
        expectedBlocksParticipatedInHistory: aliceTimeInHistory,
        expectedStakerReward: aliceExpectedStakerReward
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerReward(bob, bobStakeIndex),
      await getExpectedStakerReward(bob, stakingInstance, bobStakeIndex, {
        expectedTotalCurrentlyStaked,
        expectedAmountStaked: bobStakeAmount,
        expectedStakerRewardFromCurrent: bobExpectedRewardFromCurrent,
        expectedStakerRewardFromHistory: 0,
        expectedBlocksParticipatedInHistory: bobTimeInHistory,
        expectedStakerReward: bobExpectedStakerReward
      })
    );
  });

  it('should return zero if user has unstaked', async () => {
    const [
      stakingInstance,
      {
        blocksDelta,
        mockRewardInstance,
        owner
      }
    ] = await deployStaking();

    const expectedTotalCurrentlyStaked = DEFAULT_STAKER_AMOUNT;

    expectBignumberEqual(
      await stakingInstance.getStakerReward(owner, 0),
      await getExpectedStakerReward(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked,
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedStakerRewardFromCurrent: toBN(toWei(10 * blocksDelta)), // owner is alone
        expectedStakerRewardFromHistory: 0,
        expectedBlocksParticipatedInHistory: 0,
        expectedStakerReward: toBN(toWei(10 * blocksDelta))
      })
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getStakerReward(owner, 0),
      await getExpectedStakerReward(owner, stakingInstance, 0, {
        expectedTotalCurrentlyStaked,
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedStakerRewardFromCurrent: toBN(toWei(10 * (blocksDelta + 1))),
        expectedStakerRewardFromHistory: 0,
        expectedBlocksParticipatedInHistory: 0,
        expectedStakerReward: toBN(toWei(10 * (blocksDelta + 1)))
      })
    );

    const aliceStakeAmount = toBN(toWei('99'));

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(aliceStakeAmount, numberToBytes32(4), {from: alice});
    const aliceStakeIndex = 0;

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(aliceStakeAmount, numberToBytes32(aliceStakeIndex), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getStakerReward(alice, aliceStakeIndex),
      0
    );
  });
});
