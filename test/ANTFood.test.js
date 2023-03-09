const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat")

describe("ANTFood", function () {
    let ANTFood, ANTFoodContract, ANTCoin, ANTCoinContract;

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();

        // ANTFood smart contract deployment
        ANTFood = await ethers.getContractFactory("ANTFood");
        ANTFoodContract = await ANTFood.deploy();
        await ANTFoodContract.deployed();

        ANTCoin = await ethers.getContractFactory("ANTCoin");
        ANTCoinContract = await ANTCoin.deploy();
        await ANTCoinContract.deployed();
    });

    describe("Test Suite", function () {
        it("Should set the right owner", async function () {
            const owner = await ANTFoodContract.owner();
            expect(owner).to.be.equal(deployer.address);
        });

        it("addMinterRole: should fail if caller is not owner", async () => {
            await expect(ANTFoodContract.connect(user1).addMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("addMinterRole: should work if caller is owner", async () => {
            await ANTFoodContract.addMinterRole(user1.address);
            const role = await ANTFoodContract.getMinterRole(user1.address);
            expect(role).to.be.equal(true);
        })

        it("revokeMinterRole: should fail if caller is not owner", async () => {
            await expect(ANTFoodContract.connect(badActor).revokeMinterRole(user2.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("revokeMinterRole: should work if caller is owner", async () => {
            await ANTFoodContract.addMinterRole(user1.address);
            const role1 = await ANTFoodContract.getMinterRole(user1.address);
            expect(role1).to.be.equal(true);
            await ANTFoodContract.revokeMinterRole(user1.address);
            const role2 = await ANTFoodContract.getMinterRole(user1.address);
            expect(role2).to.be.equal(false);
        })

        it("ownerMint: should fail if caller is not minter", async () => {
            await expect(ANTFoodContract.connect(badActor).ownerMint(badActor.address, 10000)).to.be.revertedWith("ANTFood: Caller is not the minter");
        })

        it("ownerMint: should work if caller is minter", async () => {
            await ANTFoodContract.addMinterRole(user1.address);
            await ANTFoodContract.connect(user1).ownerMint(user2.address, 100000);
            const expected = await ANTFoodContract.balanceOf(user2.address);
            expect(expected).to.be.equal(100000);
        })

        it("setMintMethod: should fail if caller is not owner", async () => {
            await expect(ANTFoodContract.connect(badActor).setMintMethod(true)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setMintMethod: should work if caller is owner", async () => {
            await ANTFoodContract.connect(deployer).setMintMethod(true);
            const mintMethod = await ANTFoodContract.mintMethod();
            await expect(mintMethod).to.be.equal(true);
        })

        it("setMintPrice: should fail if caller is not owner", async () => {
            await expect(ANTFoodContract.connect(badActor).setMintPrice(1000)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setMintPrice: should fail if setAmount is less than zero", async () => {
            await expect(ANTFoodContract.connect(deployer).setMintPrice(0)).to.be.revertedWith("ANTFood: mint price must be greater than zero");
        })

        it("setMintPrice: should work if caller is minter", async () => {
            await ANTFoodContract.setMintPrice(100000);
            const expected = await ANTFoodContract.mintPrice();
            expect(expected).to.be.equal(100000);
        })

        it("setTokenAddressForMint: should fail if caller is not owner", async () => {
            await expect(ANTFoodContract.connect(badActor).setTokenAddressForMint(user3.address)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setTokenAddressForMint: should work if caller is minter", async () => {
            await ANTFoodContract.setTokenAddressForMint(user3.address);
            const expected = await ANTFoodContract.tokenAddressForMint();
            expect(expected).to.be.equal(user3.address);
        })

        it("setTokenAmountForMint: should fail if caller is not owner", async () => {
            await expect(ANTFoodContract.connect(badActor).setTokenAmountForMint(1000000)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setTokenAmountForMint: should fail if setAmount is less than zero", async () => {
            await expect(ANTFoodContract.connect(deployer).setTokenAmountForMint(0)).to.be.revertedWith("ANTFood: Token amount must be greater than zero");
        })

        it("setTokenAmountForMint: should work if caller is minter", async () => {
            await ANTFoodContract.setTokenAmountForMint(100000);
            const expected = await ANTFoodContract.tokenAmountForMint();
            expect(expected).to.be.equal(100000);
        })

        it("mint: should fail if matic payment is not enough", async () => {
            await ANTFoodContract.setMintPrice(100000000);
            const mintPrice = await ANTFoodContract.mintPrice();
            await ANTFoodContract.setMintMethod(true);
            await expect(ANTFoodContract.connect(user1).mint(user1.address, 1)).to.be.revertedWith("ANTFood: Pay amount is not enough to mint");
            await expect(ANTFoodContract.connect(user1).mint(user1.address, 1, { value: mintPrice.sub(BigNumber.from("1")) })).to.be.revertedWith("ANTFood: Pay amount is not enough to mint");
            await expect(ANTFoodContract.connect(user1).mint(user1.address, 2, { value: mintPrice.mul(2).sub(1) })).to.be.revertedWith("ANTFood: Pay amount is not enough to mint");
            await expect(ANTFoodContract.connect(user1).mint(user1.address, 2, { value: mintPrice.mul(2) })).to.be.not.reverted;
        })

        it("mint: should fail if token amount payment is not enough", async () => {
            const tokenAmountForMint = 1000000;
            await ANTFoodContract.setMintMethod(false);
            await ANTFoodContract.setTokenAddressForMint(ANTCoinContract.address);
            await ANTFoodContract.setTokenAmountForMint(tokenAmountForMint);
            await expect(ANTFoodContract.connect(user1).mint(user1.address, 1)).to.be.revertedWith("ANTFood: pay token amount is not enough to mint");
            await ANTCoinContract.transfer(user1.address, tokenAmountForMint);
            await expect(ANTFoodContract.connect(user1).mint(user1.address, 1)).to.be.revertedWith("ANTFood: should approve tokens to transfer");
        })

        it("mint: should work if user passed all conditions for mint", async () => {
            const tokenAmountForMint = 10000;
            await ANTFoodContract.setMintMethod(false);
            await ANTFoodContract.setTokenAddressForMint(ANTCoinContract.address);
            await ANTFoodContract.setTokenAmountForMint(tokenAmountForMint);
            await ANTCoinContract.transfer(user1.address, tokenAmountForMint);
            await ANTCoinContract.connect(user1).approve(ANTFoodContract.address, tokenAmountForMint);
            await expect(ANTFoodContract.connect(user1).mint(user1.address, 1)).to.be.not.reverted;
            const expected = await ANTFoodContract.balanceOf(user1.address);
            expect(expected).to.be.equal(1);
        })

        it("burn: should fail if caller is not minter", async () => {
            await expect(ANTFoodContract.connect(badActor).burn(user1.address, 1)).to.be.revertedWith("ANTFood: Caller is not the minter");
        })

        it("burn: burn function should work", async () => {
            const tokenAmountForMint = 10000;
            await ANTFoodContract.setMintMethod(false);
            await ANTFoodContract.setTokenAddressForMint(ANTCoinContract.address);
            await ANTFoodContract.setTokenAmountForMint(tokenAmountForMint);
            await ANTCoinContract.transfer(user1.address, tokenAmountForMint);
            await ANTCoinContract.connect(user1).approve(ANTFoodContract.address, tokenAmountForMint);
            await expect(ANTFoodContract.connect(user1).mint(user1.address, 1)).to.be.not.reverted;
            const expected = await ANTFoodContract.balanceOf(user1.address);
            expect(expected).to.be.equal(1);
            await ANTFoodContract.burn(user1.address, 1);
            const expected1 = await ANTFoodContract.balanceOf(user1.address);
            expect(expected1).to.be.equal(0);
        })

        it("withdraw: should fail if caller is not the owner", async () => {
            await expect(ANTFoodContract.connect(user1).withdraw(user1.address, 1000)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("withdraw: should work if caller is owner", async () => {
            const initialBalanceOfUser = await ANTFoodContract.provider.getBalance(user3.address);
            await ANTFoodContract.setMintPrice(100000000);
            const mintPrice = await ANTFoodContract.mintPrice();
            await ANTFoodContract.setMintMethod(true);
            await ANTFoodContract.connect(user1).mint(user1.address, 1, { value: mintPrice });
            const contractBalance1 = await ANTFoodContract.provider.getBalance(ANTFoodContract.address);
            expect(contractBalance1).to.be.equal(mintPrice);
            await ANTFoodContract.withdraw(user3.address, mintPrice);
            const contractBalance2 = await ANTFoodContract.provider.getBalance(ANTFoodContract.address);
            expect(contractBalance2).to.be.equal(0);
            const expectedBalance = await ANTFoodContract.provider.getBalance(user3.address);
            expect(expectedBalance).to.be.equal(initialBalanceOfUser.add(mintPrice))
        })

        it("withdrawToken: should fail if caller is not the owner", async () => {
            await expect(ANTFoodContract.connect(user1).withdrawToken(ANTCoinContract.address, user3.address, 1000)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("withdrawToken: should work if caller is owner", async () => {
            const tokenAmountForMint = 10000;
            await ANTFoodContract.setMintMethod(false);
            await ANTFoodContract.setTokenAddressForMint(ANTCoinContract.address);
            await ANTFoodContract.setTokenAmountForMint(tokenAmountForMint);
            await ANTCoinContract.transfer(user1.address, tokenAmountForMint);
            await ANTCoinContract.connect(user1).approve(ANTFoodContract.address, tokenAmountForMint);
            await ANTFoodContract.connect(user1).mint(user1.address, 1);
            const contractBalance1 = await ANTCoinContract.balanceOf(ANTFoodContract.address);
            expect(contractBalance1).to.be.equal(tokenAmountForMint);
            await ANTFoodContract.withdrawToken(ANTCoinContract.address, user2.address, tokenAmountForMint);
            const contractBalance2 = await ANTCoinContract.balanceOf(ANTFoodContract.address);
            expect(contractBalance2).to.be.equal(0);
            const expectedBalance = await ANTCoinContract.balanceOf(user2.address);
            expect(expectedBalance).to.be.equal(tokenAmountForMint);
        })

        it("setPaused: should fail if caller is not the owner", async () => {
            await expect(ANTFoodContract.connect(badActor).setPaused(true)).to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setPaused: if unpaused, mint function should not work", async () => {
            const mintPrice = await ANTFoodContract.mintPrice();
            await ANTFoodContract.setMintMethod(true);
            await ANTFoodContract.connect(user1).mint(user1.address, 1, { value: mintPrice });
            await ANTFoodContract.setPaused(true);
            await expect(ANTFoodContract.connect(user1).mint(user1.address, 1)).to.be.revertedWith("Pausable: paused")
            await expect(ANTFoodContract.connect(user1).transfer(user2.address, 1)).to.be.revertedWith("Pausable: paused");
            await expect(ANTFoodContract.connect(user1).burn(user1.address, 1)).to.be.revertedWith("Pausable: paused");
            await expect(ANTFoodContract.connect(user1).transferFrom(user1.address, user2.address, 1)).to.be.revertedWith("Pausable: paused");
            await ANTFoodContract.setPaused(false);
            await expect(ANTFoodContract.mint(user1.address, 1, { value: mintPrice })).to.be.not.reverted;
            await expect(ANTFoodContract.connect(user1).transfer(user2.address, 1)).to.be.not.reverted;
            await ANTFoodContract.connect(user1).approve(user2.address, 1);
            await expect(ANTFoodContract.connect(user2).transferFrom(user1.address, user2.address, 1)).to.be.not.reverted;
        })
    })
});