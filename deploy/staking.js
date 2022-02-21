const {toWei} = require('../helpers/utils');
// const {numberToBytes32} = require('../test/helpers/bytes');

const forceRedeploy = false;

// for blocktimes: https://ethereum.stackexchange.com/questions/27048/comparison-of-the-different-testnets

const KOVAN_STAKING_LOCKS = [
  900, // Circa 1 hour at 4 seconds per block
  21600, // Circa 1 day at 4 seconds per block
  43200, // Circa 2 days at 4 seconds per block
  10 // a quick unlock for testing
];

const MAINNET_BLOCKS_IN_ONE_DAY = 5922;

// using 2017-18-19-20 average blocktime
const MAINNET_STAKING_LOCKS = [
  MAINNET_BLOCKS_IN_ONE_DAY * 30, // Circa 1 month
  MAINNET_BLOCKS_IN_ONE_DAY * 90, // Circa 3 months
  MAINNET_BLOCKS_IN_ONE_DAY * 180, // Circa 6 months
  MAINNET_BLOCKS_IN_ONE_DAY * 365 // Circa 12 months
];

const STAKING_LOCKS_MULTIPLIER = [
  100, // Index = 0
  150, // Index = 1
  200, // Index = 2
  300 // Index = 3
];

const MAINNET_0FIRST_YEAR_REWARD_PER_BLOCK = '11671771121237020990'; // about 25 MIL/year

// eslint-disable-next-line max-len
const DEFAULT_REWARDS_PER_BLOCK = [[MAINNET_0FIRST_YEAR_REWARD_PER_BLOCK, MAINNET_BLOCKS_IN_ONE_DAY * 365]];
const DEFAULT_TICKETS_MINTING_RATIO = toWei('5000', 'ether');
const DEFAULT_TICKETS_MINTING_CHILL_PERIOD = MAINNET_BLOCKS_IN_ONE_DAY * 30;

module.exports = async ({deployments, getChainId}) => {
  const chainId = await getChainId();

  console.log(`Deploying staking contracts inchain: ${chainId})...`);

  const {deploy, execute} = deployments;
  const [owner, alice] = await ethers.getSigners();

  const deployBurpToken = () => deploy('BurpERC20Token', {
    from: owner.address,
    log: true,
    skipIfAlreadyDeployed: !forceRedeploy,
    args: [
      'BURP',
      'BURP',
      toWei('500000000'),
      owner.address
    ]
  });

  const deployRarityRegister = () => deploy('NFTRarityRegister', {
    from: owner.address,
    args: [],
    log: true,
    skipIfAlreadyDeployed: !forceRedeploy
  });

  const deployTicket = () => deploy('RaffleTicket', {
    from: owner.address,
    args: ['https://example.com'],
    log: true,
    skipIfAlreadyDeployed: !forceRedeploy
  });

  const deployTokenHelperLib = () => deploy('TokenHelper', {
    from: owner.address,
    log: true,
    skipIfAlreadyDeployed: !forceRedeploy
  });

  const deployRewardStreamerLib = ({tokenHelperLibInstance}) => deploy('RewardStreamerLib', {
    from: owner.address,
    log: true,
    libraries: {
      TokenHelper: tokenHelperLibInstance.address
    },
    skipIfAlreadyDeployed: !forceRedeploy
  });

  const deployStakingLib = ({tokenHelperLibInstance, rewardStreamerLibInstance}) => deploy('StakingLib', {
    from: owner.address,
    log: true,
    libraries: {
      TokenHelper: tokenHelperLibInstance.address,
      RewardStreamerLib: rewardStreamerLibInstance.address
    },
    skipIfAlreadyDeployed: !forceRedeploy
  });

  const deployStaking = ({
    stakingLibInstance,
    rewardStreamerLibInstance,
    rarityRegisterInstance,

    burpTokenInstance,
    ticketInstance
  }) => deploy('Staking', {
    from: owner.address,
    log: true,
    proxy: {
      owner: owner.address,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        init: {
          methodName: 'initialize', // method to be executed when the proxy is deployed
          args: [
            burpTokenInstance.address,
            ticketInstance.address,
            chainId === 0 ? MAINNET_STAKING_LOCKS : KOVAN_STAKING_LOCKS,
            STAKING_LOCKS_MULTIPLIER,
            DEFAULT_TICKETS_MINTING_RATIO,
            chainId === 0 ? DEFAULT_TICKETS_MINTING_CHILL_PERIOD : 1,
            rarityRegisterInstance.address,
            owner.address
          ]
        }
      }
    },
    libraries: {
      StakingLib: stakingLibInstance.address,
      RewardStreamerLib: rewardStreamerLibInstance.address
    },
    skipIfAlreadyDeployed: !forceRedeploy
  });

  const burpTokenInstance = await deployBurpToken();
  const ticketInstance = await deployTicket();
  const rarityRegisterInstance = await deployRarityRegister();
  const tokenHelperLibInstance = await deployTokenHelperLib();
  const rewardStreamerLibInstance = await deployRewardStreamerLib({tokenHelperLibInstance});
  const stakingLibInstance = await deployStakingLib({
    tokenHelperLibInstance,
    rewardStreamerLibInstance
  });

  const stakingInstance = await deployStaking({
    burpTokenInstance,
    ticketInstance,
    rarityRegisterInstance,

    stakingLibInstance,
    rewardStreamerLibInstance
  });

  await execute(
    'RaffleTicket',
    {from: owner.address, log: true},
    'addMinter',
    '0x3BB4Def1f518dd4a36A2cc3CBEA00b1a4345598f'
  )

  if(stakingInstance.newlyDeployed) {
    await execute(
      'BurpERC20Token',
      {from: owner.address, log: true},
      'approve',
      stakingInstance.address, toWei('300000000', 'ether')
    );

    await Promise.all(
      DEFAULT_REWARDS_PER_BLOCK
        .map(([rewPerBlock, endReward]) => execute(
          'Staking',
          {from: owner.address, log: true},
          'addRewardStream',
          0, rewPerBlock, endReward + stakingInstance.receipt.blockNumber
        ))
    );
  }

  // await execute(
  //   'Staking',
  //   {from: owner.address, log: true},
  //   'addLockDuration',
  //   1, 1
  // );

  await execute(
    'BurpERC20Token',
    {from: owner.address, log: true},
    'transfer',
    alice.address, toWei('10000000', 'ether')
  );

  await execute(
    'BurpERC20Token',
    {from: alice.address, log: true},
    'approve',
    stakingInstance.address, toWei('1000000', 'ether')
  );

  await execute(
    'Staking',
    {from: alice.address, log: true},
    'stake',
    toWei('1000', 'ether'),
    numberToBytes32(0)
  );

  const aliceStake = await read( // make a read-only call to a contract
    'Staking',
    {},
    'userStakes',
    alice.address, 0
  );

  await execute(
    'Staking',
    {from: alice.address, log: true},
    'unstake',
    toWei('1000', 'ether'), numberToBytes32(0)
  );

  console.log({aliceStake: aliceStake.stakingUnits.toString()});
};

module.exports.tags = ['Staking'];
