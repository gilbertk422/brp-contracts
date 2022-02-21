const {deployRaffle} = require('../helpers/deploy');
const {getRaffleActors} = require('../../helpers/address');
const {shouldFailWithMessage} = require('../../helpers/utils');
const {startRaffle} = require('../helpers/raffle');

contract('Raffle: getPlayerAtIndex', accounts => {
  it('should return the correct player', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex] = await startRaffle(raffleInstance);

    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    const player = await raffleInstance.getPlayerAtIndex(raffleIndex, 0);

    expect(player).to.be.equal(user);
  });

  it('should return zero if Player does not exist', async () => {
    const [raffleInstance] = await deployRaffle(accounts);

    const [raffleIndex] = await startRaffle(raffleInstance);

    await shouldFailWithMessage(
      raffleInstance.getPlayerAtIndex(raffleIndex, 0),
      'Raffle: No Player at index'
    );
  });

  it('should throw if raffle does not exist', async () => {
    const [raffleInstance] = await deployRaffle(accounts);

    await shouldFailWithMessage(
      raffleInstance.getPlayerAtIndex('111', 0),
      'Raffle: Raffle does not exists'
    );
  });
});
