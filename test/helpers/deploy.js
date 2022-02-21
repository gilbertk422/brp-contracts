const LinkToken = artifacts.require('LinkToken');
const VRFCoordinator = artifacts.require('VRFCoordinator');
const Raffle = artifacts.require('Raffle');
const Staking = artifacts.require('Staking');
const BurpERC20Token = artifacts.require('BurpERC20Token');
const StakingReward = artifacts.require('MockStakingReward');
const MockReward = artifacts.require('MockReward');
const RaffleTicket = artifacts.require('RaffleTicket');
const NFTRarityRegister = artifacts.require('NFTRarityRegister');
const MockERC721Token = artifacts.require('MockERC721Token');

const {toWei} = require('../../helpers/utils');
const {getRaffleActorsAsync, getStakeActorsAsync, getBurpTokenActorsAsync} = require('../../helpers/address');
const {numberToBytes32} = require('./bytes');

const {parseEther} = ethers.utils;

const deployBurpToken = async (options = {}) => {
  const {
    name = 'Burp Test',
    symbol = 'BT',
    tokenSupply = parseEther('100')
  } = options;

  const {
    owner
  } = await getBurpTokenActorsAsync();

  const burpToken = await BurpERC20Token.new(
    name,
    symbol,
    tokenSupply,
    owner
  );

  return [burpToken, {owner}];
};

const deployMockNftToken = async () => {
  const {owner} = await getStakeActorsAsync();
  const nftTokenInstance = await MockERC721Token.new('NFT Token', 'NFT', {from: owner});

  return [nftTokenInstance, {owner}];
};

const deployMockPrize = async () => {
  const {owner} = await getRaffleActorsAsync();
  const mockPrizeInstance = await MockERC721Token.new('MockPrize', 'PRZ', {from: owner});

  return [mockPrizeInstance, {owner}];
};

const deployTicket = async () => {
  const {owner} = await getRaffleActorsAsync();
  const ticketInstance = await RaffleTicket.new('https://example.com', {from: owner});

  return [ticketInstance, {owner}];
};

const deployLinkToken = async () => {
  const {owner} = await getRaffleActorsAsync();
  const deployLinkTokenInstance = await LinkToken.new({from: owner});

  return [deployLinkTokenInstance, {owner}];
};

const deployRarityRegister = async () => {
  const {owner} = await getRaffleActorsAsync();

  const RarityRegisterInstance = await NFTRarityRegister.new({from: owner});

  return [RarityRegisterInstance, {owner}];
};

const deployVRFCoordinator = async (options = {}) => {
  let {linkTokenInstance} = options;

  if(!linkTokenInstance) {
    [linkTokenInstance] = await deployLinkToken();
  }

  const {owner} = await getRaffleActorsAsync();

  const VRFCoordinatorInstance = await VRFCoordinator.new(linkTokenInstance.address, {from: owner});

  return [VRFCoordinatorInstance, {owner, linkTokenInstance}];
};

const deployRaffleContract = async ({
  owner,
  ticketInstance
}) => {
  const [linkTokenInstance, {owner: mockLinkTokenOwner}] = await deployLinkToken();
  const [VRFCoordinatorInstance] = await deployVRFCoordinator({linkTokenInstance});
  const raffleParams = [
    ticketInstance.address,
    '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4',
    VRFCoordinatorInstance.address,
    linkTokenInstance.address
  ];
  const raffleInstance = await Raffle.new(...raffleParams, {from: owner});

  const ownerBalance = await linkTokenInstance.balanceOf(mockLinkTokenOwner);
  await linkTokenInstance
    .transfer(raffleInstance.address, ownerBalance, {from: mockLinkTokenOwner});

  return [
    raffleInstance,
    {
      mockLinkTokenOwner,
      linkTokenInstance,
      VRFCoordinatorInstance
    }
  ];
};

const deployRaffle = async () => {
  const {owner} = await getRaffleActorsAsync();
  const [ticketInstance] = await deployTicket();
  const [mockPrizeInstance] = await deployMockPrize();
  const [
    raffleInstance,
    {
      mockLinkTokenOwner,
      linkTokenInstance,
      VRFCoordinatorInstance
    }
  ] = await deployRaffleContract({
    owner,
    ticketInstance
  });

  return [
    raffleInstance,
    {
      raffleTicketInstance: ticketInstance,
      rafflePrizeInstance: mockPrizeInstance,
      owner,
      mockLinkTokenOwner,
      linkTokenInstance,
      VRFCoordinatorInstance
    }
  ];
};

const deployMockReward = async () => {
  const {owner} = await getRaffleActorsAsync();
  const mockRewardInstance = await MockReward.new({from: owner});

  return [mockRewardInstance, {owner}];
};

const deployStakingLib = async () => {
  const tokenHelperLib = await ethers.getContractFactory('TokenHelper');
  const tokenHelperLibInstance = await tokenHelperLib.deploy();
  const rewardStreamerLib = await ethers.getContractFactory('RewardStreamerLib', {
    libraries: {
      TokenHelper: tokenHelperLibInstance.address
    }
  });
  const rewardStreamerLibInstance = await rewardStreamerLib.deploy();
  const stakingLib = await ethers.getContractFactory('StakingLib', {
    libraries: {
      TokenHelper: tokenHelperLibInstance.address,
      RewardStreamerLib: rewardStreamerLibInstance.address
    }
  });
  const stakingLibInstance = await stakingLib.deploy();

  return [stakingLibInstance, {tokenHelperLibInstance, rewardStreamerLibInstance}];
};

const deployStakingReward = async () => {
  const {owner} = await getRaffleActorsAsync();
  const [mockRewardInstance] = await deployMockReward();

  await mockRewardInstance.mint(owner, toWei('10000', 'ether'));

  const [_, {rewardStreamerLibInstance}] = await deployStakingLib();
  const ethersStakingReward = await ethers.getContractFactory('MockStakingReward', {
    libraries: {
      RewardStreamerLib: rewardStreamerLibInstance.address
    }
  });
  const ethersStakingRewardInstance = await ethersStakingReward.deploy(mockRewardInstance.address);

  const stakingRewardInstance = await StakingReward
    .at(ethersStakingRewardInstance.address);

  const deployedAtBlock = await web3.eth.getBlockNumber();

  return [stakingRewardInstance, {owner, mockRewardInstance, deployedAtBlock}];
};

// For testing on deployment we will use the correct values
// 175200; // blocks in one month
// 2102400; // blocks in one year
// 4204800 // blocks in two years
// 8409600 // blocks in four month
const STAKING_LOCKS = [
  10, // Index = 0
  100, // Index = 1
  1000, // Index = 2
  5000, // Index = 3,
  1 // Index 4
];

const STAKING_LOCKS_MULTIPLIER = [
  100, // Index = 0
  150, // Index = 1
  200, // Index = 2
  300, // Index = 3
  100 //  Index = 4
];

const DEFAULT_REWARDS_PER_BLOCK = [[toWei('10'), 100]];
const DEFAULT_TICKETS_MINTING_RATIO = toWei('100', 'ether');

const deployStaking = async (opts = {}) => {
  const {
    owner = (await getRaffleActorsAsync()).owner,
    mockRewardInstance = (await deployMockReward())[0],
    ticketInstance = (await deployTicket())[0],
    skipMinting,
    skipAddLockDuration,
    skipAddRewardStreams,
    stakingLocks = STAKING_LOCKS,
    stakingLocksMultiplier = STAKING_LOCKS_MULTIPLIER,
    ticketMintingRatio = DEFAULT_TICKETS_MINTING_RATIO,
    ticketMintingChillPeriod = 1
  } = opts;

  const [rarityRegisterInstance] = await deployRarityRegister();

  const [stakingLibInstance, {rewardStreamerLibInstance}] = await deployStakingLib();
  const staking = await ethers.getContractFactory('Staking', {
    libraries: {
      StakingLib: stakingLibInstance.address,
      RewardStreamerLib: rewardStreamerLibInstance.address
    }
  });

  await upgrades.silenceWarnings();
  // eslint-disable-next-line no-underscore-dangle
  const _stakingInstance = await upgrades.deployProxy(staking, [
    mockRewardInstance.address,
    ticketInstance.address,
    stakingLocks,
    stakingLocksMultiplier,
    ticketMintingRatio,
    ticketMintingChillPeriod,
    rarityRegisterInstance.address,
    owner
  ], {
    initializer: 'initialize',
    unsafeAllowLinkedLibraries: true
  });

  const stakingInstance = await Staking.at(_stakingInstance.address);

  const deployedAtBlock = await web3.eth.getBlockNumber();

  await ticketInstance.addMinter(stakingInstance.address, {from: owner});

  if(!skipMinting) {
    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});
    await mockRewardInstance
      .approve(stakingInstance.address, toWei('1000000', 'ether'), {from: owner});

    if(!skipAddRewardStreams) {
      await Promise.all(
        DEFAULT_REWARDS_PER_BLOCK
          .map(([rewPerBlock, endReward]) => stakingInstance
            .addRewardStream(0, rewPerBlock, endReward + deployedAtBlock))
      );
    }
  }
  if(!skipAddLockDuration) {
    await stakingInstance.addLockDuration(1, 1, {from: owner});
  }

  const currentBlock = await web3.eth.getBlockNumber();

  const blocksDelta = currentBlock - deployedAtBlock;

  return [
    stakingInstance,
    {
      blocksDelta, // helpful for testing how many blocks elapsed already
      owner,
      deployedAtBlock,
      mockRewardInstance,
      ticketInstance,
      rarityRegisterInstance,
      NO_LOCK_INDEX: numberToBytes32(4),
      stakingLocks,
      stakingLocksMultiplier,
      ticketMintingRatio
    }
  ];
};

// As truffle contracts do not work fully to test some behaviours (e.g.
// when we want to include multiple tx in a single block), we can use the ethers coounterpart
// to deploy a contract. Eventually, all test contracts will be deployed usign ethers js.
const deployEthersStakingInstance = async (opts = {}) => {
  // // we can reuse other parts from truffle
  const [stakingInstance, ...rest] = await deployStaking(opts);

  const ethersStakingInstance = await ethers.getContractAt('Staking', stakingInstance.address);

  return [ethersStakingInstance, ...rest];
};

module.exports = {
  deployStaking,
  deployMockNftToken,
  deployRarityRegister,
  deployRaffle,
  deployMockPrize,
  deployBurpToken,
  deployLinkToken,
  deployStakingLib,
  STAKING_LOCKS,
  deployStakingReward,
  deployEthersStakingInstance,
  deployTicket,
  deployMockReward,
  deployVRFCoordinator,
  deployRaffleContract
};
