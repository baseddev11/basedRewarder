import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { DibsRewarder, IERC20__factory } from "../typechain-types";
import hre, { ethers, upgrades } from "hardhat";
import { MockContract, deployMockContract } from "ethereum-waffle";
import { expect } from "chai";
import { getCurrentTimeStamp } from "./timeUtils";

describe("testBasedRewarder", () => {
  let rewarder: DibsRewarder;
  let based: MockContract;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async () => {
    [admin, user1, user2, user3] = await ethers.getSigners();
    based = await deployMockContract(admin, IERC20__factory.abi);
    const startTimestamp = await getCurrentTimeStamp();
    const Factory = await ethers.getContractFactory("DibsRewarder");
    const args = [
      ethers.constants.AddressZero,
      admin.address,
      startTimestamp,
      ethers.constants.AddressZero,
      0,
      [0, 0],
    ];
    rewarder = (await upgrades.deployProxy(Factory, args)) as DibsRewarder;
  });

  it("should not set based token if not admin", async () => {
    await expect(
      rewarder.connect(user1).setBased(based.address)
    ).to.be.revertedWith(
      `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await rewarder.DEFAULT_ADMIN_ROLE()}`
    );
  });

  it("should set based token if admin", async () => {
    await rewarder.connect(admin).setBased(based.address);
    expect(await rewarder.based()).to.eq(based.address);
  });

  it("should deposit reward for day 0", async () => {
    await rewarder.connect(admin).setBased(based.address);
    await based.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);
    expect(await rewarder.totalReward(0)).to.eq(1000);
  });

  it("should deposit reward for day 1 too", async () => {
    await rewarder.connect(admin).setBased(based.address);
    await based.mock.transferFrom
      .withArgs(user2.address, rewarder.address, 2000)
      .returns(true);
    await based.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);

    await rewarder.connect(user2).fill(0, 2000);
    await rewarder.connect(user1).fill(1, 1000);
    expect(await rewarder.totalReward(1)).to.eq(1000);
    expect(await rewarder.totalReward(0)).to.eq(2000);
  });

  it("should increase deposit reward for day 0", async () => {
    await rewarder.connect(admin).setBased(based.address);
    await based.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);
    await based.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);
    expect(await rewarder.totalReward(0)).to.eq(2000);
  });

  it("should withdraw reward for day 0", async () => {
    await rewarder.connect(admin).setBased(based.address);

    // fill
    await based.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);

    // go to next day
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    // claim

    await based.mock.transfer.withArgs(user2.address, 100).returns(true);
    await rewarder.connect(user2).claim(0, 10, 100);

    const userClaimed = await rewarder.claimed(user2.address, 0);
    expect(userClaimed).to.eq(100);
  });

  it("should not withdraw reward for day 0 twice", async () => {
    await rewarder.connect(admin).setBased(based.address);

    // fill
    await based.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);

    // go to next day
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    // claim

    await based.mock.transfer.withArgs(user2.address, 100).returns(true);
    await rewarder.connect(user2).claim(0, 10, 100);

    await expect(rewarder.connect(user2).claim(0, 10, 100)).to.be.revertedWith(
      "Mock on the method is not initialized"
    );
  });

  it("should withdraw reward for day 0 and 1", async () => {
    await rewarder.connect(admin).setBased(based.address);

    // fill
    await based.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);

    await based.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(1, 1000);

    // go to next day
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    // claim

    await based.mock.transfer.withArgs(user2.address, 100).returns(true);
    await rewarder.connect(user2).claim(0, 10, 100);

    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    await based.mock.transfer.withArgs(user2.address, 200).returns(true);
    await rewarder.connect(user2).claim(1, 20, 100);

    const userClaimed = await rewarder.claimed(user2.address, 0);
    expect(userClaimed).to.eq(100);
    const userClaimed2 = await rewarder.claimed(user2.address, 1);
    expect(userClaimed2).to.eq(200);
  });

  it("should allow multiple users to claim", async () => {
    await rewarder.connect(admin).setBased(based.address);

    // fill
    await based.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);

    await based.mock.transferFrom
      .withArgs(user2.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user2).fill(1, 1000);

    // go to next day
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    // claim

    await based.mock.transfer.withArgs(user3.address, 100).returns(true);
    await rewarder.connect(user3).claim(0, 10, 100);

    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    await based.mock.transfer.withArgs(user3.address, 200).returns(true);
    await rewarder.connect(user3).claim(1, 20, 100);

    const userClaimed = await rewarder.claimed(user3.address, 0);
    expect(userClaimed).to.eq(100);
    const userClaimed2 = await rewarder.claimed(user3.address, 1);
    expect(userClaimed2).to.eq(200);
  });
});
