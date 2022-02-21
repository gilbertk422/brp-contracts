/* eslint-disable max-len */
const {deployRaffle} = require('../helpers/deploy');
const {
  startRaffle,
  startRaffleAndDraftWinners,
  populatePrizes,
  enterRaffle
} = require('../helpers/raffle');
const {findEventInTransaction} = require('../../helpers/events');
const {shouldFailWithMessage, soliditySha3, increaseTo} = require('../../helpers/utils');

const entropy = soliditySha3('entropy');

contract('Raffle: rawfulfillRandomness', accounts => {
  it('should store the randomNumber in the correcty Raffle', async () => {
    const [raffleInstance, {owner, raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle(accounts);

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    await enterRaffle(raffleInstance, raffleIndex, raffleTicketInstance, accounts.slice(2, 3));
    await populatePrizes(raffleInstance, raffleIndex, 5);

    await increaseTo(endDate);

    const draftWinnersResult = await raffleInstance.draftWinners(raffleIndex, entropy, {from: owner});

    const {args} = await findEventInTransaction(
      draftWinnersResult,
      'RandomnessRequested'
    );

    const randomness = '123';
    await VRFCoordinatorInstance.callBackWithRandomness(
      args.requestId,
      randomness,
      raffleInstance.address
    );

    const raffleInfo = await raffleInstance.raffleInfo(raffleIndex);

    expect(raffleInfo.randomResult.toString()).to.be.equal(randomness);
  });

  it('should allow only VRFCoordinator to call this function', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    await enterRaffle(raffleInstance, raffleIndex, raffleTicketInstance, accounts.slice(2, 3));
    await populatePrizes(raffleInstance, raffleIndex, 5);

    await increaseTo(endDate);

    const draftWinnersResult = await raffleInstance.draftWinners(raffleIndex, entropy, {from: owner});

    const {args} = await findEventInTransaction(
      draftWinnersResult,
      'RandomnessRequested'
    );

    const randomness = '123';

    await shouldFailWithMessage(
      raffleInstance.rawFulfillRandomness(args.requestId, randomness),
      'Only VRFCoordinator can fulfill'
    );
  });

  it('should prevent VRFCoordinator to call twice', async () => {
    const [raffleInstance, {raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle(accounts);

    const {requestId, raffleIndex, randomness} = await startRaffleAndDraftWinners(
      raffleInstance,
      {
        raffleTicketInstance,
        VRFCoordinatorInstance
      }
    );

    // NOTE: Chainlink VRFCoordinator is implemented using <address>.call, which does not
    // halt the transaction on throw -- it just fails gracefully
    await VRFCoordinatorInstance.callBackWithRandomness(
      requestId,
      '321',
      raffleInstance.address
    );

    const raffleInfo2 = await raffleInstance.raffleInfo(raffleIndex);
    expect(raffleInfo2.randomResult.toString()).to.be.equal(randomness);
  });
});
