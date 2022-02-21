const {deployRaffle, deployMockPrize} = require('../helpers/deploy');
const {getRaffleActors} = require('../../helpers/address');
const {
  shouldFailWithMessage,
  increase,
  latest,
  duration,
  toBN
} = require('../../helpers/utils');
const {startRaffle} = require('../helpers/raffle');
const {expectBignumberEqual} = require('../../helpers/index');

contract('Raffle: addPrize', accounts => {
  it('should allow only Owner to add a Prize to a Raffle', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const [mockPrizeInstance, {owner: prizeOwner}] = await deployMockPrize();

    const {user} = getRaffleActors(accounts);
    const tokenId = '1';

    await mockPrizeInstance.mint(prizeOwner, tokenId, {from: prizeOwner});
    await mockPrizeInstance.approve(raffleInstance.address, tokenId, {from: prizeOwner});

    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    const raffleIndex = '0';
    await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    await shouldFailWithMessage(
      raffleInstance.addPrize(
        raffleIndex,
        mockPrizeInstance.address,
        tokenId,
        {from: user}
      ),
      'Ownable: caller is not the owner'
    );
  });

  it('should revert if Raffle is already concluded', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const [mockPrizeInstance, {owner: prizeOwner}] = await deployMockPrize();

    const tokenId = '1';

    await mockPrizeInstance.mint(prizeOwner, tokenId, {from: prizeOwner});
    await mockPrizeInstance.approve(raffleInstance.address, tokenId, {from: prizeOwner});

    const [raffleIndex] = await startRaffle(raffleInstance, {sendForward: true});

    await increase(1); // pass the end date

    await shouldFailWithMessage(
      raffleInstance.addPrize(
        raffleIndex,
        mockPrizeInstance.address,
        tokenId,
        {from: owner}
      ),
      'Raffle: Raffle is already concluded'
    );
  });

  it('should allow only if Raffle exists', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const [mockPrizeInstance, {owner: prizeOwner}] = await deployMockPrize();

    const tokenId = '1';

    await mockPrizeInstance.mint(prizeOwner, tokenId, {from: prizeOwner});
    await mockPrizeInstance.approve(raffleInstance.address, tokenId, {from: prizeOwner});

    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    await shouldFailWithMessage(
      raffleInstance.addPrize(
        '1',
        mockPrizeInstance.address,
        tokenId,
        {from: owner}
      ),
      'Raffle: Raffle does not exists'
    );
  });

  it('should add the Prize to the correct Raffle', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const [mockPrizeInstance, {owner: prizeOwner}] = await deployMockPrize();

    const tokenId = '1';

    await mockPrizeInstance.mint(prizeOwner, tokenId, {from: prizeOwner});
    await mockPrizeInstance.approve(raffleInstance.address, tokenId, {from: prizeOwner});

    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    const raffleIndex = '0';
    await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    await raffleInstance.addPrize(
      raffleIndex,
      mockPrizeInstance.address,
      tokenId,
      {from: owner}
    );

    const prize = await raffleInstance.getPrizeAtIndex(raffleIndex, '0');

    expect(prize['0']).to.be.equal(mockPrizeInstance.address);
    expect(prize['1'].toString()).to.be.equal(tokenId);
  });

  it('should transfer the Prize correctly to Raffle smart contract', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const [mockPrizeInstance, {owner: prizeOwner}] = await deployMockPrize();

    const tokenId = '1';

    await mockPrizeInstance.mint(prizeOwner, tokenId, {from: prizeOwner});
    await mockPrizeInstance.approve(raffleInstance.address, tokenId, {from: prizeOwner});

    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    const raffleIndex = '0';
    await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    await raffleInstance.addPrize(
      raffleIndex,
      mockPrizeInstance.address,
      tokenId,
      {from: owner}
    );

    const ownerOfToken = await mockPrizeInstance.ownerOf(tokenId);

    expect(ownerOfToken).to.be.equal(raffleInstance.address);
  });

  it('should never add RaffleTicket as Prize', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const [mockPrizeInstance, {owner: prizeOwner}] = await deployMockPrize();

    const tokenId = '1';

    await mockPrizeInstance.mint(prizeOwner, tokenId, {from: prizeOwner});
    await mockPrizeInstance.approve(raffleInstance.address, tokenId, {from: prizeOwner});

    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    const raffleIndex = '0';
    await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    await shouldFailWithMessage(
      raffleInstance.addPrize(
        raffleIndex,
        raffleTicketInstance.address,
        tokenId,
        {from: owner}
      ),
      'Raffle: Prize can not be a ticket'
    );
  });

  it('should emit a PrizeAdded Event', async () => {
    const [raffleInstance, {owner}] = await deployRaffle(accounts);
    const [mockPrizeInstance, {owner: prizeOwner}] = await deployMockPrize();

    const tokenId = '1';

    await mockPrizeInstance.mint(prizeOwner, tokenId, {from: prizeOwner});
    await mockPrizeInstance.approve(raffleInstance.address, tokenId, {from: prizeOwner});

    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    const raffleIndex = '0';
    await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    const result = await raffleInstance.addPrize(
      raffleIndex,
      mockPrizeInstance.address,
      tokenId,
      {from: owner}
    );

    const {args: {raffleIndex: storedRaffleIndex, prizeIndex}} = result.logs.find(({event: e}) => e === 'PrizeAdded');

    expectBignumberEqual(raffleIndex, storedRaffleIndex);
    expectBignumberEqual(prizeIndex, 0);
  });
});
