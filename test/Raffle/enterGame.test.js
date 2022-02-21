const {deployRaffle} = require('../helpers/deploy');
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

contract('Raffle: enterGame', accounts => {
  it('should allow only if Raffle is not concluded', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex] = await startRaffle(raffleInstance, {sendForward: true});

    await increase(1); // we pass the raffle endDate

    await shouldFailWithMessage(
      raffleInstance.enterGame(
        raffleIndex,
        tokenId,
        {from: user}
      ),
      'Raffle: Raffle not running'
    );
  });

  it('should allow only if Raffle exists', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const now = await latest();
    const startDate = toBN(now).add(duration.seconds(10));
    const endDate = toBN(now).add(duration.hours(1));

    await raffleInstance.startRaffle(startDate, endDate, {from: owner});

    await shouldFailWithMessage(
      raffleInstance.enterGame(
        '1',
        tokenId,
        {from: user}
      ),
      'Raffle: Raffle does not exists'
    );
  });

  it('should add the Player to the correct raffle', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    const player = await raffleInstance.getPlayerAtIndex(raffleIndex, 0);

    expect(player).to.be.equal(user);
  });

  it('should transfer the Ticket correctly', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex] = await startRaffle(raffleInstance);

    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});
    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    const balance = await raffleTicketInstance.balanceOf(raffleInstance.address, tokenId);
    expectBignumberEqual(balance, toBN(1));
  });

  it('should emit a EnteredGame Event', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '2';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    {
      const enterGameResult = await raffleInstance
        .enterGame(raffleIndex, tokenId, {from: user});

      const event = enterGameResult.logs.find(({event: e}) => e === 'EnteredGame');

      expectBignumberEqual(event.args.raffleIndex, raffleIndex);
      expect(event.args.player).to.be.equal(user);
      expectBignumberEqual(event.args.playerIndexInRaffle, 0);
    }

    {
      const enterGameResult = await raffleInstance
        .enterGame(raffleIndex, tokenId, {from: user});

      const event = enterGameResult.logs.find(({event: e}) => e === 'EnteredGame');

      expectBignumberEqual(event.args.raffleIndex, raffleIndex);
      expect(event.args.player).to.be.equal(user);
      expectBignumberEqual(event.args.playerIndexInRaffle, 1);
    }
  });

  it('should allow the same Player to play multiple Tickets for the same Raffle', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});
    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});
    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex] = await startRaffle(raffleInstance);

    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});
    const balance1 = await raffleTicketInstance.balanceOf(raffleInstance.address, tokenId);

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});
    const balance2 = await raffleTicketInstance.balanceOf(raffleInstance.address, tokenId);

    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    const balance3 = await raffleTicketInstance.balanceOf(raffleInstance.address, tokenId);

    const playersCount = await raffleInstance.getPlayersLength(raffleIndex);

    expectBignumberEqual(balance1, toBN(1));
    expectBignumberEqual(balance2, toBN(2));
    expectBignumberEqual(balance3, toBN(3));

    expect(playersCount.toNumber()).to.be.equal(3);
  });

  it('should not require an "approve"', async () => {
    const [raffleInstance, {owner, raffleTicketInstance}] = await deployRaffle(accounts);
    const {user} = getRaffleActors(accounts);
    const tokenId = '0'; // always ticket id is 0
    const tokenAmount = '1';

    await raffleTicketInstance.mint(user, tokenId, tokenAmount, {from: owner});

    const [raffleIndex] = await startRaffle(raffleInstance);
    await raffleTicketInstance.setApprovalForAll(raffleInstance.address, true, {from: user});

    // here the Raffle calls transferFrom without requiring an approve() first
    await raffleInstance
      .enterGame(raffleIndex, tokenId, {from: user});

    const balance = await raffleTicketInstance.balanceOf(raffleInstance.address, tokenId);

    expectBignumberEqual(balance, toBN(1));
  });
});
