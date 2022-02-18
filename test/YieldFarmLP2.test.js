const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('YieldFarm Uniswap Liquidity Pool v2', function () {
    let yieldFarm
    let staking
    let user, communityVault, userAddr, communityVaultAddr
    let unixToken, uniLP, creatorAcc

    const TOTAL_TOKENS = 4500000
    const NR_OF_EPOCHS = 6
    const NR_EPOCHS_DELAY_FROM_STAKING = 3 // new farm will be Thu Mar 03 2022 08:00:00 GMT+0000
    const EPOCH_1_START_TIME_STAKING = 1638518400 // Fri Dec 03 2021 08:00:00 GMT+0000
    const EPOCH_1_START_TIME_FARM = 1646294400 // Thu Mar 03 2022 08:00:00 GMT+0000
    const EPOCH_LENGTH = 2592000 // 30 days

    const distributedAmount = ethers.BigNumber.from(TOTAL_TOKENS).mul(ethers.BigNumber.from(10).pow(18))
    let snapshotId
    const PER_EPOCH = TOTAL_TOKENS / NR_OF_EPOCHS

    const amount = ethers.BigNumber.from(PER_EPOCH).mul(ethers.BigNumber.from(10).pow(18))
    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot')
        const [creator, userSigner] = await ethers.getSigners()
        user = userSigner
        creatorAcc = creator
        userAddr = await user.getAddress()

        const Staking = await ethers.getContractFactory('Staking', creator)

        staking = await Staking.deploy(EPOCH_1_START_TIME_STAKING, EPOCH_LENGTH)
        await staking.deployed()

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
        const CommunityVault = await ethers.getContractFactory('CommunityVault')

        unixToken = await ERC20Mock.deploy()
        uniLP = await ERC20Mock.deploy()
        communityVault = await CommunityVault.deploy(unixToken.address)
        communityVaultAddr = communityVault.address
        const YieldFarm = await ethers.getContractFactory('YieldFarmLP2')
        yieldFarm = await YieldFarm.deploy(
            unixToken.address,
            uniLP.address,
            staking.address,
            communityVaultAddr,
        )
        await unixToken.mint(communityVaultAddr, distributedAmount)
        await communityVault.connect(creator).setAllowance(yieldFarm.address, distributedAmount)
    })

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('General Contract checks', function () {
        it('should be deployed', async function () {
            expect(staking.address).to.not.equal(0)
            expect(yieldFarm.address).to.not.equal(0)
            expect(unixToken.address).to.not.equal(0)
        })

        it('new farm should be epoch 0 when deployed', async function () {
            // set to a little before this farm begins
            await moveAtEpoch(3)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(0)
            expect(await yieldFarm.epochStart()).to.equal(EPOCH_1_START_TIME_FARM)
        })

        it('new farm should be epoch 1 at farm start time', async function () {
            await setNextBlockTimestamp(EPOCH_1_START_TIME_FARM)
            await ethers.provider.send('evm_mine')
            expect(await yieldFarm.getCurrentEpoch()).to.equal(1)
        })

        it('correct farm epoch offset', async function () {
            // farm epoch 0 = staking epoch 3
            await moveAtEpoch(3)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(0)

            await moveAtEpoch(4)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(1)

            await moveAtEpoch(5)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(2)
        })

        it('Get epoch PoolSize and distribute tokens', async function () {
            // move chain to block for staking epoch 3
            await moveAtEpoch(NR_EPOCHS_DELAY_FROM_STAKING) // staking epoch 3, farm epoch 0
            // init up to but not including current staking epoch (2)
            await manuallyInitFarmEpoch(uniLP.address)
            // deposit - should init staking epoch 3 (farm epoch 0) for this farm contract
            await depositUniLP(amount)
            // move chain to staking epoch 5 (farm epoch 2)
            await moveAtEpoch(NR_EPOCHS_DELAY_FROM_STAKING + 2)
            const totalAmount = amount

            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount)
            expect(await yieldFarm.getEpochStake(userAddr, 1)).to.equal(totalAmount)
            expect(await unixToken.allowance(communityVaultAddr, yieldFarm.address)).to.equal(distributedAmount)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(2)
            expect(await staking.getCurrentEpoch()).to.equal(5)

            // harvest from completed farm epoch 1 (staking epoch 4 - currently in 5)
            await yieldFarm.connect(user).harvest(1)
            expect(await unixToken.balanceOf(userAddr)).to.equal(distributedAmount.div(NR_OF_EPOCHS))
            await expect(yieldFarm.harvest(2)).to.be.revertedWith('This epoch is in the future')
        })
    })

    describe('Contract Tests', function () {
        it('User harvest and mass Harvest', async function () {
            // move chain to block for staking epoch 3
            await moveAtEpoch(NR_EPOCHS_DELAY_FROM_STAKING) // staking epoch 3, farm epoch 0
            // init up to but not including current staking epoch (2)
            await manuallyInitFarmEpoch(uniLP.address)
            await depositUniLP(amount)
            const totalAmount = amount
            // initialize epochs meanwhile
            await moveAtEpoch(7)
            expect(await yieldFarm.getPoolSize(1)).to.equal(amount)

            expect(await yieldFarm.lastInitializedEpoch()).to.equal(0) // no epoch initialized
            await expect(yieldFarm.harvest(5)).to.be.revertedWith('This epoch is in the future')
            await expect(yieldFarm.harvest(2)).to.be.revertedWith('Harvest in order')
            await (await yieldFarm.connect(user).harvest(1)).wait()

            expect(await unixToken.balanceOf(userAddr)).to.equal(
                amount.mul(distributedAmount.div(NR_OF_EPOCHS)).div(totalAmount),
            )
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(1)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(1) // epoch 1 have been initialized

            await (await yieldFarm.connect(user).massHarvest()).wait()
            const totalDistributedAmount = amount.mul(distributedAmount.div(NR_OF_EPOCHS)).div(totalAmount).mul(3)
            expect(await unixToken.balanceOf(userAddr)).to.equal(totalDistributedAmount)
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(3)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(3) // epoch 3 have been initialized
        })
        it('Have nothing to harvest', async function () {
            // move chain to block for staking epoch 3
            await moveAtEpoch(NR_EPOCHS_DELAY_FROM_STAKING) // staking epoch 3, farm epoch 0
            // init up to but not including current staking epoch (2)
            await manuallyInitFarmEpoch(uniLP.address)
            await depositUniLP(amount)
            await moveAtEpoch(6) // farm epoch 3
            expect(await yieldFarm.getPoolSize(1)).to.equal(amount)
            // harvest with "creatorAcc" account (has no deposit)
            await yieldFarm.connect(creatorAcc).harvest(1)
            expect(await unixToken.balanceOf(await creatorAcc.getAddress())).to.equal(0)
            await yieldFarm.connect(creatorAcc).massHarvest()
            expect(await unixToken.balanceOf(await creatorAcc.getAddress())).to.equal(0)
        })
        it('harvest maximum 6 farm epochs', async function () {
            // move chain to block for staking epoch 3
            await moveAtEpoch(NR_EPOCHS_DELAY_FROM_STAKING) // staking epoch 3, farm epoch 0
            // init up to but not including current staking epoch (2)
            await manuallyInitFarmEpoch(uniLP.address)
            await depositUniLP(amount)
            const totalAmount = amount
            await moveAtEpoch(300)

            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount)
            await (await yieldFarm.connect(user).massHarvest()).wait()
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(NR_OF_EPOCHS)
        })

        it('gives epochid = 0 for previous epochs', async function () {
            await moveAtEpoch(-2)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(0)
        })
        it('it should return 0 if no deposit in an epoch', async function () {
            await moveAtEpoch(8)
            await yieldFarm.connect(user).harvest(1)
            expect(await unixToken.balanceOf(await user.getAddress())).to.equal(0)
        })
    })

    describe('Events', function () {
        it('Harvest emits Harvest', async function () {
            // move chain to block for staking epoch 3
            await moveAtEpoch(NR_EPOCHS_DELAY_FROM_STAKING) // staking epoch 3, farm epoch 0
            // init up to but not including current staking epoch (2)
            await manuallyInitFarmEpoch(uniLP.address)
            await depositUniLP(amount)
            await moveAtEpoch(5)

            await expect(yieldFarm.connect(user).harvest(1))
                .to.emit(yieldFarm, 'Harvest')
        })

        it('MassHarvest emits MassHarvest', async function () {
            // move chain to block for staking epoch 3
            await moveAtEpoch(NR_EPOCHS_DELAY_FROM_STAKING) // staking epoch 3, farm epoch 0
            // init up to but not including current staking epoch (2)
            await manuallyInitFarmEpoch(uniLP.address)
            await depositUniLP(amount)
            await moveAtEpoch(6)

            await expect(yieldFarm.connect(user).massHarvest())
                .to.emit(yieldFarm, 'MassHarvest')
        })
    })

    async function setNextBlockTimestamp (timestamp) {
        const block = await ethers.provider.send('eth_getBlockByNumber', ['latest', false])
        const currentTs = block.timestamp
        const diff = timestamp - currentTs
        await ethers.provider.send('evm_increaseTime', [diff])
    }

    async function moveAtEpoch (epoch) {
        await setNextBlockTimestamp(EPOCH_1_START_TIME_STAKING + EPOCH_LENGTH * (epoch - 1))
        await ethers.provider.send('evm_mine')
    }

    async function depositUniLP (x, u = user) {
        const ua = await u.getAddress()
        await uniLP.mint(ua, x)
        await uniLP.connect(u).approve(staking.address, x)
        return await staking.connect(u).deposit(uniLP.address, x)
    }

    async function manuallyInitFarmEpoch (farmTokenAddress, u = user) {
        const currentStakingEpoch = parseInt(await staking.getCurrentEpoch())
        let initializedFarmEpoch = -1
        for (let i = currentStakingEpoch + 1; i >= 0; i--) {
            const ok = await staking.epochIsInitialized(farmTokenAddress, i)
            if (ok) {
                initializedFarmEpoch = i
                break
            }
        }
        for (let i = initializedFarmEpoch + 1; i < currentStakingEpoch; i++) {
            await staking.connect(u).manualEpochInit([farmTokenAddress], i)
        }
    }
})
