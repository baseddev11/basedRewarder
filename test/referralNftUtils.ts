import { ethers } from "hardhat";
import { BigNumber } from "ethers";

export function getTokenIdFromCode(code: string): BigNumber {
  return BigNumber.from(
    ethers.utils.keccak256(ethers.utils.solidityPack(["string"], [code]))
  );
}
