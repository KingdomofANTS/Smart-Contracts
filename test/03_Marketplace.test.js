const { expect } = require("chai");
const { ethers } = require("hardhat")

describe("Marketplace", function () {
    let ANTShop, ANTShopContract, Marketplace, MarketplaceContract, ANTCoin, ANTCoinContract, Randomizer, RandomizerContract, MockRandomizer, MockRandomizerContract, Purse, PurseContract, ANTLottery, ANTLotteryContract;

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();

        // Randomizer smart contract deployment
                // Randomizer smart contract deployment
        const polyKeyHash = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";
        const polyVrfCoordinator = "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed"
        const subScriptionId = 5715;
        Randomizer = await ethers.getContractFactory("Randomizer");
        RandomizerContract = await Randomizer.deploy(polyKeyHash, polyVrfCoordinator, subScriptionId);
        await RandomizerContract.deployed();

        MockRandomizer = await ethers.getContractFactory("MockRandomizer");
        MockRandomizerContract = await MockRandomizer.deploy();
        await MockRandomizerContract.deployed();

        // ANTCoin smart contract deployment
        ANTCoin = await ethers.getContractFactory("ANTCoin");
        ANTCoinContract = await ANTCoin.deploy();
        await ANTCoinContract.deployed();

        // ANTShop smart contract deployment
        ANTShop = await ethers.getContractFactory("ANTShop");
        ANTShopContract = await ANTShop.deploy();
        await ANTShopContract.deployed();

        // ANTLottery smart contract deployment
        ANTLottery = await ethers.getContractFactory("ANTLottery");
        ANTLotteryContract = await ANTLottery.deploy(RandomizerContract.address, ANTCoinContract.address);
        await ANTLotteryContract.deployed();

        // Purse smart contract deployment
        Purse = await ethers.getContractFactory("Purse");
        PurseContract = await Purse.deploy(RandomizerContract.address, ANTShopContract.address, ANTLotteryContract.address);
        await PurseContract.deployed();

        // Marketplace smart contract deployment
        Marketplace = await ethers.getContractFactory("Marketplace");
        MarketplaceContract = await Marketplace.deploy(ANTShopContract.address, PurseContract.address, ANTLotteryContract.address);
        await MarketplaceContract.deployed();
        await ANTShopContract.addMinterRole(MarketplaceContract.address);
        await ANTCoinContract.addMinterRole(ANTLotteryContract.address);
        await ANTLotteryContract.addMinterRole(MarketplaceContract.address);
    });

    describe("Test Suite", function () {
        it("Should set the right owner", async function () {
            const owner = await MarketplaceContract.owner();
            expect(owner).to.be.equal(deployer.address);
        });

        it("Should initailized ANTShop refernce in Marketplace", async () => {
            const antShopContract = await MarketplaceContract.ANTShop();
            expect(antShopContract).to.be.equal(ANTShopContract.address)
        })

        it("setMintInfo: should fail if caller is not the owner", async () => {
            await expect(MarketplaceContract.connect(badActor).setMintInfo(0, 1, ANTCoinContract.address, 1)).to.be.revertedWith("Marketplace: Caller is not the owner or minter");
        })

        it("setMintInfo: should fail if token address is null", async () => {
            const zeroAddress = ethers.constants.AddressZero;
            await expect(MarketplaceContract.setMintInfo(0, 1, zeroAddress, 1)).to.be.revertedWith("Marketplace: token address can't be a null address");
        })

        it("setMintInfo: should work if caller is owner", async () => {
            const maticMintPrice = 1000000;
            const tokenAmountForMint = 10000000000;
            await MarketplaceContract.setMintInfo(0, maticMintPrice, ANTCoinContract.address, tokenAmountForMint);
            const mintInfo = await MarketplaceContract.getMintInfo(0);
            expect(mintInfo.isSet).to.be.equal(true);
            expect(mintInfo.mintMethod).to.be.equal(true);
            expect(mintInfo.mintPrice).to.be.equal(maticMintPrice);
            expect(mintInfo.tokenAmountForMint).to.be.equal(tokenAmountForMint);
            expect(mintInfo.tokenAddressForMint).to.be.equal(ANTCoinContract.address);            
        })

        it("setMintMethod: should fail if caller is not the owner", async () => {
            await expect(MarketplaceContract.connect(badActor).setMintMethod(0, false)).to.be.revertedWith("Marketplace: Caller is not the owner or minter");
        })

        it("setMintMethod: should work if caller is owner", async () => {
            const maticMintPrice = 1000000;
            const tokenAmountForMint = 10000000000;
            await MarketplaceContract.setMintInfo(0, maticMintPrice, ANTCoinContract.address, tokenAmountForMint);
            const mintInfo1 = await MarketplaceContract.getMintInfo(0);
            expect(mintInfo1.mintMethod).to.be.equal(true);
            await MarketplaceContract.setMintMethod(0, false);
            const mintInfo2 = await MarketplaceContract.getMintInfo(0);
            expect(mintInfo2.mintMethod).to.be.equal(false);
        })

        describe("buyTokens", () => {
            it("should fail if token info not set yet in ANTShop", async () => {
                await expect(MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address)).to.be.revertedWith("ANTShop: invalid type id");
            })

            it("should fail if mint info not set yet in Marketplace", async () => {
                await ANTShopContract.setTokenTypeInfo(0, "ANTFood", "testBaseURI1");
                await expect(MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address)).to.be.revertedWith("Marketplace: mint info not set");
            })

            it("should fail if matic payment is not enough", async () => {
                const maticMintAmount = 1000000000000;
                await ANTShopContract.setTokenTypeInfo(0, "ANTFood", "testBaseURI");
                await MarketplaceContract.setMintInfo(0, maticMintAmount, ANTCoinContract.address, 1000000);
                await expect(MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address, { value: maticMintAmount - 1 })).to.be.revertedWith("Marketplace: Insufficient Matic")
            })

            it("should fail if caller don't have enough token amount for mint", async () => {
                const maticMintAmount = 1000000000000;
                await ANTShopContract.setTokenTypeInfo(0, "ANTFood", "testBaseURI");
                await MarketplaceContract.setMintInfo(0, maticMintAmount, ANTCoinContract.address, 1000000);
                await MarketplaceContract.setMintMethod(0, false);
                await expect(MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address)).to.be.revertedWith("Marketplace: Insufficient Tokens");
                await ANTCoinContract.transfer(user1.address, 1000000);
                const user1Balance = await ANTCoinContract.balanceOf(user1.address);
                expect(user1Balance).to.be.equal(1000000)
                await expect(MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address)).to.be.revertedWith("Marketplace: You should approve tokens for minting");
            })

            it("should work with both cases (Matic, custom token)", async () => {

                /* -------------- ANTFood --------------- */

                // matic mint
                const maticMintAmount = 1000000000000;
                await ANTShopContract.setTokenTypeInfo(0, "ANTFood", "testBaseURI");
                await MarketplaceContract.setMintInfo(0, maticMintAmount, ANTCoinContract.address, 1000000);
                await MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address, { value: maticMintAmount});
                const userBalance1 = await ANTShopContract.balanceOf(user1.address, 0);
                expect(userBalance1).to.be.equal(1);

                // custom tokne mint
                await MarketplaceContract.setMintMethod(0, false);
                await ANTCoinContract.transfer(user1.address, 1000000);
                const user1Balance = await ANTCoinContract.balanceOf(user1.address);
                expect(user1Balance).to.be.equal(1000000);
                await ANTCoinContract.connect(user1).approve(MarketplaceContract.address, 1000000);
                await expect(MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address)).to.be.not.reverted;
                const userBalance2 = await ANTShopContract.balanceOf(user1.address, 0);
                expect(userBalance2).to.be.equal(2);

                /* -------------- Leveling Potions --------------- */
                // matic mint
                await ANTShopContract.setTokenTypeInfo(1, "Leveling Potions", "testBaseURI");
                await MarketplaceContract.setMintInfo(1, maticMintAmount, ANTCoinContract.address, 1000000);
                await MarketplaceContract.connect(user1).buyTokens(1, 1, user1.address, { value: maticMintAmount});
                const userBalance3 = await ANTShopContract.balanceOf(user1.address, 1);
                expect(userBalance3).to.be.equal(1);

                // custom tokne mint
                await MarketplaceContract.setMintMethod(1, false);
                await ANTCoinContract.transfer(user1.address, 1000000);
                const userBalance = await ANTCoinContract.balanceOf(user1.address);
                expect(userBalance).to.be.equal(1000000);
                await ANTCoinContract.connect(user1).approve(MarketplaceContract.address, 1000000);
                await expect(MarketplaceContract.connect(user1).buyTokens(1, 1, user1.address)).to.be.not.reverted;
                const userBalance4 = await ANTShopContract.balanceOf(user1.address, 1);
                expect(userBalance4).to.be.equal(2);
            })
        })

        it("setPuased: should fail if caller is not the owner", async () => {
            await expect(MarketplaceContract.connect(badActor).setPaused(true)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setPaused: should work if caller is owner", async () => {
            const maticMintAmount = 1000000000000;
            await ANTShopContract.setTokenTypeInfo(0, "ANTFood", "testBaseURI");
            await MarketplaceContract.setMintInfo(0, maticMintAmount, ANTCoinContract.address, 1000000);
            await MarketplaceContract.setPaused(true);
            await expect(MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address, { value: maticMintAmount})).to.be.revertedWith("Pausable: paused");
            await MarketplaceContract.setPaused(false);
            await MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address, { value: maticMintAmount});
            const userBalance1 = await ANTShopContract.balanceOf(user1.address, 0);
            expect(userBalance1).to.be.equal(1);
        })

        it("withdraw: should fail if caller is not the owner", async () => {
            await expect(MarketplaceContract.connect(user1).withdraw(user1.address, 1000)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("withdraw: should work if caller is owner", async () => {
            const initialBalanceOfUser = await MarketplaceContract.provider.getBalance(user3.address);
            const maticMintAmount = 1000000000000;
            await ANTShopContract.setTokenTypeInfo(0, "ANTFood", "testBaseURI");
            await MarketplaceContract.setMintInfo(0, maticMintAmount, ANTCoinContract.address, 1000000);
            await MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address, { value: maticMintAmount});
            const contractBalance = await MarketplaceContract.provider.getBalance(MarketplaceContract.address);
            expect(contractBalance).to.be.equal(maticMintAmount);
            await MarketplaceContract.withdraw(user3.address, maticMintAmount);
            const expectedBalanceOfUser = await MarketplaceContract.provider.getBalance(user3.address);
            expect(expectedBalanceOfUser).to.be.equal(initialBalanceOfUser.add(maticMintAmount))      ;
        })

        it("withdrawToken: should fail if caller is not the owner", async () => {
            await expect(MarketplaceContract.connect(user1).withdrawToken(ANTCoinContract.address, user3.address, 1000)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("withdrawToken: should work if caller is owner", async () => {
            const maticMintAmount = 1000000000000;
            const tokenAmount = 1000000;
            await MarketplaceContract.setMintInfo(0, maticMintAmount, ANTCoinContract.address, tokenAmount);
            await ANTShopContract.setTokenTypeInfo(0, "ANTFood", "testBaseURI");
            await MarketplaceContract.setMintMethod(0, false);
            await ANTCoinContract.transfer(user1.address, tokenAmount);
            const user1Balance = await ANTCoinContract.balanceOf(user1.address);
            expect(user1Balance).to.be.equal(tokenAmount);
            await ANTCoinContract.connect(user1).approve(MarketplaceContract.address, tokenAmount);
            await expect(MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address)).to.be.not.reverted;
            const userBalance2 = await ANTShopContract.balanceOf(user1.address, 0);
            expect(userBalance2).to.be.equal(1);
            const contractBalance = await ANTCoinContract.balanceOf(MarketplaceContract.address);
            expect(contractBalance).to.be.equal(tokenAmount);
            await MarketplaceContract.withdrawToken(ANTCoinContract.address, user3.address, tokenAmount);
            const expectedBalance = await ANTCoinContract.balanceOf(user3.address);
            expect(expectedBalance).to.be.equal(tokenAmount);
        })
    })
});