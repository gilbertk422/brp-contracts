/* eslint-disable max-len */
const {
  toBN,
  getBlockNumber,
  toWei,
  fromWei
} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');
const {findEventInTransaction} = require('../../helpers/events');
const {numberToBytes32, hexToNumberString} = require('./bytes');

const REWARD_PER_BLOCK = toBN(toWei('10', 'ether'));
const DEFAULT_STAKER_AMOUNT = toBN(toWei('1', 'ether'));

const getExpectedCurrentPeriodLength = async stakingInstance => {
  const historyEndBlock = await stakingInstance.historyEndBlock();
  const currentBlock = await getBlockNumber();
  const currentPeriodLength = toBN(currentBlock).sub(historyEndBlock);

  return currentPeriodLength;
};

const getExpectedTotalGeneratedReward = async (stakingInstance, checks = {}) => {
  const {
    expectedStartBlock,
    expeectedBlocksElapsed,
    expectedTotalGeneratedReward
  } = checks;

  const historyStartBlock = await stakingInstance.historyStartBlock();
  if(expectedStartBlock) {
    expectBignumberEqual(historyStartBlock, expectedStartBlock);
  }

  const currentBlock = await getBlockNumber();
  const blocksElapsed = toBN(currentBlock).sub(historyStartBlock);
  if(expeectedBlocksElapsed) {
    expectBignumberEqual(blocksElapsed, expeectedBlocksElapsed);
  }

  const expectedGeneratedReward = blocksElapsed.mul(REWARD_PER_BLOCK);
  if(expectedTotalGeneratedReward) {
    expectBignumberEqual(expectedTotalGeneratedReward, expectedTotalGeneratedReward);
  }
  return expectedGeneratedReward;
};

const getExpectedCurrentPeriodReward = async stakingInstance => {
  const currentPeriodLength = await getExpectedCurrentPeriodLength(stakingInstance);

  return currentPeriodLength.mul(REWARD_PER_BLOCK);
};

const getExpectedCurrentPeriodAverageReward = async (stakingInstance, checks = {}) => {
  const {
    expectedTotalCurrentlyStaked,
    expectedCurrentPeriodLength,
    expectedCurrentPeriodAverageReward
  } = checks;

  const currentPeriodLength = await getExpectedCurrentPeriodLength(stakingInstance, checks);
  if(expectedCurrentPeriodLength) {
    expectBignumberEqual(expectedCurrentPeriodLength, expectedCurrentPeriodLength);
  }

  const currentlyStaked = await stakingInstance.totalCurrentlyStaked();
  if(expectedTotalCurrentlyStaked) {
    expectBignumberEqual(expectedTotalCurrentlyStaked, expectedTotalCurrentlyStaked);
  }

  if(currentlyStaked.isZero()) {
    return toBN(0);
  }

  const expectedCurrentPeriodReward = await getExpectedCurrentPeriodReward(stakingInstance, checks);

  const currentPeriodAverageReward = expectedCurrentPeriodReward
    .mul(toBN(10 ** 18))
    .div(currentlyStaked)
    .div(currentPeriodLength);

  expectBignumberEqual(
    await stakingInstance.getCurrentPeriodAverageReward(),
    currentPeriodAverageReward
  );

  if(expectedCurrentPeriodAverageReward) {
    expectBignumberEqual(expectedCurrentPeriodAverageReward, expectedCurrentPeriodAverageReward);
  }

  return currentPeriodAverageReward;
};

const getExpectedNextHistoryAverageRewardAfterEvent = async (stakingInstance, checks = {}) => {
  const {
    expectedCurrentPeriodLength,
    expectedHistoryLength,
    expectedNewHistoryLength,
    expectedCurrentAverageReward,
    expectedHistoryAverageReward,
    expectedNextHistoryAverageRewardAfterEvent
  } = checks;

  // the next history period length =+ current period lenght
  const currentPeriodLength = await getExpectedCurrentPeriodLength(stakingInstance);
  if(expectedCurrentPeriodLength) {
    expectBignumberEqual(currentPeriodLength, expectedCurrentPeriodLength);
  }
  const actualHistoryLength = await stakingInstance.getHistoryLength();
  if(expectedHistoryLength) {
    expectBignumberEqual(actualHistoryLength, expectedHistoryLength);
  }

  const newHistoryLength = actualHistoryLength.add(currentPeriodLength);
  if(expectedNewHistoryLength) {
    expectBignumberEqual(newHistoryLength, expectedNewHistoryLength);
  }

  // next history average reward is equal to:
  // (current length * current avg + history length * history avg) / new history length
  const currentPeriodAverageReward = await getExpectedCurrentPeriodAverageReward(stakingInstance);
  if(expectedCurrentAverageReward) {
    expectBignumberEqual(currentPeriodAverageReward, expectedCurrentAverageReward);
  }
  const historyPeriodAverageReward = await stakingInstance.historyAverageReward();
  if(expectedHistoryAverageReward) {
    expectBignumberEqual(historyPeriodAverageReward, expectedHistoryAverageReward);
  }

  const nextHistoryAverageReward = (
    (
      currentPeriodLength.mul(currentPeriodAverageReward)
    ).add(
      actualHistoryLength.mul(historyPeriodAverageReward)
    )
  )
    .div(newHistoryLength);

  if(expectedNextHistoryAverageRewardAfterEvent) {
    expectBignumberEqual(nextHistoryAverageReward, expectedNextHistoryAverageRewardAfterEvent);
  }

  return nextHistoryAverageReward;
};

const expectAllValuesAreCorrect = async (stakingInstance, opt = {}) => {
  const {
    stakedAmount,
    lastActionBlock
  } = opt;

  if(stakedAmount) {
    expectBignumberEqual(
      await stakingInstance.totalCurrentlyStaked(),
      stakedAmount
    );
  }

  if(lastActionBlock) {
    const deployedAtBlock = await stakingInstance.historyStartBlock();

    expectBignumberEqual(
      await stakingInstance.getHistoryLength(),
      lastActionBlock - deployedAtBlock - 1
    );
  }

  expectBignumberEqual(
    await stakingInstance.getCurrentPeriodLength(),
    await getExpectedCurrentPeriodLength(stakingInstance)
  );

  expectBignumberEqual(
    await stakingInstance.getTotalGeneratedReward(),
    await getExpectedTotalGeneratedReward(stakingInstance)
  );

  expectBignumberEqual(
    await stakingInstance.getTotalRewardInCurrentPeriod(),
    await getExpectedCurrentPeriodReward(stakingInstance)
  );

  expectBignumberEqual(
    await stakingInstance.getCurrentPeriodAverageReward(),
    await getExpectedCurrentPeriodAverageReward(stakingInstance)
  );
};

const getHistoryAverageForStake = async (staker, stakingInstance, stakerIndex, checks = {}) => {
  const {
    expectedBlocksParticipatedInHistory,
    expectedHistoryAverageReward,
    expectedHistoryAverageRewardWhenEntered,
    expectedHistoryLengthBeforeStakerEntered,
    expectedEnteredAtBlock,
    expectedHistoryLength,
    expectedHistoryAverageForStaker,
    expectedAmountStaked
  } = checks;

  const blocksParticipatedInHistory = await stakingInstance.getStakerTimeInHistory(staker, stakerIndex);
  if(expectedBlocksParticipatedInHistory) {
    expectBignumberEqual(blocksParticipatedInHistory, expectedBlocksParticipatedInHistory);
  }

  const historyAverageReward = await stakingInstance.historyAverageReward();
  if(expectedHistoryAverageReward) {
    expectBignumberEqual(historyAverageReward, expectedHistoryAverageReward);
  }

  const historyLength = await stakingInstance.getHistoryLength();
  if(expectedHistoryLength) {
    expectBignumberEqual(historyLength, expectedHistoryLength);
  }

  const stakesLength = await stakingInstance.getUserStakes(staker);

  if(stakerIndex >= stakesLength.toNumber()) {
    return toBN(0);
  }

  const {
    enteredAtBlock,
    historyAverageRewardWhenEntered,
    amountStaked
  } = await stakingInstance.userStakes(staker, stakerIndex);

  if(expectedEnteredAtBlock) {
    expectBignumberEqual(expectedEnteredAtBlock, enteredAtBlock);
  }
  if(expectedHistoryAverageRewardWhenEntered) {
    expectBignumberEqual(historyAverageRewardWhenEntered, expectedHistoryAverageRewardWhenEntered);
  }
  if(expectedAmountStaked) {
    expectBignumberEqual(amountStaked, expectedAmountStaked);
  }

  const historyLengthBeforeStakerEntered = await stakingInstance
    .getHistoryLengthBeforeStakerEntered(staker, stakerIndex);
  if(expectedHistoryLengthBeforeStakerEntered) {
    expectBignumberEqual(
      historyLengthBeforeStakerEntered,
      expectedHistoryLengthBeforeStakerEntered
    );
  }

  let historyAverageFromStaker;

  if(blocksParticipatedInHistory.isZero()) {
    historyAverageFromStaker = toBN(0);
  }
  else {
    historyAverageFromStaker = (
      (historyAverageReward.mul(historyLength)).sub(
        toBN(historyAverageRewardWhenEntered).mul(historyLengthBeforeStakerEntered)
      )
    ).div(blocksParticipatedInHistory);
  }

  expectBignumberEqual(
    historyAverageFromStaker,
    await stakingInstance.getHistoryAverageForStake(staker, stakerIndex)
  );

  if(expectedHistoryAverageForStaker) {
    expectBignumberEqual(
      historyAverageFromStaker,
      expectedHistoryAverageForStaker
    );
  }

  return historyAverageFromStaker;
};

const getExpectedStakerRewardFromHistory = async (staker, stakingInstance, stakeIndex, checks = {}) => {
  const {
    expectedHistoryAverageForStaker,
    expectedAmountStaked,
    expectedBlocksParticipatedInHistory,
    expectedStakerRewardFromHistory
  } = checks;

  const stakesLength = await stakingInstance.getUserStakes(staker);

  if(stakeIndex >= stakesLength.toNumber()) {
    return toBN(0);
  }

  const {amountStaked} = await stakingInstance.userStakes(staker, stakeIndex);
  if(expectedAmountStaked) {
    expectBignumberEqual(amountStaked, expectedAmountStaked);
  }

  const historyAverageForStaker = await getHistoryAverageForStake(staker, stakingInstance, stakeIndex, checks);
  if(expectedHistoryAverageForStaker) {
    expectBignumberEqual(historyAverageForStaker, expectedHistoryAverageForStaker);
  }

  const blocksParticipatedInHistory = await stakingInstance.getStakerTimeInHistory(staker, stakeIndex);
  if(expectedBlocksParticipatedInHistory) {
    expectBignumberEqual(blocksParticipatedInHistory, expectedBlocksParticipatedInHistory);
  }

  const historyReward = blocksParticipatedInHistory
    .mul(historyAverageForStaker)
    .mul(toBN(amountStaked))
    .div(toBN(10 ** 18));

  const actualStakerRewardFromHistory = await stakingInstance.getStakerRewardFromHistory(staker, stakeIndex);
  expectBignumberEqual(
    historyReward,
    actualStakerRewardFromHistory
  );

  if(expectedStakerRewardFromHistory) {
    expectBignumberEqual(actualStakerRewardFromHistory, expectedStakerRewardFromHistory);
  }

  return historyReward;
};

const getStakerRewardFromCurrent = async (staker, stakingInstance, stakeIndex, checks = {}) => {
  const {
    expectedTotalCurrentlyStaked,
    expectedAmountStaked,
    expectedRewardInCurrentPeriod,
    expectedStakerRewardFromCurrent,
    expectedCurrentPeriodLength
  } = checks;

  const totalCurrentlyStaked = await stakingInstance.totalCurrentlyStaked();
  if(expectedTotalCurrentlyStaked) {
    expectBignumberEqual(totalCurrentlyStaked, expectedTotalCurrentlyStaked);
  }

  const stakesLength = await stakingInstance.getUserStakes(staker);

  if(stakeIndex >= stakesLength.toNumber()) {
    return toBN(0);
  }

  const {amountStaked} = await stakingInstance.userStakes(staker, stakeIndex);
  if(expectedAmountStaked) {
    expectBignumberEqual(amountStaked, expectedAmountStaked);
  }

  if(expectedCurrentPeriodLength) {
    expectBignumberEqual(
      expectedCurrentPeriodLength,
      await stakingInstance.getCurrentPeriodLength()
    );
  }

  const totalRewardInCurrentPeriod = await stakingInstance.getTotalRewardInCurrentPeriod();
  if(expectedRewardInCurrentPeriod) {
    expectBignumberEqual(totalRewardInCurrentPeriod, expectedRewardInCurrentPeriod);
  }

  const rewardFromCurrentPeriod = totalRewardInCurrentPeriod
    .mul(toBN(amountStaked))
    .div(totalCurrentlyStaked);

  expectBignumberEqual(
    rewardFromCurrentPeriod,
    await stakingInstance.getStakerRewardFromCurrent(staker, stakeIndex)
  );
  if(expectedStakerRewardFromCurrent) {
    expectBignumberEqual(
      rewardFromCurrentPeriod,
      expectedStakerRewardFromCurrent
    );
  }

  return rewardFromCurrentPeriod;
};

const getExpectedStakerReward = async (staker, stakingInstance, stakeIndex, checks = {}) => {
  const {
    expectedStakerRewardFromCurrent,
    expectedStakerRewardFromHistory,
    expectedStakerReward
  } = checks;

  const fromCurrent = await getStakerRewardFromCurrent(staker, stakingInstance, stakeIndex, checks);
  const actualFromCurrent = await stakingInstance.getStakerRewardFromCurrent(staker, stakeIndex);
  expectBignumberEqual(actualFromCurrent, fromCurrent);
  if(expectedStakerRewardFromCurrent) {
    expectBignumberEqual(fromCurrent, expectedStakerRewardFromCurrent);
  }

  const fromHistory = await getExpectedStakerRewardFromHistory(staker, stakingInstance, stakeIndex, checks);
  const actualFromHistory = await stakingInstance.getStakerRewardFromHistory(staker, stakeIndex);
  expectBignumberEqual(actualFromHistory, fromHistory);
  if(expectedStakerRewardFromHistory) {
    expectBignumberEqual(actualFromHistory, expectedStakerRewardFromHistory);
  }

  const sum = fromCurrent.add(fromHistory);
  const actualSum = await stakingInstance.getStakerReward(staker, stakeIndex);

  expectBignumberEqual(actualSum, sum);
  if(expectedStakerReward) {
    expectBignumberEqual(actualSum, expectedStakerReward);
  }

  return sum;
};

const getExpectedStakerPeriodPoolShare = async (staker, stakingInstance, stakeIndex, checks = {}) => {
  const {
    expectedAmountStaked,
    expectedTotalCurrentlyStaked,
    expectedStakerPoolShare
  } = checks;

  const stakesLength = await stakingInstance.getUserStakes(staker);

  if(stakeIndex >= stakesLength.toNumber()) {
    return toBN(0);
  }

  const {amountStaked} = await stakingInstance.userStakes(staker, stakeIndex);
  if(expectedAmountStaked) {
    expectBignumberEqual(amountStaked, expectedAmountStaked);
  }
  const totalCurrentlyStaked = await stakingInstance.totalCurrentlyStaked();
  if(expectedTotalCurrentlyStaked) {
    expectBignumberEqual(totalCurrentlyStaked, expectedTotalCurrentlyStaked);
  }

  const stakerPoolShare = toBN(amountStaked)
    .mul(toBN(10 ** 18))
    .div(totalCurrentlyStaked);

  expectBignumberEqual(
    stakerPoolShare,
    await stakingInstance.getStakerPoolShare(staker, stakeIndex)
  );

  if(expectedStakerPoolShare) {
    expectBignumberEqual(
      stakerPoolShare,
      expectedStakerPoolShare
    );
  }

  return stakerPoolShare;
};

const printStakingSnapshot = async (stakingInstance, eventDescription = '') => {
  const deployedAt = await stakingInstance.historyStartBlock();
  const currentBlock = await getBlockNumber();
  const totalStakingUnits = fromWei((await stakingInstance.totalStakingUnits()).toString());
  const totalCurrentlyStaked = fromWei((await stakingInstance.totalCurrentlyStaked()).toString());
  const totalDistributedRewards = fromWei((await stakingInstance.totalDistributedRewards()).toString());
  const historyRewardPot = fromWei((await stakingInstance.historyRewardPot()).toString());
  const totalRewardInCurrentPeriod = fromWei((await stakingInstance.getTotalRewardInCurrentPeriod()).toString());
  const totalGeneratedReward = fromWei((await stakingInstance.getTotalGeneratedReward()).toString());
  const historyAverageReward = fromWei((await stakingInstance.historyAverageReward()).toString());
  const currentPeriodAverageReward = fromWei((await stakingInstance.getCurrentPeriodAverageReward()).toString());
  const currentPeriodLength = (await stakingInstance.getCurrentPeriodLength()).toString();
  const historyLength = (await stakingInstance.getHistoryLength()).toString();

  console.table({
    BLOCK: `${currentBlock - deployedAt.toNumber()} ${eventDescription}`,
    totalCurrentlyStaked,
    totalStakingUnits,
    historyRewardPot,
    historyAverageReward,
    totalRewardInCurrentPeriod,
    currentPeriodAverageReward,
    currentPeriodLength,
    historyLength,
    totalDistributedRewards,
    totalGeneratedReward
  });
};

const printStakerSnapshot = async (stakingInstance, stakerAddress, stakeIndex, eventDescription = '') => {
  const deployedAt = await stakingInstance.historyStartBlock();
  const currentBlock = await getBlockNumber();

  const userStake = await stakingInstance.userStakes(stakerAddress, stakeIndex);

  const enteredAtBlock = userStake.enteredAtBlock.toString();
  const lockedTill = userStake.lockedTill.toString();
  const historyAverageRewardWhenEntered = fromWei(userStake.historyAverageRewardWhenEntered.toString());
  const stakingUnits = fromWei(userStake.stakingUnits.toString());
  const amountStaked = fromWei(userStake.amountStaked.toString());
  const rewardCredit = fromWei(userStake.rewardCredit.toString());
  const stakerPoolShare = fromWei((await stakingInstance.getStakerPoolShare(stakerAddress, stakeIndex)).toString());
  const stakerRewardFromCurrent = fromWei((await stakingInstance.getStakerRewardFromCurrent(stakerAddress, stakeIndex)).toString());
  const stakerTimeInHistory = (await stakingInstance.getStakerTimeInHistory(stakerAddress, stakeIndex)).toString();
  const stakerRewardFromHistory = fromWei((await stakingInstance.getStakerRewardFromHistory(stakerAddress, stakeIndex)).toString());
  const historyAverageForStaker = fromWei((await stakingInstance.getHistoryAverageForStake(stakerAddress, stakeIndex)).toString());

  console.table({
    BLOCK: `${currentBlock - deployedAt.toNumber()} ${eventDescription}`,
    enteredAtBlock,
    lockedTill,
    historyAverageRewardWhenEntered,
    stakingUnits,
    amountStaked,
    rewardCredit,
    stakerPoolShare,
    stakerRewardFromCurrent,
    stakerTimeInHistory,
    stakerRewardFromHistory,
    historyAverageForStaker
  });
};

const addStake = async (stakingInstance, opts = {}) => {
  const {
    staker,
    amount = toWei('500', 'ether'),
    lockIndex = 3
  } = opts;

  const stakeResult = await stakingInstance
    .stake(amount, numberToBytes32(lockIndex), {from: staker});

  const {args} = await findEventInTransaction(
    stakeResult,
    'Staked'
  );

  return {
    stakeIndex: hexToNumberString(args.data),
    amount: args.amount
  };
};

module.exports = {
  REWARD_PER_BLOCK,
  DEFAULT_STAKER_AMOUNT,
  getExpectedTotalGeneratedReward,
  getExpectedCurrentPeriodAverageReward,
  getExpectedCurrentPeriodReward,
  getExpectedNextHistoryAverageRewardAfterEvent,
  getExpectedCurrentPeriodLength,
  expectAllValuesAreCorrect,
  getHistoryAverageForStake,
  getExpectedStakerRewardFromHistory,
  getStakerRewardFromCurrent,
  getExpectedStakerReward,
  getExpectedStakerPeriodPoolShare,
  printStakingSnapshot,
  printStakerSnapshot,
  addStake
};
