const {range} = require('rxjs');
const {concatMap, reduce} = require('rxjs/operators');
const {expectBignumberEqual, expect} = require('../../../helpers');
const {deployStakingReward} = require('../../helpers/deploy');

contract('StakeStreamer: it should be safe with big loops', () => {
  it('should add correctly the rewards in we are adding in steam', async () => {
    const [
      stakingRewardInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStakingReward();

    /**
     *
     * Period End Block:  |100|200|300|400|500|600|700|800|900|1000|...
     * Block Rewards:     | 10| 20| 30| 40| 50| 60| 70| 80| 90| 100|...
     * Periods:           | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |...
     * Test 1(101-150) •   *|~|                                 •...
     * Test 2(301-350) •   •      *|~|                          •...
     * Test 3(351-650) •          • |~*~~~~~~~~|                •...
     * Test 4(361-362) •              •|~|                      •...
     *
     * Symbols:
     *  •  indicate the current cursor position
     *  *  indicates the crossing of a period. cursor will be moved here.
     * |~| indicates the range we're reading
     *
     * The cursor will be updated every time the FROM block is bigger than
     * the PREVIOUS period block end
     *
     * Notes: the period end blocks are relative to the deploy block
     * of the contract. E.g. if the endblock of period 1 is 100, the
     * actual block would be 100 + deployedAtBlock.
     */

    // const {receipt: {gasUsed: gasCostWithoutLoop}} = await stakingRewardInstance
    //   .storeRewardValue(0, 1);

    await mockRewardInstance.approve(stakingRewardInstance.address, 999999999999999);
    const streamId0 = 0;

    const addRewardStream = rewardStreamId => async i => {
      const rewardPerBlock = (i + 1) * 10;
      const startBlock = deployedAtBlock + i * 100;
      const endBlock = deployedAtBlock + (i + 1) * 100;
      const periodLength = endBlock - startBlock;
      const toralRewardInPeriod = rewardPerBlock * periodLength;

      await stakingRewardInstance
        .addRewardStream(
          rewardStreamId,
          (i + 1) * 10,
          deployedAtBlock + (i + 1) * 100,
          {from: owner}
        );

      return toralRewardInPeriod;
    };

    const totalRewards = await range(0, 60)
      .pipe(
        concatMap(addRewardStream(streamId0)),
        reduce((acc, curr) => acc + curr, 0)
      ).toPromise();

    expectBignumberEqual(
      totalRewards,
      await stakingRewardInstance.getRewardsFromRange(0, 999999999999)
    );

    // READ 1, it will bump the stream reward cursor because we start from block 0
    // but we get to block 101, crossing a full reward period
    const fromBlock1 = deployedAtBlock + 101;
    const toBlock1 = deployedAtBlock + 150;
    // console.log(`Updating rewards from block ${fromBlock1} to block ${toBlock1}`);

    const {receipt: {gasUsed: gasCost1}} = await stakingRewardInstance
      .storeRewardValue(fromBlock1, toBlock1);
    // console.log(`GAS_COST_1: ${gasCost1 - gasCostWithoutLoop}`);
    // const returnedValue1 = await stakingRewardInstance.returnedValue();
    // console.log(`returnedValue1: ${returnedValue1.toString()}`);
    // const cursorAfter1 = await stakingRewardInstance.rewardStreamCursors(0);
    // console.log(`cursorAfter1: ${cursorAfter1.toString()}`);
    // const readReward1 = await stakingRewardInstance.getRewardsFromRange(fromBlock1, toBlock1);
    // console.log(`readReward1: ${readReward1.toString()}\n`);
    //
    // READ 2, it will bump the stream reward cursor because the current period ends at 203
    // but we get fromBlock 301, crossing a full reward period
    const fromBlock2 = deployedAtBlock + 301;
    const toBlock2 = deployedAtBlock + 350;
    // console.log(`Updating rewards from block ${fromBlock2} to block ${toBlock2}`);

    const {receipt: {gasUsed: gasCost2}} = await stakingRewardInstance
      .storeRewardValue(fromBlock2, toBlock2);
    // console.log(`GAS_COST_2: ${gasCost2 - gasCostWithoutLoop}`);
    // const returnedValue2 = await stakingRewardInstance.returnedValue();
    // console.log(`returnedValue: ${returnedValue2.toString()}`);
    // const cursorAfter2 = await stakingRewardInstance.rewardStreamCursors(0);
    // console.log(`cursorAfter2: ${cursorAfter2.toString()}`);
    // const readReward2 = await stakingRewardInstance.getRewardsFromRange(fromBlock2, toBlock2);
    // console.log(`readReward2: ${readReward2.toString()}\n`);

    // READ 3, it will bump the stream reward cursor because the current period ends at 303
    // but we get fromBlock 351, crossing a full reward period
    const fromBlock3 = deployedAtBlock + 351;
    const toBlock3 = deployedAtBlock + 360;
    // console.log(`Updating rewards from block ${fromBlock3} to block ${toBlock3}`);
    //
    const {receipt: {gasUsed: gasCost3}} = await stakingRewardInstance
      .storeRewardValue(fromBlock3, toBlock3);
    // console.log(`GAS_COST_3: ${gasCost3 - gasCostWithoutLoop}`);
    // const returnedValue3 = await stakingRewardInstance.returnedValue();
    // console.log(`returnedValue3: ${returnedValue3.toString()}`);
    // const cursorAfter3 = await stakingRewardInstance.rewardStreamCursors(0);
    // console.log(`cursorAfter3: ${cursorAfter3.toString()}`);
    // const readReward3 = await stakingRewardInstance.getRewardsFromRange(fromBlock3, toBlock3);
    // console.log(`readReward3: ${readReward3.toString()}\n`);

    // READ 3, it will NOT bump the stream reward cursor because
    // the current period ends at 403 but we get fromBlock 361
    const fromBlock4 = deployedAtBlock + 361;
    const toBlock4 = deployedAtBlock + 362;
    // console.log(`Updating rewards from block ${fromBlock4} to block ${toBlock4}`);
    //
    const {receipt: {gasUsed: gasCost4}} = await stakingRewardInstance
      .storeRewardValue(fromBlock4, toBlock4);
    // console.log(`GAS_COST_4: ${gasCost4 - gasCostWithoutLoop}`);
    // const returnedValue4 = await stakingRewardInstance.returnedValue();
    // console.log(`returnedValue4: ${returnedValue4.toString()}`);
    // const cursorAfter4 = await stakingRewardInstance.rewardStreamCursors(0);
    // console.log(`cursorAfter4: ${cursorAfter4.toString()}`);
    // const readReward4 = await stakingRewardInstance.getRewardsFromRange(fromBlock4, toBlock4);
    // console.log(`readReward4: ${readReward4.toString()}\n`);

    expect(gasCost4).to.be.lessThan(gasCost1);
    expect(gasCost4).to.be.lessThan(gasCost2);
    expect(gasCost4).to.be.lessThan(gasCost3);
  });
});
