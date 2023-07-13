const { expect } = require("chai");
const { BigNumber, utils } = require("ethers");
const { ethers } = require("hardhat")

describe("End2End", function () {
    let ANTCoin, ANTCoinContract, ANTShop, ANTShopContract, BasicANT, BasicANTContract, PremiumANT, PremiumANTContract, ANTLottery, ANTLotteryContract, Purse, PurseContract, Marketplace, MarketplaceContract, Bosses, BossesContract, FoodGathering, FoodGatheringContract, LevelingGround, LevelingGroundContract, Tasks, TasksContract, Workforce, WorkforceContract, Vesting, VestingContract, Randomizer, RandomizerContract;

    const basicANTMaticMintPrice = ethers.utils.parseEther("0.001")
    const baiscANTANTCoinMintAmount = ethers.utils.parseEther("1000");

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();

        ANTCoin = await hre.ethers.getContractFactory("ANTCoin");
        ANTCoinContract = await ANTCoin.deploy();
        await ANTCoinContract.deployed();

        // ant shop
        ANTShop = await hre.ethers.getContractFactory("ANTShop");
        ANTShopContract = await ANTShop.deploy();
        await ANTShopContract.deployed();

        await ANTShopContract.connect(deployer).setTokenTypeInfo(0, "ANTFood", "ant food uri")
        await ANTShopContract.connect(deployer).setTokenTypeInfo(1, "Leveling Potion", "leveling potion uri")

        // basic ant
        BasicANT = await hre.ethers.getContractFactory("BasicANT");
        BasicANTContract = await BasicANT.deploy(ANTCoinContract.address, ANTShopContract.address);
        await BasicANTContract.deployed();

        await ANTShopContract.addMinterRole(BasicANTContract.address);
        await ANTCoinContract.addMinterRole(BasicANTContract.address);

        await BasicANTContract.setBatchInfo(0, "Worker ANT", "testBaseURI1", basicANTMaticMintPrice, ANTCoinContract.address, baiscANTANTCoinMintAmount);
        await BasicANTContract.setBatchInfo(1, "Wise ANT", "testBaseURI2", basicANTMaticMintPrice, ANTCoinContract.address, baiscANTANTCoinMintAmount);
        await BasicANTContract.setBatchInfo(2, "Fighter ANT", "testBaseURI3", basicANTMaticMintPrice, ANTCoinContract.address, baiscANTANTCoinMintAmount);

        // premium ant
        PremiumANT = await hre.ethers.getContractFactory("PremiumANT");
        PremiumANTContract = await PremiumANT.deploy(ANTCoinContract.address, ANTShopContract.address);
        await PremiumANTContract.deployed();

        await ANTShopContract.addMinterRole(PremiumANTContract.address);
        await ANTCoinContract.addMinterRole(PremiumANTContract.address);

        await PremiumANTContract.setBatchInfo(0, "Worker ANT", "testBaseURI1", 100, 1);
        await PremiumANTContract.setBatchInfo(1, "Wise ANT", "testBaseURI2", 100, 1);
        await PremiumANTContract.setBatchInfo(2, "Fighter ANT", "testBaseURI2", 100, 1);

        // ramdomizer
        const polyKeyHash = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";
        const polyVrfCoordinator = "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed"
        const polyLinkToken = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
        const vrFee = "1000000000000"
        Randomizer = await hre.ethers.getContractFactory("Randomizer");
        RandomizerContract = await Randomizer.deploy(polyKeyHash, polyVrfCoordinator, polyLinkToken, vrFee);
        await RandomizerContract.deployed();

        // ant lottery
        ANTLottery = await ethers.getContractFactory("ANTLottery");
        ANTLotteryContract = await ANTLottery.deploy(RandomizerContract.address, ANTCoinContract.address);
        await ANTLotteryContract.deployed();
        await ANTLotteryContract.setOperatorAndTreasuryAndInjectorAddresses(deployer.address, deployer.address);
        const provider = ANTLotteryContract.provider;
        const blockNumber = await provider.getBlockNumber();
        const block = await provider.getBlock(blockNumber);
        const blockTimestamp = block.timestamp;
        const MIN_LENGTH_LOTTERY = await ANTLotteryContract.MIN_LENGTH_LOTTERY();
        await ANTLotteryContract.startLottery(Number(blockTimestamp) + Number(MIN_LENGTH_LOTTERY) + 100, [2000, 2000, 2000, 2000, 1000, 1000]);

        // purse
        Purse = await ethers.getContractFactory("Purse");
        PurseContract = await Purse.deploy(RandomizerContract.address, ANTShopContract.address, ANTLotteryContract.address);
        await PurseContract.deployed();

        Marketplace = await ethers.getContractFactory("Marketplace");
        MarketplaceContract = await Marketplace.deploy(ANTShopContract.address, PurseContract.address, ANTLotteryContract.address);
        await MarketplaceContract.deployed();
        await ANTShopContract.addMinterRole(MarketplaceContract.address);
        await ANTShopContract.addMinterRole(PurseContract.address);
        await ANTLotteryContract.addMinterRole(MarketplaceContract.address);
        await ANTLotteryContract.addMinterRole(PurseContract.address);
        await ANTCoinContract.addMinterRole(ANTLotteryContract.address);
        await PurseContract.addMinterRole(MarketplaceContract.address);
        await PurseContract.addMultiPurseCategories(["Common", "UnCommon", "Rare", "Ultra Rare", "Legendary"], [45, 25, 20, 7, 3], [20, 5, 25, 25, 35], [5, 20, 25, 25, 35], [75, 75, 50, 50, 30], [5, 10, 10, 20, 50], [1, 1, 1, 2, 5], [10, 25, 30, 50, 100], [0, 0, 0, 0, 0]);

        // bosses
        Bosses = await ethers.getContractFactory('Bosses');
        BossesContract = await Bosses.deploy(RandomizerContract.address, ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address);
        await BossesContract.deployed();

        await ANTCoinContract.addMinterRole(BossesContract.address);
        await PremiumANTContract.addMinterRole(BossesContract.address);
        await BasicANTContract.addMinterRole(BossesContract.address);
        await BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake", "Anteater"], [20, 50, 100, 250, 600], [1, 1, 1, 1, 1], [5, 10, 18, 25, 40])

        // food fathering
        FoodGathering = await ethers.getContractFactory("FoodGathering")
        FoodGatheringContract = await FoodGathering.deploy(ANTCoinContract.address, ANTShopContract.address);
        await FoodGatheringContract.deployed();

        await ANTCoinContract.addMinterRole(FoodGatheringContract.address);
        await ANTShopContract.addMinterRole(FoodGatheringContract.address);

        // leveling ground
        LevelingGround = await ethers.getContractFactory("LevelingGround");
        LevelingGroundContract = await LevelingGround.deploy(ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address);
        await LevelingGroundContract.deployed();

        await PremiumANTContract.addMinterRole(LevelingGroundContract.address);
        await BasicANTContract.addMinterRole(LevelingGroundContract.address);
        await ANTCoinContract.addMinterRole(LevelingGroundContract.address)

        // tasks
        Tasks = await ethers.getContractFactory("Tasks");
        TasksContract = await Tasks.deploy(RandomizerContract.address, ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address, PurseContract.address);
        await TasksContract.deployed();

        await ANTCoinContract.addMinterRole(TasksContract.address);
        await PremiumANTContract.addMinterRole(TasksContract.address);
        await BasicANTContract.addMinterRole(TasksContract.address);
        await PurseContract.addMinterRole(TasksContract.address)

        // workforce
        Workforce = await ethers.getContractFactory("Workforce");
        WorkforceContract = await Workforce.deploy(ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address);
        await WorkforceContract.deployed();
        await ANTCoinContract.addMinterRole(WorkforceContract.address);
        await PremiumANTContract.addMinterRole(WorkforceContract.address);
        await BasicANTContract.addMinterRole(WorkforceContract.address);

        // vesting
        Vesting = await ethers.getContractFactory("Vesting");
        VestingContract = await Vesting.deploy(ANTCoinContract.address);
        await VestingContract.deployed();
        await ANTCoinContract.addMinterRole(VestingContract.address);
        await VestingContract.addVestingPoolInfo("Private sale", 20, 9);
        await VestingContract.addVestingPoolInfo("Public sale", 40, 6);
        await VestingContract.addVestingPoolInfo("Team", 10, 12);
        await VestingContract.addVestingPoolInfo("Advisory", 10, 12);
        await VestingContract.addVestingPoolInfo("Reserve", 0, 12);
        await VestingContract.addVestingPoolInfo("Foundation", 10, 24)
    });

    describe("Test Suite", function () {
        it("All smart contracts should be deployed properly", async () => {
            expect(ANTCoinContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(ANTShopContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(MarketplaceContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(PremiumANTContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(BasicANTContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(PurseContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(RandomizerContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(WorkforceContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(FoodGatheringContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(LevelingGroundContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(ANTLotteryContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(BossesContract.address).to.not.equal(ethers.constants.AddressZero);
            expect(VestingContract.address).to.not.equal(ethers.constants.AddressZero);
        })

        describe("ANTCoin", async () => {
            it("should mint to owner 100 million upon the smart contract deployed", async () => {
                const ownerBalance = await ANTCoinContract.balanceOf(deployer.address);
                expect(ownerBalance).to.be.equal(utils.parseEther("100000000"))
            })

            it("maxCirculationSupply should be less than 200 million", async () => {
                await expect(ANTCoinContract.mint(user1.address, utils.parseEther("100000000"))).to.be.not.reverted;
                await expect(ANTCoinContract.mint(user1.address, 1)).to.be.revertedWith("ANTCoin: Mint amount exceed Max Circulation Supply")
            })

            it("should calculate the totalCirculationSupply properly", async () => {
                await ANTCoinContract.burn(deployer.address, utils.parseEther("100"));
                await ANTCoinContract.mint(user1.address, utils.parseEther("101"));
                const totalCirculatingSupply = await ANTCoinContract.totalCirculatingSupply();
                expect(totalCirculatingSupply).to.be.equal(utils.parseEther(String(100000000 - 100 + 101)))
            })
        })

        describe("ANTShop", async () => {
            it("setTokenTypeInfo: should be set the token type info properly by owner", async () => {
                await ANTShopContract.setTokenTypeInfo(0, "test token 1", "test token 1 base uri");
                await ANTShopContract.setTokenTypeInfo(1, "test token 2", "test token 2 base uri");

                const token1TypeInfo = await ANTShopContract.getInfoForType(0);
                const token2TypeInfo = await ANTShopContract.getInfoForType(1);

                expect(token1TypeInfo.toString()).to.be.equal("0,0,true,test token 1 base uri,test token 1");
                expect(token2TypeInfo.toString()).to.be.equal("0,0,true,test token 2 base uri,test token 2");
            })

            it("mint & burn: ant shop ERC1155 tokens could be minted & burned by minter", async () => {
                await ANTShopContract.addMinterRole(user1.address);
                await ANTShopContract.connect(user1).mint(0, 10, user2.address);
                await ANTShopContract.connect(user1).mint(1, 5, user3.address);
                await ANTShopContract.connect(user1).burn(0, 2, user2.address);
                await ANTShopContract.connect(user1).burn(1, 3, user3.address);

                const token1Info = await ANTShopContract.getInfoForType(0);
                const token2Info = await ANTShopContract.getInfoForType(1);

                const user2Balance = await ANTShopContract.balanceOf(user2.address, 0);
                const user3Balance = await ANTShopContract.balanceOf(user3.address, 1);

                expect(token1Info.toString()).to.be.equal("10,2,true,ant food uri,ANTFood");
                expect(token2Info.toString()).to.be.equal("5,3,true,leveling potion uri,Leveling Potion");

                expect(user2Balance).to.be.equal(8);
                expect(user3Balance).to.be.equal(2);
            })

            it("isApprovedForAll: auto approve for minters", async () => {
                await ANTShopContract.addMinterRole(user1.address);
                await ANTShopContract.connect(user1).mint(0, 10, user2.address);
                await ANTShopContract.connect(user1).mint(0, 10, user1.address);
                await expect(ANTShopContract.connect(user3).safeTransferFrom(user2.address, user3.address, 0, 2, ethers.constants.HashZero)).to.be.revertedWith("ANTShop: Caller is not owner nor approved")
                await expect(ANTShopContract.connect(badActor).safeTransferFrom(user2.address, user1.address, 0, 2, ethers.constants.HashZero)).to.be.revertedWith("ANTShop: Caller is not owner nor approved");
                await expect(ANTShopContract.connect(badActor).safeTransferFrom(user1.address, user2.address, 0, 2, ethers.constants.HashZero)).to.be.revertedWith("ANTShop: Caller is not owner nor approved");
                await expect(ANTShopContract.connect(user1).safeTransferFrom(user2.address, user3.address, 0, 3, ethers.constants.HashZero)).to.be.not.reverted;
                await expect(ANTShopContract.connect(user1).safeTransferFrom(user2.address, ANTShopContract.address, 0, 3, ethers.constants.HashZero)).to.be.not.reverted;
            })
        })

        describe("Marketplace", async () => {
            it("setMintInfo: should work properly by owner", async () => {
                await expect(MarketplaceContract.connect(badActor).setMintInfo(0, 0, ANTCoinContract.address, 100)).to.be.revertedWith("Marketplace: Caller is not the owner or minter");
                await expect(MarketplaceContract.setMintInfo(0, 0, ethers.constants.AddressZero, 0)).to.be.revertedWith("Marketplace: token address can't be a null address");
                await MarketplaceContract.setMintInfo(0, ethers.utils.parseEther("0.1"), ANTCoinContract.address, 100);
                await expect(MarketplaceContract.getMintInfo(1)).to.be.revertedWith("Marketplace: Mint information not set yet");
                const mintInfo1 = await MarketplaceContract.getMintInfo(0);
                expect(mintInfo1.toString()).to.be.equal(`true,true,100000000000000000,100,${ANTCoinContract.address}`);
                await MarketplaceContract.setMintMethod(0, false);
                const mintInfo2 = await MarketplaceContract.getMintInfo(0);
                expect(mintInfo2.toString()).to.be.equal(`false,true,100000000000000000,100,${ANTCoinContract.address}`);
            });

            it("setPurseMintInfo & setLotteryTicketMintInfo: should set mint info by owner", async () => {
                await expect(MarketplaceContract.connect(badActor).setPurseMintInfo(true, utils.parseEther("0.1"), ANTCoinContract.address, 100)).to.be.revertedWith("Marketplace: Caller is not the owner or minter");
                await expect(MarketplaceContract.connect(badActor).setLotteryTicketMintInfo(true, utils.parseEther("0.1"), ANTCoinContract.address, 100)).to.be.revertedWith("Marketplace: Caller is not the owner or minter");
                await expect(MarketplaceContract.setPurseMintInfo(true, utils.parseEther("0.1"), ethers.constants.AddressZero, 100)).to.be.revertedWith("Marketplace: Purse token address can't be zero address");
                await expect(MarketplaceContract.setLotteryTicketMintInfo(true, utils.parseEther("0.1"), ethers.constants.AddressZero, 100)).to.be.revertedWith("Marketplace: Lottery token address can't be zero address");

                await MarketplaceContract.setPurseMintInfo(true, utils.parseEther("0.1"), ANTCoinContract.address, 100);
                await MarketplaceContract.setLotteryTicketMintInfo(true, utils.parseEther("0.1"), ANTCoinContract.address, 100);

                const purseMintMethod = await MarketplaceContract.purseMintMethod();
                const purseMintPrice = await MarketplaceContract.purseMintPrice();
                const purseMintTokenAddress = await MarketplaceContract.purseMintTokenAddress();
                const purseMintTokenAmount = await MarketplaceContract.purseMintTokenAmount();
                const lotteryTicketMintMethod = await MarketplaceContract.lotteryTicketMintMethod();
                const lotteryTicketMintPrice = await MarketplaceContract.lotteryTicketMintPrice();
                const lotteryTicketMintTokenAddress = await MarketplaceContract.lotteryTicketMintTokenAddress();
                const lotteryTicketMintTokenAmount = await MarketplaceContract.lotteryTicketMintTokenAmount();

                expect(purseMintMethod).to.be.equal(lotteryTicketMintMethod).to.be.equal(true);
                expect(purseMintPrice).to.be.equal(lotteryTicketMintPrice).to.be.equal(utils.parseEther("0.1"));
                expect(purseMintTokenAddress).to.be.equal(lotteryTicketMintTokenAddress).to.be.equal(ANTCoinContract.address);
                expect(purseMintTokenAmount).to.be.equal(lotteryTicketMintTokenAmount).to.be.equal(100);
            })

            it("buyTokens: should mint the ant shop tokens regarding the antshop mint info", async () => {
                await expect(MarketplaceContract.connect(user1).buyTokens(0, 1, user1.address)).to.be.revertedWith("Marketplace: mint info not set");
                await MarketplaceContract.setMintInfo(0, ethers.utils.parseEther("0.01"), ANTCoinContract.address, 100); // ant food
                await MarketplaceContract.setMintInfo(1, ethers.utils.parseEther("0.1"), ANTCoinContract.address, 1000); // leveling potions
                await MarketplaceContract.connect(user1).buyTokens(0, 10, user1.address, { value: utils.parseEther("0.1") });
                await MarketplaceContract.connect(user1).buyTokens(1, 10, user1.address, { value: utils.parseEther("1") });

                const user1balance1 = await ANTShopContract.balanceOf(user1.address, 0);
                const user1balance2 = await ANTShopContract.balanceOf(user1.address, 1);

                expect(user1balance1).to.be.equal(10)
                expect(user1balance2).to.be.equal(10)

                await MarketplaceContract.setMintMethod(0, false);
                await MarketplaceContract.setMintMethod(1, false);

                await expect(MarketplaceContract.connect(user1).buyTokens(0, 10, user1.address)).to.be.revertedWith("Marketplace: Insufficient Tokens");
                await expect(MarketplaceContract.connect(user1).buyTokens(1, 10, user1.address)).to.be.revertedWith("Marketplace: Insufficient Tokens");

                await ANTCoinContract.transfer(user1.address, 100 * 10 + 1000 * 10);
                await ANTCoinContract.connect(user1).approve(MarketplaceContract.address, 100 * 10 + 1000 * 10);

                await MarketplaceContract.connect(user1).buyTokens(0, 10, user1.address);
                await MarketplaceContract.connect(user1).buyTokens(1, 10, user1.address);

                const user1balance3 = await ANTShopContract.balanceOf(user1.address, 0);
                const user1balance4 = await ANTShopContract.balanceOf(user1.address, 1);

                expect(user1balance3).to.be.equal(20)
                expect(user1balance4).to.be.equal(20)

                await expect(MarketplaceContract.connect(user1).buyTokens(0, 10, user1.address)).to.be.revertedWith("Marketplace: Insufficient Tokens");
                await expect(MarketplaceContract.connect(user1).buyTokens(1, 10, user1.address)).to.be.revertedWith("Marketplace: Insufficient Tokens");
            })

            it("buyPurseToken & buyLotteryTickets: should mint the purse token regarding the purse mint info", async () => {
                await MarketplaceContract.setPurseMintInfo(true, utils.parseEther("0.01"), ANTCoinContract.address, 100);
                await MarketplaceContract.setLotteryTicketMintInfo(true, utils.parseEther("0.1"), ANTCoinContract.address, 1000);
                await expect(MarketplaceContract.connect(user1).buyPurseTokens(user1.address, 10)).to.be.revertedWith("Marketplace: Insufficient Matic");
                await expect(MarketplaceContract.connect(user1).buyLotteryTickets(user1.address, 10)).to.be.revertedWith("Marketplace: Insufficient Matic");
                await MarketplaceContract.connect(user1).buyPurseTokens(user1.address, 10, { value: utils.parseEther("0.1") });
                const provider = ANTLotteryContract.provider;
                const blockNumber = await provider.getBlockNumber();
                const block = await provider.getBlock(blockNumber);
                await ANTLotteryContract.setOperatorAndTreasuryAndInjectorAddresses(deployer.address, deployer.address)
                await MarketplaceContract.connect(user1).buyLotteryTickets(user1.address, 10, { value: utils.parseEther("1") });
                const purseBalance1 = await PurseContract.balanceOf(user1.address);
                expect(purseBalance1).to.be.equal(10)
                const currentLotteryId = await ANTLotteryContract.currentLotteryId()
                const lotteryBalance1 = await ANTLotteryContract.viewUserInfoForLotteryId(user1.address, currentLotteryId, 0, 100);
                expect(lotteryBalance1[0].length).to.be.equal(10)
            })
        })

        describe("PremiumANT", async () => {
            it("setBatchInfo: should be set the correct batch info", async () => {
                await expect(PremiumANTContract.connect(badActor).setBatchInfo(0, "Worker ANT", "Worker ANT Base URI", 100, 2)).to.be.revertedWith("PremiumANT: Caller is not the owner or minter");
                await PremiumANTContract.setBatchInfo(0, "Worker ANT", "https://ipfs.io/ipfs/", 100, 2);
                const workerBatchInfo = await PremiumANTContract.getBatchInfo(0)
                expect(workerBatchInfo.toString()).to.be.equal("Worker ANT,https://ipfs.io/ipfs/,0,100,2");
            })

            it("mint: should mint the premium ants according to the exact logic", async () => {
                await expect(PremiumANTContract.connect(user1).mint(0, user2.address, 1)).to.be.revertedWith("PremiumANT: caller is not minter")
                await expect(PremiumANTContract.connect(user1).mint(0, user1.address, 1)).to.be.revertedWith("PremiumANT: insufficient balance")
                await ANTShopContract.mint(0, 10, user1.address);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 2);
                await PremiumANTContract.connect(user1).mint(1, user1.address, 2);
                await PremiumANTContract.connect(user1).mint(2, user1.address, 2);
                const userBalance1 = await PremiumANTContract.balanceOf(user1.address);
                expect(userBalance1).to.be.equal(6);
                const batchInfo1 = await PremiumANTContract.getBatchInfo(0);
                const batchInfo2 = await PremiumANTContract.getBatchInfo(1);
                const batchInfo3 = await PremiumANTContract.getBatchInfo(2);
                expect(batchInfo1.minted).to.be.equal(batchInfo2.minted).to.be.equal(batchInfo3.minted)
                const antFoodBalance1 = await ANTShopContract.balanceOf(user1.address, 0);
                expect(antFoodBalance1).to.be.equal(4)

                // owner mint
                await PremiumANTContract.ownerMint(0, user2.address, 5);
                const batchInfo4 = await PremiumANTContract.getBatchInfo(0);
                expect(batchInfo4.minted).to.be.equal(7)
                const totalMinted = await PremiumANTContract.minted();
                expect(totalMinted).to.be.equal(11)
                const antOwner1 = await PremiumANTContract.ownerOf(7);
                expect(antOwner1).to.be.equal(user2.address)
            })

            it("upgradePremiumANT: should be upgraded properly according to the exact upgrade logic", async () => {
                await ANTShopContract.mint(0, 10, user1.address);
                await ANTShopContract.mint(1, 100, user1.address);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 2);
                await expect(PremiumANTContract.connect(user2).upgradePremiumANT(1, 5)).to.be.revertedWith("PremiumANT: you are not owner of this token");
                await expect(PremiumANTContract.connect(user1).upgradePremiumANT(1, 0)).to.be.revertedWith("PremiumANT: leveling potion amount must be greater than zero");
                await expect(PremiumANTContract.connect(user1).upgradePremiumANT(1, 101)).to.be.revertedWith("PremiumANT: you don't have enough potions for upgrading");
                await expect(PremiumANTContract.connect(user1).upgradePremiumANT(1, 10)).to.be.revertedWith("PremiumANT: insufficient ant coin fee for upgrading");
                const upgradeANTFeePerPotion = await PremiumANTContract.upgradeANTFee();
                await ANTCoinContract.transfer(user1.address, upgradeANTFeePerPotion.mul(100));
                await PremiumANTContract.connect(user1).upgradePremiumANT(1, 10)
                const antInfo1 = await PremiumANTContract.getANTInfo(1)
                expect(antInfo1.level).to.be.equal(20);
                expect(antInfo1.remainPotions).to.be.equal(10);
                await PremiumANTContract.connect(user1).upgradePremiumANT(1, 11);
                const antInfo2 = await PremiumANTContract.getANTInfo(1)
                expect(antInfo2.level).to.be.equal(21);
                expect(antInfo2.remainPotions).to.be.equal(0);
                await PremiumANTContract.connect(user1).upgradePremiumANT(1, 24);
                const antInfo3 = await PremiumANTContract.getANTInfo(1)
                expect(antInfo3.level).to.be.equal(22);
                expect(antInfo3.remainPotions).to.be.equal(2);

                const user1ANTCoinBalance1 = await ANTCoinContract.balanceOf(user1.address);
                expect(user1ANTCoinBalance1).to.be.equal(upgradeANTFeePerPotion.mul(100 - (10 + 11 + 24)))

                await PremiumANTContract.setMaxLevel(23);
                await PremiumANTContract.connect(user1).upgradePremiumANT(1, 30);
                const user1ANTFoodBalance = await ANTShopContract.balanceOf(user1.address, 1)
                expect(user1ANTFoodBalance).to.be.equal(100 - 10 - 11 - 24 - 21) // 
                const antInfo4 = await PremiumANTContract.getANTInfo(1)
                expect(antInfo4.level).to.be.equal(23)
                expect(antInfo4.remainPotions).to.be.equal(0)
            })

            it("ownerANTUpgrade: should be upgraded by owner", async () => {
                await ANTShopContract.mint(0, 10, user1.address);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 2);
                await expect(PremiumANTContract.connect(badActor).ownerANTUpgrade(1, 25)).to.be.revertedWith("PremiumANT: Caller is not the owner or minter")
                await PremiumANTContract.ownerANTUpgrade(1, 25);
                const antInfo1 = await PremiumANTContract.getANTInfo(1)
                expect(antInfo1.level).to.be.equal(21);
                expect(antInfo1.remainPotions).to.be.equal(4);
            })
        })

        describe("BasicANT", async () => {
            it("setBatchInfo: should be set the correct batch info", async () => {
                await expect(BasicANTContract.connect(badActor).setBatchInfo(0, "Worker ANT", "Worker ANT Base URI", 100, ANTCoinContract.address, 1000)).to.be.revertedWith("BasicANT: Caller is not the owner or minter");
                await BasicANTContract.setBatchInfo(0, "Worker ANT", "Worker ANT Base URI", 100, ANTCoinContract.address, 1000);
                const workerBatchInfo = await BasicANTContract.getBatchInfo(0)
                expect(workerBatchInfo.toString()).to.be.equal(`Worker ANT,Worker ANT Base URI,0,100,${ANTCoinContract.address},1000,true`);
            })

            it("mint: should mint the basic ants according to the exact logic", async () => {
                await expect(BasicANTContract.connect(user1).mint(0, user2.address, 1)).to.be.revertedWith("BasicANT: caller is not minter")
                await expect(BasicANTContract.connect(user1).mint(0, user1.address, 1)).to.be.revertedWith("BasicANT: insufficient Matic")
                await BasicANTContract.connect(user1).mint(0, user1.address, 2, { value: basicANTMaticMintPrice.mul(2) });
                await BasicANTContract.connect(user1).mint(1, user1.address, 2, { value: basicANTMaticMintPrice.mul(2) });
                await BasicANTContract.connect(user1).mint(2, user1.address, 2, { value: basicANTMaticMintPrice.mul(2) });
                const userBalance1 = await BasicANTContract.balanceOf(user1.address);
                expect(userBalance1).to.be.equal(6);
                const batchInfo1 = await BasicANTContract.getBatchInfo(0);
                const batchInfo2 = await BasicANTContract.getBatchInfo(1);
                const batchInfo3 = await BasicANTContract.getBatchInfo(2);
                expect(batchInfo1.minted).to.be.equal(batchInfo2.minted).to.be.equal(batchInfo3.minted)

                // owner mint
                await BasicANTContract.ownerMint(0, user2.address, 5);
                const batchInfo4 = await BasicANTContract.getBatchInfo(0);
                expect(batchInfo4.minted).to.be.equal(7)
                const totalMinted = await BasicANTContract.minted();
                expect(totalMinted).to.be.equal(11)
                const antOwner1 = await BasicANTContract.ownerOf(7);
                expect(antOwner1).to.be.equal(user2.address)
            })

            it("upgradeBasicANT: should be upgraded properly according to the exact upgrade logic", async () => {
                await ANTShopContract.mint(1, 100, user1.address);
                await BasicANTContract.connect(user1).mint(0, user1.address, 2, { value: basicANTMaticMintPrice.mul(2) });
                await expect(BasicANTContract.connect(user2).upgradeBasicANT(1, 5)).to.be.revertedWith("BasicANT: you are not owner of this token");
                await expect(BasicANTContract.connect(user1).upgradeBasicANT(1, 0)).to.be.revertedWith("BasicANT: leveling potion amount must be greater than zero");
                await expect(BasicANTContract.connect(user1).upgradeBasicANT(1, 101)).to.be.revertedWith("BasicANT: you don't have enough potions for upgrading");
                await expect(BasicANTContract.connect(user1).upgradeBasicANT(1, 10)).to.be.revertedWith("BasicANT: insufficient ant coin fee for upgrading");
                const upgradeANTFeePerPotion = await BasicANTContract.upgradeANTFee();
                await ANTCoinContract.transfer(user1.address, upgradeANTFeePerPotion.mul(100));
                await BasicANTContract.connect(user1).upgradeBasicANT(1, 3)
                const antInfo1 = await BasicANTContract.getANTInfo(1)
                expect(antInfo1.level).to.be.equal(2);
                expect(antInfo1.remainPotions).to.be.equal(1);
                await BasicANTContract.connect(user1).upgradeBasicANT(1, 5);
                const antInfo2 = await BasicANTContract.getANTInfo(1)
                expect(antInfo2.level).to.be.equal(3);
                expect(antInfo2.remainPotions).to.be.equal(3);

                const user1ANTCoinBalance1 = await ANTCoinContract.balanceOf(user1.address);
                expect(user1ANTCoinBalance1).to.be.equal(upgradeANTFeePerPotion.mul(100 - (3 + 5)))

                await BasicANTContract.setMaxLevel(4);
                await BasicANTContract.connect(user1).upgradeBasicANT(1, 10);
                const user1ANTFoodBalance = await ANTShopContract.balanceOf(user1.address, 1)
                expect(user1ANTFoodBalance).to.be.equal(100 - 3 - 5 - 1) // 
                const antInfo4 = await BasicANTContract.getANTInfo(1)
                expect(antInfo4.level).to.be.equal(4)
                expect(antInfo4.remainPotions).to.be.equal(0)
            })

            it("ownerANTUpgrade: should be upgraded by owner", async () => {
                await BasicANTContract.connect(user1).mint(0, user1.address, 2, { value: basicANTMaticMintPrice.mul(2) });
                await expect(BasicANTContract.connect(badActor).ownerANTUpgrade(1, 25)).to.be.revertedWith("BasicANT: Caller is not the owner or minter")
                await BasicANTContract.ownerANTUpgrade(1, 6);
                const antInfo1 = await BasicANTContract.getANTInfo(1)
                expect(antInfo1.level).to.be.equal(3);
                expect(antInfo1.remainPotions).to.be.equal(1);
            })
        })

        describe("Purse", async () => {
            it("addMultiPurseCategories: should add the purse category infos properly", async () => {
                await expect(PurseContract.connect(badActor).addMultiPurseCategories(["Common", "UnCommon", "Rare", "Ultra Rare", "Legendary"], [45, 25, 20, 7, 3], [20, 5, 25, 25, 35], [5, 20, 25, 25, 35], [75, 75, 50, 50, 30], [5, 10, 10, 20, 50], [1, 1, 1, 2, 5], [10, 25, 30, 50, 100], [0, 0, 0, 0, 0])).to.be.revertedWith("Purse: Caller is not the owner or minter");
                await expect(PurseContract.addMultiPurseCategories(["Common", "UnCommon", "Rare", "Ultra Rare", "Legendary"], [25, 20, 7, 3], [20, 5, 25, 25, 35], [5, 20, 25, 25, 35], [75, 75, 50, 50, 30], [5, 10, 10, 20, 50], [1, 1, 1, 2, 5], [10, 25, 30, 50, 100], [0, 0, 0, 0, 0])).to.be.revertedWith("Purse: invalid purse category data");
                await expect(PurseContract.addMultiPurseCategories(["Common", "UnCommon", "Rare", "Ultra Rare", "Legendary"], [46, 25, 20, 7, 3], [20, 5, 25, 25, 35], [5, 20, 25, 25, 35], [75, 75, 50, 50, 30], [5, 10, 10, 20, 50], [1, 1, 1, 2, 5], [10, 25, 30, 50, 100], [0, 0, 0, 0, 0])).to.be.revertedWith("Purse: invalid purse category data");
                await PurseContract.addMultiPurseCategories(["Common", "UnCommon", "Rare", "Ultra Rare", "Legendary"], [45, 25, 20, 7, 3], [20, 5, 25, 25, 35], [5, 20, 25, 25, 35], [75, 75, 50, 50, 30], [5, 10, 10, 20, 50], [1, 1, 1, 2, 5], [10, 25, 30, 50, 100], [0, 0, 0, 0, 0])
                const purseCategoryInfo = await PurseContract.getPurseCategoryInfo(0);
                expect(purseCategoryInfo.toString()).to.be.equal("Common,45,0,20,5,75,5,1,10");
                const purseCategoryInfo1 = await PurseContract.getPurseCategoryInfo(2);
                expect(purseCategoryInfo1.toString()).to.be.equal("Rare,20,0,25,25,50,10,1,30");
                await expect(PurseContract.getPurseCategoryInfo(5)).to.be.revertedWith("Purse: category info doesn't exist")
                const multiInfo1 = await PurseContract.getPurseCategoryMultiInfo([0, 1, 2, 3, 4])
                expect(multiInfo1[1].categoryName).to.be.equal("UnCommon")
            })

            it("mint: should be minted randomly", async () => {
                await PurseContract.mint(user1.address, 10);
                const tokenInfos = await PurseContract.getPurseCategoryInfoOfMultiToken([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
                console.log("category names of minted purse tokens:", tokenInfos.toString());
            })

            it("usePurseToken: user have to earn the correct reward when use a purse token", async () => {
                await PurseContract.mint(user1.address, 5);
                await PurseContract.connect(user1).usePurseToken(1);
                await PurseContract.connect(user1).usePurseToken(2);
                await PurseContract.connect(user1).usePurseToken(3);
                await expect(PurseContract.ownerOf(1)).to.be.reverted
                const usedTokenIds = await PurseContract.getUsedPurseTokenIdsByAddress(user1.address);
                const multiUserInfos = await PurseContract.getPurseMultiTokenRewardInfo(usedTokenIds);
                expect(usedTokenIds.length).to.be.equal(multiUserInfos.length).to.be.equal(3)
            })
        })

        describe("LevelingGround", async () => {
            it("should work properly all owner setting functions", async () => {
                
            })
        })
    });
});