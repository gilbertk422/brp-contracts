const {expectBignumberEqual} = require('../../../helpers');
const {getStakeActorsAsync} = require('../../../helpers/address');
const {findEventInTransaction} = require('../../../helpers/events');
const {shouldFailWithMessage} = require('../../../helpers/utils');
const {deployStaking} = require('../../helpers/deploy');

const lockIndex = 0;
const lockNumber = 111;
const lockMultiplier = 222;

contract('Staking: admin::updateLocks', () => {
  it('should set the Locks correctly', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    await stakingInstance.updateLocks(lockIndex, lockNumber, lockMultiplier, {from: owner});

    expectBignumberEqual(
      await stakingInstance.locks(lockIndex),
      lockNumber
    );
    expectBignumberEqual(
      await stakingInstance.locksMultiplier(lockIndex),
      lockMultiplier
    );
  });

  it('should allow only owner to set Locks', async () => {
    const [stakingInstance] = await deployStaking({skipMinting: true});

    const {firstUser} = await getStakeActorsAsync();

    await shouldFailWithMessage(
      stakingInstance
        .updateLocks(lockIndex, lockNumber, lockMultiplier, {from: firstUser}),
      'Ownable: caller is not the owner'
    );
  });

  it('should emit a LocksUpdated event', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    const {args} = await findEventInTransaction(
      stakingInstance.updateLocks(lockIndex, lockNumber, lockMultiplier, {from: owner}),
      'LocksUpdated'
    );

    expectBignumberEqual(
      args.lockIndex,
      lockIndex
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
