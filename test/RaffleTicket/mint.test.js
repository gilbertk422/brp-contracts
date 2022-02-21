const {deployTicket} = require('../helpers/deploy');
const {getRaffleActorsAsync} = require('../../helpers/address');
const {shouldFailWithMessage} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');

contract('RaffleTicket: mint', () => {
  it('should mint correcly', async () => {
    const [raffleTicketInstance] = await deployTicket();

    const {user} = await getRaffleActorsAsync();

    const tokenId = '1';
    const quantity = '1';

    await raffleTicketInstance.mint(user, tokenId, quantity);

    expectBignumberEqual(
      await raffleTicketInstance.balanceOf(user, tokenId),
      quantity
    );
  });

  it('should revert if called by a non minter role', async () => {
    const [raffleTicketInstance] = await deployTicket();

    const {user} = await getRaffleActorsAsync();

    const tokenId = '1';
    const quantity = '1';

    await shouldFailWithMessage(
      raffleTicketInstance.mint(user, tokenId, quantity, {from: user}),
      'Only minter role'
    );

    expectBignumberEqual(
      await raffleTicketInstance.balanceOf(user, tokenId),
      0
    );
  });
});
