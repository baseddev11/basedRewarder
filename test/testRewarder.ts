import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

import hre, { ethers, upgrades } from "hardhat";
import { MockContract, deployMockContract } from "ethereum-waffle";
import { expect } from "chai";
import { getCurrentTimeStamp } from "./timeUtils";
import {
  Rewarder,
  IERC20__factory,
  IMuonClient__factory,
  IRFL__factory,
} from "../typechain-types";

describe("testRewarder", () => {
  let rewarder: Rewarder;
  let rewardToken: MockContract;
  let muonClient: MockContract;
  let referralNft: MockContract;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async () => {
    [admin, user1, user2, user3] = await ethers.getSigners();

    rewardToken = await deployMockContract(admin, IERC20__factory.abi);
    muonClient = await deployMockContract(admin, IMuonClient__factory.abi);
    referralNft = await deployMockContract(admin, IRFL__factory.abi);

    const startTimestamp = await getCurrentTimeStamp();
    const Factory = await ethers.getContractFactory("Rewarder");
    const args = [
      rewardToken.address,
      admin.address,
      muonClient.address,
      referralNft.address,
    ];
    rewarder = (await upgrades.deployProxy(Factory, args)) as Rewarder;

    await muonClient.mock.verifyTSSAndGW.returns();
  });

  it("should not set  token if not admin", async () => {
    await expect(
      rewarder.connect(user1).setRewardToken(rewardToken.address)
    ).to.be.revertedWith(
      `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await rewarder.DEFAULT_ADMIN_ROLE()}`
    );
  });

  it("should set token if admin", async () => {
    await rewarder.connect(admin).setRewardToken(rewardToken.address);
    expect(await rewarder.rewardToken()).to.eq(rewardToken.address);
  });

  it("should deposit reward for day 0", async () => {
    await rewarder.connect(admin).setRewardToken(rewardToken.address);
    await rewardToken.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);
    expect(await rewarder.totalReward(0)).to.eq(1000);
  });

  it("should deposit reward for day 1 too", async () => {
    await rewarder.connect(admin).setRewardToken(rewardToken.address);
    await rewardToken.mock.transferFrom
      .withArgs(user2.address, rewarder.address, 2000)
      .returns(true);
    await rewardToken.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);

    await rewarder.connect(user2).fill(0, 2000);
    await rewarder.connect(user1).fill(1, 1000);
    expect(await rewarder.totalReward(1)).to.eq(1000);
    expect(await rewarder.totalReward(0)).to.eq(2000);
  });

  it("should increase deposit reward for day 0", async () => {
    await rewarder.connect(admin).setRewardToken(rewardToken.address);
    await rewardToken.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);
    await rewardToken.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);
    expect(await rewarder.totalReward(0)).to.eq(2000);
  });

  it("should withdraw reward for day 0", async () => {
    await rewarder.connect(admin).setRewardToken(rewardToken.address);

    // fill
    await rewardToken.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);

    // go to next day
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    // claim

    await rewardToken.mock.transfer.withArgs(user2.address, 100).returns(true);
    await referralNft.mock.tokenInUse.withArgs(user2.address).returns(1);

    await rewarder.connect(user2).claim(
      0,
      10,
      100,
      await time.latest(),
      "0x00",
      {
        signature: 0,
        owner: user1.address, // could be any random address
        nonce: user1.address, // could be any random address
      },
      [0, 0]
    );

    const claimed = await rewarder.claimed(1, 0);
    expect(claimed).to.eq(100);
  });

  it("should not withdraw reward for day 0 twice", async () => {
    await rewarder.connect(admin).setRewardToken(rewardToken.address);

    // fill
    await rewardToken.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);

    // go to next day
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    // claim

    await rewardToken.mock.transfer.withArgs(user2.address, 100).returns(true);
    await referralNft.mock.tokenInUse.withArgs(user2.address).returns(1);

    await rewarder.connect(user2).claim(
      0,
      10,
      100,
      await time.latest(),
      "0x00",
      {
        signature: 0,
        owner: user1.address, // could be any random address
        nonce: user1.address, // could be any random address
      },
      [0, 0]
    );

    await expect(
      rewarder.connect(user2).claim(
        0,
        10,
        100,
        await time.latest(),
        "0x00",
        {
          signature: 0,
          owner: user1.address, // could be any random address
          nonce: user1.address, // could be any random address
        },
        [0, 0]
      )
    ).to.be.revertedWith("Mock on the method is not initialized");
  });

  it("should withdraw reward for day 0 and 1", async () => {
    await rewarder.connect(admin).setRewardToken(rewardToken.address);

    // fill
    await rewardToken.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);

    await rewardToken.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(1, 1000);

    // go to next day
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    // claim

    await rewardToken.mock.transfer.withArgs(user2.address, 100).returns(true);
    await referralNft.mock.tokenInUse.withArgs(user2.address).returns(1);
    await rewarder.connect(user2).claim(
      0,
      10,
      100,
      await time.latest(),
      "0x00",
      {
        signature: 0,
        owner: user1.address, // could be any random address
        nonce: user1.address, // could be any random address
      },
      [0, 0]
    );

    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    await rewardToken.mock.transfer.withArgs(user2.address, 200).returns(true);
    await referralNft.mock.tokenInUse.withArgs(user2.address).returns(1);
    await rewarder.connect(user2).claim(
      1,
      20,
      100,
      await time.latest(),
      "0x00",
      {
        signature: 0,
        owner: user1.address, // could be any random address
        nonce: user1.address, // could be any random address
      },
      [0, 0]
    );

    const userClaimed = await rewarder.claimed(1, 0);
    expect(userClaimed).to.eq(100);
    const userClaimed2 = await rewarder.claimed(1, 1);
    expect(userClaimed2).to.eq(200);
  });

  it("should allow multiple users to claim", async () => {
    await rewarder.connect(admin).setRewardToken(rewardToken.address);

    // fill
    await rewardToken.mock.transferFrom
      .withArgs(user1.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user1).fill(0, 1000);

    await rewardToken.mock.transferFrom
      .withArgs(user2.address, rewarder.address, 1000)
      .returns(true);
    await rewarder.connect(user2).fill(1, 1000);

    // go to next day
    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    // claim

    await rewardToken.mock.transfer.withArgs(user2.address, 100).returns(true);
    await referralNft.mock.tokenInUse.withArgs(user2.address).returns(1);
    await rewarder.connect(user2).claim(
      0,
      10,
      100,
      await time.latest(),
      "0x00",
      {
        signature: 0,
        owner: user1.address, // could be any random address
        nonce: user1.address, // could be any random address
      },
      [0, 0]
    );

    await hre.network.provider.request({
      method: "evm_increaseTime",
      params: [86400],
    });

    await rewardToken.mock.transfer.withArgs(user3.address, 200).returns(true);
    await referralNft.mock.tokenInUse.withArgs(user3.address).returns(2);
    await rewarder.connect(user3).claim(
      1,
      20,
      100,
      await time.latest(),
      "0x00",
      {
        signature: 0,
        owner: user1.address, // could be any random address
        nonce: user1.address, // could be any random address
      },
      [0, 0]
    );

    const userClaimed = await rewarder.claimed(1, 0);
    expect(userClaimed).to.eq(100);
    const userClaimed2 = await rewarder.claimed(2, 1);
    expect(userClaimed2).to.eq(200);
  });
});
