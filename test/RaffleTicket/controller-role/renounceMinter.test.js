const {deployTicket} = require('../../helpers/deploy');
const {findEvent} = require('../../../helpers/events');
const {getRaffleActorsAsync} = require('../../../helpers/address');

contract('MinterRole: renounceMinter', () => {
  it('should remove the given account from the minter role', async () => {
    const [ticketInstance, {owner}] = await deployTicket();
    const {user} = await getRaffleActorsAsync();

    await ticketInstance.addMinter(user, {from: owner});
    expect(await ticketInstance.isMinter(user)).to.equal(true);

    await ticketInstance.renounceMinter({from: user});

    expect(await ticketInstance.isMinter(user)).to.equal(false);
  });

  it('should emit MinterRemoved event', async () => {
    const [ticketInstance, {owner}] = await deployTicket();
    const {user} = await getRaffleActorsAsync();

    await ticketInstance.addMinter(user, {from: owner});
    const {receipt: {logs}} = await ticketInstance.renounceMinter({from: user});

    const {args} = findEvent(logs, 'MinterRemoved');

    expect(args.account).to.equal(user);
    expect(args.minterOf).to.equal('BURP_RAFFLE_TICKET');
  });
});
