const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('YieldFarm UNiX Pool', function () {
    let yieldFarm
    let staking
    let user, communityVault, userAddr, communityVaultAddr
    let unixToken, uniLP

    const TOTAL_TOKENS = 48000000
    const NR_OF_EPOCHS = 6
    const epochDuration = 1000

    const distributedAmount = ethers.BigNumber.from(TOTAL_TOKENS).mul(ethers.BigNumber.from(10).pow(18))
    let snapshotId
    const PER_EPOCH = TOTAL_TOKENS / NR_OF_EPOCHS

    const amount = ethers.BigNumber.from(PER_EPOCH).mul(ethers.BigNumber.from(10).pow(18))

    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot')
        const [creator, userSigner] = await ethers.getSigners()
        user = userSigner
        userAddr = await user.getAddress()

        const Staking = await ethers.getContractFactory('Staking', creator)

        staking = await Staking.deploy(Math.floor(Date.now() / 1000) + 1000, epochDuration)
        await staking.deployed()

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
        const CommunityVault = await ethers.getContractFactory('CommunityVault')

        unixToken = await ERC20Mock.deploy()
        uniLP = await ERC20Mock.deploy()
        communityVault = await CommunityVault.deploy(unixToken.address)
        communityVaultAddr = communityVault.address
        const YieldFarm = await ethers.getContractFactory('YieldFarmLP')
        yieldFarm = await YieldFarm.deploy(
            unixToken.address,
            uniLP.address,
            staking.address,
            communityVaultAddr,
        )
        await unixToken.mint(communityVaultAddr, amount)
        await communityVault.connect(creator).setAllowance(yieldFarm.address, distributedAmount)
    })

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('Contract Tests', function () {
        it('CV not enough funds - harvest should fail', async function () {
            await depositUniLP(amount)
            moveAtEpoch(4)
            await (await yieldFarm.connect(user).harvest(1)).wait()
            await expect(yieldFarm.connect(user).harvest(2))
                .to.be.revertedWith('ERC20: transfer amount exceeds balance')
        })

        it('CV not enough funds - initial should fail, and succeed after CV top up', async function () {
            await depositUniLP(amount)
            moveAtEpoch(5)
            await (await yieldFarm.connect(user).harvest(1)).wait()
            expect(
                await unixToken.balanceOf(userAddr))
                .to.equal(distributedAmount.div(NR_OF_EPOCHS))
            await expect(yieldFarm.connect(user).harvest(2))
                .to.be.revertedWith('ERC20: transfer amount exceeds balance')
            await unixToken.mint(communityVaultAddr, amount)
            await (await yieldFarm.connect(user).harvest(2)).wait()
            expect(
                await unixToken.balanceOf(userAddr))
                .to.equal(distributedAmount.div(NR_OF_EPOCHS).mul(2))

            await expect(yieldFarm.connect(user).harvest(3))
                .to.be.revertedWith('ERC20: transfer amount exceeds balance')
            await unixToken.mint(communityVaultAddr, amount)
            await (await yieldFarm.connect(user).harvest(3)).wait()
            expect(
                await unixToken.balanceOf(userAddr))
                .to.equal(distributedAmount.div(NR_OF_EPOCHS).mul(3))
        })

        it('Can top up CV before epoch harvest', async function () {
            await depositUniLP(amount)
            for (let i = 1; i <= NR_OF_EPOCHS; i += 1) {
                await moveAtEpoch(i)
                const currEpoch = await yieldFarm.getCurrentEpoch()
                if (currEpoch > 1) {
                    const toHarvest = currEpoch - 1
                    await unixToken.mint(communityVaultAddr, amount)
                    await (await yieldFarm.connect(user).harvest(toHarvest)).wait()
                    expect(
                        await unixToken.balanceOf(userAddr))
                        .to.equal(distributedAmount.div(NR_OF_EPOCHS).mul(toHarvest))
                }
            }
        })
    })

    function getCurrentUnix () {
        return Math.floor(Date.now() / 1000)
    }

    async function setNextBlockTimestamp (timestamp) {
        const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false])
        const currentTs = block.timestamp
        const diff = timestamp - currentTs
        await ethers.provider.send('evm_increaseTime', [diff])
    }

    async function moveAtEpoch (epoch) {
        await setNextBlockTimestamp(getCurrentUnix() + epochDuration * epoch)
        await ethers.provider.send('evm_mine')
    }

    async function depositUniLP (x, u = user) {
        const ua = await u.getAddress()
        await uniLP.mint(ua, x)
        await uniLP.connect(u).approve(staking.address, x)
        return await staking.connect(u).deposit(uniLP.address, x)
    }
})
