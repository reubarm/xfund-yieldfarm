const { ethers } = require('hardhat')
const BN = ethers.BigNumber

/*
 * For testing on local network (Hardhat/Ganache node). Deploys mocks
 * an initialises a sandbox
 */

async function main () {
    const tenPow9 = BN.from(10).pow(9)
    const tenPow18 = BN.from(10).pow(18)

    const [creator, user1, user2, user3, user4, user5] = await ethers.getSigners()

    const xFundMock = await ethers.getContractFactory('ERC20Mock9Decimals')
    const xfund = await xFundMock.deploy()
    await xfund.deployed()

    console.log('xFundMock contract deployed to:', xfund.address)

    await xfund.mint(creator.address, BN.from(1000).mul(tenPow9))
    await xfund.mint(user1.address, BN.from(10).mul(tenPow9))
    await xfund.mint(user2.address, BN.from(10).mul(tenPow9))
    await xfund.mint(user3.address, BN.from(10).mul(tenPow9))
    await xfund.mint(user4.address, BN.from(10).mul(tenPow9))
    await xfund.mint(user5.address, BN.from(10).mul(tenPow9))

    const LPMock = await ethers.getContractFactory('ERC20Mock')
    const unilp = await LPMock.deploy()
    await unilp.deployed()

    // mint 1
    await unilp.mint(user1.address, BN.from(1).mul(tenPow18))
    await unilp.mint(user2.address, BN.from(2).mul(tenPow18))
    await unilp.mint(user3.address, BN.from(3).mul(tenPow18))
    await unilp.mint(user4.address, BN.from(4).mul(tenPow18))
    await unilp.mint(user5.address, BN.from(5).mul(tenPow18))

    console.log('LPMock contract deployed to:', unilp.address)

    // We get the contract to deploy
    const Staking = await ethers.getContractFactory('Staking')

    const staking = await Staking.deploy(Math.floor(Date.now() / 1000) + 1000, 1000)

    await staking.deployed()

    console.log('Staking contract deployed to:', staking.address)

    const communityVault = await ethers.getContractFactory('CommunityVault')
    const cv = await communityVault.deploy(xfund.address)
    await cv.deployed()
    console.log('CommunityVault deployed to:', cv.address)

    const YieldFarmLP = await ethers.getContractFactory('YieldFarmLP')

    const yflp = await YieldFarmLP.deploy(xfund.address, unilp.address, staking.address, cv.address)
    await yflp.deployed()
    console.log('YF_LP deployed to:', yflp.address)

    // Deploy YieldFarm for xFUND
    const YieldFarmXfund = await ethers.getContractFactory('YieldFarmXfund')
    const yfxf = await YieldFarmXfund.deploy(xfund.address, staking.address, cv.address)
    await yfxf.deployed()
    console.log('YF_xFUND deployed to:', yfxf.address)

    // initialise stuff
    await xfund.transfer(cv.address, BN.from(200).mul(tenPow9))
    await cv.setAllowance(yflp.address, BN.from(150).mul(tenPow9))
    await cv.setAllowance(yfxf.address, BN.from(50).mul(tenPow9))

    // some staking - LP
    await unilp.connect(user1).approve(staking.address, BN.from('500000000000000000'))
    await staking.connect(user1).deposit(unilp.address, BN.from('500000000000000000'))

    await unilp.connect(user2).approve(staking.address, BN.from('1000000000000000000'))
    await staking.connect(user2).deposit(unilp.address, BN.from('1000000000000000000'))

    await unilp.connect(user3).approve(staking.address, BN.from('1500000000000000000'))
    await staking.connect(user3).deposit(unilp.address, BN.from('1500000000000000000'))

    // some staking - xFUND
    await xfund.connect(user1).approve(staking.address, BN.from('3000000000'))
    await staking.connect(user1).deposit(xfund.address, BN.from('3000000000'))

    await xfund.connect(user2).approve(staking.address, BN.from('2000000000'))
    await staking.connect(user2).deposit(xfund.address, BN.from('2000000000'))

    await xfund.connect(user3).approve(staking.address, BN.from('1000000000'))
    await staking.connect(user3).deposit(xfund.address, BN.from('1000000000'))

    console.log('Finished')
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
