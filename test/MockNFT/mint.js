const {deployMockNftToken} = require('../helpers/deploy');
const {getRaffleActors} = require('../../helpers/address');
const {toBN} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');

contract('MockNftToken: mint', accounts => {
  it('should mint new nft token for user', async () => {
    const [mockNftInstance] = await deployMockNftToken(accounts);

    const {owner, user} = getRaffleActors(accounts);

    const tokenId = '1';

    await mockNftInstance.mint(user, tokenId, {from: owner});

    expect(await mockNftInstance.ownerOf(tokenId)).to.be.equal(user);
    expectBignumberEqual(await mockNftInstance.balanceOf(user), toBN(1));
  });
});
