const {deployStaking, deployMockNftToken} = require('../helpers/deploy');
const {getRaffleActors} = require('../../helpers/address');
const {
  toWei,
  toBN,
  getBlockNumber,
  shouldFailWithMessage
} = require('../../helpers/utils');
const {topUpUser} = require('../helpers/erc20');
const {expectBignumberEqual, getExpectedTicketsAtStake} = require('../../helpers');
const {numberToBytes32, addressToBytes} = require('../helpers/bytes');
const {getExpectedNextHistoryAverageRewardAfterEvent} = require('../helpers/staking');

contract('Stake: stakeFor', accounts => {
  it('should stake for user', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const {user: bob} = getRaffleActors(accounts, 2);
    const stakeAmount = toBN(toWei('150', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    const aliceBalanceBefore = await mockRewardInstance.balanceOf(alice);
    const bobBalanceBefore = await mockRewardInstance.balanceOf(bob);

    // Alice stakes for bob
    await stakingInstance.stakeFor(bob, stakeAmount, numberToBytes32(0), {from: alice});

    const aliceTotalStaked = await stakingInstance.totalStakedFor(alice);
    const bobTotalStaked = await stakingInstance.totalStakedFor(bob);

    const aliceBalanceAfter = await mockRewardInstance.balanceOf(alice);
    const bobBalanceAfter = await mockRewardInstance.balanceOf(bob);

    expectBignumberEqual(aliceTotalStaked, toBN(0));
    expectBignumberEqual(bobTotalStaked, stakeAmount);

    expectBignumberEqual(aliceBalanceAfter, aliceBalanceBefore.sub(stakeAmount));
    expectBignumberEqual(bobBalanceBefore, bobBalanceAfter);
  });

  it('should revert if transfer fails', async () => {
    const [stakingInstance] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const {user: bob} = getRaffleActors(accounts, 2);
    const stakeAmount = toBN(toWei('150', 'ether'));

    // alice doesn't have balance
    await shouldFailWithMessage(
      stakingInstance.stakeFor(bob, stakeAmount, numberToBytes32(0), {from: alice}),
      'ERC20: transfer amount exceeds balance or allowance'
    );
  });

  it('should revert if wrong data is passed', async () => {
    const [stakingInstance] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const {user: bob} = getRaffleActors(accounts, 2);
    const stakeAmount = toBN(toWei('150', 'ether'));

    await shouldFailWithMessage(
      stakingInstance.stakeFor(bob, stakeAmount, '0x0', {from: alice}),
      'Stake: data should by at least 32 bytes'
    );
  });

  it('should revert if wrong index is passed in data bytes', async () => {
    const [stakingInstance] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const {user: bob} = getRaffleActors(accounts, 2);
    const stakeAmount = toBN(toWei('150', 'ether'));

    await shouldFailWithMessage(
      stakingInstance.stakeFor(bob, stakeAmount, numberToBytes32(10), {from: alice}),
      'Stake: lock index out of bounds'
    );
  });

  it('should set the correct lockedTill duration', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const {user: bob} = getRaffleActors(accounts, 2);
    const stakeAmount = toBN(toWei('150', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    // Alice stakes for bob
    await stakingInstance.stakeFor(bob, stakeAmount, numberToBytes32(1), {from: alice});
    const stakeIndex = 0;

    const currentBlock = await getBlockNumber();

    const bobStakes = await stakingInstance.userStakes(bob, stakeIndex);
    const lockDuration = await stakingInstance.locks(1);

    expectBignumberEqual(toBN(currentBlock).add(lockDuration), bobStakes.lockedTill);
  });

  it('should mint tickets to user lock=1 year', async () => {
    const [stakingInstance, {mockRewardInstance, ticketInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const {user: bob} = getRaffleActors(accounts, 2);
    const stakeAmount = toBN(toWei('150', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});
    const lockIndex = 1;
    // Alice stakes for bob
    await stakingInstance.stakeFor(bob, stakeAmount, numberToBytes32(lockIndex), {from: alice});

    const expectedTicketsAmount = getExpectedTicketsAtStake(
      await stakingInstance.userStakes(bob, 0)
    );

    const ticketsBalanceOfBob = await ticketInstance.balanceOf(bob, 0);
    console.log('bob tickets', ticketsBalanceOfBob.toString());

    expectBignumberEqual(toBN(expectedTicketsAmount), toBN(ticketsBalanceOfBob));
  });

  it('should mint tickets to user lock=4 year', async () => {
    const [stakingInstance, {mockRewardInstance, ticketInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const {user: bob} = getRaffleActors(accounts, 2);
    const stakeAmount = toBN(toWei('150', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});
    const lockIndex = 3;
    // Alice stakes for bob
    await stakingInstance.stakeFor(bob, stakeAmount, numberToBytes32(lockIndex), {from: alice});

    const expectedTicketsAmount = getExpectedTicketsAtStake(
      await stakingInstance.userStakes(bob, 0)
    );

    const ticketsBalanceOfBob = await ticketInstance.balanceOf(bob, 0);

    expectBignumberEqual(toBN(expectedTicketsAmount), toBN(ticketsBalanceOfBob));
  });

  it('should stakeFor with nft', async () => {
    const [stakingInstance, {mockRewardInstance, rarityRegisterInstance}] = await deployStaking();
    const [mockNftInstance, {owner}] = await deployMockNftToken();

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 2);

    await mockNftInstance.mint(alice, 1, {from: owner});
    await rarityRegisterInstance.storeNftRarity(mockNftInstance.address, 1, 111);

    await mockNftInstance.setApprovalForAll(stakingInstance.address, true, {from: alice});
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    // eslint-disable-next-line max-len
    await getExpectedNextHistoryAverageRewardAfterEvent(stakingInstance);
    await stakingInstance
      .stakeFor(
        bob,
        stakeAmount,
        [...numberToBytes32(0), ...addressToBytes(mockNftInstance.address), ...numberToBytes32(1)],
        {from: alice}
      );
    const stakeIndex = 0;

    const userStakedTokenAfter = await stakingInstance.userStakedTokens(bob, stakeIndex);

    expect(userStakedTokenAfter.tokenAddress).to.equal(mockNftInstance.address);
    expectBignumberEqual(userStakedTokenAfter.tokenId, 1);
  });
});
