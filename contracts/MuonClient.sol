// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./MuonClientBase.sol";

contract MuonClient is Initializable, MuonClientBase {
    address public validMuonGateway;

    uint256[49] private __gap;

    function initialize(
        address _validMuonGateway,
        uint256 _muonAppId,
        PublicKey memory _muonPublicKey
    ) public initializer {
        validatePubKey(_muonPublicKey.x);

        muonAppId = _muonAppId;
        muonPublicKey = _muonPublicKey;
    }

    error InvalidSignature();

    /// @notice Verifies a Muon signature of the given data
    /// @param _data data being signed
    /// @param _reqId request id that the signature was obtained from
    /// @param _sign signature of the data
    /// @param _gatewaySignature signature of the data by the gateway (specific Muon node)
    /// reverts if the signature is invalid
    function verifyTSSAndGW(
        bytes memory _data,
        bytes calldata _reqId,
        SchnorrSign calldata _sign,
        bytes calldata _gatewaySignature
    ) internal {
        bytes32 _hash = keccak256(abi.encodePacked(muonAppId, _reqId, _data));
        if (!muonVerify(_reqId, uint256(_hash), _sign, muonPublicKey))
            revert InvalidSignature();

        _hash = _hash.toEthSignedMessageHash();
        address gatewaySignatureSigner = _hash.recover(_gatewaySignature);

        if (gatewaySignatureSigner != validMuonGateway)
            revert InvalidSignature();
    }
}
