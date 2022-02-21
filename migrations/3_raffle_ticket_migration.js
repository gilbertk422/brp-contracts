const MockTicket = artifacts.require('./MockTicket.sol');

module.exports = deployer => {
  deployer.deploy(MockTicket, 'RaffleTicket', 'RFT').then(() => {
  });
};
