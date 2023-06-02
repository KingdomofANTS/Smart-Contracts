const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { network } = require("hardhat")
const AlgebraFactoryABI = require('./abi/AlgebraFactory.json')
const RouterABI = require('./abi/Router.json')

describe("Treasury", function () {
    let ANTCoin, ANTCoinContract, Treasury, TreasuryContract, WETHAddress, AlgebraFactoryContract;

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();

        const quickSwapMainnetRouterAddress = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
        const algebraFactoryContractAddress = "0x411b0fAcC3489691f28ad58c47006AF5E3Ab3A28";

        // ANTCoin smart contract deployment
        ANTCoin = await ethers.getContractFactory("ANTCoin");
        ANTCoinContract = await ANTCoin.deploy();
        await ANTCoinContract.deployed();

        Treasury = await ethers.getContractFactory("Treasury");
        TreasuryContract = await Treasury.deploy(quickSwapMainnetRouterAddress, ANTCoinContract.address);
        await TreasuryContract.deployed();

        // create pool
        WETHAddress = await TreasuryContract._wETH();
        AlgebraFactoryContract = new ethers.Contract(algebraFactoryContractAddress, AlgebraFactoryABI, ANTCoinContract.provider);
        await AlgebraFactoryContract.connect(deployer).createPool(ANTCoinContract.address, WETHAddress);

        RouterContract = new ethers.Contract(quickSwapMainnetRouterAddress, RouterABI, ANTCoinContract.provider);
        await ANTCoinContract.approve(RouterContract.address, ethers.utils.parseEther("100000"));
        await RouterContract.connect(deployer).addLiquidityETH(ANTCoinContract.address, ethers.utils.parseEther("1000"), 0, 0, deployer.address, Date.now() + 1000, {
            value: ethers.utils.parseEther('10'),
        })

        // matic
        await TreasuryContract.updateActiveAssets([WETHAddress], ["0xAB594600376Ec9fD91F8e885dADF0CE036862dE0"])
        // eth
        // await TreasuryContract.updateActiveAssets(["0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"], ["0xF9680D99D6C9589e2a93a78A04A279e509205945"])
        // usdt
        // await TreasuryContract.updateActiveAssets(["0xc2132D05D31c914a87C6611C10748AEb04B58e8F"], ["0x0A6513e40db6EB1b165753AD52E80663aeA50545"])
        
    })

    describe("Test Suite", function () { 
        it("should set the right owner", async () => {
            const owner = await TreasuryContract.owner();
            expect(owner).to.be.equal(deployer.address)
        })

        it("depositFundsETH: should work properly", async () => {
            await TreasuryContract.depositFundsETH({value: ethers.utils.parseEther("10")});

            const price = await TreasuryContract.getKOATTPrice();
            console.log(price)
        })
    })

})