// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IMuonClientBase.sol";
import "./utils/SchnorrSECP256K1Verifier.sol";

contract MuonClientBase is IMuonClientBase, SchnorrSECP256K1Verifier {
    using ECDSA for bytes32;

    address public validGateway;
    uint256 public appId;
    PublicKey public pubKey;

    uint256[47] private __gap;

    constructor(
        address _validGateway,
        uint256 _appId,
        PublicKey memory _publicKey
    ) {
        validatePubKey(_publicKey.x);

        validGateway = _validGateway;
        appId = _appId;
        pubKey = _publicKey;
    }

    /// @notice Verifies a Muon signature of the given data
    /// @param _data data being signed
    /// @param _reqId request id that the signature was obtained from
    /// @param _signature signature of the data
    /// @param _gatewaySignature signature of the data by the gateway (specific Muon node)
    /// reverts if the signature is invalid
    function verifyTSSAndGW(
        bytes memory _data,
        bytes calldata _reqId,
        SchnorrSign calldata _signature,
        bytes calldata _gatewaySignature
    ) public {
        bytes32 _hash = keccak256(abi.encodePacked(appId, _reqId, _data));
        if (
            !verifySignature(
                pubKey.x,
                pubKey.parity,
                _signature.signature,
                uint256(_hash),
                _signature.nonce
            )
        ) revert InvalidSignature();

        _hash = _hash.toEthSignedMessageHash();
        address gatewaySignatureSigner = _hash.recover(_gatewaySignature);

        if (gatewaySignatureSigner != validGateway) revert InvalidSignature();

        emit MuonTX(_reqId, pubKey);
    }
}
