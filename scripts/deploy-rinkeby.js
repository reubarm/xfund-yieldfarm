const { ethers } = require('hardhat')
const BN = ethers.BigNumber

async function main () {
    const tenPow18 = BN.from(10).pow(18)
    const DISTRIBUTED_AMOUNT_LP = 24000000
    const DISTRIBUTED_AMOUNT_UNIX = 6000000
    // Epoch 1 starts at Mon Nov 29 2021 10:00:00 GMT+0000 with an epoch duration of 1 hour
    const EPOCH_1_START_TIME = 1638180000
    const EPOCH_LENGTH = 3600 // 6 hours

    const unix = '0xDDD6A0ECc3c6F6C102E5eA3d8Af7B801d1a77aC8'
    const unilp = '0xdec047b52fc35ac30d21a09ceb79c85e38d07936'

    // Load UNiX ABI
    const UNiX = await ethers.getContractAt('ERC20Mock', unix)

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
    console.log('YF_UNIX deployed to:', yfunix.address)

    await sleep(16000)
    let tx
    // initialise stuff - send UNiX to CV, and allow LP Yield Farm to spend from CV
    tx = await UNiX.transfer(cv.address, BN.from(DISTRIBUTED_AMOUNT_LP).mul(tenPow18))
    console.log('tx', tx.hash)
    await sleep(16000)
    tx = await cv.setAllowance(yflp.address, BN.from(DISTRIBUTED_AMOUNT_LP).mul(tenPow18))
    console.log('tx', tx.hash)
    await sleep(16000)

    // initialise stuff - send UNiX to CV, and allow UNiX Yield Farm to spend from CV
    tx = await UNiX.transfer(cv.address, BN.from(DISTRIBUTED_AMOUNT_UNIX).mul(tenPow18))
    console.log('tx', tx.hash)
    await sleep(16000)
    tx = await cv.setAllowance(yfunix.address, BN.from(DISTRIBUTED_AMOUNT_UNIX).mul(tenPow18))
    console.log('tx', tx.hash)
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
