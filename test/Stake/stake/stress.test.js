/* eslint-disable array-element-newline */
const {range} = require('rxjs');
const {concatMap} = require('rxjs/operators');
const {deployStaking} = require('../../helpers/deploy');
const {topUpUser} = require('../../helpers/erc20');
const {getRaffleActors} = require('../../../helpers/address');
const {toWei, toBN, advanceBlockTo} = require('../../../helpers/utils');
const {numberToBytes32} = require('../../helpers/bytes');

contract('Stake: stake', accounts => {
  it('should let the user stake even when reward streams are in big number', async () => {
    const [
      stakingInstance,
      {
        mockRewardInstance,
        deployedAtBlock,
        owner
      }
    ] = await deployStaking({skipAddRewardStreams: true});

    await mockRewardInstance
      .approve(stakingInstance.address, 999999999999999, {from: owner});
    const streamId0 = 0;
    const streamId1 = 1;

    const addRewardStream = rewardStreamId => i => stakingInstance
      .addRewardStream(rewardStreamId, i + 1, deployedAtBlock + i + 1, {from: owner});

    await range(0, 80)
      .pipe(
        concatMap(addRewardStream(streamId0))
      ).toPromise();
    await range(0, 80)
      .pipe(
        concatMap(addRewardStream(streamId1))
      ).toPromise();

    await advanceBlockTo(await web3.eth.getBlockNumber() + 30);

    const {user: alice} = getRaffleActors(accounts);

    await topUpUser(alice, {mockRewardInstance, stakingInstance});
    const stakeAmount = toBN(toWei('100'));

    const {receipt: {gasUsed}} = await stakingInstance
      .stake(stakeAmount, numberToBytes32(0), {from: alice});

    // this is such an extreme test, where a single user will traverse
    // 80 reward periods. In real-life a user will never cross more than 1 period.
    expect(gasUsed).to.be.lessThan(1800000);
  });
});
