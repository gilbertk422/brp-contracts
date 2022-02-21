const {deployTicket} = require('../../helpers/deploy');
const {findEvent} = require('../../../helpers/events');
const {shouldFailWithMessage} = require('../../../helpers/utils');
const {getRaffleActorsAsync} = require('../../../helpers/address');

contract('Ticket:MinterRole: removeMinter', () => {
  it('should remove the given account from the list of minters', async () => {
    const [ticketInstance, {owner}] = await deployTicket();

    const {user} = await getRaffleActorsAsync();

    await ticketInstance.addMinter(user, {from: owner});

    let isMinter;
    isMinter = await ticketInstance.isMinter(user);
    expect(isMinter).to.equal(true);

    await ticketInstance.removeMinter(user, {from: owner});

    isMinter = await ticketInstance.isMinter(user);
    expect(isMinter).to.equal(false);
  });

  it('should emit MinterRemoved event', async () => {
    const [ticketInstance, {owner}] = await deployTicket();

    const {user} = await getRaffleActorsAsync();

    await ticketInstance.addMinter(user, {from: owner});

    const {
      receipt: {logs}
    } = await ticketInstance.removeMinter(user, {from: owner});

    const {args} = findEvent(logs, 'MinterRemoved');

    expect(args.account).to.equal(user);
    expect(args.minterOf).to.equal('BURP_RAFFLE_TICKET');
  });

  it('should revert if msg.sender is not Owner', async () => {
    const [ticketInstance, {owner}] = await deployTicket();

    const {user} = await getRaffleActorsAsync();

    await shouldFailWithMessage(
      ticketInstance.removeMinter(owner, {from: user}),
      `AccessControl: account ${user.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
    );
  });
});
