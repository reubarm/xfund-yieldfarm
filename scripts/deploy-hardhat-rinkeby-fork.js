const { ethers } = require('hardhat')
const BN = ethers.BigNumber
const uniRouterAbi = require('../test/abi/UniswapV2Router02.json')
const uniLpAbi = require('../test/abi/uniswap_v2.json')

/*
 * Complete sandbox For testing on local network (Hardhat/Ganache node) using a
 * Rinkeby fork. Run the node with:
 *
 * npx ganache-cli --fork 'https://rinkeby.infura.io/v3/INFURA_API_KEY' \
 *                 --deterministic \
 *                 --accounts 20 \
 *                 --networkId 31337 \
 *                 --mnemonic 'one that matches networks.hardhat.accounts.mnemonic in config.js'
 *                 --blockTime 5
 *
 * Script will deploy Yield Farm, Staking and CV contracts, and initialise a sandbox environment
 *
 * Run using:
 *
 * npx hardhat run scripts/deploy-hardhat-rinkeby-fork.js --network localhost
 */

async function mineBlock (numSeconds) {
    const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false])
    const currentUnix = Math.floor(Date.now() / 1000)
    const timestamp = currentUnix + numSeconds
    const currentTs = block.timestamp
    const diff = timestamp - currentTs
    if (diff > 0) {
        await ethers.provider.send('evm_increaseTime', [ diff ])
        await ethers.provider.send('evm_mine')
    }
}

async function addLiquidityToUni (xFundAddr, uniRouter, uniLpContract, user, xFundAmount) {
    const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false])
    const currentTs = block.timestamp
    const [reserve0, reserve1] = await uniLpContract.getReserves()
    const qEth = await uniRouter.quote(xFundAmount, reserve0, reserve1)
    await uniRouter
        .connect(user)
        .addLiquidityETH(xFundAddr, xFundAmount, xFundAmount, qEth, user.address, currentTs + 1200, { value: qEth })
}

async function swapTokenForETH (uniRouter, user, xFundAmount) {
    const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false])
    const currentTs = block.timestamp
    // address pair is [xFUND, WETH]
    await uniRouter
        .connect(user)
        .swapExactTokensForETH(
            xFundAmount,
            1,
            ['0x245330351344F9301690D5D8De2A07f5F32e1149', '0xc778417e063141139fce010982780140aa0cd5ab'],
            user.address,
            currentTs + 1200,
        )
}

async function gimmeXFUND (xFundMock) {
    const signers = await ethers.getSigners()
    for (let i = 0; i < signers.length; i += 1) {
        await xFundMock.connect(signers[i]).gimme()
    }
}

async function transferXFUNDToCreator (xFundMock) {
    const signers = await ethers.getSigners()
    for (let i = 0; i < signers.length; i += 1) {
        if (i > 5) {
            await xFundMock.connect(signers[i]).transfer(signers[0].address, BN.from(10).mul(BN.from(10).pow(9)))
        }
    }
}

async function main () {
    const tenPow9 = BN.from(10).pow(9)
    const cvAmount = 100

    const [creator, user1, user2, user3, user4, user5] = await ethers.getSigners()

    // Rinkeby addresses for xFUND and Uni-xFUND-ETH LP contracts
    const xfund = '0x245330351344F9301690D5D8De2A07f5F32e1149'
    const unilp = '0x261aa758c5701635cad0c10e24acc2949855f187'
    const uniLpContract = await ethers.getContractAt(uniLpAbi, unilp)

    // for approval and adding liquidity in sandbox
    const uniRouterAddr = '0x7a250d5630b4cf539739df2c5dacb4c659f2488d'
    const uniAllowance = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
    const uniRouter = await ethers.getContractAt(uniRouterAbi, uniRouterAddr)

    // other tokens
    const usdc = '0x6ddF381aBf26a9c57FBc34fcb9aceb7A101c84de'
    const susd = '0x9ac3462b9A259bAEF295A8C90b2984738fd7AadD'
    const dai = '0x95fD7265D5a4d8705d62A5840c5a0d69e019DCe4'

    const xFundMock = await ethers.getContractAt('xFUNDMockToken', xfund)

    // mint some xFUNDMOCK and ensure creator account has enough for Community Vault
    await gimmeXFUND(xFundMock)
    await sleep(6000)
    await transferXFUNDToCreator(xFundMock)

    // approve uniswap Router for xFUND for each user
    await xFundMock.connect(user1).approve(uniRouterAddr, uniAllowance)
    await xFundMock.connect(user2).approve(uniRouterAddr, uniAllowance)
    await xFundMock.connect(user3).approve(uniRouterAddr, uniAllowance)
    await xFundMock.connect(user4).approve(uniRouterAddr, uniAllowance)
    await xFundMock.connect(user5).approve(uniRouterAddr, uniAllowance)
    await xFundMock.approve(uniRouterAddr, uniAllowance) // creator

    console.log('xFundMock contract:', xfund)
    console.log('Uniswap xFUND-ETH LP contract:', unilp)

    await sleep(6000)
    // mimic adding liquidity to Uniswap xFUND-ETH LP
    await addLiquidityToUni(xfund, uniRouter, uniLpContract, user1, '10000000000')
    await sleep(1000)
    await addLiquidityToUni(xfund, uniRouter, uniLpContract, user2, '5000000000')
    await sleep(1000)
    await addLiquidityToUni(xfund, uniRouter, uniLpContract, user3, '5000000000')
    await sleep(1000)
    await addLiquidityToUni(xfund, uniRouter, uniLpContract, user4, '1000000000')

    // mimic swapping some xFUNDMOCK for ETH
    await swapTokenForETH(uniRouter, user5, '1000000000')

    // Deploy Staking contract
    const Staking = await ethers.getContractFactory('Staking')
    const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false])
    const tsBn = BN.from(block.timestamp)
    // epoch 1 starts 60 seconds AFTER current block time. Epoch 0 is just for staking - no rewards
    const staking = await Staking.deploy(tsBn.toNumber() + 60, 120)
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

    await sleep(1000)
    // initialise stuff - send 100 xFUND to CV, and allow LP Yield Farm to spend 100 from CV
    await xFundMock.transfer(cv.address, BN.from(cvAmount).mul(tenPow9))
    await cv.setAllowance(yflp.address, BN.from(cvAmount).mul(tenPow9))

    await sleep(1000)
    // User1 and 4 stake some LP tokens
    const lpb1 = await uniLpContract.balanceOf(user1.address)
    await uniLpContract.connect(user1).approve(staking.address, lpb1)
    await sleep(6000)
    await staking.connect(user1).deposit(uniLpContract.address, lpb1)

    const lpb2 = await uniLpContract.balanceOf(user2.address)
    await uniLpContract.connect(user2).approve(staking.address, lpb2)
    await sleep(6000)
    await staking.connect(user2).deposit(uniLpContract.address, lpb2)

    // other yield farms (not used at the moment)
    const YieldFarm = await ethers.getContractFactory('YieldFarm')
    const yf = await YieldFarm.deploy(xfund, usdc, susd, dai, staking.address, cv.address)
    await yf.deployed()
    console.log('YF deployed to:', yf.address)

    const YieldFarmBond = await ethers.getContractFactory('YieldFarmBond')
    const yfbond = await YieldFarmBond.deploy(xfund, staking.address, cv.address)
    await yfbond.deployed()
    console.log('YF_BOND deployed to:', yfbond.address)

    console.log('Finished')
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
