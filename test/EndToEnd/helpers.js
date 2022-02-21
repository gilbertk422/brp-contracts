const {topUpUser} = require('../helpers/erc20');
const {toWei, soliditySha3, toBN} = require('../../helpers/utils');
const {numberToBytes32} = require('../helpers/bytes');
const {expectBignumberEqual, getExpectedTicketsAtStake} = require('../../helpers');
const {startRaffle, populatePrizes} = require('../helpers/raffle');
const {findEventInTransaction} = require('../../helpers/events');

const actorStakes = async ({
  actor,
  stakeAmount,
  lockIndex = 0,
  stakingInstance,
  actorStakeIndex,
  multiplier = 100
}) => {
  const {receipt: {blockNumber: actorStakeBlock}} = await stakingInstance
    .stake(stakeAmount, numberToBytes32(lockIndex), {from: actor});

  const actorUserStakes = await stakingInstance.userStakes(actor, actorStakeIndex);

  expectBignumberEqual(actorUserStakes.amountStaked, stakeAmount);
  expectBignumberEqual(
    actorUserStakes.stakingUnits,
    (toBN(stakeAmount).mul(toBN(multiplier))).div(toBN(100))
  );
  expect(Number(actorUserStakes.enteredAtBlock)).to.equal(actorStakeBlock);

  return actorStakeBlock;
};

const stakeNft = async ({
  actor,
  stakingInstance,
  stakeIndex,
  mockNftInstance,
  tokenId
}) => {
  await stakingInstance
    .addNftToStake(actor, stakeIndex, mockNftInstance.address, tokenId, {from: actor});

  const userStakedTokenAfter = await stakingInstance.userStakedTokens(actor, stakeIndex);

  expect(userStakedTokenAfter.tokenAddress).to.equal(mockNftInstance.address);
  expectBignumberEqual(userStakedTokenAfter.tokenId, tokenId);
};

const actorUntakes = async ({
  stakingInstance,
  actor,
  unstakeAmount,
  stakeIndex
}) => {
  await stakingInstance.unstake(unstakeAmount, numberToBytes32(stakeIndex), {from: actor});
};

const topUpActors = async (actors, {mockRewardInstance, stakingInstance}) => {
  const {alice, bob, anna} = actors;

  await topUpUser(alice, {mockRewardInstance, stakingInstance, amount: toWei('1000', 'ether')});

  await topUpUser(bob, {mockRewardInstance, stakingInstance, amount: toWei('3000', 'ether')});

  await topUpUser(anna, {mockRewardInstance, stakingInstance, amount: toWei('500', 'ether')});
};

const expectTickets = async ({
  actor,
  prevTickersBalance,
  stakingInstance,
  ticketInstance,
  expectedTickets,
  actorStakeIndex
}) => {
  const expectedRewardedTicketsAmount = getExpectedTicketsAtStake(
    await stakingInstance.userStakes(actor, actorStakeIndex)
  );
  expectBignumberEqual(expectedRewardedTicketsAmount, toBN(expectedTickets));

  const actorTicketBalance = await ticketInstance
    .balanceOf(actor, 0); // 0 is the tokenId of the tickets

  expectBignumberEqual(
    toBN(expectedRewardedTicketsAmount).add(toBN(prevTickersBalance)),
    actorTicketBalance
  );
};

const initRaffle = async ({
  raffleInstance,
  prizeNumber = 2
}) => {
  const [raffleIndex, {startDate, endDate}] = await startRaffle(raffleInstance);

  const prizes = await populatePrizes(raffleInstance, raffleIndex, prizeNumber);

  return {
    raffleIndex,
    raffleStartDate: startDate,
    raffleEndDate: endDate,
    prizes
  };
};

const enterRaffle = async ({
  raffleInstance,
  ticketInstance,
  raffleIndex,
  actor,
  ticketId
}) => {
  await ticketInstance
    .setApprovalForAll(raffleInstance.address, true, {from: actor});

  await raffleInstance.enterGame(raffleIndex, ticketId, {from: actor});
};

function getRandomInt(max) {
  return Math.floor(Math.random() * max).toString();
}

const draftWinner = async ({
  raffleInstance,
  owner,
  raffleIndex,
  entropy = soliditySha3('entropy'),
  randomness = getRandomInt(1000000000),
  VRFCoordinatorInstance
}) => {
  const draftWinnersResult = await raffleInstance
    .draftWinners(raffleIndex, entropy, {from: owner});

  const {args: {requestId}} = await findEventInTransaction(
    draftWinnersResult,
    'RandomnessRequested'
  );

  await VRFCoordinatorInstance.callBackWithRandomness(
    requestId,
    randomness,
    raffleInstance.address
  );
};

const getPrizeWinner = async ({
  raffleInstance,
  raffleIndex,
  prizeIndex,
  expectedWinner
}) => {
  const storedPrizeWinnerAddress = await raffleInstance.getPrizeWinner(raffleIndex, prizeIndex);

  if(expectedWinner) {
    expect(storedPrizeWinnerAddress).to.be.equal(expectedWinner);
  }

  return storedPrizeWinnerAddress;
};

const assertPrizeOwner = async ({
  prizeInstance,
  prizeTokenId,
  expectedOwner
}) => {
  const owner = await prizeInstance.ownerOf(prizeTokenId);

  expect(expectedOwner).to.be.equal(owner);
};

const claimPrize = async ({
  prizeInstance,
  raffleInstance,
  raffleIndex,
  prizeIndex,
  winnerAddress,
  prizeTokenId
}) => {
  await raffleInstance.claimPrize(raffleIndex, prizeIndex, {from: winnerAddress});
  await assertPrizeOwner({prizeInstance, prizeTokenId, expectedOwner: winnerAddress});
};

module.exports = {
  topUpActors,
  actorStakes,
  actorUntakes,
  expectTickets,
  initRaffle,
  enterRaffle,
  draftWinner,
  getPrizeWinner,
  claimPrize,
  stakeNft,
  assertPrizeOwner
};
