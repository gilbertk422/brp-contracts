// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { IERC20Basic as linkERC20Basic } from "./IERC20Basic.sol";


/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
interface IERC20 is linkERC20Basic {
	function allowance(address owner, address spender) external returns (uint256);
	function transferFrom(address from, address to, uint256 value) external returns (bool);
	function approve(address spender, uint256 value) external returns (bool);
	
	event Approval(address indexed owner, address indexed spender, uint256 value);
}