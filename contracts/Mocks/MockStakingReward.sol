// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../Staking/RewardStreamer.sol";
import "../Staking/StakingLib.sol";


/// @title A Mock for the Staking Reward contract
/// @author Gilbert Kim @gilbertk422
contract MockStakingReward is RewardStreamer {
	uint256 public returnedValue;

	constructor(address _token) {
		super._setRewardToken(_token);
		RewardStreamer.rewardStreamInfo.deployedAtBlock = block.number;
	}

	function addRewardStream(uint256 rewardStreamIndex, uint256 periodBlockRate, uint256 periodLastBlock) public {
		super._addRewardStream(rewardStreamIndex, periodBlockRate, periodLastBlock);
	}

	function rewardStreamCursors(uint256 rewardStreamIndex) public view returns (uint256) {
		return rewardStreamInfo.rewardStreams[rewardStreamIndex].rewardStreamCursor;
	}

	function getRewardsFromRange(uint fromBlock, uint toBlock) public view returns (uint256) {
		return RewardStreamerLib.unsafeGetRewardsFromRange(
			rewardStreamInfo,
			fromBlock,
			toBlock
		);
	}

	function storeRewardValue(uint256 fromBlock, uint256 toBlock) external {
		returnedValue = RewardStreamerLib.getRewardAndUpdateCursor(rewardStreamInfo, fromBlock, toBlock);
	}
}
