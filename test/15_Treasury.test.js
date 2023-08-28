const { expect } = require("chai");
const { ethers } = require("hardhat");

const QuickSwapFactoryABI = require('./abi/QuickswapFactory.json')
const RouterABI = require('./abi/Router.json')

describe("Treasury", function () {
    let ANTCoin, ANTCoinContract, Treasury, TreasuryContract, WETHAddress, QuickSwapFactoryContract, QuickSwapRouterContract;
    const quickSwapMainnetRouterAddress = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
    const quickSwapFactoryAddress = "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32";
    const wBTCAddress = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6"
    const wETHAddress = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
    const usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    const wMaticAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();


        // ANTCoin smart contract deployment
        ANTCoin = await ethers.getContractFactory("ANTCoin");
        ANTCoinContract = await ANTCoin.deploy();
        await ANTCoinContract.deployed();

        Treasury = await ethers.getContractFactory("Treasury");
        TreasuryContract = await Treasury.deploy(quickSwapMainnetRouterAddress, ANTCoinContract.address);
        await TreasuryContract.deployed();

        await ANTCoinContract.addMinterRole(TreasuryContract.address);

        // create pool
        WETHAddress = await TreasuryContract._wETH();
        QuickSwapFactoryContract = new ethers.Contract(quickSwapFactoryAddress, QuickSwapFactoryABI, ANTCoinContract.provider);

        const tx = await QuickSwapFactoryContract.connect(deployer).createPair(ANTCoinContract.address, WETHAddress);
        const receipt = await tx.wait();
        const eventData = receipt.events.find((event) => event.event === 'PairCreated');
        const pairAddress = eventData.args.pair;
        await TreasuryContract.setANTCLPPair(pairAddress);

        QuickSwapRouterContract = new ethers.Contract(quickSwapMainnetRouterAddress, RouterABI, ANTCoinContract.provider);
        await ANTCoinContract.approve(QuickSwapRouterContract.address, ethers.utils.parseEther("100000"));
        // antc addLiquidity
        await QuickSwapRouterContract.connect(deployer).addLiquidityETH(ANTCoinContract.address, ethers.utils.parseEther("100000"), 0, 0, deployer.address, Date.now() + 1000, {
            value: ethers.utils.parseEther('100'),
        })

        await TreasuryContract.addActiveAssets([[wMaticAddress, [wMaticAddress, usdtAddress]]]);

        // // swap btc
        // await QuickSwapRouterContract.connect(user1).swapExactETHForTokens(ethers.utils.parseEther("1"), [wMaticAddress, wBTCAddress], user1.address, Date.now() + 1000, {
        //     value: ethers.utils.parseEther('5')
        // })

        // // swap eth

        // await QuickSwapRouterContract.connect(user1).swapExactETHForTokens(ethers.utils.parseEther("1"), [wMaticAddress, wETHAddress], user1.address, Date.now() + 1000, {
        //     value: ethers.utils.parseEther('5')
        // })

        // // swap usdt

        // await QuickSwapRouterContract.connect(user1).swapExactETHForTokens(ethers.utils.parseEther("1"), [wMaticAddress, usdtAddress], user1.address, Date.now() + 1000, {
        //     value: ethers.utils.parseEther('5')
        // })

        // await TreasuryContract.updateActiveAssets([wBTCAddress, wETHAddress, usdtAddress])

        // matic
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
            await TreasuryContract.depositFundsETH({ value: ethers.utils.parseEther("10") });
            const totalUSDBalance = await TreasuryContract.getTotalAssetsUSDValue();
            expect(totalUSDBalance).to.be.not.equal(0)
            console.log("total Assets USD Value:", Number(totalUSDBalance))
        });

        it("antCValue:", async () => {
            const antCBalance = await TreasuryContract.getANTCoinUSDValue(ethers.utils.parseEther("100"));
            console.log("ant coin use value:", Number(antCBalance))
        })

        it("LPTokenValue:", async () => {
            const lpTokenValue = await TreasuryContract.getANTCoinLPTokenUSDValue(ethers.utils.parseEther("3190"))
            console.log("lpTokenValue:", Number(lpTokenValue))
        })

        it("totalUSDValue of treasury contract", async () => {
            await TreasuryContract.depositFundsETH({ value: ethers.utils.parseEther("10") });
            const totalUSDValueOfTreasury = await TreasuryContract.getTotalUSDValueOfTreasury();
            console.log("totalTreasuryUSDValue:", Number(totalUSDValueOfTreasury));

            const KOATTPrice = await TreasuryContract.getKOATTUSDPrice(10);
            console.log("KOATTPrice per one token:", Number(KOATTPrice))
        })

        it("buyKOATTTokens", async () => {
            await TreasuryContract.depositFundsETH({ value: ethers.utils.parseEther("10") });
            const expectedAssetAmount = await TreasuryContract.getAssetAmountForKOATT(100, wMaticAddress);
            await TreasuryContract.buyKOATTTokens(100, wMaticAddress, expectedAssetAmount, { value: expectedAssetAmount })
        });

        it("sellKOATTTokens", async () => {
            await TreasuryContract.depositFundsETH({ value: ethers.utils.parseEther("10") });
            const expectedAssetAmount = await TreasuryContract.getAssetAmountForKOATT(100, wMaticAddress);
            await TreasuryContract.connect(user1).buyKOATTTokens(100, wMaticAddress, expectedAssetAmount, { value: expectedAssetAmount })
            await TreasuryContract.connect(user1).sellKOATTTokens(10);
        })
    })
})