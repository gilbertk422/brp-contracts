const {expectBignumberEqual} = require('../../helpers');
const {getStakeActorsAsync} = require('../../helpers/address');
const {findEventInTransaction} = require('../../helpers/events');
const {shouldFailWithMessage, toWei} = require('../../helpers/utils');
const {deployStaking} = require('../helpers/deploy');
const {tokenBalanceDeltaAfterAction} = require('../helpers/erc20');

contract('Staking: getStakingReward', () => {
  it('should revert if skippping an index', async () => {
    const [
      stakingInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStaking({skipMinting: true});

    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});
    await mockRewardInstance.approve(stakingInstance.address, 220 + 2100 + 28);

    const stream3Id = 1;
    await shouldFailWithMessage(
      stakingInstance.addRewardStream(stream3Id, 1, deployedAtBlock + 1, {from: owner}),
      'RewardStreamer: you cannot skip an index'
    );

    const stream1Id = 0;
    await stakingInstance.addRewardStream(stream1Id, 10, deployedAtBlock + 3, {from: owner});

    const stream2Id = 1;
    await stakingInstance.addRewardStream(stream2Id, 1, deployedAtBlock + 3, {from: owner});

    const stream4Id = 3;
    await shouldFailWithMessage(
      stakingInstance.addRewardStream(stream4Id, 1, deployedAtBlock + 1, {from: owner}),
      'RewardStreamer: you cannot skip an index'
    );
  });

  it('should revert if overwriting an existing stream', async () => {
    const [
      stakingInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStaking({skipMinting: true});

    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});

    await mockRewardInstance.approve(stakingInstance.address, 1);

    const stream1Id = 0;
    await stakingInstance.addRewardStream(stream1Id, 1, deployedAtBlock + 1, {from: owner});

    await shouldFailWithMessage(
      stakingInstance.addRewardStream(stream1Id, 1, deployedAtBlock + 1, {from: owner}),
      'RewardStreamer: periodStart must be smaller than rewardLastBlock'
    );
  });

  it('should revert if not enough tokens have been approved', async () => {
    const [
      stakingInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStaking({skipMinting: true});

    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});

    await mockRewardInstance.approve(stakingInstance.address, 99);

    await shouldFailWithMessage(
      stakingInstance.addRewardStream(0, 10, deployedAtBlock + 10, {from: owner}),
      'ERC20: transfer amount exceeds balance or allowance'
    );
  });

  it('should transfer only the correct amount of tokens', async () => {
    const [
      stakingInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStaking({skipMinting: true});

    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});

    await mockRewardInstance.approve(stakingInstance.address, 99999999);

    const stream1Id = 0;

    const balanceDelta = await tokenBalanceDeltaAfterAction(
      mockRewardInstance,
      stakingInstance.address,
      () => stakingInstance
        .addRewardStream(stream1Id, 10, deployedAtBlock + 10, {from: owner}) // 100 tokens
    );

    expectBignumberEqual(balanceDelta, 100);
  });

  it('should allow only owner to add rewards', async () => {
    const [stakingInstance, {deployedAtBlock}] = await deployStaking({skipMinting: true});

    const {firstUser} = await getStakeActorsAsync();

    const stream1Id = 0;
    await shouldFailWithMessage(
      stakingInstance
        .addRewardStream(stream1Id, 10, deployedAtBlock + 10, {from: firstUser}),
      'Ownable: caller is not the owner'
    );
  });

  it('should emit a RewardAdded event', async () => {
    const [
      stakingRewardInstance,
      {
        owner,
        mockRewardInstance,
        deployedAtBlock
      }
    ] = await deployStaking({skipMinting: true});

    await mockRewardInstance
      .mint(owner, toWei('1000000', 'ether'), {from: owner});

    await mockRewardInstance.approve(stakingRewardInstance.address, 99999999);

    const stream1Id = 0;

    const {args} = await findEventInTransaction(
      stakingRewardInstance
        .addRewardStream(stream1Id, 10, deployedAtBlock + 10, {from: owner}),
      'RewardStreamAdded'
    );

    expectBignumberEqual(args.rewardPerBlock, 10);
    expectBignumberEqual(args.rewardLastBlock, deployedAtBlock + 10);
    expectBignumberEqual(args.rewardInStream, 100);
  });
});
