const { ethers } = require('hardhat')
const BN = ethers.BigNumber

async function main () {
    const tenPow9 = BN.from(10).pow(9)
    const TOTAL_DISTRIBUTED_AMOUNT = 20

    const xfund = '0x245330351344F9301690D5D8De2A07f5F32e1149'
    const unilp = '0x261aa758c5701635cad0c10e24acc2949855f187'

    // Load xFUNDMOCK
    const xFundMock = await ethers.getContractAt('xFUNDMockToken', xfund)

    // Staking contract
    const Staking = await ethers.getContractFactory('Staking')

    // Epoch 1 starts at Fri, 05 Feb 2021 18:00:00 +0000 UTC and epoch duration of 12 hours
    const staking = await Staking.deploy(1612548000, 43200)
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

    // initialise stuff - send 20 xFUND to CV, and allow LP Yield Farm to spend 20 from CV
    await xFundMock.transfer(cv.address, BN.from(TOTAL_DISTRIBUTED_AMOUNT).mul(tenPow9))
    await cv.setAllowance(yflp.address, BN.from(TOTAL_DISTRIBUTED_AMOUNT).mul(tenPow9))
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
