const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { network } = require("hardhat")

describe("Bosses", function () {
    let ANTCoin, ANTCoinContract, ANTShop, ANTShopContract, Bosses, BossesContract, Randomizer, RandomizerContract, BasicANT, BasicANTContract, PremiumANT, PremiumANTContract;

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();

        // Randomizer smart contract deployment
        const keyHash = "0x01f7a05a9b9582bd382add6f255d31774e3846da15c0f45959a3b0266cb40d6b";
        const linkToken = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
        const vrfCordinator = "0xa555fC018435bef5A13C6c6870a9d4C11DEC329C";
        const vrfFee = "1000000000000000000"
        Randomizer = await ethers.getContractFactory("Randomizer");
        RandomizerContract = await Randomizer.deploy(keyHash, linkToken, vrfCordinator, vrfFee);
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

        // Basic ANT smart contract deployment
        BasicANT = await ethers.getContractFactory('BasicANT');
        BasicANTContract = await BasicANT.deploy(ANTCoinContract.address, ANTShopContract.address);
        await BasicANTContract.deployed();
        await ANTShopContract.addMinterRole(BasicANTContract.address);

        // Premium ANT smart contract deployment
        PremiumANT = await ethers.getContractFactory('PremiumANT');
        PremiumANTContract = await PremiumANT.deploy(ANTCoinContract.address, ANTShopContract.address);
        await PremiumANTContract.deployed();
        await ANTShopContract.addMinterRole(PremiumANTContract.address);

        // Bosses smart contract deployment
        Bosses = await ethers.getContractFactory('Bosses');
        BossesContract = await Bosses.deploy(RandomizerContract.address, ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address);
        await BossesContract.deployed()

        // give a minterRole to Booses contract
        await ANTCoinContract.addMinterRole(BossesContract.address);
        await PremiumANTContract.addMinterRole(BossesContract.address);
        await BasicANTContract.addMinterRole(BossesContract.address);
    });

    describe("Test Suite", function () {
        it("Should set the right owner", async function () {
            const owner = await BossesContract.owner();
            expect(owner).to.be.equal(deployer.address);
        });

        it("addMinterRole: should fail if caller is not owner", async () => {
            await expect(BossesContract.connect(user1).addMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("addMinterRole: should work if caller is owner", async () => {
            await BossesContract.addMinterRole(user1.address);
            const role = await BossesContract.getMinterRole(user1.address);
            expect(role).to.be.equal(true);
        })

        it("revokeMinterRole: should fail if caller is not owner", async () => {
            await expect(BossesContract.connect(badActor).revokeMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("revokeMinterRole: should work if caller is owner", async () => {
            await BossesContract.addMinterRole(user1.address);
            const role1 = await BossesContract.getMinterRole(user1.address);
            expect(role1).to.be.equal(true);
            await BossesContract.revokeMinterRole(user1.address);
            const role2 = await BossesContract.getMinterRole(user1.address);
            expect(role2).to.be.equal(false);
        });

        it("setRandomizerContract: should work if caller is owner", async () => {
            const randomizer = await BossesContract.randomizer();
            expect(randomizer).to.be.equal(RandomizerContract.address);
            await BossesContract.setRandomizerContract(user1.address);
            const expected = await BossesContract.randomizer();
            expect(expected).to.be.equal(user1.address);
        })

        it("setANTCoinContract: should work if caller is owner", async () => {
            const antCoin = await BossesContract.antCoin();
            expect(antCoin).to.be.equal(ANTCoinContract.address);
            await BossesContract.setANTCoinContract(user1.address);
            const expected = await BossesContract.antCoin();
            expect(expected).to.be.equal(user1.address);
        })

        it("setPremiumANTContract: should work if caller is owner", async () => {
            const premiumANT = await BossesContract.premiumANT();
            expect(premiumANT).to.be.equal(PremiumANTContract.address);
            await BossesContract.setPremiumANTContract(user1.address);
            const expected = await BossesContract.premiumANT();
            expect(expected).to.be.equal(user1.address);
        })

        it("setBasicANTContract: should work if caller is owner", async () => {
            const basicANT = await BossesContract.basicANT();
            expect(basicANT).to.be.equal(BasicANTContract.address);
            await BossesContract.setBasicANTContract(user1.address);
            const expected = await BossesContract.basicANT();
            expect(expected).to.be.equal(user1.address);
        })

        it("setStakePeriod: should work if caller is owner", async () => {
            await expect(BossesContract.connect(badActor).setStakePeriod(100)).to.be.revertedWith("Ownable: caller is not the owner");
            await BossesContract.setStakePeriod(1000);
            const expected = await BossesContract.stakePeriod();
            expect(expected).to.be.equal(1000)
        })

        it("setBurnRate: should work if caller is owner", async () => {
            await expect(BossesContract.connect(badActor).setBurnRate(100)).to.be.revertedWith("Ownable: caller is not the owner");
            await BossesContract.setBurnRate(1000);
            const expected = await BossesContract.burnRate();
            expect(expected).to.be.equal(1000)
        })

        it("setLimitANTCoinStakeAmount: should work if caller is owner", async () => {
            await expect(BossesContract.connect(badActor).setLimitANTCoinStakeAmount(100)).to.be.revertedWith("Ownable: caller is not the owner");
            await BossesContract.setLimitANTCoinStakeAmount(1000);
            const expected = await BossesContract.limitANTCoinStakeAmount();
            expect(expected).to.be.equal(1000)
        })

        it("setBossesPoolsInfo: should work if caller is owner", async () => {
            await expect(BossesContract.connect(badActor).setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake", "Anteater"], [20, 50, 100, 250, 600], [1, 1, 1, 1, 1], [5, 10, 18, 25, 40])).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake"], [20, 50, 100, 250, 600], [1, 1, 1, 1, 1], [5, 10, 18, 25, 40])).to.be.revertedWith("Bosses: invalid bosses pools info")
            await expect(BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake", "Anteater"], [ 50, 100, 250, 600], [1, 1, 1, 1, 1], [5, 10, 18, 25, 40])).to.be.revertedWith("Bosses: invalid bosses pools info")
            await expect(BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake", "Anteater"], [20, 50, 100, 250, 600], [1, 1, 1, 1], [5, 10, 18, 25, 40])).to.be.revertedWith("Bosses: invalid bosses pools info")
            await expect(BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake", "Anteater"], [20, 50, 100, 250, 600], [1, 1, 1, 1, 1], [5, 10, 25, 40])).to.be.revertedWith("Bosses: invalid bosses pools info")
            await BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake", "Anteater"], [20, 50, 100, 250, 600], [1, 1, 1, 1, 1], [5, 10, 18, 25, 40])
            const poolInfo1 = await BossesContract.getBossesPoolInfoByIndex(0);
            const poolInfo2 = await BossesContract.getBossesPoolInfoByIndex(1);
            const poolInfo3 = await BossesContract.getBossesPoolInfoByIndex(2);
            const poolInfo4 = await BossesContract.getBossesPoolInfoByIndex(3);
            const poolInfo5 = await BossesContract.getBossesPoolInfoByIndex(4);
            expect(poolInfo1.toString()).to.be.equal("Catepillar,20,1,5")
            expect(poolInfo2.toString()).to.be.equal("Snail,50,1,10")
            expect(poolInfo3.toString()).to.be.equal("Beetle,100,1,18")
            expect(poolInfo4.toString()).to.be.equal("Snake,250,1,25")
            expect(poolInfo5.toString()).to.be.equal("Anteater,600,1,40")
            await BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake1", "Anteater", "Test"], [20, 50, 100, 250, 600, 100], [1, 1, 1, 5, 1, 1], [5, 10, 18, 25, 40, 50])
            const poolInfo6 = await BossesContract.getBossesPoolInfoByIndex(5);
            const poolInfo4_1 = await BossesContract.getBossesPoolInfoByIndex(3);
            expect(poolInfo6.toString()).to.be.equal("Test,100,1,50");
            expect(poolInfo4_1.toString()).to.be.equal("Snake1,250,5,25")
        })

        it("stakePremiumANT: should work normally", async () => {
            const antCoinTransferAmount = 100000000000;
            await ANTShopContract.mint(0, 10, user1.address);
            await ANTShopContract.mint(0, 10, user2.address);
            await PremiumANTContract.setBatchInfo(0, "Worker ANT", "testBaseURI1", 1000, 1);
            await PremiumANTContract.setBatchInfo(1, "Wise ANT", "testBaseURI2", 1000, 1);
            // batch index 0 mint of premium ants
            await PremiumANTContract.connect(user1).mint(0, user1.address, 1);
            await PremiumANTContract.connect(user2).mint(0, user2.address, 1);
            await ANTCoinContract.transfer(user1.address, antCoinTransferAmount)
            await ANTCoinContract.transfer(user2.address, antCoinTransferAmount)
            await expect(BossesContract.connect(user1).stakePremiumANT(2, antCoinTransferAmount)).to.be.revertedWith("Bosses: you are not owner of this token");
            await BossesContract.setLimitANTCoinStakeAmount(antCoinTransferAmount - 1);
            await expect(BossesContract.connect(user1).stakePremiumANT(1, antCoinTransferAmount)).to.be.revertedWith("Bosses: ant coin stake amount exceed the limit amount");
            await BossesContract.setLimitANTCoinStakeAmount(BigNumber.from(antCoinTransferAmount.toString()).mul("1000"));
            await expect(BossesContract.connect(user1).stakePremiumANT(1, antCoinTransferAmount + 1)).to.be.revertedWith("Bosses: insufficient ant coin balance");
            await expect(BossesContract.connect(user1).stakePremiumANT(1, antCoinTransferAmount)).to.be.revertedWith("Bosses: bosses pools info has not been set yet");

            await BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake", "Anteater"], [20, 50, 100, 250, 600], [1, 1, 1, 1, 1], [5, 10, 18, 25, 40]);
            await BossesContract.connect(user1).stakePremiumANT(1, antCoinTransferAmount);
            await BossesContract.connect(user2).stakePremiumANT(2, antCoinTransferAmount);
            const user1StakedTokenIds1 = await BossesContract.getPremiumANTStakedByAddress(user1.address);
            const user2StakedTokenIds1 = await BossesContract.getPremiumANTStakedByAddress(user2.address);
            expect(user1StakedTokenIds1.toString()).to.be.equal("1")
            expect(user2StakedTokenIds1.toString()).to.be.equal("2")
            const user1StakedInfo1 = await BossesContract.getPremiumANTStakeInfo(1);
            const user2StakedInfo1 = await BossesContract.getPremiumANTStakeInfo(2);
            const user1AntCoinBalance1 = await ANTCoinContract.balanceOf(user1.address);
            expect(user1AntCoinBalance1).to.be.equal(0);
            const user2AntCoinBalance1 = await ANTCoinContract.balanceOf(user2.address);
            expect(user2AntCoinBalance1).to.be.equal(0);

            await increaseTime(60 * 60 * 24 * 29); // 29 days

            // early unStake --- User1 token Id: 1
            await BossesContract.connect(user1).unStakePremiumANT(1);
            const user1StakedTokenIds2 = await BossesContract.getPremiumANTStakedByAddress(user1.address);
            expect(user1StakedTokenIds2.toString()).to.be.equal("");
            const user1AntCoinBalance2 = await ANTCoinContract.balanceOf(user1.address);
            const expectedUser1ANTCoinBalance1 = antCoinTransferAmount * 0.8;
            expect(user1AntCoinBalance2).to.be.equal(expectedUser1ANTCoinBalance1);
            const user1PremiumANTInfo = await PremiumANTContract.getANTInfo(2);
            expect(user1PremiumANTInfo.level).to.be.equal(20)

            await increaseTime(60 * 60 * 24 * 1);
            // normal unStake --- User2 token Id: 2
            await BossesContract.connect(user2).unStakePremiumANT(2);
            const user2StakedTokenIds2 = await BossesContract.getPremiumANTStakedByAddress(user2.address);
            expect(user2StakedTokenIds2.toString()).to.be.equal("");
            const user2AntCoinBalance2 = await ANTCoinContract.balanceOf(user2.address);
            const poolInfo = await BossesContract.getBossesPoolInfoByIndex(user2StakedInfo1.rewardIndex);
            const expectedUser2ANTCoinBalance1 = antCoinTransferAmount + antCoinTransferAmount * poolInfo.rewardAPY / 100;
            expect(user2AntCoinBalance2).to.be.equal(expectedUser2ANTCoinBalance1);
            const user2PremiumANTInfo = await PremiumANTContract.getANTInfo(2);
            expect(user2PremiumANTInfo.level).to.be.equal(1)
        });

        it("stakeBasicANT: should work normally", async () => {
            const antCoinTransferAmount = 100000000000;
            await ANTShopContract.mint(0, 10, user1.address);
            await ANTShopContract.mint(0, 10, user2.address);
            await BasicANTContract.setBatchInfo(0, "Worker ANT", "testBaseURI1", 1000, ANTCoinContract.address, 1);
            await BasicANTContract.setBatchInfo(1, "Wise ANT", "testBaseURI1", 1000, ANTCoinContract.address, 1);
            // batch index 0 mint of premium ants
            await BasicANTContract.connect(user1).mint(0, user1.address, 1, { value: 1000 });
            await BasicANTContract.connect(user2).mint(0, user2.address, 1, { value: 1000 });
            await ANTCoinContract.transfer(user1.address, antCoinTransferAmount)
            await ANTCoinContract.transfer(user2.address, antCoinTransferAmount)
            await expect(BossesContract.connect(user1).stakeBasicANT(2, antCoinTransferAmount)).to.be.revertedWith("Bosses: you are not owner of this token");
            await BossesContract.setLimitANTCoinStakeAmount(antCoinTransferAmount - 1);
            await expect(BossesContract.connect(user1).stakeBasicANT(1, antCoinTransferAmount)).to.be.revertedWith("Bosses: ant coin stake amount exceed the limit amount");
            await BossesContract.setLimitANTCoinStakeAmount(BigNumber.from(antCoinTransferAmount.toString()).mul("1000"));
            await expect(BossesContract.connect(user1).stakeBasicANT(1, antCoinTransferAmount + 1)).to.be.revertedWith("Bosses: insufficient ant coin balance");
            await expect(BossesContract.connect(user1).stakeBasicANT(1, antCoinTransferAmount)).to.be.revertedWith("Bosses: bosses pools info has not been set yet");
            await BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake", "Anteater"], [20, 50, 100, 250, 600], [1, 1, 1, 1, 1], [5, 10, 18, 25, 40]);
            await expect(BossesContract.connect(user1).stakeBasicANT(1, antCoinTransferAmount)).to.be.revertedWith("Bosses: ant level must be greater than the minimum required pool level");
            
            // upgrade basic ants level to 5 for testing
            await BasicANTContract.downgradeLevel(1, 5);  
            await BasicANTContract.downgradeLevel(2, 5);

            await BossesContract.connect(user1).stakeBasicANT(1, antCoinTransferAmount);
            await BossesContract.connect(user2).stakeBasicANT(2, antCoinTransferAmount);
            const user1StakedTokenIds1 = await BossesContract.getBasicANTStakedByAddress(user1.address);
            const user2StakedTokenIds1 = await BossesContract.getBasicANTStakedByAddress(user2.address);
            expect(user1StakedTokenIds1.toString()).to.be.equal("1")
            expect(user2StakedTokenIds1.toString()).to.be.equal("2")
            const user1StakedInfo1 = await BossesContract.getBasicANTStakeInfo(1);
            const user2StakedInfo1 = await BossesContract.getBasicANTStakeInfo(2);
            const user1AntCoinBalance1 = await ANTCoinContract.balanceOf(user1.address);
            expect(user1AntCoinBalance1).to.be.equal(0);
            const user2AntCoinBalance1 = await ANTCoinContract.balanceOf(user2.address);
            expect(user2AntCoinBalance1).to.be.equal(0);

            await increaseTime(60 * 60 * 24 * 29); // 29 days

            // early unStake --- User1 token Id: 1
            await BossesContract.connect(user1).unStakeBasicANT(1);
            const user1StakedTokenIds2 = await BossesContract.getBasicANTStakedByAddress(user1.address);
            expect(user1StakedTokenIds2.toString()).to.be.equal("");
            const user1AntCoinBalance2 = await ANTCoinContract.balanceOf(user1.address);
            const expectedUser1ANTCoinBalance1 = antCoinTransferAmount * 0.8;
            expect(user1AntCoinBalance2).to.be.equal(expectedUser1ANTCoinBalance1);
            const user1BasicANTInfo = await BasicANTContract.getANTInfo(2);
            expect(user1BasicANTInfo.level).to.be.equal(5)

            await increaseTime(60 * 60 * 24 * 1);
            // normal unStake --- User2 token Id: 2
            await BossesContract.connect(user2).unStakeBasicANT(2);
            const user2StakedTokenIds2 = await BossesContract.getBasicANTStakedByAddress(user2.address);
            expect(user2StakedTokenIds2.toString()).to.be.equal("");
            const user2AntCoinBalance2 = await ANTCoinContract.balanceOf(user2.address);
            const poolInfo = await BossesContract.getBossesPoolInfoByIndex(user2StakedInfo1.rewardIndex);
            const expectedUser2ANTCoinBalance1 = antCoinTransferAmount + antCoinTransferAmount * poolInfo.rewardAPY / 100;
            expect(user2AntCoinBalance2).to.be.equal(expectedUser2ANTCoinBalance1);
            const user2BasicANTInfo = await BasicANTContract.getANTInfo(2);
            expect(user2BasicANTInfo.level).to.be.equal(1)
        });
    })
})


const rpc = ({ method, params }) => {
    return network.provider.send(method, params);
};

const increaseTime = async (seconds) => {
    await rpc({ method: "evm_increaseTime", params: [seconds] });
    return rpc({ method: "evm_mine" });
};
