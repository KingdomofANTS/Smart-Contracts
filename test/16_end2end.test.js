const { expect } = require("chai");
const { BigNumber, utils } = require("ethers");
const { ethers } = require("hardhat")

describe("End2End", function () {
    let ANTCoin, ANTCoinContract, ANTShop, ANTShopContract, BasicANT, BasicANTContract, PremiumANT, PremiumANTContract, ANTLottery, ANTLotteryContract, Purse, PurseContract, Marketplace, MarketplaceContract, Bosses, BossesContract, FoodGathering, FoodGatheringContract, LevelingGround, LevelingGroundContract, Tasks, TasksContract, Workforce, WorkforceContract, Vesting, VestingContract, Randomizer, RandomizerContract;

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

        const basicANTMaticMintPrice = ethers.utils.parseEther("0.001")
        const baiscANTANTCoinMintAmount = ethers.utils.parseEther("1000");

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

        // purse
        Purse = await ethers.getContractFactory("Purse");
        PurseContract = await Purse.deploy(RandomizerContract.address, ANTShopContract.address, ANTLotteryContract.address);
        await PurseContract.deployed();

        Marketplace = await ethers.getContractFactory("Marketplace");
        MarketplaceContract = await Marketplace.deploy(ANTShopContract.address, PurseContract.address, ANTLotteryContract.address);
        await MarketplaceContract.deployed();
        await ANTShopContract.addMinterRole(MarketplaceContract.address);
        await ANTLotteryContract.addMinterRole(MarketplaceContract.address);
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
    });
});