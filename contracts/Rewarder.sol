// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/IMuonClient.sol";

import "./interfaces/IRFL.sol";

contract Rewarder is AccessControlUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public rewardToken; // Reward token
    address public muonClient; // Muon client contract
    address public rfl; // Referral NFT contract

    mapping(uint256 => mapping(uint256 => uint256)) public claimed; // Mapping of nft's claimed balance per day. claimed[nftId][day] = amount
    mapping(uint256 => uint256) public totalReward; // Mapping of total reward per day totalReward[day] = amount

    // Events
    event Reward(uint256 day, uint256 amount);
    event Claim(address indexed user, uint256 day, uint256 amount);
    event SetrewardToken(address indexed rewardToken);
    event SetMuonClient(address newAddress, address oldAddress);

    // Errors
    error InvalidSignature();
    error DayNotFinished();

    /// @notice Initialize the contract
    /// @param _rewardToken address of the reward token
    /// @param _admin address of the admin, can set reward token
    /// @param _muonClient muon signature verifier
    function initialize(
        address _rewardToken,
        address _admin,
        address _muonClient,
        address _rfl
    ) public initializer {
        muonClient = _muonClient;
        rewardToken = _rewardToken;
        rfl = _rfl;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    /// @notice Fill reward for a given day from the token contract
    /// @param _day day to fill reward for
    /// @param _amount amount of reward to fill
    function fill(uint256 _day, uint256 _amount) external {
        IERC20Upgradeable(rewardToken).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );
        totalReward[_day] += _amount;
        emit Reward(_day, _amount);
    }

    /// @notice Claim reward for a given day - requires valid muon signature
    /// @param _day day to claim reward for
    /// @param _points earned points for the day
    /// @param _totalPoints total earned points for the day
    /// @param _sigTimestamp timestamp of the signature
    /// @param _reqId request id that the signature was obtained from
    /// @param _sign signature of the data
    /// @param _gatewaySignature signature of the data by the gateway (specific Muon node)
    /// reverts if the signature is invalid
    function claim(
        uint256 _day,
        uint256 _points,
        uint256 _totalPoints,
        uint256 _sigTimestamp,
        bytes calldata _reqId,
        IMuonClient.SchnorrSign calldata _sign,
        bytes calldata _gatewaySignature
    ) external {
        if (_day >= _sigTimestamp / 1 days) revert DayNotFinished();

        uint256 tokenId = IRFL(rfl).tokenInUse(msg.sender);

        IMuonClient(muonClient).verifyTSSAndGW(
            abi.encodePacked(
                tokenId,
                _day,
                _points,
                _totalPoints,
                _sigTimestamp
            ),
            _reqId,
            _sign,
            _gatewaySignature
        );

        uint256 rewardAmount = (totalReward[_day] * _points) / _totalPoints;
        uint256 withdrawableAmount = rewardAmount - claimed[tokenId][_day];
        claimed[tokenId][_day] += withdrawableAmount;

        IERC20Upgradeable(rewardToken).safeTransfer(
            msg.sender,
            withdrawableAmount
        );

        emit Claim(msg.sender, _day, rewardAmount);
    }

    /// @notice Set the reward token
    /// @param _rewardToken address of the reward token
    function setRewardToken(
        address _rewardToken
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardToken = _rewardToken;
        emit SetrewardToken(_rewardToken);
    }

    /// @notice Set the muon client
    /// @param _muonClient address of the muon client
    function setMuonClient(
        address _muonClient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit SetMuonClient(_muonClient, address(muonClient));
        muonClient = _muonClient;
    }
}
