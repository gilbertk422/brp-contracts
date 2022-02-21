const {expect} = require('chai');
const {deployRarityRegister, deployMockNftToken} = require('../helpers/deploy');
const {ZERO_ADDRESS} = require('../../helpers/address');

contract('NFTRarityRegister: constructor', accounts => {
  it('should deploy correctly', async () => {
    const [nftTokenInstance] = await deployMockNftToken(accounts);
    const [rarityRegisterInstance, {owner}] = await deployRarityRegister(accounts);

    expect(rarityRegisterInstance.address).to.not.be.equal(undefined);
    expect(rarityRegisterInstance.address).to.not.be.equal(ZERO_ADDRESS);

    expect(nftTokenInstance.address).to.not.be.equal(undefined);
    expect(nftTokenInstance.address).to.not.be.equal(ZERO_ADDRESS);

    expect(owner).to.not.be.equal(undefined);
    expect(await rarityRegisterInstance.owner()).to.be.equal(owner);
  });
});
