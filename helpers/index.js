const path = require('path');
const glob = require('glob');
const {expect} = require('chai');
const {toBN} = require('./utils');

const requireAllTestsInFolder = (pattern = './test/**/*.test.js') => glob.sync(pattern).forEach(file => {
  // eslint-disable-next-line import/no-dynamic-require
  require(path.resolve(file));
});

const expectBignumberEqual = (a, b) => expect(a.toString()).to.be.equal(b.toString());

const calculateTicketsAmount = (userStake, currentBlock) => {
  const {
    stakingUnits,
    ticketsMintingChillPeriodWhenEntered,
    ticketsMintingRatioWhenEntered,
    ticketsMinted,
    enteredAtBlock,
    lockedTill
  } = userStake;

  const blocksDelta = Math.min(
    (currentBlock - Number(enteredAtBlock)),
    (lockedTill - Number(enteredAtBlock))
  ) + Number(ticketsMintingChillPeriodWhenEntered);

  const periodsPassed = Math.floor(blocksDelta / Number(ticketsMintingChillPeriodWhenEntered));

  const multipliedUnits = toBN(stakingUnits).mul(toBN(periodsPassed));

  const printableTickets = multipliedUnits.div(toBN(ticketsMintingRatioWhenEntered));

  const netPrintableTickets = printableTickets.sub(toBN(ticketsMinted));

  return netPrintableTickets.toNumber();
};

const getExpectedTicketsAtStake = userStake => {
  const {
    stakingUnits,
    ticketsMintingRatioWhenEntered
  } = userStake;

  const expectedTickets = toBN(stakingUnits).div(toBN(ticketsMintingRatioWhenEntered));

  return expectedTickets.toNumber();
};

module.exports = {
  expect,
  expectBignumberEqual,
  requireAllTestsInFolder,
  calculateTicketsAmount,
  getExpectedTicketsAtStake
};
