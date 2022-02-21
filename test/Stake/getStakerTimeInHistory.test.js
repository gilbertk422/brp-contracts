const {deployStaking} = require('../helpers/deploy');
const {topUpUser} = require('../helpers/erc20');
const {getRaffleActors} = require('../../helpers/address');
const {toWei, toBN, advanceBlock} = require('../../helpers/utils');
const {expectBignumberEqual} = require('../../helpers');
const {numberToBytes32} = require('../helpers/bytes');

contract('Stake: getStakerTimeInHistory', accounts => {
  it('should return zero if staker is not in history', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    const {user} = getRaffleActors(accounts);

    expectBignumberEqual(
      await stakingInstance.getStakerTimeInHistory(user, 0),
      0
    );

    expectBignumberEqual(
      await stakingInstance.getStakerTimeInHistory(owner, 0),
      0
    );
  });

  it('should get the correct time in history stakers', async () => {
    const [stakingInstance, {mockRewardInstance, owner}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);
    const {user: bob} = getRaffleActors(accounts, 1);
    const aliceStakeAmount = toBN(toWei('99', 'ether'));
    const bobStakeAmount = toBN(toWei('200', 'ether'));

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    await topUpUser(bob, {mockRewardInstance, stakingInstance});

    const userStakes = await stakingInstance
      .userStakes(owner, 0);// owner first(default) stake

    const {enteredAtBlock: ownerEnterBlock} = userStakes;
    expectBignumberEqual(
      await stakingInstance.getStakerTimeInHistory(owner, 0),
      toBN(ownerEnterBlock).sub(toBN(ownerEnterBlock))
    );

    await stakingInstance.stake(aliceStakeAmount, numberToBytes32(0), {from: alice});
    const aliceStakeIndex = 0;

    const {enteredAtBlock: aliceEnterBlock} = await stakingInstance
      .userStakes(alice, aliceStakeIndex);

    expectBignumberEqual(
      await stakingInstance.getStakerTimeInHistory(owner, 0),
      toBN(aliceEnterBlock).sub(toBN(ownerEnterBlock))
    );

    expectBignumberEqual(
      await stakingInstance.getStakerTimeInHistory(alice, aliceStakeIndex),
      toBN(aliceEnterBlock).sub(toBN(aliceEnterBlock))
    );

    await stakingInstance.stake(bobStakeAmount, numberToBytes32(0), {from: bob});
    const bobStakeIndex = 0;

    const {enteredAtBlock: bobEnterBlock} = await stakingInstance.userStakes(bob, bobStakeIndex);

    expectBignumberEqual(
      await stakingInstance.getStakerTimeInHistory(owner, bobStakeIndex),
      toBN(bobEnterBlock).sub(toBN(ownerEnterBlock))
    );

    expectBignumberEqual(
      await stakingInstance.getStakerTimeInHistory(alice, aliceStakeIndex),
      toBN(bobEnterBlock).sub(toBN(aliceEnterBlock))
    );
  });

  it('should return zero if user has unstaked', async () => {
    const [stakingInstance, {mockRewardInstance}] = await deployStaking();

    const {user: alice} = getRaffleActors(accounts);
    const aliceStakeAmount = toBN(toWei('99', 'ether'));

    await topUpUser(alice, {mockRewardInstance, stakingInstance});

    await stakingInstance.stake(aliceStakeAmount, numberToBytes32(4), {from: alice});
    const aliceStakeIndex = 0;

    await advanceBlock();
    await advanceBlock();

    await stakingInstance
      .unstake(aliceStakeAmount, numberToBytes32(aliceStakeIndex), {from: alice});

    expectBignumberEqual(
      await stakingInstance.getStakerTimeInHistory(alice, 0),
      0
    );
  });
});
