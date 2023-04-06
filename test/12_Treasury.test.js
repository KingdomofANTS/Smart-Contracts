const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const { network } = require("hardhat")

describe("Treasury", function () {
    let ANTCoin, ANTCoinContract, Treasury, TreasuryContract;

    beforeEach(async function () {
        [deployer, controller, badActor, user1, user2, user3, ...user] = await ethers.getSigners();

        // ANTCoin smart contract deployment
        ANTCoin = await ethers.getContractFactory("ANTCoin");
        ANTCoinContract = await ANTCoin.deploy();
        await ANTCoinContract.deployed();

        Treasury = await ethers.getContractFactory("Treasury");
        TreasuryContract = await Treasury.deploy("0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", ANTCoinContract.address);
        await TreasuryContract.deployed();
    })

    describe("Test Suite", function () { 
        it("should set the right owner", async () => {
            const owner = await TreasuryContract.owner();
            expect(owner).to.be.equal(deployer.address)
        })
    })

})