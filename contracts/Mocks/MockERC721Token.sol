// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';

/// @title Lottery tickets to be given to users after staking (mintable).
/// @author Gilbert Kim @gilbertk422
contract MockERC721Token is ERC721, Ownable, Pausable {

	constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

	/**
	 * @dev Function to mint tokens.
	 * @param to The address that will receive the minted tokens.
	 * @param tokenId The token id to mint.
	 * @return A boolean that indicates if the operation was successful.
	 */
	function mint(address to, uint256 tokenId) public returns (bool) {
		super._safeMint(to, tokenId);
		return true;
	}

	function safeTransferFrom(address from, address to, uint256 tokenId) public override whenNotPaused {
		super.safeTransferFrom(from, to, tokenId);
	}
	function transferFrom(address from, address to, uint256 tokenId) public override whenNotPaused {
		super.transferFrom(from, to, tokenId);
	}

	function pause() public {
		_pause();
	}
	
	function unpause() public {
		_unpause();
	}

}