const {expectBignumberEqual} = require('../../../helpers');
const {getStakeActorsAsync} = require('../../../helpers/address');
const {findEventInTransaction} = require('../../../helpers/events');
const {shouldFailWithMessage} = require('../../../helpers/utils');
const {deployStaking} = require('../../helpers/deploy');

const lockIndex = 6;
const lockNumber = 111;
const lockMultiplier = 222;

contract('Staking: admin::addLockDuration', () => {
  it('should add the Locks correctly', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    await stakingInstance.addLockDuration(lockNumber, lockMultiplier, {from: owner});

    expectBignumberEqual(
      await stakingInstance.locks(lockIndex),
      lockNumber
    );
    expectBignumberEqual(
      await stakingInstance.locksMultiplier(lockIndex),
      lockMultiplier
    );
  });

  it('should allow only owner to add Locks', async () => {
    const [stakingInstance] = await deployStaking({skipMinting: true});

    const {firstUser} = await getStakeActorsAsync();

    await shouldFailWithMessage(
      stakingInstance
        .addLockDuration(lockNumber, lockMultiplier, {from: firstUser}),
      'Ownable: caller is not the owner'
    );
  });

  it('should emit a LocksUpdated event', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    const {args} = await findEventInTransaction(
      stakingInstance.addLockDuration(lockNumber, lockMultiplier, {from: owner}),
      'LocksUpdated'
    );

    expectBignumberEqual(
      args.lockIndex,
      lockIndex // original locks + 1
    );
    expectBignumberEqual(
      args.lockNumber,
      lockNumber
    );
    expectBignumberEqual(
      args.lockMultiplier,
      lockMultiplier
    );
  });
});
