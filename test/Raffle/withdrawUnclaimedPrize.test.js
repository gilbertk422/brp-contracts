/* eslint-disable max-len */
const {deployRaffle} = require('../helpers/deploy');
const {startRaffleAndDraftWinners} = require('../helpers/raffle');
const {findEventInTransaction} = require('../../helpers/events');
const {shouldFailWithMessage, increase} = require('../../helpers/utils');
const {getRaffleActorsAsync} = require('../../helpers/address');
const {expectBignumberEqual} = require('../../helpers/index');

contract('Raffle: withdrawUnclaimedPrize', accounts => {
  it('should allow only Owner to withdraw a Prize', async () => {
    const [raffleInstance, {raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle();
    const {user} = await getRaffleActorsAsync();

    const {prizes, raffleIndex} = await startRaffleAndDraftWinners(
      raffleInstance,
      {
        raffleTicketInstance,
        VRFCoordinatorInstance,
        playerAccounts: []
      }
    );

    await Promise.all(prizes.map(async ([_, prizeIndex]) => {
      await shouldFailWithMessage(
        raffleInstance.unlockUnclaimedPrize(raffleIndex, prizeIndex, {from: user}),
        'Ownable: caller is not the owner'
      );
    }));
  });

  it('should allow to withdraw only after grace period has passed', async () => {
    const [raffleInstance, {owner, raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle(accounts);

    const {prizes, raffleIndex} = await startRaffleAndDraftWinners(
      raffleInstance,
      {
        raffleTicketInstance,
        VRFCoordinatorInstance
      }
    );

    await Promise.all(prizes.map(async ([_, prizeIndex]) => {
      await shouldFailWithMessage(
        raffleInstance.unlockUnclaimedPrize(raffleIndex, prizeIndex, {from: owner}),
        'Raffle: Grace period not passed yet'
      );
    }));
  });

  it('should allow to withdraw correctly', async () => {
    const [raffleInstance, {owner, raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle(accounts);

    const {prizes, raffleIndex} = await startRaffleAndDraftWinners(
      raffleInstance,
      {
        raffleTicketInstance,
        VRFCoordinatorInstance
      }
    );

    const gracePeriod = await raffleInstance.withdrawGracePeriod();
    await increase(gracePeriod);

    await Promise.all(prizes.map(async ([prizeInstance, prizeIndex, prizeTokenId]) => {
      const {args: {winner, raffleIndex: raffleIndexReturned, prizeIndex: prizeIndexStored}} = await findEventInTransaction(
        raffleInstance.unlockUnclaimedPrize(raffleIndex, prizeIndex, {from: owner}),
        'PrizeClaimed'
      );

      expect(winner).to.be.equal(owner);
      expectBignumberEqual(raffleIndexReturned, raffleIndex);
      expectBignumberEqual(prizeIndex, prizeIndexStored);

      const newOwner = await prizeInstance.ownerOf(prizeTokenId);
      expect(newOwner).to.be.equal(owner);
    }));
  });

  it('should allow to withdraw immediatelly if no Players entered the game', async () => {
    const [raffleInstance, {owner, raffleTicketInstance, VRFCoordinatorInstance}] = await deployRaffle(accounts);

    const {prizes, raffleIndex} = await startRaffleAndDraftWinners(
      raffleInstance,
      {
        raffleTicketInstance,
        VRFCoordinatorInstance,
        playerAccounts: []
      }
    );

    await Promise.all(prizes.map(async ([_, prizeIndex]) => {
      const {args: {winner, raffleIndex: raffleIndexReturned, prizeIndex: prizeIndexStored}} = await findEventInTransaction(
        raffleInstance.unlockUnclaimedPrize(raffleIndex, prizeIndex, {from: owner}),
        'PrizeClaimed'
      );

      expect(winner).to.be.equal(owner);
      expectBignumberEqual(raffleIndexReturned, raffleIndex);
      expectBignumberEqual(prizeIndex, prizeIndexStored);
    }));
  });
});
