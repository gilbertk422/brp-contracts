const {deployBurpToken} = require('../helpers/deploy');

contract('BurpToken: constructor', accounts => {
  it('should deploy correctly', async () => {
    const [burpTokenInstance] = await deployBurpToken(accounts);

    expect(burpTokenInstance.address).to.not.be.equal(undefined);
  });

  it('should send all supply to Owner', async () => {
    const [burpTokenInstance, {owner}] = await deployBurpToken({tokenSupply: 300});

    const ownerBalance = await burpTokenInstance.balanceOf(owner);

    expect(ownerBalance).to.not.be.equal(300);
  });

  it('should not implement a mint method', async () => {
    const [burpTokenInstance] = await deployBurpToken();

    expect(burpTokenInstance.mint).to.be.equal(undefined);
  });
});
