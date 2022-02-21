const {deployTicket} = require('../helpers/deploy');

contract('RaffleTicket: constructor', () => {
  it('should deploy correcly', async () => {
    const [mockTicketInstance] = await deployTicket();

    expect(mockTicketInstance.address).to.not.be.equal(undefined);
  });
});
