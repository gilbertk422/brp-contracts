const {deployRaffle} = require('../helpers/deploy');
const {populatePrizes, enterRaffle, startRaffle} = require('../helpers/raffle');

contract('Raffle: meta', accounts => {
  it('populatePrizes helper should populate the Prizes correctly', async () => {
    const [raffleInstance] = await deployRaffle(accounts);

    const [raffleIndex] = await startRaffle(raffleInstance);

    const prizes = await populatePrizes(raffleInstance, raffleIndex, 5);

    await Promise.all(prizes.map(async ([prizeInstance, prizeId], i) => {
      const {
        0: prizeAtIndexAddress,
        1: prizeAtIndexId
      } = await raffleInstance.getPrizeAtIndex(raffleIndex, i);

      expect(prizeAtIndexAddress).to.be.equal(prizeInstance.address);
      expect(prizeAtIndexId.toNumber()).to.be.equal(prizeId);
    }));
  });

  it('enterRaffle helper should enter the raffle for given accounts', async () => {
    const [raffleInstance, {raffleTicketInstance}] = await deployRaffle(accounts);

    const [raffleIndex] = await startRaffle(raffleInstance);

    const rafflePlayers = await enterRaffle(
      raffleInstance,
      raffleIndex,
      raffleTicketInstance,
      accounts
    );

    await Promise.all(rafflePlayers.map(async ([rafflePlayerAddress], i) => {
      const storedRafflePlayerAddress = await raffleInstance.getPlayerAtIndex(raffleIndex, i);

      expect(storedRafflePlayerAddress).to.be.equal(rafflePlayerAddress);
    }));
  });
});
