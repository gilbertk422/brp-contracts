const {expectBignumberEqual} = require('../../helpers');
const {toWei, toBN} = require('../../helpers/utils');
const {deployStaking} = require('../helpers/deploy');

contract('Stake: constructor', () => {
  it('should deploy correctly the Staking contract', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking({skipMinting: true});

    const rewardTokenAddress = await stakingInstance.rewardToken.call();
    const historyStartBlock = await stakingInstance.historyStartBlock.call();
    const historyEndBlock = await stakingInstance.historyEndBlock.call();

    expect(rewardTokenAddress).to.equal(mockRewardInstance.address);
    expectBignumberEqual(historyEndBlock, historyStartBlock);
  });

  it('should add the Owner as default staker with stake of 1', async () => {
    const [stakingInstance, {owner}] = await deployStaking();
    const contractDeployBlock = await stakingInstance.historyStartBlock();

    const ownerStake = await stakingInstance.userStakes(owner, 0);
    expect(ownerStake.amountStaked.toString()).to.equal(toWei('1', 'ether'));
    expect(ownerStake.historyAverageRewardWhenEntered.toString()).to.equal('0');
    expectBignumberEqual(
      ownerStake.enteredAtBlock,
      contractDeployBlock.add(toBN(1))
    );
  });
});
