require("@nomicfoundation/hardhat-toolbox");
require("dotenv");

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
      url: "https://polygon-mumbai.g.alchemy.com/v2/yiqhYdMo90O5WLE0CgoJ1IOBE2Ns4lGo",
      accounts: ["your-private-key"]
        // process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  },
  etherscan: {
    apiKey: "BMMDEFMCYRYXZ53YJ9KNJP8QXHZESCSKA7",
  },
};