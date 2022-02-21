const {deployStaking} = require('../helpers/deploy');
const {addStake} = require('../helpers/staking');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, advanceBlock} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: getClaimableTickets', accounts => {
  it('should show the correct number of tickets', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    await stakingInstance.setTicketsMintingRatio(toWei('500'));

    const {user: alice} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    const stakeAmount = toWei('100');
    const {stakeIndex: aliceStakeIndex} = await addStake(stakingInstance, {
      lockIndex: 0, // 10 blocks, no multiplier
      staker: alice,
      amount: stakeAmount
    });

    // the ticket minting threshold is 500

    // ticketMintingChillPeriod is 1 block
    // we expect the user to print 2 tickets
    // because 10 periods * 100 = 1000 => 2 tickets

    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      0
    );

    // after 5 blocks (5 periods) we should have 15000 ghost shares (5 * 3000), which should
    // equal to 3 tickets (at 5000 BURP threshold)
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      0
    );
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      1
    );

    // other 5 blocks and we should see 2 tickets
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      1
    );
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      2
    );
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    // still 2
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      2
    );

    await stakingInstance.claimTickets(0, {from: alice});
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      0
    );
  });

  it('should return 0 after unstake', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    await stakingInstance.setTicketsMintingRatio(toWei('500'));

    const {user: alice} = getRaffleActors(accounts, 1);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    const stakeAmount = toWei('100');
    const {stakeIndex: aliceStakeIndex} = await addStake(stakingInstance, {
      lockIndex: 0, // 10 blocks, no multiplier
      staker: alice,
      amount: stakeAmount
    });

    // the ticket minting threshold is 500

    // ticketMintingChillPeriod is 1 block
    // we expect the user to print 2 tickets
    // because 10 periods * 100 = 1000 => 2 tickets

    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      0
    );

    // after 5 blocks (5 periods) we should have 15000 ghost shares (5 * 3000), which should
    // equal to 3 tickets (at 5000 BURP threshold)
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      0
    );
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      1
    );

    // other 5 blocks and we should see 2 tickets
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      1
    );
    await advanceBlock();
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      2
    );
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();
    await advanceBlock();

    // still 2
    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      2
    );

    await stakingInstance.unstake(1, numberToBytes32(0), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getClaimableTickets(alice, aliceStakeIndex, {from: alice}),
      0
    );
  });
});
