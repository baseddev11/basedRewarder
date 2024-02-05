import { BigNumber } from "ethers";
import hre, { ethers, upgrades } from "hardhat";

async function deploy() {
  // const [admin] = await ethers.getSigners();
  // const Factory = await ethers.getContractFactory("MockToken");

  const args = ["MockToken", "MT"];

  // //@ts-ignore
  // const mockToken = await Factory.deploy(...args);

  // console.log("Mock token deployed to:", mockToken.address);

  if (hre.network.name != "hardhat") {
    try {
      await hre.run("verify:verify", {
        address: "0x8Bd03dE024a0ED0bb71e4d23dD05039eB69E1dd0",
        constructorArguments: args,
        contract: "contracts/MockToken.sol:MockToken",
      });
    } catch (e) {
      console.log(e);
    }
  }
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
