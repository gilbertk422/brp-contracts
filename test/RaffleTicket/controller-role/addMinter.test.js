const {deployTicket} = require('../../helpers/deploy');
const {findEvent} = require('../../../helpers/events');
const {shouldFailWithMessage} = require('../../../helpers/utils');
const {getRaffleActorsAsync} = require('../../../helpers/address');

contract('Ticket: addMinter', () => {
  it('should add the given account to the list of minter', async () => {
    const [ticketInstance, {owner}] = await deployTicket();

    const {user} = await getRaffleActorsAsync();

    await ticketInstance.addMinter(
      user,
      {from: owner}
    );

    const isMinter = await ticketInstance.isMinter(user);
    expect(isMinter).to.equal(true);
  });

  it('should emit MinterAdded event', async () => {
    const [ticketInstance, {owner}] = await deployTicket();
    const {user} = await getRaffleActorsAsync();

    const {receipt: {logs}} = await ticketInstance.addMinter(
      user,
      {from: owner}
    );
    const {args} = findEvent(logs, 'MinterAdded');

    expect(args.account).to.equal(user);
    expect(args.minterOf).to.equal('BURP_RAFFLE_TICKET');
  });

  it('should revert if called by someone who does not have the Minter Role', async () => {
    const [ticketInstance] = await deployTicket();
    const {user} = await getRaffleActorsAsync();

    // someone without the minter role trying to add himself
    await shouldFailWithMessage(
      ticketInstance.addMinter(
        user,
        {from: user}
      ),
      'Only minter role'
    );
  });
});
