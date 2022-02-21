const {deployTicket} = require('../../helpers/deploy');

contract('MinterRole: ctor', () => {
  it('should set the type of the minter', async () => {
    const [ticketInstance] = await deployTicket();

    const minterOf = await ticketInstance.minterOf();
    expect(minterOf).to.equal('BURP_RAFFLE_TICKET');
  });

  it('should add the msg.sender account into the list of minters', async () => {
    const [ticketInstance, {owner}] = await deployTicket();

    const isMinter = await ticketInstance.isMinter(owner);
    expect(isMinter).to.equal(true);
  });
});
