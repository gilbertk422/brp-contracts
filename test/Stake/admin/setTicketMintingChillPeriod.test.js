const {expectBignumberEqual} = require('../../../helpers');
const {getStakeActorsAsync} = require('../../../helpers/address');
const {findEventInTransaction} = require('../../../helpers/events');
const {shouldFailWithMessage} = require('../../../helpers/utils');
const {deployStaking} = require('../../helpers/deploy');

const newValue = 222;

contract('Staking: admin::setTicketMintingChillPeriod', () => {
  it('should set the TicketMintingChillPeriod correctly', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    await stakingInstance.setTicketsMintingChillPeriod(newValue, {from: owner});

    expectBignumberEqual(
      await stakingInstance.ticketsMintingChillPeriod(),
      newValue
    );
  });

  it('should allow only owner to set TicketMintingChillPeriod', async () => {
    const [stakingInstance] = await deployStaking({skipMinting: true});

    const {firstUser} = await getStakeActorsAsync();

    await shouldFailWithMessage(
      stakingInstance
        .setTicketsMintingChillPeriod(newValue, {from: firstUser}),
      'Ownable: caller is not the owner'
    );
  });

  it('should emit a TicketMintingChillPeriodUpdated event', async () => {
    const [stakingInstance, {owner}] = await deployStaking();

    const {args} = await findEventInTransaction(
      stakingInstance.setTicketsMintingChillPeriod(newValue, {from: owner}),
      'TicketMintingChillPeriodUpdated'
    );

    expectBignumberEqual(
      args.newValue,
      newValue
    );
  });
});
