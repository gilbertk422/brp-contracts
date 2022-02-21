/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('@openzeppelin/hardhat-upgrades');
require('@nomiclabs/hardhat-truffle5');
require('@nomiclabs/hardhat-web3');
require('hardhat-gas-reporter');
require('@nomiclabs/hardhat-waffle');
require('hardhat-contract-sizer');
require('hardhat-deploy');

const {mnemonic, mainnetMnemonic} = require('./mnemonics');

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.6.2'
      },
      {
        version: '0.7.3'
      },
      {
        version: '0.8.0'
      }
    ]
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic
      }
    },
    kovan: {
      url: 'https://kovan.infura.io/v3/a1f1a6ef150f4c25996cc3c45314c03f',
      accounts: {
        mnemonic
      },
      live: true,
      saveDeployments: true,
      tags: ['staging']
    },
    mainnet: {
      url: 'https://www.infura.io/v3/a1f1a6ef150f4c25996cc3c45314c03f',
      accounts: {
        mnemonic: mainnetMnemonic
      },
      live: true,
      saveDeployments: true,
      tags: ['staging']
    }
  },
  gasReporter: {
    currency: 'GBP',
    coinmarketcap: '03006a7b-32df-4188-813e-d59e6b2431b5'
  }
};
