import { BigNumber } from "ethers";
import hre, { ethers, upgrades } from "hardhat";

async function deploy() {
  const [admin] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("Rewarder");

  const basedToken = "0x8Bd03dE024a0ED0bb71e4d23dD05039eB69E1dd0";

  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const nft = "0xB898E8FD032ADa096F95754139208B3a271502fe";

  const args = [basedToken, admin.address, admin.address, zeroAddress, nft];

  const rewarder = await upgrades.deployProxy(Factory, args);
  await rewarder.deployed();

  console.log("Rewarder deployed to:", rewarder.address);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    rewarder.address
  );

  console.log("Implementation deployed to:", implementationAddress);

  // verify rewarder
  if (hre.network.name != "hardhat") {
    try {
      await hre.run("verify:verify", {
        address: rewarder.address,
        constructorArguments: [],
        contract: "contracts/Rewarder.sol:Rewarder",
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
