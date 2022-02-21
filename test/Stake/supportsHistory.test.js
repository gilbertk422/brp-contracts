const {deployStaking} = require('../helpers/deploy');

contract('Stake: supportsHistory', () => {
  it('should return false', async () => {
    const [stakingInstance] = await deployStaking();

    const supportsHistory = await stakingInstance.supportsHistory();

    expect(supportsHistory).to.equal(false);
  });
});
