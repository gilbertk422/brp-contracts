// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances. 
 */
contract BasicToken {
	mapping(address => uint256) balances;

	event Transfer(address indexed from, address indexed to, uint256 value);

	/**
	* @dev transfer token for a specified address
	* @param _to The address to transfer to.
	* @param _value The amount to be transferred.
	*/
	function transfer(address _to, uint256 _value) public virtual returns (bool) {
		balances[msg.sender] = balances[msg.sender] - _value;
		balances[_to] = balances[_to]  + _value;
		emit Transfer(msg.sender, _to, _value);
		return true;
	}

	/**
	* @dev Gets the balance of the specified address.
	* @param _owner The address to query the the balance of. 
	* @return An uint256 representing the amount owned by the passed address.
	*/
	function balanceOf(address _owner) public view returns (uint256) {
		return balances[_owner];
	}

}
