const {deployStaking} = require('../helpers/deploy');

contract('Stake: token', () => {
  it('should return the address of the reward token', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const tokenResult = await stakingInstance.token();

    expect(tokenResult).to.equal(mockRewardInstance.address);
  });
});
