const { expect, util } = require("chai");
const { ethers } = require("hardhat");
const { network } = require("hardhat")
const { utils } = ethers;

describe("FoodGathering", function () {
    let ANTCoin, ANTCoinContract, ANTShop, ANTShopContract, FoodGathering, FoodGatheringContract, Randomizer, RandomizerContract;

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

        // set ANTFood and LevelingPotions contract
        await ANTShopContract.setTokenTypeInfo(0, "ANTFood", "testBaseURI1");
        await ANTShopContract.setTokenTypeInfo(1, "Leveling Potions", "testBaseURI2");

        FoodGathering = await ethers.getContractFactory("FoodGathering")
        FoodGatheringContract = await FoodGathering.deploy(ANTCoinContract.address, ANTShopContract.address);
        await FoodGatheringContract.deployed();

        await ANTCoinContract.addMinterRole(FoodGatheringContract.address);
        await ANTShopContract.addMinterRole(FoodGatheringContract.address);
    });

    describe("Test Suite", function () {
        it("Should set the right owner", async function () {
            const owner = await FoodGatheringContract.owner();
            expect(owner).to.be.equal(deployer.address);
        });

        it("all contracts should be set correctly", async () => {
            const antCoinAddress = await FoodGatheringContract.antCoin();
            const antShopAddress = await FoodGatheringContract.antShop();
            expect(antCoinAddress).to.be.equal(ANTCoinContract.address);
            expect(antShopAddress).to.be.equal(ANTShopContract.address);
        })

        it("addMinterRole: should fail if caller is not owner", async () => {
            await expect(FoodGatheringContract.connect(user1).addMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("addMinterRole: should work if caller is owner", async () => {
            await FoodGatheringContract.addMinterRole(user1.address);
            const role = await FoodGatheringContract.getMinterRole(user1.address);
            expect(role).to.be.equal(true);
        })

        it("revokeMinterRole: should fail if caller is not owner", async () => {
            await expect(FoodGatheringContract.connect(badActor).revokeMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("revokeMinterRole: should work if caller is owner", async () => {
            await FoodGatheringContract.addMinterRole(user1.address);
            const role1 = await FoodGatheringContract.getMinterRole(user1.address);
            expect(role1).to.be.equal(true);
            await FoodGatheringContract.revokeMinterRole(user1.address);
            const role2 = await FoodGatheringContract.getMinterRole(user1.address);
            expect(role2).to.be.equal(false);
        });

        it("setAntFoodTokenId: should fail if caller is not owner", async () => {
            await expect(FoodGatheringContract.connect(badActor).setANTFoodTokenId(2)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setAntFoodTokenId: should work if caller is owner", async () => {
            const antFoodTokenId = await FoodGatheringContract.antFoodTokenId();
            expect(antFoodTokenId).to.be.equal(0);
            await FoodGatheringContract.setANTFoodTokenId(1);
            const expected = await FoodGatheringContract.antFoodTokenId();
            expect(expected).to.be.equal(1);
        })

        it("setStakeFeeAmount: should fail if caller is not owner", async () => {
            await expect(FoodGatheringContract.connect(badActor).setStakeFeeAmount(2)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setStakeFeeAmount: should work if caller is owner", async () => {
            const stakeFeeAmount = await FoodGatheringContract.stakeFeeAmount();
            expect(stakeFeeAmount).to.be.equal(utils.parseEther("1000"));
            await FoodGatheringContract.setStakeFeeAmount(1);
            const expected = await FoodGatheringContract.stakeFeeAmount();
            expect(expected).to.be.equal(1);
        })

        it("setMaxAmountForStake: should fail if caller is not owner", async () => {
            await expect(FoodGatheringContract.connect(badActor).setMaxAmountForStake(2)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setMaxAmountForStake: should work if caller is owner", async () => {
            const maxAmountForStake = await FoodGatheringContract.maxAmountForStake();
            expect(maxAmountForStake).to.be.equal(utils.parseEther("900000"));
            await FoodGatheringContract.setMaxAmountForStake(1);
            const expected = await FoodGatheringContract.maxAmountForStake();
            expect(expected).to.be.equal(1);
        })

        it("setCycleStakedAmount: should fail if caller is not owner", async () => {
            await expect(FoodGatheringContract.connect(badActor).setCycleTimestamp(2)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setCycleStakedAmount: should work if caller is owner", async () => {
            const cycleStakedAmount = await FoodGatheringContract.cycleStakedAmount();
            expect(cycleStakedAmount).to.be.equal(utils.parseEther("30000"));
            await FoodGatheringContract.setCycleStakedAmount(1);
            const expected = await FoodGatheringContract.cycleStakedAmount();
            expect(expected).to.be.equal(1);
        })

        it("setCycleTimestamp: should fail if caller is not owner", async () => {
            await expect(FoodGatheringContract.connect(badActor).setCycleTimestamp(2)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setCycleTimestamp: should work if caller is owner", async () => {
            const cycleTimestamp = await FoodGatheringContract.cycleTimestamp();
            expect(cycleTimestamp).to.be.equal(60 * 60 * 24);
            await FoodGatheringContract.setCycleTimestamp(1);
            const expected = await FoodGatheringContract.cycleTimestamp();
            expect(expected).to.be.equal(1);
        })

        it("stake: should fail if user don't have enough ant coin balance for staking", async () => {
            await expect(FoodGatheringContract.connect(user1).stake(1000)).to.be.revertedWith("FoodGathering: you don't have enough ant coin balance for staking")
        })

        it("stake: should fail if user staking amount exceed the maximum staking amount limit", async () => {
            const maxAmountForStake = await FoodGatheringContract.maxAmountForStake();
            const stakeFeeAmount = await FoodGatheringContract.stakeFeeAmount();
            await ANTCoinContract.transfer(user1.address, maxAmountForStake.add(stakeFeeAmount).add(1));
            await expect(FoodGatheringContract.connect(user1).stake(maxAmountForStake.add(1))).to.be.revertedWith("FoodGathering: your staking amount exceeds the maximum staking amount limit.")
        })

        it("stake & unStake: should work if all conditions are correct", async () => {
            const stakeFeeAmount = await FoodGatheringContract.stakeFeeAmount();
            await ANTCoinContract.transfer(user1.address, stakeFeeAmount.add(utils.parseEther("900000")));
            const initialBalance = await ANTCoinContract.balanceOf(user1.address);
            await FoodGatheringContract.connect(user1).stake(utils.parseEther("100000"));
            const userANTCBalance1 = await ANTCoinContract.balanceOf(user1.address);
            expect(userANTCBalance1).to.be.equal(initialBalance.sub(utils.parseEther("100000")).sub(stakeFeeAmount));

            const stakedInfo1 = await FoodGatheringContract.getStakedInfo(user1.address);
            expect(stakedInfo1.stakedAmount).to.be.equal(utils.parseEther("100000"));
            expect(stakedInfo1.rewardDebt).to.be.equal(0);

            await increaseTime(60 * 60 * 25);
            const expectedPendingAmount1 = utils.parseEther("100000").mul(60 * 60 * 25).mul(1000).div(utils.parseEther("30000").mul(60 * 60 * 24));
            const pendingAmount1 = await FoodGatheringContract.pendingRewardByAddress(user1.address);
            expect(expectedPendingAmount1).to.be.equal(pendingAmount1); // 3472

            await FoodGatheringContract.connect(user1).stake(utils.parseEther("50000"));
            const userANTCBalance2 = await ANTCoinContract.balanceOf(user1.address);
            expect(userANTCBalance2).to.be.equal(userANTCBalance1.sub(utils.parseEther("50000")).sub(stakeFeeAmount));

            const stakedInfo2 = await FoodGatheringContract.getStakedInfo(user1.address);
            expect(stakedInfo2.stakedAmount).to.be.equal(utils.parseEther("100000").add(utils.parseEther("50000")));
            expect(stakedInfo2.rewardDebt).to.be.equal(expectedPendingAmount1);
            await increaseTime(60 * 60 * 30);
            const expectedPendingAmount2 = utils.parseEther("150000").mul(60 * 60 * 30).mul(1000).div(utils.parseEther("30000").mul(60 * 60 * 24));
            const pendingAmount2 = await FoodGatheringContract.pendingRewardByAddress(user1.address);
            expect(pendingAmount2).to.be.equal(pendingAmount1.add(expectedPendingAmount2)) // 9722

            const tx = await FoodGatheringContract.connect(user1).unStake();
            const rewardAmount = await ANTShopContract.balanceOf(user1.address, 0);
            const expectedANTFoodBalance = (pendingAmount1.add(expectedPendingAmount2)).div(1000);
            expect(rewardAmount).to.be.equal(expectedANTFoodBalance); // 9

            const userANTCBalance3 = await ANTCoinContract.balanceOf(user1.address);
            expect(userANTCBalance3).to.be.equal(userANTCBalance2.add(utils.parseEther("150000")));
            const stakedInfo3 = await FoodGatheringContract.getStakedInfo(user1.address);
            expect(stakedInfo3.stakedAmount).to.be.equal(0);
            expect(stakedInfo3.rewardDebt).to.be.equal(0);
            expect(stakedInfo3.stakedTimestamp).to.be.equal(0);
            expect(tx).to.emit(FoodGatheringContract, "FoodGatheringUnStaked").withArgs(user1.address, utils.parseEther("150000"), 9)
        })

        it("unStake: should fail if caller didn't stake anything", async () => {
            await expect(FoodGatheringContract.connect(user3).unStake()).to.be.revertedWith("FoodGathering: You didn't stake any amount of ant coins")
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