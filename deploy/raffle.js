/* eslint-disable no-case-declarations */
const {
  toBN,
  duration,
  latest,
  soliditySha3,
  increase,
  toWei
} = require('../helpers/utils');

const forceRedeploy = true;

const HARDHAT_CHAIN_ID = '31337';

module.exports = async ({deployments, getChainId}) => {
  const chainId = await getChainId();

  const {deploy, execute} = deployments;
  const [owner, alice] = await ethers.getSigners();

  const getChainlinkValues = async () => {
    switch(chainId) {
      case 0:
        return {
          LINK_ADDRESS: 'chainlink mainnet',
          LINK_VRF_COORDINATOR: 'chainlink mainnet',
          LINK_KEY_HASH: 'chainlink mainnet'
        };

      case 42:
        return {
          LINK_ADDRESS: '0xa36085f69e2889c224210f603d836748e7dc0088',
          LINK_VRF_COORDINATOR: '0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9',
          LINK_KEY_HASH: '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'
        };

      case HARDHAT_CHAIN_ID:
        const linkTokenInstance = await deploy('LinkToken', {
          from: owner.address,
          log: true,
          skipIfAlreadyDeployed: !forceRedeploy
        });

        const linkVrfCoordinatorInstance = await deploy('VRFCoordinator', {
          from: owner.address,
          log: true,
          args: [linkTokenInstance.address],
          skipIfAlreadyDeployed: !forceRedeploy
        });

        return {
          LINK_ADDRESS: linkTokenInstance.address,
          LINK_VRF_COORDINATOR: linkVrfCoordinatorInstance.address,
          LINK_KEY_HASH: '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'
        };

      default:
        throw new Error(`Unknown chainId: ${chainId}`);
    }
  };

  const deployTicket = () => deploy('RaffleTicket', {
    from: owner.address,
    args: ['https://example.com'],
    log: true,
    skipIfAlreadyDeployed: !forceRedeploy
  });

  const deployMockERC721Token = () => deploy('MockERC721Token', {
    from: owner.address,
    log: true,
    args: ['MockPrize', 'PRZ'],
    skipIfAlreadyDeployed: !forceRedeploy
  });

  const {
    LINK_ADDRESS,
    LINK_VRF_COORDINATOR,
    LINK_KEY_HASH
  } = await getChainlinkValues();

  const deployRaffle = ({raffleTicketInstance}) => deploy('Raffle', {
    from: owner.address,
    args: [
      raffleTicketInstance.address,
      LINK_KEY_HASH, // keyhash for Kovan
      LINK_VRF_COORDINATOR, // VRF Coordinator for Kovan
      LINK_ADDRESS // LINK token on Kovan
    ],
    log: true,
    skipIfAlreadyDeployed: !forceRedeploy
  });

  const raffleTicketInstance = await deployTicket();
  const mockERC721TokenInstance = await deployMockERC721Token();
  const raffleInstance = await deployRaffle({raffleTicketInstance});

  if(chainId === HARDHAT_CHAIN_ID) {
    await execute(
      'LinkToken',
      {from: owner.address, log: true},
      'transfer',
      raffleInstance.address, toWei('1000')
    );
  }

  if(raffleInstance.newlyDeployed) {
    await execute(
      'MockERC721Token',
      {from: owner.address, log: true},
      'mint',
      owner.address, '1'
    );
    await execute(
      'MockERC721Token',
      {from: owner.address, log: true},
      'approve',
      raffleInstance.address, '1'
    );

    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    await execute(
      'Raffle',
      {from: owner.address, log: true},
      'startRaffle',
      startDate.toString(), endDate.toString()
    );

    await execute(
      'Raffle',
      {from: owner.address, log: true},
      'addPrize',
      0, mockERC721TokenInstance.address, '1'
    );

    await execute(
      'RaffleTicket',
      {from: owner.address, log: true},
      'mint',
      alice.address, '0', '10'
    );

    await execute(
      'RaffleTicket',
      {from: alice.address, log: true},
      'setApprovalForAll',
      raffleInstance.address, true
    );

    await new Promise(res => setTimeout(() => res(), 10000));

    await execute(
      'Raffle',
      {from: alice.address, log: true},
      'enterGame',
      '0', '1'
    );

    // if(chainId === HARDHAT_CHAIN_ID) { // hardhat network
    //   console.log('Increasing');
    //   await increase(100000);
    // }
    // else {
    //   console.log('Awaiting...');
    // }

    // await execute(
    //   'Raffle',
    //   {from: owner.address, log: true},
    //   'draftWinners',
    //   0, soliditySha3('entropy')
    // );

    // await execute(
    //   'Raffle',
    //   {from: alice.address, log: true},
    //   'claimPrize',
    //   0, 0
    // );
  }
};

module.exports.tags = ['Raffle'];
