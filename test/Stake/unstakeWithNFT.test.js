const {deployStaking, deployMockNftToken} = require('../helpers/deploy');
const {tokenBalanceDeltaAfterAction, topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {
  shouldFailWithMessage,
  toWei,
  toBN,
  getBlockNumber,
  advanceBlock
} = require('../../helpers/utils');
const {findEventInTransaction} = require('../../helpers/events');
const {numberToBytes32, hexToNumberString, createCallData} = require('../helpers/bytes');
const {expectBignumberEqual} = require('../../helpers');
const {DEFAULT_STAKER_AMOUNT, getExpectedNextHistoryAverageRewardAfterEvent} = require('../helpers/staking');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

contract('Stake: unstake with NFT', accounts => {
  it('should return the correct extra reward', async () => {
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

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    const balanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    expectBignumberEqual(
      balanceDelta,
      stakeAmount.add(toBN(toWei('49.751243781094527363')))
    );
  });

  it('should return the correct reward, stake and NFT', async () => {
    const [mockNftInstance, {owner}] = await deployMockNftToken();
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);

    const tokenId = 1;

    await mockNftInstance.mint(alice, tokenId, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, tokenId, 200);
    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});

    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    const stakeAmount = toBN(toWei('100'));

    await stakingInstance
      .stake(stakeAmount, createCallData(4, mockNftInstance.address, tokenId), {from: alice});
    const stakeIndex = 0;

    expect(stakingInstance.address).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    const balanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    expect(alice).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    expectBignumberEqual(
      balanceDelta,
      stakeAmount.add(toBN(toWei('49.751243781094527363')))
    );
  });

  it('should return the correct reward if the NFT transfer fails', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await mockNftInstance.mint(alice, 2, {from: owner});

    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 200);
    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    await stakingInstance
      .stake(stakeAmount, createCallData(4, mockNftInstance.address, 1), {from: alice});
    const stakeIndex = 0;

    const {amountStaked} = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    const tokenId = 1;
    const {address: tokenAddress} = mockNftInstance;

    {
      const currentNftOwner = await mockNftInstance.ownerOf(1);
      expect(currentNftOwner).to.equal(stakingInstance.address);
    }
    await advanceBlock();
    await advanceBlock();

    expect(stakingInstance.address).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    // we prevent the contract from transfering NFTs
    await mockNftInstance.pause({from: owner});

    await shouldFailWithMessage(
      mockNftInstance
        .safeTransferFrom(alice, alice, 2, {from: alice}),
      'Pausable: paused'
    );

    const balanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      alice,
      () => stakingInstance
        .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice})
    );

    expect(stakingInstance.address).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    expectBignumberEqual(
      balanceDelta,
      stakeAmount.add(toBN(toWei('49.751243781094527363')))
    );

    // we prevent the contract from transfering NFTs
    await mockNftInstance.unpause({from: owner});

    await stakingInstance.unstakeERC721(numberToBytes32(stakeIndex), {from: alice});

    expect(alice).to.be.equal(await mockNftInstance.ownerOf(tokenId));

    const {
      tokenAddress: storedTokenAddress,
      tokenId: storedTokenId
    } = await stakingInstance.userStakedTokens(alice, stakeIndex);

    expect(storedTokenAddress).to.be.equal(ZERO_ADDRESS);
    expectBignumberEqual(storedTokenId, 0);
  });

  it('should emit Unstaked Event', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    await advanceBlock();
    await advanceBlock();

    const unstakeResult = await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    const {args} = await findEventInTransaction(
      unstakeResult,
      'Unstaked'
    );

    const expectedAmount = toBN(toWei('29.7'));

    expect(args.user).to.equal(user);
    expectBignumberEqual(args.amount, expectedAmount);
    expectBignumberEqual(args.total, DEFAULT_STAKER_AMOUNT);
    expect(hexToNumberString(args.data)).to.equal(String(stakeIndex));
  });

  it('should update the totalCurrentlyStaked', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    expectBignumberEqual(
      await stakingInstance.totalCurrentlyStaked(),
      DEFAULT_STAKER_AMOUNT.add(stakeAmount)
    );

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    expectBignumberEqual(
      await stakingInstance.totalCurrentlyStaked(),
      DEFAULT_STAKER_AMOUNT
    );
  });

  it('should update the historyEndBlock', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    const previousHistoryEndBlock = await stakingInstance.historyEndBlock();

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    expectBignumberEqual(
      await stakingInstance.historyEndBlock(),
      (await getBlockNumber()) - 1
    );

    expectBignumberEqual(
      await stakingInstance.historyEndBlock(),
      previousHistoryEndBlock.add(toBN(3)) // 2 advance block + unstake block
    );
  });

  it('should update the historyRewardPot', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    await advanceBlock();

    const previousHistoryRewardPot = await stakingInstance.historyRewardPot();
    const previousCurrentPeriodReward = await stakingInstance.getTotalRewardInCurrentPeriod();

    const aliceUnstakeResult = await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    const newHistoryRewardPot = await stakingInstance.historyRewardPot();

    const {args} = await findEventInTransaction(
      aliceUnstakeResult,
      'Unstaked'
    );

    expectBignumberEqual(
      newHistoryRewardPot,
      previousHistoryRewardPot.add(previousCurrentPeriodReward).sub(args.amount)
    );
  });

  it('should update the historyAverageReward', async () => {
    const [stakingInstance, {mockRewardInstance, blocksDelta}] = await deployStaking();

    const {user} = getRaffleActors(accounts);
    const stakeAmount = toBN(toWei('99'));

    await topUpUser(user, {mockRewardInstance, stakingInstance});

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: user});
    const stakeIndex = 0;

    await advanceBlock();
    const expectedAverageReward = await getExpectedNextHistoryAverageRewardAfterEvent(
      stakingInstance, {
        expectedCurrentPeriodLength: 2,
        expectedHistoryLength: blocksDelta + 2,
        expectedNewHistoryLength: blocksDelta + 2 + 2, // adding the current period
        expectedCurrentAverageReward: toBN(toWei('0.1')),
        expectedNextHistoryAverageRewardAfterEvent: toBN(toWei('7.8'))
      }
    );
    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: user});

    const historyAverageReward = await stakingInstance.historyAverageReward();

    expectBignumberEqual(
      historyAverageReward,
      expectedAverageReward
    );
  });
});
