const { ethers } = require('hardhat')
const BN = ethers.BigNumber

async function main () {
    const tenPow18 = BN.from(10).pow(18)
    const DISTRIBUTED_AMOUNT_LP = 13500000
    const DISTRIBUTED_AMOUNT_UNIX = 4500000

    // Epoch 1 starts at Fri Dec 03 2021 08:00:00 GMT+0000 with an epoch duration of 30 days
    const EPOCH_1_START_TIME = 1638518400
    const EPOCH_LENGTH = 2592000 // 30 days

    const unix = '0xddd6a0ecc3c6f6c102e5ea3d8af7b801d1a77ac8'
    const unilp = '0xccab68f48531215b0707e8d908c43e7de73dbdbc'

    // Staking contract
    const Staking = await ethers.getContractFactory('Staking')
    const staking = await Staking.deploy(EPOCH_1_START_TIME, EPOCH_LENGTH)
    await staking.deployed()
    console.log('Staking contract deployed to:', staking.address)

    // Deploy Community Vault
    const communityVault = await ethers.getContractFactory('CommunityVault')
    const cv = await communityVault.deploy(unix)
    await cv.deployed()
    console.log('CommunityVault deployed to:', cv.address)

    // Deploy YieldFarm for Uniswap UNiX-ETH LP
    const YieldFarmLP = await ethers.getContractFactory('YieldFarmLP')
    const yflp = await YieldFarmLP.deploy(unix, unilp, staking.address, cv.address)
    await yflp.deployed()
    console.log('YF_LP deployed to:', yflp.address)

    // Deploy YieldFarm for UNiX
    const YieldFarmUnix = await ethers.getContractFactory('YieldFarmUnix')
    const yfunix = await YieldFarmUnix.deploy(unix, staking.address, cv.address)
    await yfunix.deployed()
    console.log('YF_UNiX deployed to:', yfunix.address)

    await sleep(16000)
    await cv.setAllowance(yflp.address, BN.from(DISTRIBUTED_AMOUNT_LP).mul(tenPow18))
    await sleep(16000)
    await cv.setAllowance(yfunix.address, BN.from(DISTRIBUTED_AMOUNT_UNIX).mul(tenPow18))
}

function sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
