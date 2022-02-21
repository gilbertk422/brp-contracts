/* eslint-disable max-len */
const {deployRaffle} = require('../helpers/deploy');
const {
  enterRaffle,
  populatePrizes,
  startRaffle,
  calculateWinnerIndex
} = require('../helpers/raffle');
const {findEventInTransaction} = require('../../helpers/events');
const {shouldFailWithMessage, soliditySha3, increaseTo} = require('../../helpers/utils');
const {getRaffleActors} = require('../../helpers/address');
const {RAFFLE_STATES} = require('../../helpers/constants');

const findPlayerAtIndex = (players, index) => players.find(([_, i]) => i === index);

const entropy = soliditySha3('entropy');

contract('Raffle: draftWinners', accounts => {
  it('should work if raffle is running', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    await populatePrizes(raffleInstance, raffleIndex, 5);
    await increaseTo(endDate);

    await raffleInstance.draftWinners(raffleIndex, entropy, {from: owner});

    await shouldFailWithMessage(
      raffleInstance.draftWinners(raffleIndex, entropy, {from: owner}),
      'Raffle: Randomness already requested'
    );
  });

  it('should fail if raffle does not exist', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);

    await shouldFailWithMessage(
      raffleInstance.draftWinners('1', entropy, {from: owner}),
      'Raffle: Raffle does not exists'
    );
  });

  it('should store the random number requestId', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    await populatePrizes(raffleInstance, raffleIndex, 5);
    await increaseTo(endDate);

    const draftWinnersResult = await raffleInstance.draftWinners(raffleIndex, entropy, {from: owner});

    const {args} = await findEventInTransaction(
      draftWinnersResult,
      'RandomnessRequested'
    );
    const randomnessRequest = await raffleInstance.randomnessRequests(args.requestId);

    expect(randomnessRequest.toString()).to.be.equal(raffleIndex.toString());
  });

  it('should store the "inconclusive Raffle" flag if it concludes without Players', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    await populatePrizes(raffleInstance, raffleIndex, 5);
    await increaseTo(endDate);

    await raffleInstance.draftWinners(raffleIndex, entropy, {from: owner});

    const raffleInfo = await raffleInstance.raffleInfo(raffleIndex);

    expect(raffleInfo.randomResult.toString()).to.be.equal(String(RAFFLE_STATES.INCONCLUSIVE));
  });

  it('should store the "inconclusive Raffle" flag if it concludes without Prizes', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    await increaseTo(endDate);

    await raffleInstance.draftWinners(raffleIndex, entropy, {from: owner});

    const raffleInfo = await raffleInstance.raffleInfo(raffleIndex);

    expect(raffleInfo.randomResult.toString()).to.be.equal(String(RAFFLE_STATES.INCONCLUSIVE));
  });

  it('should fail if end date is not reached', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    await populatePrizes(raffleInstance, raffleIndex, 5);

    await shouldFailWithMessage(
      raffleInstance.draftWinners(raffleIndex, entropy, {from: owner}),
      'Raffle: Raffle is not concluded yet'
    );
  });

  it('should set randomNumber to 1 (our flag for pending)', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});
    await populatePrizes(raffleInstance, raffleIndex, 5);

    await increaseTo(endDate);

    await raffleInstance.draftWinners(raffleIndex, entropy, {from: owner});
    const raffleInfo = await raffleInstance.raffleInfo(raffleIndex);

    expect(raffleInfo.randomResult.toString()).to.be.equal('1');
  });

  it('should create a random number request and VRF fulfill it correctly', async () => {
    const [raffleInstance, {owner, raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});
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

  it('should allow the Owner to draft winners', async () => {
    const [raffleInstance] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);

    await shouldFailWithMessage(
      raffleInstance.draftWinners('1', entropy, {from: user}),
      'Ownable: caller is not the owner'
    );
  });

  it('should map every prize to a winner', async () => {
    const [raffleInstance, {owner, raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle(accounts);

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    const players = await enterRaffle(raffleInstance, raffleIndex, raffleTicketInstance, accounts);
    const prizes = await populatePrizes(raffleInstance, raffleIndex, 5);

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

    const playersNumber = await raffleInstance.getPlayersLength(raffleIndex);

    await Promise.all(prizes.map(async ([_, prizeIndex]) => {
      const expectedWinnerIndex = calculateWinnerIndex(prizeIndex, raffleInfo.randomResult, playersNumber);
      const storedPrizeWinnerAddress = await raffleInstance.getPrizeWinner(raffleIndex, prizeIndex);

      // players is an array of [playerAddress, playerIndex]. We need the item with a given index
      const [expectedPlayerAtIndex] = findPlayerAtIndex(players, expectedWinnerIndex.toNumber());

      expect(storedPrizeWinnerAddress).to.be.equal(expectedPlayerAtIndex);
    }));
  });
});
