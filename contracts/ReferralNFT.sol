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

    event CollateralLocked(uint256 indexed tokenId, uint256 amount);
    event CollateralUnlocked(uint256 indexed tokenId, uint256 amount);
    event SetInUse(uint256 indexed tokenId, address indexed owner);

    error InactiveReferrer();

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

    // =========================== PUBLIC VIEWS ===========================

    /// @notice returns a deterministic tokenId based on code - token id may not exist yet
    /// @param code - referral code
    /// @return tokenId
    function getTokenId(string memory code) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(code)));
    }

    /// @notice token is active if it's OG or has enough collateral locked
    /// @param tokenId - token id
    /// @return true if active
    function isActiveReferrer(uint256 tokenId) public view returns (bool) {
        return
            lockedTokens[tokenId] >= activationCollateralThreshold ||
            isOg[tokenId];
    }

    /// @notice mint a token if it doesn't exist yet, does not require collateral to activate
    /// @param to - address to mint to
    /// @param code - referral code
    function ogMint(
        address to,
        string memory code
    ) public onlyRole(MINTER_ROLE) {
        uint256 tokenId = getTokenId(code);
        isOg[tokenId] = true;
        _safeMint(to, tokenId);
    }

    /// @notice mint a token to caller if it doesn't exist yet, requires collateral to activate
    /// @param code - referral code
    function safeMint(string memory code) external {
        _safeMint(msg.sender, getTokenId(code));
    }

    /// @notice mint a token with a referrer if it doesn't exist yet, requires collateral to activate
    /// @param code - referral code
    /// @param referrerTokenId - referrer token id - must be active
    function safeMint(
        string memory code,
        uint256 referrerTokenId
    ) external onlyActiveReferrer(referrerTokenId) {}

    /// @notice set token in use for the sender if the token is owned by the sender
    /// @param tokenId - token id
    function setTokenInUse(uint256 tokenId) external onlyOwner(tokenId) {
        tokenInUse[msg.sender] = tokenId;
        emit SetInUse(tokenId, msg.sender);
    }

    // =========================== INTERNAL OVERRIDES ===========================

    /// @notice unsets token in use for the sender if the token is in use
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override {
        for (uint256 i = 0; i < batchSize; i++) {
            uint256 tokenId = firstTokenId + i;
            if (from != address(0)) {
                if (tokenInUse[from] == tokenId) {
                    tokenInUse[from] = 0;
                }
            }
        }
    }

    /// @dev sets token in use for the receiver if has no active token
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override {
        for (uint256 i = 0; i < batchSize; i++) {
            uint256 tokenId = firstTokenId + i;
            if (to != address(0)) {
                if (tokenInUse[to] == 0) {
                    tokenInUse[to] = tokenId;
                }
            }
        }
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

    /// @dev only owner of the token can call this
    modifier onlyOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _;
    }

    modifier onlyActiveReferrer(uint256 tokenId) {
        if (isActiveReferrer(tokenId)) {
            _;
        } else {
            revert InactiveReferrer();
        }
        _;
    }
}
