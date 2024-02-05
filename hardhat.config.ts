import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-etherscan";
import "@openzeppelin/hardhat-upgrades";

// load env variables
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    "base-mainnet": {
      url: "https://mainnet.base.org",
      accounts: [process.env.ADMIN_PRIVATE_KEY!],
    },
    goerli: {
      url: "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: [
        process.env.TESTER_PRIVATE_KEY!,
        process.env.ADMIN_PRIVATE_KEY!,
      ],
      gasPrice: 60000000000,
    },
    bsc: {
      url: "https://bsc-dataseed3.binance.org",
      accounts: [process.env.ADMIN_PRIVATE_KEY!],
    },
    mumbai: {
      url: "https://rpc.ankr.com/polygon_mumbai",
      accounts: [process.env.ADMIN_PRIVATE_KEY!],
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [process.env.ADMIN_PRIVATE_KEY!],
    },
    arbitrumOne: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.ADMIN_PRIVATE_KEY!],
    },
  },
  etherscan: {
    customChains: [
      {
        network: "base-mainnet",
        chainId: 8453,

        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org/",
        },
      },
    ],
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY!,
      goerli: process.env.ETHERSCAN_API_KEY!,
      polygonMumbai: process.env.MATICSCAN_API_KEY!,
      polygon: process.env.MATICSCAN_API_KEY!,
      bsc: process.env.BSCSCAN_API_KEY!,
      arbitrumOne: process.env.ARBITRUMSCAN_API_KEY!,
      "base-mainnet": process.env.BASESCAN_API_KEY!,
    },
  },
};

export default config;
