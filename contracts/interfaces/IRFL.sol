// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRFL {
    function tokenInUse(address) external view returns (uint256);

    function lockedTokens(uint256) external view returns (uint256);

    function codeName(uint256) external view returns (string memory);

    function codeTokenId(string memory) external view returns (uint256);

    function isOg(uint256) external view returns (bool);

    function referrer(uint256) external view returns (uint256);

    function collateral() external view returns (address);

    function activationThreshold() external view returns (uint256);

    function isActiveReferrer(uint256) external view returns (bool);
}
