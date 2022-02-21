const {deployStaking, deployEthersStakingInstance, deployMockNftToken} = require('../helpers/deploy');
const {getExpectedNextHistoryAverageRewardAfterEvent} = require('../helpers/staking');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors, ZERO_ADDRESS} = require('../../helpers/address');
const {
  shouldFailWithMessage,
  toWei,
  toBN,
  advanceBlock
} = require('../../helpers/utils');
const {numberToBytes32} = require('../helpers/bytes');
const {expectBignumberEqual} = require('../../helpers');
const {batchTransactionsInBlock} = require('../helpers/network');

contract('Stake: addNftToStake', accounts => {
  it('should let the user stake the NFT correctly and update state accordingly', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 111);

    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    // eslint-disable-next-line max-len
    await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});
    const stakeIndex = 0;
    const userStakedToken = await stakingInstance.userStakedTokens(alice, stakeIndex);
    expect(userStakedToken.tokenAddress).to.equal(ZERO_ADDRESS);
    expectBignumberEqual(userStakedToken.tokenId, 0);

    await stakingInstance
      .addNftToStake(alice, stakeIndex, mockNftInstance.address, 1, {from: alice});

    const userStakedTokenAfter = await stakingInstance.userStakedTokens(alice, stakeIndex);

    expect(userStakedTokenAfter.tokenAddress).to.equal(mockNftInstance.address);
    expectBignumberEqual(userStakedTokenAfter.tokenId, 1);
  });

  it('should prevent addign if NFT already added', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await mockNftInstance.mint(alice, 2, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 111);
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 2, 211);

    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    // eslint-disable-next-line max-len
    await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});
    const stakeIndex = 0;

    const userStakedToken = await stakingInstance.userStakedTokens(alice, stakeIndex);
    expect(userStakedToken.tokenAddress).to.equal(ZERO_ADDRESS);
    expectBignumberEqual(userStakedToken.tokenId, 0);

    await stakingInstance
      .addNftToStake(alice, stakeIndex, mockNftInstance.address, 1, {from: alice});
    await shouldFailWithMessage(
      stakingInstance.addNftToStake(alice, stakeIndex, mockNftInstance.address, 1, {from: alice}),
      'Staking: Stake already has a token'
    );
  });

  it('should prevent adding an NFT the staker doesnt own', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(owner, 1, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 111);

    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: owner});
    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    // eslint-disable-next-line max-len
    await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});
    const stakeIndex = 0;

    const userStakedToken = await stakingInstance.userStakedTokens(alice, stakeIndex);
    expect(userStakedToken.tokenAddress).to.equal(ZERO_ADDRESS);
    expectBignumberEqual(userStakedToken.tokenId, 0);

    await shouldFailWithMessage(
      stakingInstance.addNftToStake(alice, stakeIndex, mockNftInstance.address, 1, {from: alice}),
      'Staking: could not add NFT to stake'
    );
  });

  it('should prevent adding an NFT that is not present in NFTRarityRegister', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(alice, 1, {from: owner});

    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    // eslint-disable-next-line max-len
    await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});
    const stakeIndex = 0;

    const userStakedToken = await stakingInstance.userStakedTokens(alice, stakeIndex);
    expect(userStakedToken.tokenAddress).to.equal(ZERO_ADDRESS);
    expectBignumberEqual(userStakedToken.tokenId, 0);

    await shouldFailWithMessage(
      stakingInstance.addNftToStake(alice, stakeIndex, mockNftInstance.address, 1, {from: alice}),
      'Staking: NFT not found in RarityRegister'
    );
  });

  it('should add the correct reward credit', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 111);

    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('99'));

    // eslint-disable-next-line max-len
    await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});
    const stakeIndex = 0;
    expectBignumberEqual(
      (await stakingInstance.userStakes(alice, stakeIndex)).rewardCredit.toString(),
      0
    );
    const userStakedToken = await stakingInstance.userStakedTokens(alice, stakeIndex);
    expect(userStakedToken.tokenAddress).to.equal(ZERO_ADDRESS);
    expectBignumberEqual(userStakedToken.tokenId, 0);

    await advanceBlock();

    await stakingInstance
      .addNftToStake(alice, stakeIndex, mockNftInstance.address, 1, {from: alice});

    expectBignumberEqual(
      (await stakingInstance.userStakes(alice, stakeIndex)).rewardCredit.toString(),
      toWei('19.8')
    );
    const userStakedTokenAfter = await stakingInstance.userStakedTokens(alice, stakeIndex);

    expect(userStakedTokenAfter.tokenAddress).to.equal(mockNftInstance.address);
    expectBignumberEqual(userStakedTokenAfter.tokenId, 1);
  });

  it('should work correctly if more tha one user stakes in the same block', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployEthersStakingInstance();
    const [_, alice, bob] = await ethers.getSigners();

    const [mockNftInstance] = await deployMockNftToken();

    await mockNftInstance.mint(alice.address, 1);
    await mockNftInstance.mint(bob.address, 2);
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 111);
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 2, 111);

    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice.address});
    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: bob.address});
    
    await topUpUser(alice.address, {mockRewardInstance, stakingInstance});
    await topUpUser(bob.address, {mockRewardInstance, stakingInstance});
    const stakeAmount = toWei('100');

    await batchTransactionsInBlock([
      // eslint-disable-next-line array-element-newline
      () => stakingInstance.connect(alice).stake(stakeAmount, numberToBytes32(0)),
      () => stakingInstance.connect(bob).stake(stakeAmount, numberToBytes32(0))
    ]);
    const stakeIndex = 0;

    {
      const userStakedToken = await stakingInstance.userStakedTokens(alice.address, stakeIndex);
      expect(userStakedToken.tokenAddress).to.equal(ZERO_ADDRESS);
      expectBignumberEqual(userStakedToken.tokenId, 0);
    }
  
    {
      const userStakedToken = await stakingInstance.userStakedTokens(bob.address, stakeIndex);
      expect(userStakedToken.tokenAddress).to.equal(ZERO_ADDRESS);
      expectBignumberEqual(userStakedToken.tokenId, 0);
    }

    await batchTransactionsInBlock([
      // eslint-disable-next-line array-element-newline
      () => stakingInstance.connect(alice).addNftToStake(alice.address, stakeIndex, mockNftInstance.address, 1),
      () => stakingInstance.connect(bob).addNftToStake(bob.address, stakeIndex, mockNftInstance.address, 2)
    ]);

    {
      const userStakedTokenAfter = await stakingInstance.userStakedTokens(alice.address, stakeIndex);
  
      expect(userStakedTokenAfter.tokenAddress).to.equal(mockNftInstance.address);
      expectBignumberEqual(userStakedTokenAfter.tokenId, 1);
    }
    
    {
      const userStakedTokenAfter = await stakingInstance.userStakedTokens(bob.address, stakeIndex);
  
      expect(userStakedTokenAfter.tokenAddress).to.equal(mockNftInstance.address);
      expectBignumberEqual(userStakedTokenAfter.tokenId, 2);
    }
  });

  it('should work correctly if more than one user stakes in the same block and count reward correctly', async () => {
      const [stakingInstance, {mockRewardInstance, rarityRegisterInstance, NO_LOCK_INDEX}] = await deployEthersStakingInstance();
      const [_, alice, bob] = await ethers.getSigners();

      const [mockNftInstance] = await deployMockNftToken();

      await mockNftInstance.mint(alice.address, 1);
      await mockNftInstance.mint(bob.address, 2);
      await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 111);
      await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 2, 111);

      await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice.address});
      await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: bob.address});
      
      await topUpUser(alice.address, {mockRewardInstance, stakingInstance});
      await topUpUser(bob.address, {mockRewardInstance, stakingInstance});
      const stakeAmount = toWei('100');
      const stakeIndex = 0;
      
      await batchTransactionsInBlock([
        // eslint-disable-next-line array-element-newline
        () => stakingInstance.connect(alice).stake(stakeAmount, numberToBytes32(0)),
        () => stakingInstance.connect(bob).stake(stakeAmount, numberToBytes32(0))
      ]);
      
      await batchTransactionsInBlock([
        // eslint-disable-next-line array-element-newline
        () => stakingInstance.connect(alice).addNftToStake(alice.address, stakeIndex, mockNftInstance.address, 1),
        () => stakingInstance.connect(bob).addNftToStake(bob.address, stakeIndex, mockNftInstance.address, 2)
      ]);
      
      await advanceBlock();
      await advanceBlock();
      await advanceBlock();
      await advanceBlock();
      await advanceBlock();
      await advanceBlock();
      await advanceBlock();
      await advanceBlock();
      await advanceBlock();

    
      await batchTransactionsInBlock([
        // eslint-disable-next-line array-element-newline
        () => stakingInstance.connect(alice).unstake(0, numberToBytes32(stakeIndex)),
        () => stakingInstance.connect(bob).unstake(0, numberToBytes32(stakeIndex))
      ]);

    expectBignumberEqual(
      await mockRewardInstance.balanceOf(alice.address),
      toBN('1054750909131472681435')
    );
    expectBignumberEqual(
      await mockRewardInstance.balanceOf(bob.address),
      toBN('1054750909131472679080') // some small difference due to rounding
    );
  });

  it('should not add already added NFT', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();


    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 2);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await mockNftInstance.mint(alice, 2, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 111);
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 2, 211);

    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    // eslint-disable-next-line max-len
    await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});
    const stakeIndex = 0;
    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: bob});

    const userStakedToken = await stakingInstance.userStakedTokens(alice, stakeIndex);
    expect(userStakedToken.tokenAddress).to.equal(ZERO_ADDRESS);
    expectBignumberEqual(userStakedToken.tokenId, 0);

    await stakingInstance
      .addNftToStake(alice, stakeIndex, mockNftInstance.address, 1, {from: alice});

    await shouldFailWithMessage(
      stakingInstance.addNftToStake(alice, stakeIndex, mockNftInstance.address, 1, {from: alice}),
      'Staking: Stake already has a token'
    );
    
    await shouldFailWithMessage(
      stakingInstance.addNftToStake(bob, stakeIndex, mockNftInstance.address, 1, {from: bob}),
      'Staking: could not add NFT to stake'
    );
  });
});
