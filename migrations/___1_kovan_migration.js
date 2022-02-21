const MockTicket = artifacts.require('MockTicket');
const Raffle = artifacts.require('Raffle');
const Staking = artifacts.require('Staking');

module.exports = async (deployer, _, accounts) => {
  const [owner] = accounts;
  // 1. Deploy RaffleTicket using the Owner address
  deployer.deploy(MockTicket, 'MockTicket', 'MKT', {from: owner})
    .then(async raffleTicketInstance => {
    // 2. Deploy passing the RaffleTicket address and the Chainlink parameters
      const raffleParams = [
        raffleTicketInstance.address,
        '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4', // keyhash for Kovan
        '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9', // VRF Coordinator for Kovan
        '0xa36085f69e2889c224210f603d836748e7dc0088' // LINK token on Kovan
      ];
      const raffleInstance = await deployer.deploy(Raffle, ...raffleParams, {from: owner});

      // 3. In the RaffleTicket, call the method setRaffleAddress to setup unlimited approval
      await raffleTicketInstance.setRaffleAddress(raffleInstance.address, {from: owner});

      // 4. The Owner transfers the ownership of the RaffleTicket to the Staking contract
      // so that it can mint Tickets.
      const stakingInstance = await deployer.deploy(Staking, {from: owner});
      await raffleTicketInstance.transferOwnership(stakingInstance.address, {from: owner});
    });
};
