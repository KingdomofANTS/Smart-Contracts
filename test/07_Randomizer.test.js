const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat")

describe("Randomizer", function () {
    let Randomizer, RandomizerContract;

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
    });

    describe("Test Suite", function () {
        it("Should set the right owner", async function () {
            const owner = await RandomizerContract.owner();
            expect(owner).to.be.equal(deployer.address);
        });

        it("random: should return the randomness numbers", async () => {
            const random = await RandomizerContract.random();
            expect(random).to.be.not.reverted;
        })

        it("randomToken: should return the randomness numbers same as random function", async () => {
            const random = await RandomizerContract.randomTest();
            expect(random).to.be.not.reverted;
        })
    });
});