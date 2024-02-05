import { BigNumber } from "ethers";
import hre, { ethers, upgrades } from "hardhat";

async function deploy() {
  const [admin] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("RFL");

  const token = "0x8Bd03dE024a0ED0bb71e4d23dD05039eB69E1dd0";

  const args = [
    admin.address, // admin
    admin.address, // minter
    token, // reward token
    ethers.utils.parseEther("22"), // activation threshold
  ];

  const rfl = await upgrades.deployProxy(Factory, args);
  await rfl.deployed();

  console.log("RFL deployed to:", rfl.address);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    rfl.address
  );

  console.log("Implementation deployed to:", implementationAddress);

  // verify rewarder
  if (hre.network.name != "hardhat") {
    try {
      await hre.run("verify:verify", {
        address: rfl.address,
        constructorArguments: [],
        contract: "contracts/ReferralNFT.sol:RFL",
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
