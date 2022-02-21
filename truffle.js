const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
const {mnemonic, mainnetMnemonic} = require('./mnemonics');

const web3 = new Web3();

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      gasPrice: 0, // web3.utils.toWei('11', 'gwei'),
      gas: 8000000, // <-- This is the limit on the mainnet
      network_id: '*', // Match any network id,
      disableConfirmationListener: true
    },
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8555, // <-- If you change this, also set the port option in .solcover.js.
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 1 // <-- Use this low gas price.
    },
    kovan: {
      provider: () => new HDWalletProvider(mnemonic, 'wss://kovan.infura.io/ws/v3/a1f1a6ef150f4c25996cc3c45314c03f', 0, 9),
      network_id: 42,
      gas: 7638796,
      gasPrice: web3.utils.toWei('150', 'gwei'),
      skipDryRun: true,
      networkCheckTimeout: 90000
    },
    mainnet: {
      provider: () => new HDWalletProvider(mainnetMnemonic, 'https://mainnet.infura.io/v3/b54a5c306d464cc4ac30d7aa31f70bca', 0, 9),
      network_id: 1,
      gas: 900000,
      gasPrice: web3.utils.toWei('120', 'gwei'),
      skipDryRun: true
    }
  },

  compilers: {
    solc: {
      version: '0.6.2',
      settings: {
        optimizer: {
          enabled: true
        }
      }
    }
  },

  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'GBP',
      coinmarketcap: '03006a7b-32df-4188-813e-d59e6b2431b5'
    }
  }
};
