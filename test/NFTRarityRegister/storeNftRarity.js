const {deployRarityRegister, deployMockNftToken} = require('../helpers/deploy');
const {findEventInTransaction} = require('../../helpers/events');
const {expectBignumberEqual} = require('../../helpers');
const {shouldFailWithMessage} = require('../../helpers/utils');
const {ZERO_ADDRESS, getRaffleActorsAsync} = require('../../helpers/address');

contract('NFTRarityRegister: storeNftRarity', accounts => {
  it('should store rarity value', async () => {
    const [nftTokenInstance] = await deployMockNftToken(accounts);
    const [rarityRegisterInstance, {owner}] = await deployRarityRegister(accounts);

    const tokenId = '1';
    const rarity = '100';

    await nftTokenInstance.mint(owner, tokenId, {from: owner});
    expect(await nftTokenInstance.ownerOf(tokenId)).to.be.equal(owner);

    const storeTx = await rarityRegisterInstance.storeNftRarity(
      nftTokenInstance.address,
      tokenId,
      rarity
    );

    const {args} = await findEventInTransaction(storeTx, 'NftRarityStored');
    expect(args.tokenAddress).to.be.equal(nftTokenInstance.address);
    expectBignumberEqual(args.tokenId.toString(), tokenId);
    expectBignumberEqual(args.rarityValue.toString(), rarity);

    const rarityValue = await rarityRegisterInstance.getNftRarity(
      nftTokenInstance.address, tokenId,
      {from: owner}
    );
    expectBignumberEqual(rarityValue, rarity);
  });

  it('should revert if token address is zero address', async () => {
    const [rarityRegisterInstance, {owner}] = await deployRarityRegister(accounts);

    const tokenId = '1';
    const rarity = '100';

    await shouldFailWithMessage(
      rarityRegisterInstance.storeNftRarity(
        ZERO_ADDRESS,
        tokenId,
        rarity,
        {from: owner}
      ),
      'NFTRarityRegister: Token address is invalid'
    );
  });

  it('should store fail to update stored rarity value as rarity cannot be changed once set', async () => {
    const [nftTokenInstance] = await deployMockNftToken(accounts);
    const [rarityRegisterInstance, {owner}] = await deployRarityRegister(accounts);

    const tokenId = '1';
    const initialRarity = '100';
    const newRarity = '200';

    await nftTokenInstance.mint(owner, tokenId, {from: owner});
    expect(await nftTokenInstance.ownerOf(tokenId)).to.be.equal(owner);

    await rarityRegisterInstance.storeNftRarity(
      nftTokenInstance.address,
      tokenId,
      initialRarity
    );
    expectBignumberEqual(
      await rarityRegisterInstance.getNftRarity(nftTokenInstance.address, tokenId),
      initialRarity
    );

    await shouldFailWithMessage(
      rarityRegisterInstance.storeNftRarity(
        nftTokenInstance.address,
        tokenId,
        newRarity
      ),
      'NFTRarityRegister: Rarity already set for token'
    );
  });

  it('should allow only Owner to storeNftRarity', async () => {
    const [nftTokenInstance] = await deployMockNftToken(accounts);
    const [rarityRegisterInstance, {owner}] = await deployRarityRegister(accounts);

    const {user} = await getRaffleActorsAsync();

    const tokenId = '1';
    const rarity = '100';

    await nftTokenInstance.mint(user, tokenId, {from: owner});
    expect(await nftTokenInstance.ownerOf(tokenId)).to.be.equal(user);

    await shouldFailWithMessage(
      rarityRegisterInstance.storeNftRarity(
        nftTokenInstance.address,
        tokenId,
        rarity,
        {from: user}
      ),
      'Ownable: caller is not the owner'
    );
  });
});
