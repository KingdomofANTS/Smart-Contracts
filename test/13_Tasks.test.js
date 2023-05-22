const { expect } = require("chai");
const { ethers } = require("hardhat");
const { network } = require("hardhat")

describe("Tasks", function () {
    let Randomizer, RandomizerContract, ANTCoin, ANTCoinContract, BasicANT, BasicANTContract, PremiumANT, PremiumANTContract, Purse, PurseContract, Tasks, TasksContract, ANTShop, ANTShopContract;

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();

        // Randomizer smart contract deployment
        Randomizer = await ethers.getContractFactory("MockRandomizer");
        RandomizerContract = await Randomizer.deploy();
        await RandomizerContract.deployed();

        // ANTCoin smart contract deployment
        ANTCoin = await ethers.getContractFactory("ANTCoin");
        ANTCoinContract = await ANTCoin.deploy();
        await ANTCoinContract.deployed();

        // ANTShop smart contract deployment
        ANTShop = await ethers.getContractFactory("ANTShop");
        ANTShopContract = await ANTShop.deploy();
        await ANTShopContract.deployed();

        // Basic ANT smart contract deployment
        BasicANT = await ethers.getContractFactory('BasicANT');
        BasicANTContract = await BasicANT.deploy(ANTCoinContract.address, ANTShopContract.address);
        await BasicANTContract.deployed();
        await ANTShopContract.addMinterRole(BasicANTContract.address);

        // Premium ANT smart contract deployment
        PremiumANT = await ethers.getContractFactory('PremiumANT');
        PremiumANTContract = await PremiumANT.deploy(ANTCoinContract.address, ANTShopContract.address);
        await PremiumANTContract.deployed();

        // ANTLottery smart contract deployment
        ANTLottery = await ethers.getContractFactory("ANTLottery");
        ANTLotteryContract = await ANTLottery.deploy(RandomizerContract.address, ANTCoinContract.address);
        await ANTLotteryContract.deployed();

        // Purse smart contract deployment
        Purse = await ethers.getContractFactory("Purse");
        PurseContract = await Purse.deploy(RandomizerContract.address, ANTShopContract.address, ANTLotteryContract.address);
        await PurseContract.deployed();

        // Tasks smart contract deployment
        Tasks = await ethers.getContractFactory("Tasks");
        TasksContract = await Tasks.deploy(RandomizerContract.address, ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address, PurseContract.address);
        await TasksContract.deployed();

        // Marketplace smart contract deployment
        Marketplace = await ethers.getContractFactory("Marketplace");
        MarketplaceContract = await Marketplace.deploy(ANTShopContract.address, PurseContract.address, ANTLotteryContract.address);
        await MarketplaceContract.deployed();
        await ANTShopContract.addMinterRole(MarketplaceContract.address);

        // give a minterRole to Workforce contract
        await ANTCoinContract.addMinterRole(TasksContract.address);
        await PremiumANTContract.addMinterRole(TasksContract.address);
        await BasicANTContract.addMinterRole(TasksContract.address);

        await ANTShopContract.addMinterRole(PurseContract.address);
        await ANTShopContract.setTokenTypeInfo(0, "ANTFoodURI");
        await ANTShopContract.setTokenTypeInfo(1, "LevelingPotionsURI");
        await ANTShopContract.addMinterRole(PremiumANTContract.address)
        await ANTLotteryContract.addMinterRole(MarketplaceContract.address);
        await ANTLotteryContract.addMinterRole(PurseContract.address);
        await ANTCoinContract.addMinterRole(ANTLotteryContract.address);
        await PurseContract.addMinterRole(TasksContract.address)
        await PurseContract.addMultiPurseCategories(["Common", "UnCommon", "Rare", "Ultra Rare", "Legendary"], [45, 25, 20, 7, 3], [20, 5, 25, 25, 35], [5, 20, 25, 25, 35], [75, 75, 50, 50, 30], [5, 10, 10, 20, 50], [1, 1, 1, 2, 5], [10, 25, 30, 50, 100], [0, 0, 0, 0, 0])
    });


    describe("Test Suite", function () {
        it("Should set the right owner", async function () {
            const owner = await TasksContract.owner();
            expect(owner).to.be.equal(deployer.address);
        });

        it("addMinterRole: should fail if caller is not owner", async () => {
            await expect(TasksContract.connect(user1).addMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("addMinterRole: should work if caller is owner", async () => {
            await TasksContract.addMinterRole(user1.address);
            const role = await TasksContract.getMinterRole(user1.address);
            expect(role).to.be.equal(true);
        })

        it("revokeMinterRole: should fail if caller is not owner", async () => {
            await expect(TasksContract.connect(badActor).revokeMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("revokeMinterRole: should work if caller is owner", async () => {
            await TasksContract.addMinterRole(user1.address);
            const role1 = await TasksContract.getMinterRole(user1.address);
            expect(role1).to.be.equal(true);
            await TasksContract.revokeMinterRole(user1.address);
            const role2 = await TasksContract.getMinterRole(user1.address);
            expect(role2).to.be.equal(false);
        });

        it("contracts setting: should fail if caller is not the owner", async () => {
            await expect(TasksContract.connect(badActor).setRandomizerContract(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(TasksContract.connect(badActor).setANTCoinContract(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(TasksContract.connect(badActor).setPurseContract(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(TasksContract.connect(badActor).setBasicANTContract(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(TasksContract.connect(badActor).setPremiumANTContract(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("contract setting: should update the contract addresses properly if caller is owner", async () => {
            await TasksContract.setRandomizerContract(user1.address);
            await TasksContract.setANTCoinContract(user1.address);
            await TasksContract.setPurseContract(user1.address);
            await TasksContract.setBasicANTContract(user1.address);
            await TasksContract.setPremiumANTContract(user1.address);

            const randomizerContract = await TasksContract.randomizer();
            const antCoinContract = await TasksContract.antCoin();
            const purseContract = await TasksContract.purse();
            const basicANTContract = await TasksContract.basicANT();
            const premiumANTContract = await TasksContract.premiumANT();

            expect(randomizerContract).to.be.equal(user1.address)
            expect(antCoinContract).to.be.equal(user1.address)
            expect(purseContract).to.be.equal(user1.address)
            expect(basicANTContract).to.be.equal(user1.address)
            expect(premiumANTContract).to.be.equal(user1.address)
        })

        it("setMinimumLevelForStake: should fail if caller is not the owner", async () => {
            await expect(TasksContract.connect(badActor).setMinimumLevelForStake(10)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setMinimumLevelForStake: should work if caller is the owner", async () => {
            await TasksContract.setMinimumLevelForStake(2);
            const expected = await TasksContract.minimumLevelForStake();
            expect(expected).to.be.equal(2);
        })

        it("setANTCStakeFee: should fail if caller is not the owner", async () => {
            await expect(TasksContract.connect(badActor).setANTCStakeFee(10)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setANTCStakeFee: should work if caller is the owner", async () => {
            await TasksContract.setANTCStakeFee(2);
            const expected = await TasksContract.antCStakeFee();
            expect(expected).to.be.equal(2);
        })

        it("setRewardLevels: should fail if caller is not the owner", async () => {
            await expect(TasksContract.connect(badActor).setRewardLevels([[2, 5], [2, 5], [2, 5], [2, 5], [2, 5]])).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setRewardLevels: should fail if reward info is incorrect", async () => {
            await expect(TasksContract.connect(deployer).setRewardLevels([[2, 5], [5, 2], [2, 5], [2, 5], [2, 5]])).to.be.revertedWith("Tasks: index0 should be less than index1 value");

        })

        it("setRewardLevels: should return the correct reward level array values", async () => {
            await TasksContract.setRewardLevels([[5, 19], [10, 25], [19, 40], [25, 40], [30, 40]])
            const rewardLevels = await TasksContract.getRewardLevels();
            expect(rewardLevels.length).to.be.equal(5);
            expect(rewardLevels.toString()).to.be.equal("5,19,10,25,19,40,25,40,30,40");
        })

        it("setRewardsAmount: should fail if caller is not the owner", async () => {
            await expect(TasksContract.connect(badActor).setRewardsAmount([1, 2, 3, 4, 5])).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setRewardsAmount: should work if caller is the owner", async () => {
            await TasksContract.setRewardsAmount([1, 2, 3, 4, 5]);
            const expected = await TasksContract.getRewardsAmount();
            expect(expected.toString()).to.be.equal("1,2,3,4,5");
        })

        describe("stakePremiumANT & unStakePremiumANT", async () => {
            it("should fail if caller is not owner of premium ant", async () => {
                await ANTShopContract.mint(0, 100000, user1.address)
                await PremiumANTContract.setBatchInfo(0, "Worker ANT", "testBaseURI1", 1000, 1);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 1);
                await expect(TasksContract.connect(user2).stakePremiumANT(1)).to.be.revertedWith("Tasks: you are not owner of this token");
            });

            it("should fail if user don't have enough ant coin balance for staking", async () => {
                await ANTShopContract.mint(0, 100000, user1.address)
                await PremiumANTContract.setBatchInfo(0, "Worker ANT", "testBaseURI1", 1000, 1);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 1);
                await expect(TasksContract.connect(user1).stakePremiumANT(1)).to.be.revertedWith("Tasks: insufficient ant coin balance");
            })

            it("should work correctly", async () => {
                const antcoinStakeFee = 1000000;
                const antcoinInitAmount = 100000000;
                await TasksContract.setRewardLevels([[5, 19], [10, 25], [19, 40], [25, 40], [30, 40]])
                await TasksContract.setRewardsAmount([1,2,3,4,5]);
                await TasksContract.setANTCStakeFee(antcoinStakeFee);
                await ANTShopContract.mint(0, 100000, user1.address)
                await PremiumANTContract.setBatchInfo(0, "Worker ANT", "testBaseURI1", 1000, 1);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 10);
                await ANTCoinContract.transfer(user1.address, antcoinInitAmount);
                const tx = await TasksContract.connect(user1).stakePremiumANT(1);
                expect(tx).to.emit(TasksContract, "TasksStakePremiumANT").withArgs(1, user1.address);
                const totalPremiumANTStaked = await TasksContract.totalPremiumANTStaked();
                expect(totalPremiumANTStaked).to.be.equal(1);
                const expectedANTCoinBalance = await ANTCoinContract.balanceOf(user1.address);
                expect(expectedANTCoinBalance).to.be.equal(antcoinInitAmount - antcoinStakeFee);
                const stakedTokenOwner = await PremiumANTContract.ownerOf(1);
                expect(stakedTokenOwner).to.be.equal(TasksContract.address);
                const stakedAntsByAddress = await TasksContract.getPremiumANTStakedByAddress(user1.address);
                expect(stakedAntsByAddress.toString()).to.be.equal("1")
                const stakedInfo = await TasksContract.getPremiumANTStakeInfo(1);
                console.log("premiumANT StakedInfo:", stakedInfo.toString());
                await increaseTime(60 * 60 * 24 * 29);
                await expect(TasksContract.connect(user1).unStakePremiumANT(1)).to.be.revertedWith("Tasks: you can not unstake the ANT early");
                await increaseTime(60 * 60 * 24 * 1);
                await expect(TasksContract.connect(user2).unStakePremiumANT(1)).to.be.revertedWith("Tasks: you are not owner of this premium ant");
                await TasksContract.connect(user1).unStakePremiumANT(1);
                const totalPremiumANTStaked1 = await TasksContract.totalPremiumANTStaked();
                expect(totalPremiumANTStaked1).to.be.equal(0);
                const stakedTokenOwner1 = await PremiumANTContract.ownerOf(1);
                expect(stakedTokenOwner1).to.be.equal(user1.address);
                const stakedAntsByAddress1 = await TasksContract.getPremiumANTStakedByAddress(user1.address);
                expect(stakedAntsByAddress1.toString()).to.be.equal("");
            })
        })

        describe("stakeBasicANT", async () => {
            const maticMintPrice = 1000;
            const tokenAmountForMint = 10000;

            it("should fail if caller is not owner of basic ant", async () => {
                await ANTShopContract.mint(0, 100000, user1.address)
                await BasicANTContract.setBatchInfo(0, "name1", "testBaseURI1", maticMintPrice, ANTCoinContract.address, tokenAmountForMint);
                await BasicANTContract.connect(user1).mint(0, user1.address, 1, { value: maticMintPrice });
                await expect(TasksContract.connect(user2).stakeBasicANT(1)).to.be.revertedWith("Tasks: you are not owner of this token");
            });

            it("should fail if user don't have enough ant coin balance for staking", async () => {
                await ANTShopContract.mint(0, 100000, user1.address)
                await BasicANTContract.setBatchInfo(0, "name1", "testBaseURI1", maticMintPrice, ANTCoinContract.address, tokenAmountForMint);
                await BasicANTContract.connect(user1).mint(0, user1.address, 1, { value: maticMintPrice });
                await expect(TasksContract.connect(user1).stakeBasicANT(1)).to.be.revertedWith("Tasks: insufficient ant coin balance");
            })

            it("should work correctly", async () => {
                const antcoinStakeFee = 1000000;
                const antcoinInitAmount = 100000000;
                await TasksContract.setRewardLevels([[5, 19], [10, 25], [19, 40], [25, 40], [30, 40]])
                await TasksContract.setRewardsAmount([1,2,3,4,5]);
                await TasksContract.setANTCStakeFee(antcoinStakeFee);
                await ANTShopContract.mint(0, 100000, user1.address)
                await BasicANTContract.setBatchInfo(0, "name1", "testBaseURI1", maticMintPrice, ANTCoinContract.address, tokenAmountForMint);
                await BasicANTContract.connect(user1).mint(0, user1.address, 10, { value: maticMintPrice * 10 });
                await ANTCoinContract.transfer(user1.address, antcoinInitAmount);
                await BasicANTContract.downgradeLevel(1, 8);
                const tx = await TasksContract.connect(user1).stakeBasicANT(1);
                expect(tx).to.emit(TasksContract, "TasksStakeBasicANT").withArgs(1, user1.address);
                const totalBasicANTStaked = await TasksContract.totalBasicANTStaked();
                expect(totalBasicANTStaked).to.be.equal(1);
                const expectedANTCoinBalance = await ANTCoinContract.balanceOf(user1.address);
                expect(expectedANTCoinBalance).to.be.equal(antcoinInitAmount - antcoinStakeFee);
                const stakedTokenOwner = await BasicANTContract.ownerOf(1);
                expect(stakedTokenOwner).to.be.equal(TasksContract.address);
                const stakedAntsByAddress = await TasksContract.getBasicANTStakedByAddress(user1.address);
                expect(stakedAntsByAddress.toString()).to.be.equal("1")
                const stakedInfo = await TasksContract.getBasicANTStakeInfo(1);
                console.log("BasicANT StakedInfo:", stakedInfo.toString());
                await increaseTime(60 * 60 * 24 * 29);
                await expect(TasksContract.connect(user1).unStakeBasicANT(1)).to.be.revertedWith("Tasks: you can not unstake the ANT early");
                await increaseTime(60 * 60 * 24 * 1);
                await expect(TasksContract.connect(user2).unStakeBasicANT(1)).to.be.revertedWith("Tasks: you are not owner of this basic ant");
                await TasksContract.connect(user1).unStakeBasicANT(1);
                const totalBasicANTStaked1 = await TasksContract.totalBasicANTStaked();
                expect(totalBasicANTStaked1).to.be.equal(0);
                const stakedTokenOwner1 = await BasicANTContract.ownerOf(1);
                expect(stakedTokenOwner1).to.be.equal(user1.address);
                const stakedAntsByAddress1 = await TasksContract.getBasicANTStakedByAddress(user1.address);
                expect(stakedAntsByAddress1.toString()).to.be.equal("");
            })
        })
    })
})

const rpc = ({ method, params }) => {
    return network.provider.send(method, params);
};

const increaseTime = async (seconds) => {
    await rpc({ method: "evm_increaseTime", params: [seconds] });
    return rpc({ method: "evm_mine" });
};
