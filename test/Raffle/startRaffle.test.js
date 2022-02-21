const {deployRaffle} = require('../helpers/deploy');
const {getRaffleActors} = require('../../helpers/address');
const {
  shouldFailWithMessage,
  latest,
  duration,
  toBN
} = require('../../helpers/utils');
const {findEventInTransaction} = require('../../helpers/events');

contract('Raffle: startRaffle', accounts => {
  it('should emit a RaffleStarted Event', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    const result = await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    const {args} = await findEventInTransaction(
      result,
      'RaffleStarted'
    );

    expect(args.startDate.toString()).to.be.equal(startDate.toString());
    expect(args.endDate.toString()).to.be.equal(endDate.toString());
    expect(args.raffleIndex.toString()).to.be.equal('0');
  });

  it('should allow only Owner to start a new Raffle', async () => {
    const [raffleInstance] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    await shouldFailWithMessage(
      raffleInstance.startRaffle(startDate, endDate, {from: user}),
      'Ownable: caller is not the owner'
    );
  });

  it('should store revert if startDate is lower that now', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const now = await latest();
    const startDate = toBN(now).sub(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    await shouldFailWithMessage(
      raffleInstance.startRaffle(startDate, endDate, {from: owner}),
      'Raffle: Start date should be later than current block time'
    );
  });

  it('should store  if startDate is higher that endDate', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const now = await latest();
    const startDate = toBN(now).add(duration.hours(2));
    const endDate = toBN(now).add(duration.hours(1));

    await shouldFailWithMessage(
      raffleInstance.startRaffle(startDate, endDate, {from: owner}),
      'Raffle: End date should be later than start date'
    );
  });

  it('should store the Raffle end date and start date correctly', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    const raffleInfo = await raffleInstance.raffleInfo(0);

    expect(raffleInfo.startDate.toString()).to.be.equal(startDate.toString());
    expect(raffleInfo.endDate.toString()).to.be.equal(endDate.toString());
  });

  it('should create a new Raffle correctly', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    const raffleInfo = await raffleInstance.raffleInfo(0);

    expect(raffleInfo.startDate.toString()).to.be.equal(startDate.toString());
    expect(raffleInfo.endDate.toString()).to.be.equal(endDate.toString());
    expect(raffleInfo.randomResult.toString()).to.be.equal('0');
  });
});
