import { BigNumber } from "ethers";
import hre, { ethers, upgrades } from "hardhat";

async function deploy() {
  const [admin] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("DibsRewarder");
  const appId =
    "29996138867610942848855832240712459333931278134263772663951800460922233661812";
  const validGateway = "0x6914c3af649c285d706d6757dd899d84b606c2da";

  const publicKey = [
    "0x4d8bf64cdc8651641833910995bfe0aed9b61037721f3d2305d1f87e8f3ad815",
    "0",
  ];

  const basedToken = "0xBa5E6fa2f33f3955f0cef50c63dCC84861eAb663";

  const args = [basedToken, admin.address, validGateway, appId, publicKey];

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
        contract: "contracts/BasedRewarder.sol:DibsRewarder",
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
