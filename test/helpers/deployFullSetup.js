const {getRaffleActorsAsync, getRaffleActors} = require('../../helpers/address');
const {
  deployMockPrize,
  deployTicket,
  deployMockReward,
  deployStaking,
  deployRaffleContract
} = require('./deploy');

const deploySetup = async accounts => {
  const {owner} = await getRaffleActorsAsync();
  const {user: alice} = getRaffleActors(accounts, 1);
  const {user: bob} = getRaffleActors(accounts, 2);
  const {user: anna} = getRaffleActors(accounts, 3);

  const [mockPrizeInstance] = await deployMockPrize();
  const [ticketInstance] = await deployTicket();
  const [mockRewardInstance] = await deployMockReward();

  const [
    raffleInstance,
    {
      VRFCoordinatorInstance
    }
  ] = await deployRaffleContract({owner, ticketInstance});
  const [
    stakingInstance,
    {
      rarityRegisterInstance
    }
  ] = await deployStaking({owner, mockRewardInstance, ticketInstance});

  return {
    raffleInstance,
    stakingInstance,
    mockPrizeInstance,
    ticketInstance,
    mockRewardInstance,
    VRFCoordinatorInstance,
    rarityRegisterInstance,
    actors: {
      owner,
      alice,
      bob,
      anna
    }
  };
};

module.exports = {
  deploySetup
};
