const {deployStaking} = require('../helpers/deploy');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, toBN} = require('../../helpers/utils');
const {topUpUser} = require('../helpers/erc20');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: totalStakedFor', accounts => {
  it('should return the total amount staked for a user', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const {user: alice} = getRaffleActors(accounts, 1);
    const {user: bob} = getRaffleActors(accounts, 2);
    const stakeAmountAlice = toBN(toWei('150', 'ether'));
    const stakeAmountBob = toBN(toWei('88', 'ether'));
    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(stakeAmountAlice, numberToBytes32(0), {from: alice});
    await stakingInstance.stake(stakeAmountBob, numberToBytes32(0), {from: bob});

    const aliceTotalStaked = await stakingInstance.totalStakedFor(alice);
    const bobTotalStaked = await stakingInstance.totalStakedFor(bob);

    expectBignumberEqual(aliceTotalStaked, stakeAmountAlice);
    expectBignumberEqual(bobTotalStaked, stakeAmountBob);
  });
});
