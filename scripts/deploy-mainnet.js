const { ethers } = require('hardhat')
const BN = ethers.BigNumber

async function main () {
    const tenPow9 = BN.from(10).pow(9)
    const DISTRIBUTED_AMOUNT_LP = 750
    const DISTRIBUTED_AMOUNT_XFUND = 250

    // Epoch 1 starts at Thu Feb 18 2021 12:00:00 GMT+0000 with an epoch duration of 2 weeks
    const EPOCH_1_START_TIME = 1613649600
    const EPOCH_LENGTH = 1209600 // 2 weeks

    const xfund = '0x892a6f9df0147e5f079b0993f486f9aca3c87881'
    const unilp = '0xab2d2f5bc36620a57ec4bb60d6a7df2a847deab5'

    // Staking contract
    const Staking = await ethers.getContractFactory('Staking')
    const staking = await Staking.deploy(EPOCH_1_START_TIME, EPOCH_LENGTH)
    await staking.deployed()
    console.log('Staking contract deployed to:', staking.address)

    // Deploy Community Vault
    const communityVault = await ethers.getContractFactory('CommunityVault')
    const cv = await communityVault.deploy(xfund)
    await cv.deployed()
    console.log('CommunityVault deployed to:', cv.address)

    // Deploy YieldFarm for Uniswap xFUND-ETH LP
    const YieldFarmLP = await ethers.getContractFactory('YieldFarmLP')
    const yflp = await YieldFarmLP.deploy(xfund, unilp, staking.address, cv.address)
    await yflp.deployed()
    console.log('YF_LP deployed to:', yflp.address)

    // Deploy YieldFarm for xFUND
    const YieldFarmXfund = await ethers.getContractFactory('YieldFarmXfund')
    const yfxf = await YieldFarmXfund.deploy(xfund, staking.address, cv.address)
    await yfxf.deployed()
    console.log('YF_xFUND deployed to:', yfxf.address)

    await sleep(16000)
    await cv.setAllowance(yflp.address, BN.from(DISTRIBUTED_AMOUNT_LP).mul(tenPow9))
    await sleep(16000)
    await cv.setAllowance(yfxf.address, BN.from(DISTRIBUTED_AMOUNT_XFUND).mul(tenPow9))
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
