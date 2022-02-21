const {deployStaking} = require('../helpers/deploy');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, toBN, advanceBlock} = require('../../helpers/utils');
const {getExpectedStakerRewardFromHistory, DEFAULT_STAKER_AMOUNT} = require('../helpers/staking');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: getStakerRewardFromHistory', accounts => {
  it('should return zero for non stakers', async () => {
    const [stakingInstance] = await deployStaking();

    const {user} = getRaffleActors(accounts);

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromHistory(user, 0),
      0
    );
  });

  it('should get the correct history reward existing stakers', async () => {
    const [stakingInstance, {mockRewardInstance, owner}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);
    const aliceStakeAmount = toBN(toWei('99', 'ether'));
    const bobStakeAmount = toBN(toWei('200', 'ether'));

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    const {enteredAtBlock: ownerEnterBlockNumber} = await stakingInstance.userStakes(owner, 0);
    const ownerEnterBlock = toBN(ownerEnterBlockNumber);

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromHistory(owner, 0),
      await getExpectedStakerRewardFromHistory(owner, stakingInstance, 0, {
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedHistoryAverageForStaker: 0,
        expectedBlocksParticipatedInHistory: ownerEnterBlock.sub(ownerEnterBlock),
        expectedStakerRewardFromHistory: 0
      })
    );

    await stakingInstance.stake(aliceStakeAmount, numberToBytes32(0), {from: alice});
    const aliceStakeIndex = 0;

    const {enteredAtBlock: aliceEnterBlockNumber} = await stakingInstance
      .userStakes(alice, aliceStakeIndex);
    const aliceEnterBlock = toBN(aliceEnterBlockNumber);

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromHistory(owner, 0),
      await getExpectedStakerRewardFromHistory(owner, stakingInstance, 0, {
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedHistoryAverageForStaker: 0,
        expectedBlocksParticipatedInHistory: aliceEnterBlock.sub(ownerEnterBlock)
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromHistory(alice, aliceStakeIndex),
      await getExpectedStakerRewardFromHistory(alice, stakingInstance, aliceStakeIndex, {
        expectedAmountStaked: aliceStakeAmount,
        expectedHistoryAverageForStaker: 0,
        expectedBlocksParticipatedInHistory: aliceEnterBlock.sub(aliceEnterBlock),
        expectedStakerRewardFromHistory: 0
      })
    );

    await stakingInstance.stake(bobStakeAmount, numberToBytes32(0), {from: bob});
    const bobStakeIndex = 0;

    const {enteredAtBlock: bobEnterBlockNumber} = await stakingInstance.userStakes(bob, bobStakeIndex);
    const bobEnterBlock = toBN(bobEnterBlockNumber);

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromHistory(owner, 0),
      await getExpectedStakerRewardFromHistory(owner, stakingInstance, 0)
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromHistory(owner, 0),
      await getExpectedStakerRewardFromHistory(owner, stakingInstance, 0, {
        expectedAmountStaked: DEFAULT_STAKER_AMOUNT,
        expectedHistoryAverageForStaker: 0,
        expectedBlocksParticipatedInHistory: bobEnterBlock.sub(ownerEnterBlock)
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromHistory(alice, aliceStakeIndex),
      await getExpectedStakerRewardFromHistory(alice, stakingInstance, aliceStakeIndex, {
        expectedAmountStaked: aliceStakeAmount,
        expectedHistoryAverageForStaker: 0,
        expectedBlocksParticipatedInHistory: bobEnterBlock.sub(aliceEnterBlock)
      })
    );

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromHistory(bob, bobStakeIndex),
      await getExpectedStakerRewardFromHistory(bob, stakingInstance, bobStakeIndex, {
        expectedAmountStaked: bobStakeAmount,
        expectedHistoryAverageForStaker: 0,
        expectedBlocksParticipatedInHistory: bobEnterBlock.sub(bobEnterBlock),
        expectedStakerRewardFromHistory: 0
      })
    );
  });

  it('should return zero if user has unstaked', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);
    const aliceStakeAmount = toBN(toWei('99', 'ether'));

    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(aliceStakeAmount, numberToBytes32(4), {from: alice});
    const aliceStakeIndex = 0;

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(aliceStakeAmount, numberToBytes32(aliceStakeIndex), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getStakerRewardFromHistory(alice, aliceStakeIndex),
      0
    );
  });
});
