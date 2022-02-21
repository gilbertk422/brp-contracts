const {expectBignumberEqual} = require('../../../helpers');
const {getStakeActorsAsync} = require('../../../helpers/address');
const {findEventInTransaction} = require('../../../helpers/events');
const {shouldFailWithMessage} = require('../../../helpers/utils');
const {deployStaking} = require('../../helpers/deploy');

const newValue = 111;

contract('Staking: admin::setTicketMintingRatio', () => {
  it('should set the ticketMintingRatio correctly', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    await stakingInstance.setTicketsMintingRatio(newValue, {from: owner});

    expectBignumberEqual(
      await stakingInstance.ticketsMintingRatio(),
      newValue
    );
  });

  it('should allow only owner to set ticket minting ratio', async () => {
    const [stakingInstance] = await deployStaking({skipMinting: true});

    const {firstUser} = await getStakeActorsAsync();

    await shouldFailWithMessage(
      stakingInstance
        .setTicketsMintingRatio(newValue, {from: firstUser}),
      'Ownable: caller is not the owner'
    );
  });

  it('should emit a TicketMintingRatioUpdated event', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    const {args} = await findEventInTransaction(
      stakingInstance.setTicketsMintingRatio(newValue, {from: owner}),
      'TicketMintingRatioUpdated'
    );

    expectBignumberEqual(
      args.newValue,
      newValue
    );
  });
});
