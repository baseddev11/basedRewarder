// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMuonClientBase {
    struct SchnorrSign {
        uint256 signature;
        address owner;
        address nonce;
    }

    struct PublicKey {
        uint256 x;
        uint8 parity;
    }

    event MuonTX(bytes reqId, PublicKey pubKey);
    error InvalidSignature();

    function verifyTSSAndGW(
        bytes memory _data,
        bytes calldata _reqId,
        SchnorrSign calldata _signature,
        bytes calldata _gatewaySignature
    ) external;
}
