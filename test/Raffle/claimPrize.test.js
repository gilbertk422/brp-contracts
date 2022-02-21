const {deployRaffle} = require('../helpers/deploy');
const {enterRaffle, populatePrizes, startRaffle} = require('../helpers/raffle');
const {shouldFailWithMessage, stringToBytes32, increaseTo} = require('../../helpers/utils');
const {findEventInTransaction} = require('../../helpers/events');
const {getRaffleActors} = require('../../helpers/address');
const {expectBignumberEqual} = require('../../helpers/index');

const commitMessage = stringToBytes32('commitMessage');

contract('Raffle: claimPrize', accounts => {
  it('should fail if randomNumber is equal 0 or 1', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    await populatePrizes(raffleInstance, raffleIndex, 5);
    await increaseTo(endDate);

    await raffleInstance.draftWinners(raffleIndex, commitMessage, {from: owner});

    await shouldFailWithMessage(
      raffleInstance.claimPrize(raffleIndex, tokenId, {from: user}),
      'Raffle: Random Number not drafted yet'
    );
  });

  it('should emit a PrizeClaimed Event', async () => {
    const [
      raffleInstance,
      {
        owner,
        raffleTicketInstance,
        VRFCoordinatorInstance
      }
    ] = await deployRaffle(accounts);

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    await enterRaffle(raffleInstance, raffleIndex, raffleTicketInstance, accounts);
    const prizes = await populatePrizes(raffleInstance, raffleIndex, 5);

    await increaseTo(endDate);

    const draftWinnersResult = await raffleInstance
      .draftWinners(raffleIndex, commitMessage, {from: owner});

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

    await Promise.all(prizes.map(async ([_, prizeIndex]) => {
      const storedPrizeWinnerAddress = await raffleInstance
        .getPrizeWinner(raffleIndex, prizeIndex);

      const {
        args: {
          winner,
          raffleIndex: raffleIndexReturned,
          prizeIndex: prizeIndexStored
        }
      } = await findEventInTransaction(
        raffleInstance.claimPrize(raffleIndex, prizeIndex, {from: storedPrizeWinnerAddress}),
        'PrizeClaimed'
      );

      expect(winner).to.be.equal(storedPrizeWinnerAddress);
      expectBignumberEqual(raffleIndexReturned, raffleIndex);
      expectBignumberEqual(prizeIndex, prizeIndexStored);
    }));
  });

  it('should revert if raffle is still running', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    await shouldFailWithMessage(
      raffleInstance.claimPrize(raffleIndex, tokenId, {from: user}),
      'Raffle: Raffle is not concluded yet'
    );
  });

  it('should revert if you are not the winner', async () => {
    const [
      raffleInstance,
      {
        owner,
        raffleTicketInstance,
        VRFCoordinatorInstance
      }
    ] = await deployRaffle(accounts);

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    await enterRaffle(raffleInstance, raffleIndex, raffleTicketInstance, accounts);
    const prizes = await populatePrizes(raffleInstance, raffleIndex, 5);

    await increaseTo(endDate);

    const draftWinnersResult = await raffleInstance
      .draftWinners(raffleIndex, commitMessage, {from: owner});

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

    await Promise.all(prizes.map(async ([_, prizeIndex]) => {
      const storedPrizeWinnerAddress = await raffleInstance
        .getPrizeWinner(raffleIndex, prizeIndex);

      // any other address will do
      const anotherAddress = accounts.find(add => add !== storedPrizeWinnerAddress);

      await shouldFailWithMessage(
        raffleInstance.claimPrize(raffleIndex, prizeIndex, {from: anotherAddress}),
        'Raffle: You are not the winner of this Prize'
      );
    }));
  });

  it('should allow every winner to claim its Prize', async () => {
    const [
      raffleInstance,
      {
        owner,
        raffleTicketInstance,
        VRFCoordinatorInstance
      }
    ] = await deployRaffle(accounts);
    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    await enterRaffle(raffleInstance, raffleIndex, raffleTicketInstance, accounts);
    const prizes = await populatePrizes(raffleInstance, raffleIndex, 5);

    await increaseTo(endDate);

    const draftWinnersResult = await raffleInstance
      .draftWinners(raffleIndex, commitMessage, {from: owner});

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

    await Promise.all(prizes.map(async ([prizeInstance, prizeIndex, prizeTokenId]) => {
      const storedPrizeWinnerAddress = await raffleInstance
        .getPrizeWinner(raffleIndex, prizeIndex);

      await raffleInstance.claimPrize(raffleIndex, prizeIndex, {from: storedPrizeWinnerAddress});

      const newOwner = await prizeInstance.ownerOf(prizeTokenId);

      expect(storedPrizeWinnerAddress).to.be.equal(newOwner);
    }));
  });
});
