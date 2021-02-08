const { ethers } = require('hardhat')
const BN = ethers.BigNumber

async function main () {
    const tenPow9 = BN.from(10).pow(9)
    const TOTAL_DISTRIBUTED_AMOUNT = 10

    const xfundAddr = '0x245330351344F9301690D5D8De2A07f5F32e1149'
    const stakingAddr = '0x1Da1B0e5DdcC97Ec8C9Ac093ab79DD3D5D8A58F6'
    const cvAddr = '0xb100bDb465ffd26F90B950EF9cE1cc8521351818'

    // Load xFUNDMOCK
    const xFundMock = await ethers.getContractAt('xFUNDMockToken', xfundAddr)

    // Load CV
    const CV = await ethers.getContractAt('CommunityVault', cvAddr)

    // Deploy YieldFarm for xFUND
    const YieldFarmXfund = await ethers.getContractFactory('YieldFarmXfund')

    const yfxf = await YieldFarmXfund.deploy(xfundAddr, stakingAddr, cvAddr)
    await yfxf.deployed()
    console.log('YF_xFUND deployed to:', yfxf.address)

    await sleep(1000)
    // initialise stuff - send 100 xFUND to CV, and allow LP Yield Farm to spend 100 from CV
    await xFundMock.transfer(cvAddr, BN.from(TOTAL_DISTRIBUTED_AMOUNT).mul(tenPow9))

    await sleep(16000)
    await CV.setAllowance(yfxf.address, BN.from(TOTAL_DISTRIBUTED_AMOUNT).mul(tenPow9))
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
