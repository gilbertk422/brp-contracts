const {expectBignumberEqual} = require('../../helpers');
const {toWei, toBN} = require('../../helpers/utils');
const {deployStaking, deployStakingLib} = require('../helpers/deploy');

contract('Stake: upgradable contract', () => {
  it('should be an upgradable contract', async () => {
    const [stakingInstance, {owner}] = await deployStaking();
    const contractDeployBlock = await stakingInstance.historyStartBlock();

    const [stakingLibInstance, {rewardStreamerLibInstance}] = await deployStakingLib();

    const MockStakingV2 = await ethers.getContractFactory('MockStakingV2', {
      libraries: {
        StakingLib: stakingLibInstance.address,
        RewardStreamerLib: rewardStreamerLibInstance.address
      }
    });
    const upgraded = await upgrades
      .upgradeProxy(stakingInstance.address, MockStakingV2, {unsafeAllowLinkedLibraries: true});

    const number = 111;

    const echo = await upgraded.echo(number);
    expectBignumberEqual(
      echo,
      number
    );

    const ownerStake = await upgraded.userStakes(owner, 0);
    expect(ownerStake.amountStaked.toString()).to.equal(toWei('1', 'ether'));
    expect(ownerStake.historyAverageRewardWhenEntered.toString()).to.equal('0');
    expectBignumberEqual(
      ownerStake.enteredAtBlock,
      contractDeployBlock.add(toBN(1))
    );
  });
});
