### [Smart Contract External Audit](https://github.com/BarnBridge/BarnBridge-YieldFarming/blob/master/BarnBridge-Yield-Farming-and-Incentivization-AUDIT.pdf)

## About

An implementation of the [BarnBridge](https://github.com/BarnBridge/BarnBridge-YieldFarming)
Yield Farm smart contracts, with modifications for UniX and the Uniswap
UniX-ETH Liquidity Pool.

Modifications to the smart contracts are minor/cosmetic, and as such should maintain
integrity of the original smart contracts audit results.

Modifications are as follows:

1) Cosmetic changes - variable names `_bond` and `bond` changed to `_unix` and `unix`
   in `CommunityVault.sol` and `YieldFarmLP.sol`
2) The above modification has also been made to the other YieldFarm contracts.

## Contracts

### Mainnet

- [UniX Token](https://etherscan.io/address/0xddd6a0ecc3c6f6c102e5ea3d8af7b801d1a77ac8)

- [Uniswap V2 UniX-USDC LP](https://etherscan.io/address/0xccab68f48531215b0707e8d908c43e7de73dbdbc)

- [Staking](https://etherscan.io/address/0x0c374f9886949C58bD2B439Ac3501Cd5321A7A0f#code)

- [Community Vault](https://etherscan.io/address/0xCEcD8d0594E9D6F3b00e7cA1B8BE6848FF0282BB#code)

- [Yield Farm LP](https://etherscan.io/address/0xFAaDf53DAf0B2B32D5F2Db14F1F23FA57BA51304#code)

- [Yield Farm UNiX](https://etherscan.io/address/0x98E0d8FC5d7B2341Ea943f9B4cf020dB672d5e10#code)

###  Rinkeby Testnet

- [UniX](https://rinkeby.etherscan.io/address/0xDDD6A0ECc3c6F6C102E5eA3d8Af7B801d1a77aC8)

- [Uniswap V2 UniX-USDC LP](https://rinkeby.etherscan.io/address/0xdec047b52fc35ac30d21a09ceb79c85e38d07936)

- [Staking](https://rinkeby.etherscan.io/address/0xFf4c3a49Fc24e9727307c7c44ff46F740f6783a1#code)

- [Community Vault](https://rinkeby.etherscan.io/address/0x4098600a916616C16c5b55bdb3F992628a312B4e#code)

- [Yield Farm LP](https://rinkeby.etherscan.io/address/0xa61F4Fb0E2C47B7677dFeac59CB594daeCC2AC88#code)

- [Yield Farm UNiX](https://rinkeby.etherscan.io/address/0xBf8D9dF45B53a2D3c271327B6AccaE2532F3C82D#code)
