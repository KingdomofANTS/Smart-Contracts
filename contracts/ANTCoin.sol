// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ANTCoin is ERC20, Ownable {

    // Max Circulation Supply Amount
    uint256 public constant maxCirculationSupply = 200000000 ether; // 200 million
    // Current Circulation Supply Amount
    uint256 public currentCirculationSupply = 0;
    // minters
    mapping(address => bool) private minters;
    // modifier to check _msgSender has minter role
    modifier onlyMinter() {
        require(minters[_msgSender()], "ANTCoin: Caller is not the minter");
        _;
    }

    constructor() ERC20("ANT Coin", "ANTC") {
        minters[_msgSender()] = true;
        mint(_msgSender(), 100000000 ether); // 100 million
    }

    /**
    * @notice Mint ANT Coin tokens to receipt address
    * @dev Modifer to require msg.sender to be minter
    * @param receipt Receipt address to mint the tokens
    * @param _amount The amount to mint the tokens
    */

    function mint(address receipt, uint256 _amount) public onlyMinter {
        require(currentCirculationSupply + _amount > maxCirculationSupply, "ANTCoin: Mint amount exceed Max Circulation Supply");
        _mint(receipt, _amount);
        currentCirculationSupply += _amount;
    }

    /**
    * @notice Burn ANT Coin tokens
    * @param _amount The amount to mint the tokens
    */

    function burn(address account, uint256 _amount) external {
        _burn(account, _amount);
        currentCirculationSupply -= _amount;
    }

    // Function to grant mint role
    function addMinterRole(address _address) external onlyOwner {
        minters[_address] = true;
    }

    // Function to revoke mint role
    function revokeMinterRole(address _address) external onlyOwner {
        minters[_address] = false;
    }
}
