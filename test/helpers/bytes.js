const {web3} = require('@openzeppelin/test-helpers/src/setup');

const numberToBytes32 = num => {
  const hex = web3.utils.numberToHex(num);
  const bytes = web3.utils.hexToBytes(hex);

  return [...new Array(32 - bytes.length).fill(0), ...bytes];
};

const addressToBytes = address => web3.utils.hexToBytes(address);

const stringToBytes = str => {
  const hex = web3.utils.utf8ToHex(str);
  return web3.utils.hexToBytes(hex);
};

const createCallData = (
  index,
  tokenAddress,
  tokenId
) => [...numberToBytes32(index), ...addressToBytes(tokenAddress), ...numberToBytes32(tokenId)];

const hexToString = hex => web3.utils.hexToUtf8(hex);
const hexToNumberString = hex => web3.utils.hexToNumberString(hex);

module.exports = {
  numberToBytes32,
  addressToBytes,
  stringToBytes,
  createCallData,
  hexToString,
  hexToNumberString
};
