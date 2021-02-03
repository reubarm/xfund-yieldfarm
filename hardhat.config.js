const config = require('./config')

require('@nomiclabs/hardhat-waffle')
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require('solidity-coverage');
require('hardhat-abi-exporter');

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
    const accounts = await ethers.getSigners()

    for (const account of accounts) {
        console.log(await account.getAddress())
    }
})

// Some of the settings should be defined in `./config.js`.
// Go to https://buidler.dev/config/ for the syntax.
module.exports = {
    solidity: {
        version: '0.6.12',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
            },
        },
    },

    defaultNetwork: "hardhat",

    networks: config.networks,
    etherscan: config.etherscan,

    gasReporter: {
        enabled: !!(process.env.REPORT_GAS),
    },

    abiExporter: {
        path: './abi',
        only: ['Staking', 'YieldFarm', 'YieldFarmLP', 'YieldFarmBond', 'CommunityVault'],
        clear: true,
        flat: true,
    },
}
