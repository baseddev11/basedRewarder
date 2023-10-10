// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./MuonClientBase.sol";

contract MuonClient is Initializable, MuonClientBase {
    uint256[50] private __gap;

    function __MuonClient_init(
        uint256 _muonAppId,
        PublicKey memory _muonPublicKey
    ) internal onlyInitializing {
        validatePubKey(_muonPublicKey.x);

        muonAppId = _muonAppId;
        muonPublicKey = _muonPublicKey;
    }
}
