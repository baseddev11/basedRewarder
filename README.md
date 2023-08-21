# DibsRewarder Contract

## Overview

The `DibsRewarder` is a smart contract that manages rewards based on a user's volume for a given day. It leverages the Muon protocol for signature verification to ensure authenticity of claims. In summery, there is a reward allocation of $BASED token every day, and users can claim a portion of the daily reward based on the volume they generated with respect to total volume.
This contract has functionalities to:

1. Initialize the rewarder with necessary parameters.
2. Fill rewards for a particular day.
3. Claim rewards for a particular day (requires Muon signature).
4. Set the reward token's address.
5. Set the start timestamp of the reward program.

## Dependencies

- OpenZeppelin Contracts: Used for cryptographic operations, ERC20 token functionalities, and access controls.
- MuonClient: Custom contract for Muon-related operations.

## Setting Up

### Installation

Clone the repository and install necessary node modules:

```bash
git clone <repository-url>
cd <repository-directory>
npm install
```

### Testing

Before running tests, there are certain modifications you need to make due to the limitations in mocking the Muon protocol:

1. Comment out the last 4 arguments of the `claim` function.
2. Comment out the `verifyTSSAndGW` function call inside the `claim` function.

After making these changes, you can run tests using:

```bash
npx hardhat test
```

## Contract Functions

### Initialization

The contract is initialized using the `initialize` function which sets the reward token, Muon gateway, admin's address, Muon app ID, and Muon public key.

### Filling Rewards

Anyone can fill rewards for a particular day using the `fill` function. This involves transferring tokens from the sender to the contract.

### Claiming Rewards

Users can claim their rewards for a particular day using the `claim` function. This requires a valid Muon signature. The function verifies the signature and transfers the entitled reward to the user.

### Modifying Contract Parameters

Admins can change the reward token's address using the `setBased` function and modify the start timestamp of the reward program using the `setStartTimestamp` function.

## Security

The contract uses Muon's multi-signature verification to ensure only valid claims are processed. Any attempt to claim with an invalid or tampered signature will result in a transaction revert.

## Events

- `Reward`: Emitted when rewards are filled for a day.
- `Claim`: Emitted when a user claims their reward.
- `SetBased`: Emitted when the reward token's address is changed.
- `SetStartTimestamp`: Emitted when the start timestamp is modified.

## Errors

- `InvalidSignature`: Raised when the provided Muon signature is invalid.
- `DayNotFinished`: Raised when trying to claim a reward for a day that hasn't finished yet.
