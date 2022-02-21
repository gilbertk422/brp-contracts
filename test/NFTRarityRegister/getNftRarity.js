const {deployRarityRegister, deployMockNftToken} = require('../helpers/deploy');
const {expectBignumberEqual} = require('../../helpers/index');

contract('NFTRarityRegister: getNftRarity', accounts => {
  it('should retrive correct rarity value', async () => {
    const [nftTokenInstance] = await deployMockNftToken(accounts);
    const [rarityRegisterInstance, {owner}] = await deployRarityRegister(accounts);

    const tokenId = '1';
    const rarity = '100';

    await nftTokenInstance.mint(owner, tokenId, {from: owner});
    expect(await nftTokenInstance.ownerOf(tokenId)).to.be.equal(owner);

    await rarityRegisterInstance.storeNftRarity(
      nftTokenInstance.address,
      tokenId,
      rarity,
      {from: owner}
    );
    expectBignumberEqual(
      await rarityRegisterInstance.getNftRarity(nftTokenInstance.address, tokenId),
      rarity
    );
  });

  it('should return zero rarity if non-existent token address and id are passed', async () => {
    const [nftTokenInstance] = await deployMockNftToken(accounts);
    const [rarityRegisterInstance] = await deployRarityRegister(accounts);

    expectBignumberEqual(
      await rarityRegisterInstance.getNftRarity(nftTokenInstance.address, '5'),
      0
    );
  });
});
