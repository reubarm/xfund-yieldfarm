const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('YieldFarm xFUND Pool', function () {
    let yieldFarm
    let staking
    let user, communityVault, userAddr, communityVaultAddr
    let xfundToken, creatorAcc
    const distributedAmount = ethers.BigNumber.from(10).mul(ethers.BigNumber.from(10).pow(9))
    let snapshotId
    const epochDuration = 1000
    const NR_OF_EPOCHS = 10

    const amount = ethers.BigNumber.from(1).mul(ethers.BigNumber.from(10).pow(9))
    beforeEach(async function () {
        snapshotId = await ethers.provider.send('evm_snapshot')
        const [creator, userSigner] = await ethers.getSigners()
        user = userSigner
        creatorAcc = creator
        userAddr = await user.getAddress()

        const Staking = await ethers.getContractFactory('Staking', creator)

        staking = await Staking.deploy(Math.floor(Date.now() / 1000) + 1000, epochDuration)
        await staking.deployed()

        const ERC20Mock = await ethers.getContractFactory('ERC20Mock')
        const CommunityVault = await ethers.getContractFactory('CommunityVault')

        xfundToken = await ERC20Mock.deploy()
        communityVault = await CommunityVault.deploy(xfundToken.address)
        communityVaultAddr = communityVault.address
        const YieldFarm = await ethers.getContractFactory('YieldFarmXfund')
        yieldFarm = await YieldFarm.deploy(
            xfundToken.address,
            staking.address,
            communityVaultAddr,
        )
        await xfundToken.mint(communityVaultAddr, distributedAmount)
        await communityVault.connect(creator).setAllowance(yieldFarm.address, distributedAmount)
    })

    afterEach(async function () {
        await ethers.provider.send('evm_revert', [snapshotId])
    })

    describe('General Contract checks', function () {
        it('should be deployed', async function () {
            expect(staking.address).to.not.equal(0)
            expect(yieldFarm.address).to.not.equal(0)
            expect(xfundToken.address).to.not.equal(0)
        })

        it('Get epoch PoolSize and distribute tokens', async function () {
            await depositBond(amount)
            await moveAtEpoch(10)
            const totalAmount = amount

            expect(await yieldFarm.getPoolSize(1)).to.equal(totalAmount)
            expect(await yieldFarm.getEpochStake(userAddr, 1)).to.equal(totalAmount)
            expect(await xfundToken.allowance(communityVaultAddr, yieldFarm.address)).to.equal(distributedAmount)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(2) // epoch on yield is staking - 1

            await yieldFarm.connect(user).harvest(1)
            expect(await xfundToken.balanceOf(userAddr)).to.equal(distributedAmount.div(NR_OF_EPOCHS))
        })
    })

    describe('Contract Tests', function () {
        it('User harvest and mass Harvest', async function () {
            await depositBond(amount)
            const totalAmount = amount
            // initialize epochs meanwhile
            await moveAtEpoch(16)
            expect(await yieldFarm.getPoolSize(1)).to.equal(amount)

            expect(await yieldFarm.lastInitializedEpoch()).to.equal(0) // no epoch initialized
            await expect(yieldFarm.harvest(10)).to.be.revertedWith('This epoch is in the future')
            await expect(yieldFarm.harvest(3)).to.be.revertedWith('Harvest in order')
            await (await yieldFarm.connect(user).harvest(1)).wait()

            expect(await xfundToken.balanceOf(userAddr)).to.equal(
                amount.mul(distributedAmount.div(NR_OF_EPOCHS)).div(totalAmount),
            )
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(1)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(1) // epoch 1 have been initialized

            await (await yieldFarm.connect(user).massHarvest()).wait()
            const totalDistributedAmount = amount.mul(distributedAmount.div(NR_OF_EPOCHS)).div(totalAmount).mul(7)
            expect(await xfundToken.balanceOf(userAddr)).to.equal(totalDistributedAmount)
            expect(await yieldFarm.connect(user).userLastEpochIdHarvested()).to.equal(7)
            expect(await yieldFarm.lastInitializedEpoch()).to.equal(7) // epoch 7 have been initialized
        })
        it('Have nothing to harvest', async function () {
            await depositBond(amount)
            await moveAtEpoch(10)
            expect(await yieldFarm.getPoolSize(1)).to.equal(amount)
            await yieldFarm.connect(creatorAcc).harvest(1)
            expect(await xfundToken.balanceOf(await creatorAcc.getAddress())).to.equal(0)
            await yieldFarm.connect(creatorAcc).massHarvest()
            expect(await xfundToken.balanceOf(await creatorAcc.getAddress())).to.equal(0)
        })
        it('harvest maximum 12 epochs', async function () {
            await depositBond(amount)
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
            await moveAtEpoch(10)
            await yieldFarm.connect(user).harvest(1)
            expect(await xfundToken.balanceOf(await user.getAddress())).to.equal(0)
        })
        it('it should be epoch1 when staking epoch is 9', async function () {
            await moveAtEpoch(9)
            expect(await staking.getCurrentEpoch()).to.equal(9)
            expect(await yieldFarm.getCurrentEpoch()).to.equal(1)
        })
    })

    describe('Events', function () {
        it('Harvest emits Harvest', async function () {
            await depositBond(amount)
            await moveAtEpoch(13)

            await expect(yieldFarm.connect(user).harvest(1))
                .to.emit(yieldFarm, 'Harvest')
        })

        it('MassHarvest emits MassHarvest', async function () {
            await depositBond(amount)
            await moveAtEpoch(13)

            await expect(yieldFarm.connect(user).massHarvest())
                .to.emit(yieldFarm, 'MassHarvest')
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

    async function depositBond (x, u = user) {
        const ua = await u.getAddress()
        await xfundToken.mint(ua, x)
        await xfundToken.connect(u).approve(staking.address, x)
        return await staking.connect(u).deposit(xfundToken.address, x)
    }
})
