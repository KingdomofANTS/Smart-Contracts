// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const {ethers} = hre

async function main() {
    [deployer] = await ethers.getSigners();
    // ant coin
    const ANTCoin = await hre.ethers.getContractFactory("ANTCoin");
    const ANTCoinContract = await ANTCoin.deploy();
    await ANTCoinContract.deployed();

    // ant shop
    const ANTShop = await hre.ethers.getContractFactory("ANTShop");
    const ANTShopContract = await ANTShop.deploy();
    await ANTShopContract.deployed();

    await ANTShopContract.connect(deployer).setTokenTypeInfo(0, "ANTFood", "antshop uri")
    await ANTShopContract.connect(deployer).setTokenTypeInfo(1, "Leveling Potions", "leveling potion uri")

    // basic ant
    const BasicANT = await hre.ethers.getContractFactory("BasicANT");
    const BasicANTContract = await BasicANT.deploy(ANTCoinContract.address, ANTShopContract.address);
    await BasicANTContract.deployed();

    await ANTShopContract.addMinterRole(BasicANTContract.address);
    await ANTCoinContract.addMinterRole(BasicANTContract.address);

    const basicANTMaticMintPrice = ethers.utils.parseEther("0.001")
    const baiscANTANTCoinMintAmount = ethers.utils.parseEther("1000");

    await BasicANTContract.setBatchInfo(0, "Worker ANT", "https://ipfs.moralis.io:2053/ipfs/QmWsYC3fCyxWb9yBGNTKMfz9QtpApEcWKHhAzCN4StBgvT", basicANTMaticMintPrice, ANTCoinContract.address, baiscANTANTCoinMintAmount);
    await BasicANTContract.setBatchInfo(1, "Wise ANT", "https://ipfs.moralis.io:2053/ipfs/QmWsYC3fCyxWb9yBGNTKMfz9QtpApEcWKHhAzCN4StBgvT", basicANTMaticMintPrice, ANTCoinContract.address, baiscANTANTCoinMintAmount);
    await BasicANTContract.setBatchInfo(2, "Fighter ANT", "https://ipfs.moralis.io:2053/ipfs/QmWsYC3fCyxWb9yBGNTKMfz9QtpApEcWKHhAzCN4StBgvT", basicANTMaticMintPrice, ANTCoinContract.address, baiscANTANTCoinMintAmount);

    // premium ant
    const PremiumANT = await hre.ethers.getContractFactory("PremiumANT");
    const PremiumANTContract = await PremiumANT.deploy(ANTCoinContract.address, ANTShopContract.address);
    await PremiumANTContract.deployed();

    await ANTShopContract.addMinterRole(PremiumANTContract.address);
    await ANTCoinContract.addMinterRole(PremiumANTContract.address);

    await PremiumANTContract.setBatchInfo(0, "Worker ANT", "https://ipfs.moralis.io:2053/ipfs/Qmdq1EUL2cwRXhVHAQ7KNBcfcYW6LKTm7Z1HBNkhaU1Bna/", 100, 1);
    await PremiumANTContract.setBatchInfo(1, "Wise ANT", "https://ipfs.moralis.io:2053/ipfs/Qmdq1EUL2cwRXhVHAQ7KNBcfcYW6LKTm7Z1HBNkhaU1Bna/", 100, 1);
    await PremiumANTContract.setBatchInfo(2, "Fighter ANT", "https://ipfs.moralis.io:2053/ipfs/Qmdq1EUL2cwRXhVHAQ7KNBcfcYW6LKTm7Z1HBNkhaU1Bna/", 100, 1);

    // ramdomizer
    const polyKeyHash = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";
    const polyVrfCoordinator = "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed"
    const polyLinkToken = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
    const vrFee = "1000000000000"
    const Randomizer = await hre.ethers.getContractFactory("Randomizer");
    const RandomizerContract = await Randomizer.deploy(polyKeyHash, polyVrfCoordinator, polyLinkToken, vrFee);
    await RandomizerContract.deployed();

    // ant lottery
    const ANTLottery = await ethers.getContractFactory("ANTLottery");
    const ANTLotteryContract = await ANTLottery.deploy(RandomizerContract.address, ANTCoinContract.address);
    await ANTLotteryContract.deployed();
    await ANTLotteryContract.setOperatorAndTreasuryAndInjectorAddresses(deployer.address, deployer.address);


    /*------------------It needs to be confirmed while testing ----------------- */
    const provider = ANTLotteryContract.provider;
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    const blockTimestamp = block.timestamp;
    const MIN_LENGTH_LOTTERY = await ANTLotteryContract.MIN_LENGTH_LOTTERY();
    await ANTLotteryContract.startLottery(Number(blockTimestamp) + Number(MIN_LENGTH_LOTTERY) + 100, [2000, 2000, 2000, 2000, 1000, 1000]);

    // purse
    const Purse = await ethers.getContractFactory("Purse");
    const PurseContract = await Purse.deploy(RandomizerContract.address, ANTShopContract.address, ANTLotteryContract.address);
    await PurseContract.deployed();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    const MarketplaceContract = await Marketplace.deploy(ANTShopContract.address, PurseContract.address, ANTLotteryContract.address);
    await MarketplaceContract.deployed();
    await ANTShopContract.addMinterRole(MarketplaceContract.address);
    await ANTLotteryContract.addMinterRole(MarketplaceContract.address);
    await ANTShopContract.addMinterRole(PurseContract.address);
    await ANTLotteryContract.addMinterRole(PurseContract.address);
    await ANTCoinContract.addMinterRole(ANTLotteryContract.address);
    await PurseContract.addMinterRole(MarketplaceContract.address);
    await PurseContract.addMultiPurseCategories(["Common", "UnCommon", "Rare", "Ultra Rare", "Legendary"], [45, 25, 20, 7, 3], [20, 5, 25, 25, 35], [5, 20, 25, 25, 35], [75, 75, 50, 50, 30], [5, 10, 10, 20, 50], [1, 1, 1, 2, 5], [10, 25, 30, 50, 100], [0, 0, 0, 0, 0]);

    // bosses
    const Bosses = await ethers.getContractFactory('Bosses');
    const BossesContract = await Bosses.deploy(RandomizerContract.address, ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address);
    await BossesContract.deployed();

    await ANTCoinContract.addMinterRole(BossesContract.address);
    await PremiumANTContract.addMinterRole(BossesContract.address);
    await BasicANTContract.addMinterRole(BossesContract.address);
    await BossesContract.setBossesPoolsInfo(["Catepillar", "Snail", "Beetle", "Snake", "Anteater"], [20, 50, 100, 250, 600], [1, 1, 1, 1, 1], [5, 10, 18, 25, 40])

    // food fathering
    const FoodGathering = await ethers.getContractFactory("FoodGathering")
    const FoodGatheringContract = await FoodGathering.deploy(ANTCoinContract.address, ANTShopContract.address);
    await FoodGatheringContract.deployed();

    await ANTCoinContract.addMinterRole(FoodGatheringContract.address);
    await ANTShopContract.addMinterRole(FoodGatheringContract.address);

    // leveling ground
    const LevelingGround = await ethers.getContractFactory("LevelingGround");
    const LevelingGroundContract = await LevelingGround.deploy(ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address);
    await LevelingGroundContract.deployed();

    await PremiumANTContract.addMinterRole(LevelingGroundContract.address);
    await BasicANTContract.addMinterRole(LevelingGroundContract.address);
    await ANTCoinContract.addMinterRole(LevelingGroundContract.address)

    // tasks
    const Tasks = await ethers.getContractFactory("Tasks");
    const TasksContract = await Tasks.deploy(RandomizerContract.address, ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address, PurseContract.address);
    await TasksContract.deployed();
  
    await ANTCoinContract.addMinterRole(TasksContract.address);
    await PremiumANTContract.addMinterRole(TasksContract.address);
    await BasicANTContract.addMinterRole(TasksContract.address);
    await PurseContract.addMinterRole(TasksContract.address)

    // workforce
    const Workforce = await ethers.getContractFactory("Workforce");
    const WorkforceContract = await Workforce.deploy(ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address);
    await WorkforceContract.deployed();
    await ANTCoinContract.addMinterRole(WorkforceContract.address);
    await PremiumANTContract.addMinterRole(WorkforceContract.address);
    await BasicANTContract.addMinterRole(WorkforceContract.address);

    // vesting
    const Vesting = await ethers.getContractFactory("Vesting");
    const VestingContract = await Vesting.deploy(ANTCoinContract.address);
    await VestingContract.deployed();
    await ANTCoinContract.addMinterRole(VestingContract.address);
    await VestingContract.addVestingPoolInfo("Private sale", 20, 9);
    await VestingContract.addVestingPoolInfo("Public sale", 40, 6);
    await VestingContract.addVestingPoolInfo("Team", 10, 12);
    await VestingContract.addVestingPoolInfo("Advisory", 10, 12);
    await VestingContract.addVestingPoolInfo("Reserve", 0, 12);
    await VestingContract.addVestingPoolInfo("Foundation", 10, 24)

    console.log("ANTCoin Contract Address:", ANTCoinContract.address);
    console.log("ANTShop Contract Address:", ANTShopContract.address);
    console.log("Marketplace Contract Address:", MarketplaceContract.address);
    console.log("PremiumANT Contract Address:", PremiumANTContract.address);
    console.log("BasicANT Contract Address:", BasicANTContract.address);
    console.log("Purse Contract Address:", PurseContract.address);
    console.log("Randomizer Contract Address:", RandomizerContract.address);
    console.log("Workforce Contract Address:", WorkforceContract.address);
    console.log("FoodGathering Contract Address:", FoodGatheringContract.address);
    console.log("LevelingGround Contract Address:", LevelingGroundContract.address);
    console.log("ANTLottery Contract Address:", ANTLotteryContract.address);
    console.log("Bosses Contract Address:", BossesContract.address);
    console.log("Tasks Contract Address:", TasksContract.address);
    console.log("Vesting Contract Address:", VestingContract.address);

    await hre.run("verify:verify", {
      address: ANTCoinContract.address,
      constructorArguments: [],
    });

    await hre.run("verify:verify", {
      address: ANTShopContract.address,
      constructorArguments: [],
    });

    await hre.run("verify:verify", {
      address: MarketplaceContract.address,
      constructorArguments: [ANTShopContract.address, PurseContract.address, ANTLotteryContract.address],
    });

    await hre.run("verify:verify", {
      address: PremiumANTContract.address,
      constructorArguments: [ANTCoinContract.address, ANTShopContract.address],
    });

    await hre.run("verify:verify", {
      address: BasicANTContract.address,
      constructorArguments: [ANTCoinContract.address, ANTShopContract.address],
    });

    await hre.run("verify:verify", {
      address: PurseContract.address,
      constructorArguments: [RandomizerContract.address, ANTShopContract.address, ANTLotteryContract.address],
    });

    await hre.run("verify:verify", {
      address: WorkforceContract.address,
      constructorArguments: [ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address],
    });

    await hre.run("verify:verify", {
      address: RandomizerContract.address,
      constructorArguments: [polyKeyHash, polyVrfCoordinator, polyLinkToken, vrFee],
    });

    await hre.run("verify:verify", {
      address: FoodGatheringContract.address,
      constructorArguments: [ANTCoinContract.address, ANTShopContract.address],
    });

    await hre.run("verify:verify", {
      address: LevelingGroundContract.address,
      constructorArguments: [ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address],
    });

    await hre.run("verify:verify", {
      address: ANTLotteryContract.address,
      constructorArguments: [RandomizerContract.address, ANTCoinContract.address],
    });

    await hre.run("verify:verify", {
      address: BossesContract.address,
      constructorArguments: [RandomizerContract.address, ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address],
    });

    await hre.run("verify:verify", {
      address: TasksContract.address,
      constructorArguments: [RandomizerContract.address, ANTCoinContract.address, PremiumANTContract.address, BasicANTContract.address, PurseContract.address],
    });

    await hre.run("verify:verify", {
      address: VestingContract.address,
      constructorArguments: [ANTCoinContract.address],
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
