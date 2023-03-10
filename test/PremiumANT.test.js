const { expect } = require("chai");
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")

describe("PremiumANT", function () {
    let ANTShop, ANTShopContract, PremiumANT, PremiumANTContract;

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();

        // ANTShop smart contract deployment
        ANTShop = await ethers.getContractFactory("ANTShop");
        ANTShopContract = await ANTShop.deploy();
        await ANTShopContract.deployed();

        // set ANTFood and LevelingPotions contract
        await ANTShopContract.setTokenTypeInfo(0, "testBaseURI1");
        await ANTShopContract.setTokenTypeInfo(1, "testBaseURI2");

        // Premium ANT smart contract deployment
        PremiumANT = await ethers.getContractFactory('PremiumANT');
        PremiumANTContract = await PremiumANT.deploy(ANTShopContract.address);
        await PremiumANTContract.deployed();
        await ANTShopContract.addMinterRole(PremiumANTContract.address);
    });

    describe("Test Suite", function () {
        it("Should set the right owner", async function () {
            const owner = await PremiumANTContract.owner();
            expect(owner).to.be.equal(deployer.address);
        });

        it("addMinterRole: should fail if caller is not owner", async () => {
            await expect(PremiumANTContract.connect(user1).addMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("addMinterRole: should work if caller is owner", async () => {
            await PremiumANTContract.addMinterRole(user1.address);
            const role = await PremiumANTContract.getMinterRole(user1.address);
            expect(role).to.be.equal(true);
        })

        it("revokeMinterRole: should fail if caller is not owner", async () => {
            await expect(PremiumANTContract.connect(badActor).revokeMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("revokeMinterRole: should work if caller is owner", async () => {
            await PremiumANTContract.addMinterRole(user1.address);
            const role1 = await PremiumANTContract.getMinterRole(user1.address);
            expect(role1).to.be.equal(true);
            await PremiumANTContract.revokeMinterRole(user1.address);
            const role2 = await PremiumANTContract.getMinterRole(user1.address);
            expect(role2).to.be.equal(false);
        })

        it("setLevelingPotionTokenId: should fail if caller is not the owner", async () => {
            await expect(PremiumANTContract.connect(badActor).setLevelingPotionTokenId(1)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setLevelingPotionTokenId: should work if caller is the owner", async () => {
            await PremiumANTContract.setLevelingPotionTokenId(2);
            const expected = await PremiumANTContract.levelingPotionTokenId();
            expect(expected).to.be.equal(2)
        })

        it("setAntFoodTokenId: should fail if caller is not the owner", async () => {
            await expect(PremiumANTContract.connect(badActor).setAntFoodTokenId(1)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setAntFoodTokenId: should work if caller is owner", async () => {
            await PremiumANTContract.setAntFoodTokenId(2);
            const expected = await PremiumANTContract.antFoodTokenId();
            expect(expected).to.be.equal(2)
        })

        it("setBatchInfo: should fail if caller is not the owner", async () => {
            await expect(PremiumANTContract.connect(badActor).setBatchInfo(0, "name1", "testBaseURI1", 1000, 10)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setBatchInfo: should work if caller is the owner", async () => {
            await PremiumANTContract.setBatchInfo(0, "name1", "testBaseURI1", 1000, 2);
            await PremiumANTContract.setBatchInfo(1, "name2", "testBaseURI2", 2000, 1);
            const expected1 = await PremiumANTContract.getBatchInfo(0);
            const expected2 = await PremiumANTContract.getBatchInfo(1);
            expect(expected1.toString()).to.be.equal("name1,testBaseURI1,0,1000,2");
            expect(expected2.toString()).to.be.equal("name2,testBaseURI2,0,2000,1");
        })

        it("setStartLevel: should fail if caller is not the owner", async () => {
            await expect(PremiumANTContract.connect(badActor).setStartLevel(0)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setStartLevel: should work if caller is the owner", async () => {
            await PremiumANTContract.setStartLevel(10);
            const expected = await PremiumANTContract.startLevel();
            expect(expected).to.be.equal(10);
        })

        it("downgradeLevel: should fail if caller is not the minter", async () => {
            await expect(PremiumANTContract.connect(badActor).downgradeLevel(0, 1)).to.be.revertedWith("PremiumANT: Caller is not the minter");
        })

        it("downgradeLevel: should work if caller has a minter role", async () => {
            await ANTShopContract.mint(0, 2, user1.address);
            await PremiumANTContract.setBatchInfo(0, "name1", "testBaseURI1", 100, 2);
            await PremiumANTContract.setBatchInfo(1, "name2", "testBaseURI2", 100, 1);
            await PremiumANTContract.connect(user1).mint(0, user1.address, 1);
            await PremiumANTContract.addMinterRole(user1.address);
            await PremiumANTContract.downgradeLevel(1, 0);
            const antInfo = await PremiumANTContract.getANTInfo(1);
            expect(antInfo.toString()).to.be.equal("0,0,0,1")
        })

        it("ownerMint: should fail if caller is not the minter", async () => {
            await expect(PremiumANTContract.connect(badActor).ownerMint(0, user1.address, 1)).to.be.revertedWith("PremiumANT: Caller is not the minter");
        })

        it("ownerMint: should work if caller has a minter role", async () => {
            await PremiumANTContract.setBatchInfo(0, "name1", "testBaseURI1", 1000, 2);
            await PremiumANTContract.addMinterRole(user1.address);
            await expect(PremiumANTContract.connect(user1).ownerMint(0, user1.address, 2)).to.be.not.reverted;
            const tokensOfOwner = await PremiumANTContract.tokensOfOwner(user1.address);
            expect(tokensOfOwner.toString()).to.be.equal("1,2");
            const batchInfo = await PremiumANTContract.getBatchInfo(0);
            expect(batchInfo.toString()).to.be.equal("name1,testBaseURI1,2,1000,2");
            const antInfo = await PremiumANTContract.getANTInfo(1);
            expect(antInfo.toString()).to.be.equal("20,0,0,1")
        })

        describe("mint", () => {
            it("should fail if batch information not set yet", async () => {
                await expect(PremiumANTContract.connect(user1).mint(0, user1.address, 1)).to.be.revertedWith("PremiumANT: batch information has not yet been set")
            })

            it("should fail if mint amount exceeds the maxSupply", async () => {
                await PremiumANTContract.setBatchInfo(0, "name1", "testBaseURI1", 10, 2);
                await expect(PremiumANTContract.connect(user1).mint(0, user1.address, 11)).to.be.revertedWith("PremiumANT: mint amount exceeds the maximum supply for this batch")
            })

            it("should fail if user don't have enough ANTFood balance to mint", async () => {
                await PremiumANTContract.setBatchInfo(0, "name1", "testBaseURI1", 10, 2);
                await expect(PremiumANTContract.connect(user1).mint(0, user1.address, 1)).to.be.revertedWith("PremiumANT: insufficient balance")
            })

            it("should work if all conditions are correct", async () => {
                await ANTShopContract.mint(0, 2, user1.address);
                await PremiumANTContract.setBatchInfo(0, "name1", "testBaseURI1", 100, 2);
                await PremiumANTContract.setBatchInfo(1, "name2", "testBaseURI2", 100, 1);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 1);
                const expectedBalanceAfterMint = await ANTShopContract.balanceOf(user1.address, 0);
                expect(expectedBalanceAfterMint).to.be.equal(0);
                const minted = await PremiumANTContract.minted();
                const totalSupply = await PremiumANTContract.totalSupply();
                expect(minted).to.be.equal(totalSupply).to.be.equal(1);
                const antInfo = await PremiumANTContract.getANTInfo(1);
                expect(antInfo.toString()).to.be.equal("20,0,0,1");
                const batchInfo = await PremiumANTContract.getBatchInfo(0);
                expect(batchInfo.toString()).to.be.equal("name1,testBaseURI1,1,100,2");
                await ANTShopContract.mint(0, 2, user1.address);
                await PremiumANTContract.connect(user1).mint(1, user1.address, 2);
                const tokensOfOwner = await PremiumANTContract.tokensOfOwner(user1.address);
                expect(tokensOfOwner.toString()).to.be.equal("1,2,3");
                const minted1 = await PremiumANTContract.minted();
                const totalSupply1 = await PremiumANTContract.totalSupply();
                expect(minted1).to.be.equal(totalSupply1).to.be.equal(3);
                const antInfo1 = await PremiumANTContract.getANTInfo(2);
                expect(antInfo1.toString()).to.be.equal("20,0,1,1");
                const antInfo2 = await PremiumANTContract.getANTInfo(3);
                expect(antInfo2.toString()).to.be.equal("20,0,1,2");
                const batchInfo1 = await PremiumANTContract.getBatchInfo(1);
                expect(batchInfo1.toString()).to.be.equal("name2,testBaseURI2,2,100,1")
                await ANTShopContract.mint(0, 100, user1.address);
                await PremiumANTContract.connect(user1).mint(1, user1.address, 90);
                const batchInfo2 = await PremiumANTContract.getBatchInfo(1);
                expect(batchInfo2.toString()).to.be.equal("name2,testBaseURI2,92,100,1");
                const antInfo3 = await PremiumANTContract.getANTInfo(30);
                expect(antInfo3.toString()).to.be.equal("20,0,1,29");
                await expect(PremiumANTContract.connect(user1).mint(1, user1.address, 10)).to.be.revertedWith("PremiumANT: mint amount exceeds the maximum supply for this batch");
            })

            it("ownerMint + userMint: should work", async () => {
                await ANTShopContract.mint(0, 100, user1.address);
                await PremiumANTContract.setBatchInfo(0, "name1", "testBaseURI1", 100, 2);
                await PremiumANTContract.setBatchInfo(1, "name2", "testBaseURI2", 100, 1);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 2);
                await PremiumANTContract.ownerMint(0, user1.address, 3);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 1);
                const tokensOfOwner = await PremiumANTContract.tokensOfOwner(user1.address);
                expect(tokensOfOwner.toString()).to.be.equal("1,2,3,4,5,6");
                const testANTInfo1 = await PremiumANTContract.getANTInfo(2);
                const testANTInfo2 = await PremiumANTContract.getANTInfo(4);
                const testANTInfo3 = await PremiumANTContract.getANTInfo(6);
                expect(testANTInfo1.toString()).to.be.equal("20,0,0,2");
                expect(testANTInfo2.toString()).to.be.equal("20,0,0,4");
                expect(testANTInfo3.toString()).to.be.equal("20,0,0,6");
                const batchInfo = await PremiumANTContract.getBatchInfo(0);
                expect(batchInfo.toString()).to.be.equal("name1,testBaseURI1,6,100,2")
                await PremiumANTContract.ownerMint(1, user1.address, 1);
                const batchInfo1 = await PremiumANTContract.getBatchInfo(1);
                expect(batchInfo1.toString()).to.be.equal("name2,testBaseURI2,1,100,1")
                const testANTInfo4 = await PremiumANTContract.getANTInfo(7);
                expect(testANTInfo4.toString()).to.be.equal("20,0,1,1");
            })
        })

        describe("upgradeMint", () => {

            beforeEach(async () => {
                // ANT Food
                await ANTShopContract.mint(0, 2, user1.address);
                // Leveling Potions
                await ANTShopContract.mint(1, 100, user1.address);
                await PremiumANTContract.setBatchInfo(0, "name1", "testBaseURI1", 100, 2);
                await PremiumANTContract.setBatchInfo(1, "name2", "testBaseURI2", 100, 1);
                await PremiumANTContract.connect(user1).mint(0, user1.address, 1);
            })

            it("should fail if caller is not owner of token for upgrading", async () => {
                await expect(PremiumANTContract.connect(badActor).upgradePremiumANT(1, 10)).to.be.revertedWith("PremiumANT: you are not owner of this token")
            })

            it("should fail if potion amount is less than zero", async () => {
                await expect(PremiumANTContract.connect(user1).upgradePremiumANT(1, 0)).to.be.revertedWith("PremiumANT: leveling potion amount must be greater than zero")
            })

            it("should fail if user don't have enough Leveling Potions for upgrading", async () => {
                await expect(PremiumANTContract.connect(user1).upgradePremiumANT(1, 101)).to.be.revertedWith("PremiumANT: you don't have enough potions for upgrading")
            })

            it("should fail if upgrade level exceeds max level", async () => {
                await PremiumANTContract.setMaxLevel(21);
                await PremiumANTContract.connect(user1).upgradePremiumANT(1, 50)
                await expect(PremiumANTContract.connect(user1).upgradePremiumANT(1, 50)).to.be.revertedWith("Premium ANT: ant can no longer be upgraded")
            })

            it("should work if all conditions are correct", async () => {
                await ANTShopContract.mint(1, 100, user1.address);
                // current level 20
                await PremiumANTContract.connect(user1).upgradePremiumANT(1, 21);
                // current level 21
                const antInfo1 = await PremiumANTContract.getANTInfo(1);
                expect(antInfo1.toString()).to.be.equal("21,0,0,1");
                await PremiumANTContract.connect(user1).upgradePremiumANT(1, 50);
                // current level should be 23 and rest potions should be 5
                const antInfo2 = await PremiumANTContract.getANTInfo(1);
                expect(antInfo2.toString()).to.be.equal("23,5,0,1");
                await PremiumANTContract.connect(user1).upgradePremiumANT(1, 20);
                // current level should be 24
                const antInfo3 = await PremiumANTContract.getANTInfo(1);
                expect(antInfo3.toString()).to.be.equal("24,1,0,1");
                await PremiumANTContract.setMaxLevel(25);
                const levelPotionsBalance1 = await ANTShopContract.balanceOf(user1.address, 1);
                await PremiumANTContract.connect(user1).upgradePremiumANT(1, 28);
                const levelPotionsBalance2 = await ANTShopContract.balanceOf(user1.address, 1);
                // current level should 25(max level)
                const antInfo4 = await PremiumANTContract.getANTInfo(1);
                expect(antInfo4.toString()).to.be.equal("25,0,0,1");
                expect(levelPotionsBalance2).to.be.equal(levelPotionsBalance1.sub(24));
            })
        })

        it("tokenURI: should fail if token doesn't exist", async () => {
            await expect(PremiumANTContract.connect(user1).tokenURI(1)).to.be.revertedWith("PremiumANT: Token does not exist.")
        })

        it("tokenURI: should return the exact batch metadata for token", async () => {
            // ANT Food
            await ANTShopContract.mint(0, 12, user1.address);
            // Leveling Potions
            await ANTShopContract.mint(1, 100, user1.address);
            await PremiumANTContract.setBatchInfo(0, "name1", "https://ipfs.io/ipfs/testBaseURI1/", 100, 2);
            await PremiumANTContract.setBatchInfo(1, "name2", "https://ipfs.io/ipfs/testBaseURI2/", 100, 1);
            await PremiumANTContract.connect(user1).mint(0, user1.address, 2);
            await PremiumANTContract.connect(user1).mint(1, user1.address, 6);
            await PremiumANTContract.connect(user1).mint(0, user1.address, 1);

            const expectedTokenURI1 = await PremiumANTContract.tokenURI(2);
            const expectedTokenURI2 = await PremiumANTContract.tokenURI(4);
            const expectedTokenURI3 = await PremiumANTContract.tokenURI(8);
            const expectedTokenURI4 = await PremiumANTContract.tokenURI(9);
            expect(expectedTokenURI1).to.be.equal("https://ipfs.io/ipfs/testBaseURI1/2.json");
            expect(expectedTokenURI2).to.be.equal("https://ipfs.io/ipfs/testBaseURI2/2.json");
            expect(expectedTokenURI3).to.be.equal("https://ipfs.io/ipfs/testBaseURI2/6.json");
            expect(expectedTokenURI4).to.be.equal("https://ipfs.io/ipfs/testBaseURI1/3.json");
        })

        it("getANTExperience: should return the experience in token", async () => {
            // ANT Food
            await ANTShopContract.mint(0, 12, user1.address);
            // Leveling Potions
            await ANTShopContract.mint(1, 100, user1.address);
            await PremiumANTContract.setBatchInfo(0, "name1", "https://ipfs.io/ipfs/testBaseURI1/", 100, 2);
            await PremiumANTContract.setBatchInfo(1, "name2", "https://ipfs.io/ipfs/testBaseURI2/", 100, 1);
            await PremiumANTContract.connect(user1).mint(0, user1.address, 2);
            await PremiumANTContract.connect(user1).upgradePremiumANT(1, 53);
            const antInfo = await PremiumANTContract.getANTInfo(1);
            expect(antInfo.toString()).to.be.equal("22,10,0,1");
            const experienceResult1 = await PremiumANTContract.getANTExperience(1);
            const num1 = BigNumber.from("22");
            const num2 = BigNumber.from("10");
            const res1 = num1.mul(num1.add(1)).div(2);
            const res2 = num1.mul(num2).add(num2.mul(num2).div(num1));
            
            // Perform the required calculation using the above values
            const expectedResult11 = res1.add(num2).mul(num2).add(res2.mul(2));
            expect(Number(experienceResult1)).to.be.equal(Number(expectedResult11));
        })

        it("transferFrom: should transfer token without approve step if caller has minter role", async () => {
            await ANTShopContract.mint(0, 12, user1.address);
            await PremiumANTContract.setBatchInfo(0, "name1", "https://ipfs.io/ipfs/testBaseURI1/", 100, 2);
            await PremiumANTContract.connect(user1).mint(0, user1.address, 2);
            await expect(PremiumANTContract.transferFrom(user1.address, PremiumANTContract.address, 1)).to.be.not.reverted
        })

        it("setPaused: should fail if caller is not the owner", async () => {
            await expect(PremiumANTContract.connect(badActor).setPaused(true)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setPaused: should work if caller is the owner", async () => {
            // ANT Food
            await ANTShopContract.mint(0, 12, user1.address);
            // Leveling Potions
            await ANTShopContract.mint(1, 100, user1.address);
            await PremiumANTContract.setBatchInfo(0, "name1", "https://ipfs.io/ipfs/testBaseURI1/", 100, 2);
            await PremiumANTContract.setBatchInfo(1, "name2", "https://ipfs.io/ipfs/testBaseURI2/", 100, 1);

            await PremiumANTContract.setPaused(true);
            await expect(PremiumANTContract.connect(user1).mint(0, user1.address, 2)).to.be.revertedWith("Pausable: paused");
            await expect(PremiumANTContract.connect(user1).upgradePremiumANT(0, 2)).to.be.revertedWith("Pausable: paused");
        })
    })
});