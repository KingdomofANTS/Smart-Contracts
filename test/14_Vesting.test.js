const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { network } = require("hardhat")

describe("Vesting", function () {
    let ANTCoin, ANTCoinContract, Vesting, VestingContract;

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();
 
        // ANTCoin smart contract deployment
        ANTCoin = await ethers.getContractFactory("ANTCoin");
        ANTCoinContract = await ANTCoin.deploy();
        await ANTCoinContract.deployed();

        Vesting = await ethers.getContractFactory("Vesting");
        VestingContract = await Vesting.deploy(ANTCoinContract.address);
        await VestingContract.deployed();
        await ANTCoinContract.addMinterRole(VestingContract.address);
    });


    describe("Test Suite", function () {
        it("Should set the right owner", async function () {
            const owner = await VestingContract.owner();
            expect(owner).to.be.equal(deployer.address);
        });

        it("setReleaseCycle: should work", async () => {
            await expect(VestingContract.connect(badActor).setReleaseCycle(100)).to.be.revertedWith("Vesting: Caller is not the owner or minter");
            await VestingContract.connect(deployer).setReleaseCycle(100);
            const releaseCycle = await VestingContract.releaseCycle();
            expect(releaseCycle).to.be.equal(100);
        })

        it("addVestingPoolInfo & revokeVestingPoolInfo: should add the vesting pool info properly by owner", async () => {
            await expect(VestingContract.connect(badActor).addVestingPoolInfo("Private Sale", 10, 9)).to.be.revertedWith("Vesting: Caller is not the owner or minter");
            await expect(VestingContract.getVestingPoolInfo(0)).to.be.revertedWith("Vesting: vesting pool info isn't exist")
            await VestingContract.addVestingPoolInfo("private sale", 10, 9);
            await expect(VestingContract.getVestingPoolInfo(1)).to.be.revertedWith("Vesting: invalid vesting pool index")
            const vestingInfo1 = await VestingContract.getVestingPoolInfo(0);
            expect(vestingInfo1.initReleaseRate).to.be.equal(10);
            expect(vestingInfo1.poolName).to.be.equal("private sale");
            expect(vestingInfo1.maxReleaseCount).to.be.equal(9);

            await VestingContract.revokeVestingPoolInfo(0);
            await expect(VestingContract.getVestingPoolInfo(0)).to.be.revertedWith("Vesting: vesting pool info isn't exist");
            await VestingContract.addVestingPoolInfo("Private sale", 10, 9);
            await VestingContract.addVestingPoolInfo("Public sale", 40, 6);
            await VestingContract.addVestingPoolInfo("Team vesting", 10, 12);
            await VestingContract.addVestingPoolInfo("Advisory vesting", 10, 12);
            await VestingContract.addVestingPoolInfo("Reverse sale", 0, 12);
            await VestingContract.addVestingPoolInfo("Foundation sale", 10, 24);
            
            await VestingContract.revokeVestingPoolInfo(0);
            const vestingInfo2 = await VestingContract.getVestingPoolInfo(0);
            expect(vestingInfo2.initReleaseRate).to.be.equal(10);
            expect(vestingInfo2.poolName).to.be.equal("Foundation sale");
            expect(vestingInfo2.maxReleaseCount).to.be.equal(24);
            await expect(VestingContract.getVestingPoolInfo(5)).to.be.revertedWith("Vesting: invalid vesting pool index");

            await VestingContract.revokeVestingPoolInfo(2);
            const vestingInfo3 = await VestingContract.getVestingPoolInfo(2);
            expect(vestingInfo3.initReleaseRate).to.be.equal(0);
            expect(vestingInfo3.poolName).to.be.equal("Reverse sale");
            expect(vestingInfo3.maxReleaseCount).to.be.equal(12);
            await expect(VestingContract.getVestingPoolInfo(4)).to.be.revertedWith("Vesting: invalid vesting pool index");

            await VestingContract.revokeVestingPoolInfo(3);
            await expect(VestingContract.getVestingPoolInfo(3)).to.be.revertedWith("Vesting: invalid vesting pool index");
        });

        it("addUserAddressesByPool & revokeUserAddressesFromPool: should work properly", async () => {
            await VestingContract.addVestingPoolInfo("Private sale", 10, 9);
            await VestingContract.addVestingPoolInfo("Public sale", 40, 6);
            await VestingContract.addVestingPoolInfo("Team vesting", 10, 12);
            await expect(VestingContract.addUserAddressesByPool(0, [])).to.be.revertedWith("Vesting: array of user wallet addresses must be greater than zero");

            await VestingContract.addUserAddressesByPool(2, [user1.address, user2.address, user3.address]);
            await VestingContract.revokeVestingPoolInfo(0);
            
            const userAddresses1 = await VestingContract.getUserAddressesByPoolIndex(0);
            expect(userAddresses1.toString()).to.be.equal(`${user1.address},${user2.address},${user3.address}`);

            await VestingContract.revokeUserAddressesFromPool(0);

            const userAddresses2 = await VestingContract.getUserAddressesByPoolIndex(0);
            expect(userAddresses2.toString()).to.be.equal("");
        })

        it("depositANTCoinToVestingPool && withdrawANTCoinFromVestingPool: should work properly", async () => {
            const depositAmount1 = BigNumber.from("1000000000");
            await VestingContract.addVestingPoolInfo("Private sale", 10, 9);
            await VestingContract.addVestingPoolInfo("Public sale", 40, 6);
            await VestingContract.addVestingPoolInfo("Team vesting", 10, 12);
            const ownerBalance1 = await ANTCoinContract.balanceOf(deployer.address);
            await expect(VestingContract.depositANTCoinToVestingPool(0, ownerBalance1 + 1)).to.be.revertedWith("Vesting: insufficient ant coin balance for depositing tokens")
            await VestingContract.depositANTCoinToVestingPool(0, depositAmount1);
            const ownerBalance2 = await ANTCoinContract.balanceOf(deployer.address);
            expect(ownerBalance2).to.be.equal(ownerBalance1.sub(depositAmount1));
            const poolInfo1 = await VestingContract.getVestingPoolInfo(0);
            expect(poolInfo1.tokenAmount).to.be.equal(depositAmount1);
            await VestingContract.depositANTCoinToVestingPool(0, depositAmount1);
            const ownerBalance3 = await ANTCoinContract.balanceOf(deployer.address);
            expect(ownerBalance3).to.be.equal(ownerBalance1.sub(depositAmount1.mul(2)));
            const poolInfo2 = await VestingContract.getVestingPoolInfo(0);
            expect(poolInfo2.tokenAmount).to.be.equal(depositAmount1.mul(2))

            await VestingContract.withdrawANTCoinFromVestingPool(0, depositAmount1);
            const ownerBalance4 = await ANTCoinContract.balanceOf(deployer.address);
            expect(ownerBalance4).to.be.equal(ownerBalance1.sub(depositAmount1));
            const poolInfo3 = await VestingContract.getVestingPoolInfo(0);
            expect(poolInfo3.tokenAmount).to.be.equal(depositAmount1);
            await expect(VestingContract.withdrawANTCoinFromVestingPool(0, depositAmount1 + 1)).to.be.revertedWith("Vesting: insufficient ant coin balance for withdrawing tokens")
            await VestingContract.addUserAddressesByPool(0, [user1.address, user2.address, user3.address]);
            await VestingContract.launchVestingPool(0)
            await expect(VestingContract.depositANTCoinToVestingPool(0, depositAmount1)).to.be.revertedWith("Vesting: can't deposit anymore after lauching the vesting pool");
            await expect(VestingContract.withdrawANTCoinFromVestingPool(0, depositAmount1)).to.be.revertedWith("Vesting: can't withdraw anymore after lauching the vesting pool");
        })

        it("launchVestingPool: should work", async () => {
            const depositedAmount = BigNumber.from("10000000000000000000000");
            await VestingContract.addVestingPoolInfo("Private sale", 20, 9);
            await VestingContract.addVestingPoolInfo("Public sale", 40, 6);
            await VestingContract.addVestingPoolInfo("Team vesting", 10, 12);
            await expect(VestingContract.launchVestingPool(0)).to.be.revertedWith("Vesting: empty array detected");
            await VestingContract.depositANTCoinToVestingPool(0, depositedAmount);
            await VestingContract.addUserAddressesByPool(0, [user1.address, user2.address, user3.address, badActor.address]);
            const tx = await VestingContract.launchVestingPool(0);
            const poolInfo1 = await VestingContract.getVestingPoolInfo(0);
            expect(tx).to.emit(VestingContract, "LaunchVestingPool").withArgs(0, "Private sale", poolInfo1.initReleasedTokenAmount)
            expect(poolInfo1.initReleasedTokenAmount).to.be.equal(depositedAmount.mul(20).div(100));
            const user1AntCoinBalance = await ANTCoinContract.balanceOf(user1.address);
            const user2AntCoinBalance = await ANTCoinContract.balanceOf(user2.address);
            expect(user1AntCoinBalance).to.be.equal(user2AntCoinBalance).to.be.equal(poolInfo1.initReleasedTokenAmount.div(4));
            await expect(VestingContract.launchVestingPool(0)).to.be.revertedWith("Vesting: already launched")
        })

        it("releaseVestingPool: should work", async () => {
            await VestingContract.addVestingPoolInfo("Private sale", 20, 3);
            await VestingContract.addVestingPoolInfo("Public sale", 40, 6);
            await VestingContract.addVestingPoolInfo("Team vesting", 10, 12);
            await expect(VestingContract.releaseVestingPool(0)).to.be.revertedWith("Vesting: the pool is not launched yet");
            await VestingContract.addUserAddressesByPool(0, [user1.address, user2.address, user3.address, badActor.address]);
            await VestingContract.launchVestingPool(0);
            await expect(VestingContract.releaseVestingPool(0)).to.be.revertedWith("Vesting: can't release any coins yet");
            await increaseTime(60 * 60 * 24 * 30);
            const tx = await VestingContract.releaseVestingPool(0);
            const poolInfo1 = await VestingContract.getVestingPoolInfo(0);
            expect(poolInfo1.currentReleasedCount).to.be.equal(1);
            const user1AntCoinBalance = await ANTCoinContract.balanceOf(user1.address);
            const expectedUser1Balance = (poolInfo1.initReleasedTokenAmount.div(4)).add((poolInfo1.tokenAmount.sub(poolInfo1.initReleasedTokenAmount)).div(3).div(4))
            expect(tx).to.emit(VestingContract, "ReleaseVestingPool").withArgs(0, "Private sale", (poolInfo1.tokenAmount.sub(poolInfo1.initReleasedTokenAmount)).div(3))
            expect(user1AntCoinBalance).to.be.equal(expectedUser1Balance)
            await increaseTime(60 * 60 * 24 * 30 * 3);
            await VestingContract.releaseVestingPool(0);
            const poolInfo2 = await VestingContract.getVestingPoolInfo(0);
            expect(poolInfo2.currentReleasedCount).to.be.equal(3);
            const user1AntCoinBalance1 = await ANTCoinContract.balanceOf(user1.address);
            const user3AntCoinBalance1 = await ANTCoinContract.balanceOf(user3.address);
            const expectedUser1Balance1 = (poolInfo1.initReleasedTokenAmount.div(4)).add((poolInfo1.tokenAmount.sub(poolInfo1.initReleasedTokenAmount)).div(4))
            expect(user1AntCoinBalance1).to.be.equal(expectedUser1Balance1).to.be.equal(user3AntCoinBalance1)
            await expect(VestingContract.releaseVestingPool(0)).to.be.revertedWith("Vesting: can't release any coins anymore from vesting pool")
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
