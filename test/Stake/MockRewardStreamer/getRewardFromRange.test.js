const {expectBignumberEqual} = require('../../../helpers');
const {shouldFailWithMessage} = require('../../../helpers/utils');
const {deployStakingReward} = require('../../helpers/deploy');
const {tokenBalanceDeltaAfterAction} = require('../../helpers/erc20');

contract('StakeStreamer: getRewardFromRange', () => {
  it('should count the total reward correctly from a single reward stream', async () => {
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
     * Block Numbers: | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
     * Block Rewards: | 10| 10| 10| 20| 20| 20| 30| 30| 30| 30 |
     * Total reward:  210
     */
    await mockRewardInstance.approve(stakingRewardInstance.address, 220);
    const streamId = 0;
    await stakingRewardInstance.addRewardStream(streamId, 10, deployedAtBlock + 3, {from: owner});
    await stakingRewardInstance.addRewardStream(streamId, 20, deployedAtBlock + 6, {from: owner});
    await stakingRewardInstance.addRewardStream(streamId, 30, deployedAtBlock + 10, {from: owner});

    const returnedValue = await stakingRewardInstance
      .getRewardsFromRange(deployedAtBlock, deployedAtBlock + 9);

    expectBignumberEqual(returnedValue, 180);
  });

  it('should count the total reward correctly from a multiple reward stream', async () => {
    const [
      stakingRewardInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStakingReward();

    /**
     * STREAM 1
     * Block Numbers: | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
     * Block Rewards: | 10| 10| 10| 20| 20| 20| 30| 30| 30| 30 |
     * Total reward:  210
     *
     * STREAM 2
     * Block Numbers: | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
     * Block Rewards: |100|100|100|200|200|200|300|300|300|300 |
     * Total reward:  2100
     *
     * STREAM 3
     * Block Numbers: | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
     * Block Rewards: | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
     * Total reward:  28
     */

    await mockRewardInstance.approve(stakingRewardInstance.address, 220 + 2100 + 28);

    const stream1Id = 0;
    await stakingRewardInstance.addRewardStream(stream1Id, 10, deployedAtBlock + 3, {from: owner});
    await stakingRewardInstance.addRewardStream(stream1Id, 20, deployedAtBlock + 6, {from: owner});
    await stakingRewardInstance.addRewardStream(stream1Id, 30, deployedAtBlock + 10, {from: owner});

    const stream2Id = 1;
    await stakingRewardInstance.addRewardStream(stream2Id, 100, deployedAtBlock + 3, {from: owner});
    await stakingRewardInstance.addRewardStream(stream2Id, 200, deployedAtBlock + 6, {from: owner});
    await stakingRewardInstance
      .addRewardStream(stream2Id, 300, deployedAtBlock + 10, {from: owner});

    const stream3Id = 2;
    await stakingRewardInstance.addRewardStream(stream3Id, 1, deployedAtBlock + 1, {from: owner});
    await stakingRewardInstance.addRewardStream(stream3Id, 2, deployedAtBlock + 2, {from: owner});
    await stakingRewardInstance.addRewardStream(stream3Id, 3, deployedAtBlock + 3, {from: owner});
    await stakingRewardInstance.addRewardStream(stream3Id, 4, deployedAtBlock + 4, {from: owner});
    await stakingRewardInstance.addRewardStream(stream3Id, 5, deployedAtBlock + 5, {from: owner});
    await stakingRewardInstance.addRewardStream(stream3Id, 6, deployedAtBlock + 6, {from: owner});
    await stakingRewardInstance.addRewardStream(stream3Id, 7, deployedAtBlock + 7, {from: owner});

    expectBignumberEqual(
      await stakingRewardInstance
        .getRewardsFromRange(deployedAtBlock, deployedAtBlock + 5),
      70 + 700 + 15
    );

    expectBignumberEqual(
      await stakingRewardInstance
        .getRewardsFromRange(deployedAtBlock, deployedAtBlock + 1),
      10 + 100 + 1
    );

    expectBignumberEqual(
      await stakingRewardInstance
        .getRewardsFromRange(deployedAtBlock, deployedAtBlock + 10),
      210 + 2100 + 28
    );
  });

  it('should revert if skippping an index', async () => {
    const [
      stakingRewardInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStakingReward();

    await mockRewardInstance.approve(stakingRewardInstance.address, 220 + 2100 + 28);

    const stream3Id = 1;
    await shouldFailWithMessage(
      stakingRewardInstance.addRewardStream(stream3Id, 1, deployedAtBlock + 1, {from: owner}),
      'RewardStreamer: you cannot skip an index'
    );

    const stream1Id = 0;
    await stakingRewardInstance.addRewardStream(stream1Id, 10, deployedAtBlock + 3, {from: owner});

    const stream2Id = 1;
    await stakingRewardInstance.addRewardStream(stream2Id, 1, deployedAtBlock + 3, {from: owner});

    const stream4Id = 3;
    await shouldFailWithMessage(
      stakingRewardInstance.addRewardStream(stream4Id, 1, deployedAtBlock + 1, {from: owner}),
      'RewardStreamer: you cannot skip an index'
    );
  });

  it('should revert if not enough tokens have been approved', async () => {
    const [
      stakingRewardInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStakingReward();

    await mockRewardInstance.approve(stakingRewardInstance.address, 99);

    await shouldFailWithMessage(
      stakingRewardInstance.addRewardStream(0, 10, deployedAtBlock + 10, {from: owner}),
      'ERC20: transfer amount exceeds balance or allowance'
    );
  });

  it('should revert if overwriting an existing stream');

  it('should transfer only the correct amount of tokens', async () => {
    const [
      stakingRewardInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStakingReward();

    await mockRewardInstance.approve(stakingRewardInstance.address, 99999999);

    const stream1Id = 0;

    const balanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      stakingRewardInstance.address,
      () => stakingRewardInstance
        .addRewardStream(stream1Id, 10, deployedAtBlock + 10, {from: owner}) // 100 tokens
    );

    expectBignumberEqual(balanceDelta, 100);
  });
});
