import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IERC20__factory, RFL } from "../typechain-types";
import { ethers, upgrades } from "hardhat";
import { MockContract, deployMockContract } from "ethereum-waffle";
import { expect } from "chai";
import { getTokenIdFromCode } from "./referralNftUtils";

describe("ReferralNFT", () => {
  let rfl: RFL;
  let deployer: SignerWithAddress;
  let admin: SignerWithAddress;
  let minter: SignerWithAddress;
  let og1: SignerWithAddress;
  let og2: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let collateral: MockContract;
  let activationThreshold = 10;

  beforeEach(async () => {
    [deployer, minter, admin, og1, og2, user1, user2, user3] =
      await ethers.getSigners();

    ///@ts-ignore
    collateral = await deployMockContract(admin, IERC20__factory.abi);

    const Factory = await ethers.getContractFactory("RFL");
    rfl = (await upgrades.deployProxy(Factory, [
      admin.address,
      minter.address,
      collateral.address,
      activationThreshold,
    ])) as RFL;
  });

  describe("Referrals", async () => {
    it("should have correct setup", async () => {
      expect(await rfl.hasRole(await rfl.DEFAULT_ADMIN_ROLE(), admin.address))
        .to.be.true;

      expect(await rfl.hasRole(await rfl.MINTER_ROLE(), minter.address)).to.be
        .true;

      expect(await rfl.collateral()).to.eq(collateral.address);
    });

    it("should not allow non-minter to mint referral NFT without locking reward token", async () => {
      await expect(
        rfl.connect(user1).ogMint(og1.address, "og1Code")
      ).to.be.revertedWith(
        `AccessControl: account ${user1.address.toLowerCase()} is missing role ${await rfl.MINTER_ROLE()}`
      );
    });

    it("should allow minter to mint referral NFT", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      expect(await rfl.ownerOf(getTokenIdFromCode("og1Code"))).to.eq(
        og1.address
      );
    });

    it("should not be able to mint with duplicate code", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await expect(
        rfl.connect(minter).ogMint(og2.address, "og1Code")
      ).to.be.revertedWith("ERC721: token already minted");
    });

    it("should allow user to own multiple referral NFTs", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await rfl.connect(minter).ogMint(og1.address, "og2Code");
      await rfl.connect(minter).ogMint(og1.address, "og3Code");
      expect(await rfl.balanceOf(og1.address)).to.eq(3);
    });

    it("should set newly minted OG referral NFT to active", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      expect(await rfl.isActiveReferrer(getTokenIdFromCode("og1Code"))).to.be
        .true;
    });

    it("should set status to inactive is normal referral NFT is minted", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await rfl.connect(user1).safeMint("user1Code");
      expect(await rfl.isActiveReferrer(getTokenIdFromCode("og1Code"))).to.be
        .true;
      expect(await rfl.isActiveReferrer(getTokenIdFromCode("user1Code"))).to.be
        .false;
    });
    it("owner should have one nft in use nfts after mint", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      expect(await rfl.tokenInUse(og1.address)).eq(
        getTokenIdFromCode("og1Code")
      );
    });

    it("should allow owner to set in use to true for referral NFT", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      expect(await rfl.tokenInUse(og1.address)).eq(
        getTokenIdFromCode("og1Code")
      );
    });

    it("should not allow non-owner to set in use to true for referral NFT", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await expect(
        rfl.connect(user1).setTokenInUse(getTokenIdFromCode("og1Code"))
      ).to.be.revertedWithCustomError(rfl, "NotOwner");
    });

    it("should set in use to 0 if referral NFT is transferred", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await rfl
        .connect(og1)
        .transferFrom(
          og1.address,
          user1.address,
          getTokenIdFromCode("og1Code")
        );
      expect(await rfl.tokenInUse(og1.address)).eq(0);
      expect(await rfl.tokenInUse(user1.address)).eq(
        getTokenIdFromCode("og1Code")
      );
    });

    it("should not be able to mint with inactive referrer", async () => {
      await rfl.connect(user1).safeMint("user1code");

      await expect(
        rfl
          .connect(user2)
          .safeMintWithReferrer("user2Code", getTokenIdFromCode("user1Code"))
      ).to.be.revertedWithCustomError(rfl, "InactiveReferrer");
    });

    it("should be able to mint with active referrer", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await rfl
        .connect(user1)
        .safeMintWithReferrer("user1Code", getTokenIdFromCode("og1Code"));
      expect(await rfl.ownerOf(getTokenIdFromCode("user1Code"))).to.eq(
        user1.address
      );

      const referrer = await rfl.referrer(getTokenIdFromCode("user1Code"));
      expect(referrer).to.eq(getTokenIdFromCode("og1Code"));
    });

    it("should be able to set referrer", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await rfl.connect(user1).safeMint("user1Code");
      await rfl
        .connect(user1)
        .setReferrer(
          getTokenIdFromCode("user1Code"),
          getTokenIdFromCode("og1Code")
        );

      const referrer = await rfl.referrer(getTokenIdFromCode("user1Code"));
      expect(referrer).to.eq(getTokenIdFromCode("og1Code"));
    });

    it("should not be able to set referrer if not owner", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await rfl.connect(user1).safeMint("user1Code");
      await expect(
        rfl
          .connect(user2)
          .setReferrer(
            getTokenIdFromCode("user1Code"),
            getTokenIdFromCode("og1Code")
          )
      ).to.be.revertedWithCustomError(rfl, "NotOwner");
    });

    it("should not be able to set referrer if referrer is not active", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await rfl.connect(user1).safeMint("user1Code");
      await rfl.connect(user2).safeMint("user2Code");
      await rfl
        .connect(user1)
        .setReferrer(
          getTokenIdFromCode("user1Code"),
          getTokenIdFromCode("og1Code")
        );

      await expect(
        rfl
          .connect(user2)
          .setReferrer(
            getTokenIdFromCode("user2Code"),
            getTokenIdFromCode("user1Code")
          )
      ).to.be.revertedWithCustomError(rfl, "InactiveReferrer");
    });

    it("should not be able to set referrer if set before", async () => {
      await rfl.connect(minter).ogMint(og1.address, "og1Code");
      await rfl.connect(minter).ogMint(og2.address, "og2Code");

      await rfl.connect(user1).safeMint("user1Code");
      await rfl
        .connect(user1)
        .setReferrer(
          getTokenIdFromCode("user1Code"),
          getTokenIdFromCode("og1Code")
        );

      await expect(
        rfl
          .connect(user1)
          .setReferrer(
            getTokenIdFromCode("user1Code"),
            getTokenIdFromCode("og2Code")
          )
      ).to.be.revertedWithCustomError(rfl, "ReferrerAlreadySet");
    });
  });

  describe("Locking and Unlocking collateral", async () => {
    it("should be able to active referrer with enough collateral", async () => {
      await rfl.connect(user1).safeMint("user1Code");
      await collateral.mock.transferFrom
        .withArgs(user1.address, rfl.address, 2)
        .returns(true);
      await rfl
        .connect(user1)
        .increaseLockedCollateral(getTokenIdFromCode("user1Code"), 2);

      const lockedCollateral = await rfl.lockedTokens(
        getTokenIdFromCode("user1Code")
      );
      expect(lockedCollateral).to.eq(2);
    });

    it("should be able to decrease locked collateral", async () => {
      await rfl.connect(user1).safeMint("user1Code");
      await collateral.mock.transferFrom
        .withArgs(user1.address, rfl.address, 2)
        .returns(true);
      await rfl
        .connect(user1)
        .increaseLockedCollateral(getTokenIdFromCode("user1Code"), 2);

      await collateral.mock.transfer.withArgs(user1.address, 1).returns(true);
      await rfl
        .connect(user1)
        .decreaseLockedCollateral(getTokenIdFromCode("user1Code"), 1);

      const lockedCollateral = await rfl.lockedTokens(
        getTokenIdFromCode("user1Code")
      );
      expect(lockedCollateral).to.eq(1);
    });

    it("should be marked as activated if collateral is enough", async () => {
      await rfl.connect(user1).safeMint("user1Code");
      await collateral.mock.transferFrom
        .withArgs(user1.address, rfl.address, activationThreshold)
        .returns(true);
      await rfl
        .connect(user1)
        .increaseLockedCollateral(
          getTokenIdFromCode("user1Code"),
          activationThreshold
        );

      expect(await rfl.isActiveReferrer(getTokenIdFromCode("user1Code"))).to.be
        .true;
    });

    it("should be marked as deactivated if collateral is not enough", async () => {
      await rfl.connect(user1).safeMint("user1Code");
      await collateral.mock.transferFrom
        .withArgs(user1.address, rfl.address, activationThreshold - 1)
        .returns(true);
      await rfl
        .connect(user1)
        .increaseLockedCollateral(
          getTokenIdFromCode("user1Code"),
          activationThreshold - 1
        );

      expect(await rfl.isActiveReferrer(getTokenIdFromCode("user1Code"))).to.be
        .false;
    });

    it("should not be able to decrease locked collateral if not owner", async () => {
      await rfl.connect(user1).safeMint("user1Code");
      await collateral.mock.transferFrom
        .withArgs(user1.address, rfl.address, 2)
        .returns(true);
      await rfl
        .connect(user1)
        .increaseLockedCollateral(getTokenIdFromCode("user1Code"), 2);

      await collateral.mock.transfer.withArgs(user2.address, 1).returns(true);
      await expect(
        rfl
          .connect(user2)
          .decreaseLockedCollateral(getTokenIdFromCode("user1Code"), 1)
      ).to.be.revertedWithCustomError(rfl, "NotOwner");
    });
  });
});
