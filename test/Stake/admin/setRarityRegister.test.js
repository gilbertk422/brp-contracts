const {getStakeActorsAsync} = require('../../../helpers/address');
const {findEventInTransaction} = require('../../../helpers/events');
const {shouldFailWithMessage} = require('../../../helpers/utils');
const {deployStaking} = require('../../helpers/deploy');

contract('Staking: admin::setRarityRegister', () => {
  it('should set the rarity registry correctly', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    await stakingInstance.setRarityRegister(owner); // any address

    expect(await stakingInstance.rarityRegister()).to.be.equal(owner);
  });

  it('should allow only owner to set rarity registry', async () => {
    const [stakingInstance] = await deployStaking({skipMinting: true});

    const {firstUser} = await getStakeActorsAsync();

    await shouldFailWithMessage(
      stakingInstance
        .setRarityRegister(firstUser, {from: firstUser}),
      'Ownable: caller is not the owner'
    );
  });

  it('should emit a RewardAdded event', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    const {args} = await findEventInTransaction(
      stakingInstance.setRarityRegister(owner, {from: owner}),
      'RarityRegisterUpdated'
    );

    expect(args.rarityRegister).to.be.equal(owner);
  });
});
