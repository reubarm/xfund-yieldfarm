### [Smart Contract External Audit](https://github.com/BarnBridge/BarnBridge-YieldFarming/blob/master/BarnBridge-Yield-Farming-and-Incentivization-AUDIT.pdf)

## About

An implementation of the [BarnBridge](https://github.com/BarnBridge/BarnBridge-YieldFarming)
Yield Farm smart contracts, with modifications for xFUND and the Uniswap
xFUND-ETH Liquidity Pool.

Modifications to the smart contracts are minor/cosmetic, and as such should maintain
integrity of the original smart contracts audit results.

Modifications are as follows:

1) Cosmetic changes - variable names `_bond` and `bond` changed to `_xfund` and `xfund`
   in `CommunityVault.sol` and `YieldFarmLP.sol`
2) xFUND has 9 decimals, not 18. The line

```solidity
_totalAmountPerEpoch = TOTAL_DISTRIBUTED_AMOUNT.mul(10**18).div(NR_OF_EPOCHS)
```

in `YieldFarmLP.sol`'s `constructor` function has been changed to:

```solidity
_totalAmountPerEpoch = TOTAL_DISTRIBUTED_AMOUNT.mul(10**9).div(NR_OF_EPOCHS)
```

3) The above modification has also been made to the other two YieldFarm contracts.

## Contracts

### Mainnet

- [Staking](https://etherscan.io/address/0x2E9ade949900e19735689686E61BF6338a65B881#code)

- [Community Vault](https://etherscan.io/address/0x9e84d9DB70fb5767f7bD2A7013C189b4CA8CC374#code)

- [Yield Farm LP](https://etherscan.io/address/0xE5b72154bce0e75dA73Da3d9D9F3B17A6eAE31DD#code)

- [Yield Farm xFUND](https://etherscan.io/address/0x76D03D983494Cf6087E9e0F330B7C5872E24Da65#code)

###  Rinkeby Testnet

- [xFUNDMOCK](https://rinkeby.etherscan.io/token/0x245330351344f9301690d5d8de2a07f5f32e1149)

- [Uniswap xFUNDMOCK-ETH LP](https://rinkeby.etherscan.io/token/0x261aa758c5701635cad0c10e24acc2949855f187)

- [Staking](https://rinkeby.etherscan.io/address/0x1Da1B0e5DdcC97Ec8C9Ac093ab79DD3D5D8A58F6#code)

- [Community Vault](https://rinkeby.etherscan.io/address/0xb100bDb465ffd26F90B950EF9cE1cc8521351818#code)

- [Yield Farm LP](https://rinkeby.etherscan.io/address/0x0E7f2297060c72B7685E6EB7a471e9cCF2e28015#code)

- [Yield Farm xFUND](https://rinkeby.etherscan.io/address/0xF9fea950b33D76FA0C4bFE2ce93ef31F0F5A0885#code)
