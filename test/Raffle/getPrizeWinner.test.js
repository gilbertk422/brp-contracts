/* eslint-disable max-len */
const {deployRaffle} = require('../helpers/deploy');
const {
  startRaffleAndDraftWinners,
  populatePrizes,
  startRaffle,
  enterRaffle
} = require('../helpers/raffle');
const {
  soliditySha3,
  toBN,
  shouldFailWithMessage,
  increaseTo
} = require('../../helpers/utils');

const findPlayerAtIndex = (players, index) => players.find(([_, i]) => i === index);

const calculateWinnerIndex = (index, entropy, playersLength) => {
  const dividend = toBN(soliditySha3(entropy.add(toBN(index))));

  return dividend.mod(playersLength);
};

const entropy = soliditySha3('entropy');

contract('Raffle: getPrizeWinner', accounts => {
  it('should work with even only one Player', async () => {
    const [raffleInstance, {raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle();

    const lonePlayer = accounts[3];

    const {
      prizes,
      raffleIndex
    } = await startRaffleAndDraftWinners(
      raffleInstance,
      {
        raffleTicketInstance,
        VRFCoordinatorInstance,
        playerAccounts: [lonePlayer]
      }
    );

    const playersNumber = await raffleInstance.getPlayersLength(raffleIndex);
    expect(playersNumber.toString()).to.be.equal('1');

    await Promise.all(prizes.map(async ([_, prizeIndex]) => {
      const storedPrizeWinnerAddress = await raffleInstance.getPrizeWinner(raffleIndex, prizeIndex);

      expect(storedPrizeWinnerAddress).to.be.equal(lonePlayer);
    }));
  });

  it('should revert if Raffle is still not concluded or randomNumber is 0 or 1', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle();

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    await populatePrizes(raffleInstance, raffleIndex, 3);
    await enterRaffle(
      raffleInstance,
      raffleIndex,
      raffleTicketInstance,
      accounts.slice(1, 3)
    );

    await increaseTo(endDate);

    await raffleInstance
      .draftWinners(raffleIndex, entropy, {from: owner});

    // to make sure that when randomness is pending
    const raffleInfo = await raffleInstance.raffleInfo(raffleIndex);
    expect(raffleInfo.randomResult.toString()).to.be.equal('1');

    await shouldFailWithMessage(
      raffleInstance.getPrizeWinner(raffleIndex, 0),
      'Raffle: Randomness pending'
    );
  });

  it('should revert if Raffle concludes without players', async () => {
    const [raffleInstance, {owner}] = await deployRaffle();

    const [raffleIndex, {endDate}] = await startRaffle(raffleInstance);

    await populatePrizes(raffleInstance, raffleIndex, 3);

    await increaseTo(endDate);

    await raffleInstance
      .draftWinners(raffleIndex, entropy, {from: owner});

    await shouldFailWithMessage(
      raffleInstance.getPrizeWinner(raffleIndex, 0),
      'Raffle: Raffle concluded without Players'
    );
  });

  it('should map every Prize to a winner', async () => {
    const [raffleInstance, {raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle();

    const {
      players,
      prizes,
      raffleIndex
    } = await startRaffleAndDraftWinners(raffleInstance, {raffleTicketInstance, VRFCoordinatorInstance});

    const playersNumber = await raffleInstance.getPlayersLength(raffleIndex);
    const raffleInfo = await raffleInstance.raffleInfo(raffleIndex);

    await Promise.all(prizes.map(async ([_, prizeIndex]) => {
      const expectedWinnerIndex = calculateWinnerIndex(prizeIndex, raffleInfo.randomResult, playersNumber);
      const storedPrizeWinnerAddress = await raffleInstance.getPrizeWinner(raffleIndex, prizeIndex);

      // players is an array of [playerAddress, playerIndex]. We need the item with a given index
      const [expectedPlayerAtIndex] = findPlayerAtIndex(players, expectedWinnerIndex.toNumber());

      expect(storedPrizeWinnerAddress).to.be.equal(expectedPlayerAtIndex);
    }));
  });
});
