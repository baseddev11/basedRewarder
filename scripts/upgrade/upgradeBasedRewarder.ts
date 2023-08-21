import hre, { upgrades, ethers } from "hardhat";

export async function upgrade(proxyAddress: string) {
  const Factory = await ethers.getContractFactory("DibsRewarder");
  const contract = await upgrades.upgradeProxy(proxyAddress, Factory);

  await contract.deployed();

  await contract.deployTransaction.wait(1);

  console.log("contract upgraded:", contract.address);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(
    contract.address
  );

  console.log("Implementation deployed to:", implementationAddress);

  // verify
  await hre.run("verify:verify", {
    address: implementationAddress,
    constructorArguments: [],
    contract: "contracts/BasedRewarder.sol:DibsRewarder",
  });
}

upgrade("0x7AA64eB76100DD214716154DbB105c4d626EA159")
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
