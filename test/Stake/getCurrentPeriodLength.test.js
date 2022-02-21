const {deployStaking} = require('../helpers/deploy');
const {topUpUser} = require('../helpers/erc20');
const {getExpectedCurrentPeriodLength} = require('../helpers/staking');
const {getRaffleActors} = require('../../helpers/address');
const {
  toWei,
  toBN,
  advanceBlock
} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: getCurrentPeriodLength', accounts => {
  it('should return the currect current period length', async () => {
    const [stakingInstance] = await deployStaking();
    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodLength(),
      await getExpectedCurrentPeriodLength(stakingInstance)
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodLength(),
      await getExpectedCurrentPeriodLength(stakingInstance)
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodLength(),
      await getExpectedCurrentPeriodLength(stakingInstance)
    );
  });

  it('should reset when an unstake happens', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodLength(),
      await getExpectedCurrentPeriodLength(stakingInstance)
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodLength(),
      await getExpectedCurrentPeriodLength(stakingInstance)
    );

    await advanceBlock();

    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodLength(),
      await getExpectedCurrentPeriodLength(stakingInstance)
    );

    const stakeAmount = toBN(toWei('99', 'ether'));

    const {user: alice} = getRaffleActors(accounts);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(stakeAmount, numberToBytes32(4), {from: alice});
    const aliceStakeIndex = 0;

    // after a stake should reset the current period
    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodLength(),
      await getExpectedCurrentPeriodLength(stakingInstance)
    );
    expectBignumberEqual(await stakingInstance.getCurrentPeriodLength(), 1);

    await advanceBlock();
    await stakingInstance.unstake(stakeAmount, numberToBytes32(aliceStakeIndex), {from: alice});

    // after an unstake should reset the current period
    expectBignumberEqual(
      await stakingInstance.getCurrentPeriodLength(),
      await getExpectedCurrentPeriodLength(stakingInstance)
    );
    expectBignumberEqual(await stakingInstance.getCurrentPeriodLength(), 1);
  });

  it.skip('should reset when an unstake happens', async () => {

  });
});
