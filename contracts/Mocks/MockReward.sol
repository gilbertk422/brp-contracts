// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";

contract MockReward is Ownable, ERC20Capped {
	uint256 constant CAP = 100e24; // 100 million

	constructor() ERC20("Reward", "BR") ERC20Capped(CAP) {}

	/**
	 * @notice Allow the owner to mint tokens
	 * @param to Address that will receive the minted tokens
	 * @param amount Amount of tokens that will be minted
	 */
	function mint(address to, uint256 amount) public onlyOwner {
		_mint(to, amount);
	}
}
