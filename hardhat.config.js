require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.13", 
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      },
    ],
  },
  networks: {
    mumbai: {
      chainId: 80001,
      url: "https://polygon-mumbai.g.alchemy.com/v2/" + process.env.ALCHEMY_URL,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};