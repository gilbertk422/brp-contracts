const {expectRevert} = require('@openzeppelin/test-helpers');
const {deployStaking} = require('../helpers/deploy');
const {addStake} = require('../helpers/staking');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, toBN, advanceBlock} = require('../../helpers/utils');
const {expectBignumberEqual, getExpectedTicketsAtStake, expect} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

const ticketTokenId = 0;

contract('Stake: claimTickets', accounts => {
  it('should mint tickets to user lock=4 year', async () => {
    const [stakingInstance, {mockRewardInstance, ticketInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const aliceStakeIndex = 0;

    // lockingPeriod index 4 doubles is a 3x multiplier
    const lockIndex = 3;

    // the ticket minting threshold is 500
    await stakingInstance.setTicketsMintingRatio(toWei('500', 'ether'));

    // so player 1 stakes 100 BURP for 12 months = 3x multiplier = 100 BURP x 3 = 300 shares
    const stakeAmount = toBN(toWei('100', 'ether'));
    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});

    // block 0 - 300 ghost shares - 0 new raffle tickets
    const aliceUserStakes = await stakingInstance.userStakes(alice, aliceStakeIndex);

    expectBignumberEqual(aliceUserStakes.ticketsMinted, 0);
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      0
    );

    // block 1 - 600 ghost shares - 1 new raffle ticket
    // (passed 500 shares threshold, 100 shares carried over)
    await stakingInstance.claimTickets(0, {from: alice});
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      1
    );
    await stakingInstance.claimTickets(0, {from: alice});
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      1
    );
    await stakingInstance.claimTickets(0, {from: alice});
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      2
    );
    await stakingInstance.claimTickets(0, {from: alice});
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      2
    );

    await stakingInstance.claimTickets(0, {from: alice});
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      3
    );
  });

  it('should mint tickets to user lock=4 year', async () => {
    const [stakingInstance, {mockRewardInstance, ticketInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const aliceStakeIndex = 0;

    // lockingPeriod index 4 doubles is a 3x multiplier
    const lockIndex = 3;

    // the ticket minting threshold is 500
    await stakingInstance.setTicketsMintingRatio(toWei('500', 'ether'));

    // so player 1 stakes 100 BURP for 12 months = 3x multiplier = 100 BURP x 3 = 300 shares
    const stakeAmount = toBN(toWei('100', 'ether'));
    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});

    // block 0 - 300 ghost shares - 0 new raffle tickets
    const aliceUserStakes = await stakingInstance.userStakes(alice, aliceStakeIndex);

    expectBignumberEqual(aliceUserStakes.ticketsMinted, 0);
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      0
    );

    // after 5 blocks (5 periods) we should have 15000 ghost shares (5 * 3000), which should
    // equal to 3 tickets (at 5000 BURP threshold)
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    await stakingInstance.claimTickets(0, {from: alice});
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      3
    );
  });

  it('should not mint more tickets after stake unlock date', async () => {
    const [
      stakingInstance,
      {
        mockRewardInstance,
        ticketInstance,
        stakingLocks
      }
    ] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100', 'ether'));

    // lockingPeriod index 4 doubles is a 3x multiplier
    const lockIndex = 4;

    // the ticket minting threshold is 500
    await stakingInstance.setTicketsMintingRatio(toWei('500', 'ether'));

    // so player 1 stakes 100 BURP for 12 months = 3x multiplier = 100 BURP x 3 = 300 shares
    const {stakeIndex: aliceStakeIndex} = await addStake(stakingInstance, {
      staker: alice,
      amount: stakeAmount
    });

    // block 0 - 300 ghost shares - 0 new raffle tickets
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    expect(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex),
      1
    );
    await stakingInstance.claimTickets(aliceStakeIndex, {from: alice});
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      stakingLocks[lockIndex]
    );
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      stakingLocks[lockIndex]
    );
    await advanceBlock();

    expect(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex),
      0
    );
    await stakingInstance.claimTickets(aliceStakeIndex, {from: alice});
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      stakingLocks[lockIndex]
    );
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      1
    );
  });

  it('should mint tickets correct amount of tickets after updating minting ratio', async () => {
    const [stakingInstance, {mockRewardInstance, ticketInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const stakeAmount = toBN(toWei('100', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const lockIndex = 3;

    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});

    const expectedTicketsAmount = getExpectedTicketsAtStake(
      await stakingInstance.userStakes(alice, 0)
    );

    const aliceTicketBalance = await ticketInstance
      .balanceOf(alice, ticketTokenId); // 0 is the tokenId of the tickets

    expectBignumberEqual(expectedTicketsAmount, aliceTicketBalance);
    expectBignumberEqual(expectedTicketsAmount, 3);

    await stakingInstance.setTicketsMintingRatio(toWei('50', 'ether'));

    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});

    const expectedTicketsAmount2 = getExpectedTicketsAtStake(
      await stakingInstance.userStakes(alice, 1)
    );

    const aliceTicketBalance2 = await ticketInstance
      .balanceOf(alice, ticketTokenId); // 0 is the tokenId of the tickets

    expectBignumberEqual(expectedTicketsAmount2, 6);
    expectBignumberEqual(aliceTicketBalance2, 9); // 8 new + 4 previous one
  });

  it('should revert if the call to mint fails', async () => {
    const [stakingInstance, {mockRewardInstance, ticketInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const aliceStakeIndex = 0;

    // lockingPeriod index 4 doubles is a 3x multiplier
    const lockIndex = 3;

    // the ticket minting threshold is 500
    await stakingInstance.setTicketsMintingRatio(toWei('500', 'ether'));

    // so player 1 stakes 100 BURP for 12 months = 3x multiplier = 100 BURP x 3 = 300 shares
    const stakeAmount = toBN(toWei('100', 'ether'));
    await stakingInstance.stake(stakeAmount, numberToBytes32(lockIndex), {from: alice});

    // block 0 - 300 ghost shares - 0 new raffle tickets
    const aliceUserStakes = await stakingInstance.userStakes(alice, aliceStakeIndex);

    expectBignumberEqual(aliceUserStakes.ticketsMinted, 0);
    expect(
      await ticketInstance.balanceOf(alice, ticketTokenId),
      0
    );

    await ticketInstance.removeMinter(stakingInstance.address)

    await expectRevert(
      stakingInstance.claimTickets(0, {from: alice}),
      'ERC1155: mint failed'
    )
  })
});
