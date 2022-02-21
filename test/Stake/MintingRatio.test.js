const {expectBignumberEqual} = require('../../helpers');
const {toWei, shouldFailWithMessage, toBN} = require('../../helpers/utils');
const {deployStaking} = require('../helpers/deploy');
const {getRaffleActors} = require('../../helpers/address');

contract('Stake: mintingRatio', accounts => {
  it('should set the minting ratio correctly', async () => {
    const [stakingInstance] = await deployStaking({skipMinting: true});

    const ticketsMintingRatio = await stakingInstance.ticketsMintingRatio();

    expectBignumberEqual(ticketsMintingRatio, toBN(toWei('100', 'ether')));
  });

  it('should fail to update ticketsMintingRatio if not Owner ', async () => {
    const [stakingInstance] = await deployStaking({skipMinting: true});
    const {user: alice} = getRaffleActors(accounts, 1);

    const ticketsMintingRatio = await stakingInstance.ticketsMintingRatio();

    expectBignumberEqual(ticketsMintingRatio, toBN(toWei('100', 'ether')));

    await shouldFailWithMessage(
      stakingInstance.setTicketsMintingRatio(toWei('300', 'ether'), {from: alice}),
      'Ownable: caller is not the owner'
    );
  });

  it('should update the minting ratio correctly', async () => {
    const [stakingInstance, {owner}] = await deployStaking({skipMinting: true});

    const ticketsMintingRatio = await stakingInstance.ticketsMintingRatio();

    expectBignumberEqual(ticketsMintingRatio, toBN(toWei('100', 'ether')));

    await stakingInstance.setTicketsMintingRatio(toWei('300', 'ether'), {from: owner});

    const newTicketsMintingRatio = await stakingInstance.ticketsMintingRatio();

    expectBignumberEqual(newTicketsMintingRatio, toBN(toWei('300', 'ether')));
  });
});
