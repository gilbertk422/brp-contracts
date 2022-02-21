// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "../Staking/StakingLib.sol";
import "../Staking/Staking.sol";

/// @title A Mock upgrade for the Staking contract
/// @author Gilbert Kim @gilbertk422
contract MockStakingV2 is Staking {
	function echo(uint256 v) public view returns (uint256) {
		return v;
	}

	function newGetHistoryLength() public view returns (uint256) {
		return 4242;
	}
}
