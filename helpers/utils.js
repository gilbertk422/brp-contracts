const {ethers} = require('ethers');
const Web3 = require('web3');
const {expectRevert, time} = require('@openzeppelin/test-helpers');
const {upgradeProxy, deployProxy} = require('@openzeppelin/truffle-upgrades');

const expectVMException = expectRevert.unspecified;
const expectInvalidOpCode = expectRevert.invalidOpcode;
const shouldFailWithMessage = expectRevert;

if(typeof web3 === 'undefined') {
  // eslint-disable-next-line no-global-assign
  web3 = new Web3();
}

const {getBlockNumber} = web3.eth;

const {
  advanceBlockTo,
  advanceBlock,
  increase,
  increaseTo,
  latest,
  duration
} = time;
const advanceBlocks = async blocksToSkip => {
  const currentBlock = await getBlockNumber();
  await advanceBlockTo(currentBlock + blocksToSkip);
};
const {parseEther, formatEther} = ethers.utils;
const toHex = value => web3.utils.toHex(value);
const hexToBytes = hex => web3.utils.hexToBytes(hex);
const hexToUtf8 = hex => web3.utils.hexToUtf8(hex);
const bytesToHex = bytes => web3.utils.bytesToHex(bytes);
const padLeft = (str, charAmount) => web3.utils.padLeft(str, charAmount);
const padRight = (str, charAmount) => web3.utils.padRight(str, charAmount);
const {soliditySha3} = web3.utils;
const {encodeFunctionSignature} = web3.eth.abi;
const asciiToHex = str => web3.utils.asciiToHex(str);
const encodeBytes32Param = str => asciiToHex(str);
const stringToBytes32 = str => web3.utils.fromAscii(str);
const bytes32ToString = bytes => web3.utils.toAscii(bytes);
const {toBN} = web3.utils;

const toWei = (amount, denomination = 'ether') => web3.utils.toWei(`${amount}`, denomination);

const fromWei = (amount, denomination = 'ether') => web3.utils.fromWei(`${amount}`, denomination);

module.exports = {
  expectVMException,
  expectInvalidOpCode,
  shouldFailWithMessage,
  toHex,
  hexToBytes,
  hexToUtf8,
  bytesToHex,
  padLeft,
  padRight,
  soliditySha3,
  encodeFunctionSignature,
  encodeBytes32Param,
  stringToBytes32,
  bytes32ToString,
  parseEther,
  formatEther,
  upgradeProxy,
  deployProxy,
  advanceBlockTo,
  advanceBlock,
  advanceBlocks,
  toBN,
  increase,
  increaseTo,
  latest,
  duration,
  toWei,
  fromWei,
  getBlockNumber
};
