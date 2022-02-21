const {deployRaffle} = require('../helpers/deploy');

contract('Raffle: constructor', accounts => {
  it('should deploy correctly', async () => {
    const [raffleInstance, {raffleTicketInstance}] = await deployRaffle(accounts);

    const storedRaffleTicketAddress = await raffleInstance.RaffleTicket();

    expect(raffleInstance.address).to.not.be.equal(undefined);
    expect(raffleTicketInstance.address).to.be.equal(storedRaffleTicketAddress);
  });

  it('the deployer should be granted Owner role', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);

    const ownerRole = await raffleInstance.owner();

    expect(owner).to.be.equal(ownerRole);
  });
});
