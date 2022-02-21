const {deployStaking} = require('../helpers/deploy');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, toBN, advanceBlock} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: getHistoryLength', accounts => {
  it('should return no event has happened yet', async () => {
    const [stakingInstance] = await deployStaking();

    expectBignumberEqual(
      await stakingInstance.getHistoryLength(),
      0
    );
  });

  it('should update correctly when a stake happens', async () => {
    const [stakingInstance, {mockRewardInstance, owner}] = await deployStaking();

    const historyStartBlock = await stakingInstance.historyStartBlock();
    const {enteredAtBlock: ownerEnterBlock} = await stakingInstance.userStakes(owner, 0);

    expectBignumberEqual(
      await stakingInstance.getHistoryLength(),
      toBN(ownerEnterBlock).sub(historyStartBlock).sub(toBN(1)),
    );

    const stakeAmount = toBN(toWei('99', 'ether'));

    const {user: alice} = getRaffleActors(accounts);
    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: alice});
    const aliceStakeIndex = 0;
    const {enteredAtBlock: aliceEnterBlock} = await stakingInstance
      .userStakes(alice, aliceStakeIndex);

    expectBignumberEqual(
      await stakingInstance.getHistoryLength(),
      toBN(aliceEnterBlock).sub(historyStartBlock).sub(toBN(1)),
    );

    const {user: bob} = getRaffleActors(accounts, 1);
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(stakeAmount, numberToBytes32(0), {from: bob});
    const bobStakeIndex = 0;
    const {enteredAtBlock: bobEnterBlock} = await stakingInstance.userStakes(bob, bobStakeIndex);

    expectBignumberEqual(
      await stakingInstance.getHistoryLength(),
      toBN(bobEnterBlock).sub(historyStartBlock).sub(toBN(1)),
    );
  });

  it('should update when an unstake happens', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();
    const historyStartBlock = await stakingInstance.historyStartBlock();

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('99'));

    await stakingInstance
      .stake(stakeAmount, numberToBytes32(4), {from: alice});
    const stakeIndex = 0;

    const {
      amountStaked,
      enteredAtBlock: aliceEnterBlock
    } = await stakingInstance.userStakes(alice, stakeIndex);

    expectBignumberEqual(amountStaked, stakeAmount);

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(stakeAmount, numberToBytes32(stakeIndex), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getHistoryLength(),
      toBN(aliceEnterBlock).sub(historyStartBlock).sub(toBN(1)).add(toBN(3))
    );
  });
});
