const {deployRaffle} = require('../helpers/deploy');
const {getRaffleActors} = require('../../helpers/address');
const {DEFAULT_GRACE_PERIOD} = require('../../helpers/constants');
const {shouldFailWithMessage, duration} = require('../../helpers/utils');

contract('Raffle: changeWithdrawGracePeriod', accounts => {
  it('should allow only Owner to change withdraw grace period', async () => {
    const [raffleInstance] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);

    await shouldFailWithMessage(
      raffleInstance.changeWithdrawGracePeriod(duration.hours(1), {from: user}),
      'Ownable: caller is not the owner'
    );
  });
  
  it('should throw is grace period is shorder than one week', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);

    await shouldFailWithMessage(
      raffleInstance.changeWithdrawGracePeriod(duration.hours(1), {from: owner}),
      'Withdraw grace period too short'
    );
  });

  it('should change withdraw grace period correctly', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);

    const defaultValue = await raffleInstance.withdrawGracePeriod();
    expect(defaultValue.toString()).to.be.equal(DEFAULT_GRACE_PERIOD);

    await raffleInstance.changeWithdrawGracePeriod(duration.weeks(2), {from: owner});
    const changedValue = await raffleInstance.withdrawGracePeriod();
    expect(changedValue.toString()).to.be.equal(duration.weeks(2).toString());
  });
});
