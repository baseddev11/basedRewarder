// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract RFL is
    Initializable,
    ERC721Upgradeable,
    ERC721BurnableUpgradeable,
    AccessControlUpgradeable
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public activationCollateralThreshold; // collateral required to activate an NFT to be able to participate in the referral program
    address public collateral;

    // tokenId => locked collateral
    mapping(uint256 => uint256) public lockedTokens;
    // tokenId => is original
    mapping(uint256 => bool) public isOg;
    // owner => token id that is in use - can only have one active at a time
    mapping(address => uint256) public tokenInUse; // tokenId 0 is never minted

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _minter,
        address _collateral,
        uint256 _activationCollateralThreshold
    ) public initializer {
        __ERC721_init("RFL", "RFL");
        __ERC721Burnable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _minter);

        collateral = _collateral;
        activationCollateralThreshold = _activationCollateralThreshold;
    }

    function getTokenId(string memory code) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(code)));
    }

    function isActiveReferrer(uint256 tokenId) public view returns (bool) {
        return
            lockedTokens[tokenId] >= activationCollateralThreshold ||
            isOg[tokenId];
    }

    /// @notice these can be activated without locking token
    function ogMint(
        address to,
        string memory code
    ) public onlyRole(MINTER_ROLE) {
        uint256 tokenId = getTokenId(code);
        isOg[tokenId] = true;
        _safeMint(to, tokenId);
    }

    function safeMint(string memory code) external {
        _safeMint(msg.sender, getTokenId(code));
    }

    function setTokenInUse(uint256 tokenId) external onlyOwner(tokenId) {
        tokenInUse[msg.sender] = tokenId;
    }

    modifier onlyOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _;
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
