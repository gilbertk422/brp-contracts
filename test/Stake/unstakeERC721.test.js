const {deployStaking, deployMockNftToken} = require('../helpers/deploy');
const {tokenBalanceDeltaAfterAction, topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {
  shouldFailWithMessage,
  toWei,
  toBN,
  advanceBlock
} = require('../../helpers/utils');
const {numberToBytes32, createCallData} = require('../helpers/bytes');
const {expectBignumberEqual, expect} = require('../../helpers');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

contract('Stake: unstakeERC721', accounts => {
  it('should return the correct NFT token', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 200);
    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    await stakingInstance
      .stake(stakeAmount, createCallData(4, mockNftInstance.address, 1), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    await shouldFailWithMessage(
      stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice}),
      'Staking: Stake is still locked'
    );

    const tokenId = 1;
    const {address: tokenAddress} = mockNftInstance;

    // we prevent the contract from transfering NFTs
    await mockNftInstance.pause({from: owner});

    await advanceBlock();
    await advanceBlock();

    const balanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    // the token is still owned by Staking
    expect(stakingInstance.address).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    expectBignumberEqual(
      balanceDelta,
      stakeAmount.add(toBN(toWei('49.751243781094527363')))
    );

    const {
      tokenAddress: storedTokenAddress,
      tokenId: storedTokenId
    } = await stakingInstance.userStakedTokens(alice, stakeIndex);

    expect(storedTokenAddress).to.be.equal(tokenAddress);
    expectBignumberEqual(storedTokenId, tokenId);

    expect(stakingInstance.address).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    // we allow again NFT transfers
    await mockNftInstance.unpause({from: owner});

    await stakingInstance.unstakeERC721(numberToBytes32(stakeIndex), {from: alice});
    expect(alice).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    const userStakedToken = await stakingInstance.userStakedTokens(alice, stakeIndex);
    expect(userStakedToken.tokenAddress).to.be.equal(ZERO_ADDRESS);
    expect(userStakedToken.tokenId).to.be.equal('0');
  });

  it('should do nothing if NFT token cannot still be moved', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 200);
    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    await stakingInstance
      .stake(stakeAmount, createCallData(4, mockNftInstance.address, 1), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    await shouldFailWithMessage(
      stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice}),
      'Staking: Stake is still locked'
    );

    const tokenId = 1;
    const {address: tokenAddress} = mockNftInstance;

    // we prevent the contract from transfering NFTs
    await mockNftInstance.pause({from: owner});

    await advanceBlock();
    await advanceBlock();

    const balanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    // the token is still owned by Staking
    expect(stakingInstance.address).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    expectBignumberEqual(
      balanceDelta,
      stakeAmount.add(toBN(toWei('49.751243781094527363')))
    );

    const {
      tokenAddress: storedTokenAddress,
      tokenId: storedTokenId
    } = await stakingInstance.userStakedTokens(alice, stakeIndex);

    expect(storedTokenAddress).to.be.equal(tokenAddress);
    expectBignumberEqual(storedTokenId, tokenId);

    expect(stakingInstance.address).to.be.equal(await mockNftInstance.ownerOf(tokenId));
    
    await stakingInstance.unstakeERC721(numberToBytes32(stakeIndex), {from: alice});
    
    expect(stakingInstance.address).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    const userStakedToken = await stakingInstance.userStakedTokens(alice, stakeIndex);
    expect(userStakedToken.tokenAddress).to.be.equal(mockNftInstance.address);
    expect(userStakedToken.tokenId).to.be.equal('1');
  });

  it('should not allow if stake is still locked', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 200);
    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(0), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    const tokenId = 1;
    const {address: tokenAddress} = mockNftInstance;

    await stakingInstance
      .addNftToStake(alice, stakeIndex, tokenAddress, tokenId, {from: alice});

    await shouldFailWithMessage(
      stakingInstance
        .unstakeERC721(numberToBytes32(stakeIndex), {from: alice}),
      'Staking: Stake is still locked'
    );
  });

  it('should do nothing if no NFT exists', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    await shouldFailWithMessage(
      stakingInstance
        .unstakeERC721(numberToBytes32(stakeIndex), {from: alice}),
      'Staking: Stake is still locked'
    );

    await stakingInstance
      .unstake(1, numberToBytes32(stakeIndex), {from: alice});

    await stakingInstance.unstakeERC721(numberToBytes32(stakeIndex), {from: alice});
  });
});
