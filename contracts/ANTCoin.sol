// SPDX-License-Identifier: MIT OR Apache-2.0

/*
W: https://kingdomofants.io 

                ▒▒██            ██▒▒                
                    ██        ██                    
                    ██  ████  ██                    
                    ████▒▒▒▒████                    
████              ██▒▒▒▒▒▒▒▒▒▒▒▒██              ████
██▒▒██            ██▒▒██▒▒▒▒██▒▒██            ██▒▒██
██▒▒██            ██▒▒██▒▒▒▒██▒▒██            ██▒▒██
  ██              ██▒▒▒▒▒▒▒▒▒▒▒▒██              ██  
    ██            ██▒▒██▒▒▒▒██▒▒██            ██    
      ██          ▓▓▒▒▒▒████▒▒▒▒██          ██      
        ██          ████████████          ██        
          ██          ██▒▒▒▒██          ██          
            ██████████▒▒▒▒▒▒▒▒██████████            
                    ██▒▒▒▒▒▒▒▒██                    
          ████████████▒▒▒▒▒▒▒▒████████████          
        ██          ██▒▒▒▒▒▒▒▒██          ██        
      ██            ██▒▒▒▒▒▒▒▒██            ██      
    ██            ████▒▒▒▒▒▒▒▒████            ██    
  ██            ██    ████████    ██            ██  
██▒▒██        ██    ██▒▒▒▒▒▒▒▒██    ██        ██▒▒██
██▒▒██      ██      ██▒▒▒▒▒▒▒▒██      ██      ██▒▒██
████      ██        ██▒▒▒▒▒▒▒▒██        ██      ████
        ██          ██▒▒▒▒▒▒▒▒██          ██        
        ██          ██▒▒▒▒▒▒▒▒██          ██        
        ██          ██▒▒▒▒▒▒▒▒██          ██        
        ██          ██▒▒▒▒▒▒▒▒██          ██        
        ██            ██▒▒▒▒██            ██        
      ████            ██▒▒▒▒██            ████      
    ██▒▒██              ████              ██▒▒██    
    ██████                                ██████    

* Howdy folks! Thanks for glancing over our contracts
* Y'all have a nice day! Enjoy the game
*/

pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import '@openzeppelin/contracts/security/Pausable.sol';
import "./interfaces/IANTCoin.sol";

contract ANTCoin is ERC20, IANTCoin, Ownable, Pausable {

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
    * ███████ ██   ██ ████████
    * ██       ██ ██     ██
    * █████     ███      ██
    * ██       ██ ██     ██
    * ███████ ██   ██    ██
    * This section has external functions
    */

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view override(ERC20, IANTCoin) returns (uint256) {
        return super.balanceOf(account);
    }

    /**
    * @notice Check address has minterRole
    */

    function getMinterRole(address _address) public view returns(bool) {
        return minters[_address];
    }

    /**
    * @notice Mint ANT Coin tokens to receipt address
    * @dev Modifer to require msg.sender to be minter
    * @param receipt Receipt address to mint the tokens
    * @param _amount The amount to mint the tokens
    */

    function mint(address receipt, uint256 _amount) public override whenNotPaused onlyMinter {
        require(currentCirculationSupply + _amount <= maxCirculationSupply, "ANTCoin: Mint amount exceed Max Circulation Supply");
        _mint(receipt, _amount);
        currentCirculationSupply += _amount;
    }

    /**
    * @notice Override `transferFrom` function of ERC20 token
    */

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override(ERC20, IANTCoin) whenNotPaused returns (bool) {
        if(minters[_msgSender()]) {
            _approve(from, to, amount);
        }
        return super.transferFrom(from, to, amount);
    }

    /**
    * @notice Override `transfer` function of ERC20 token
    */

    function transfer(address to, uint256 amount) public virtual override(ERC20, IANTCoin) whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }

    /**
    *   ██████  ██     ██ ███    ██ ███████ ██████
    *  ██    ██ ██     ██ ████   ██ ██      ██   ██
    *  ██    ██ ██  █  ██ ██ ██  ██ █████   ██████
    *  ██    ██ ██ ███ ██ ██  ██ ██ ██      ██   ██
    *   ██████   ███ ███  ██   ████ ███████ ██   ██
    * This section will have all the internals set to onlyOwner
    */

    /**
    * @notice Burn ANT Coin tokens
    * @param _amount The amount to mint the tokens
    */

    function burn(address account, uint256 _amount) external override whenNotPaused onlyMinter {
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

    /**
    * enables owner to pause / unpause contract
    */
    function setPaused(bool _paused) external onlyOwner {
        if (_paused) _pause();
        else _unpause();
    }

    /**
    * @notice Transfer ETH and return the success status.
    * @dev This function only forwards 30,000 gas to the callee.
    * @param to Address for ETH to be send to
    * @param value Amount of ETH to send
    */
    function _safeTransferETH(address to, uint256 value) internal returns (bool) {
        (bool success, ) = to.call{ value: value, gas: 30_000 }(new bytes(0));
        return success;
    }

    /**
    * @notice Allows owner to withdraw ETH funds to an address
    * @dev wraps _user in payable to fix address -> address payable
    * @param to Address for ETH to be send to
    * @param amount Amount of ETH to send
    */
    function withdraw(address payable to, uint256 amount) public onlyOwner {
        require(_safeTransferETH(to, amount));
    }

    /**
    * @notice Allows ownder to withdraw any accident tokens transferred to contract
    * @param _tokenContract Address for the token
    * @param to Address for token to be send to
    * @param amount Amount of token to send
    */
    function withdrawToken(
        address _tokenContract,
        address to,
        uint256 amount
    ) public onlyOwner {
        IERC20 tokenContract = IERC20(_tokenContract);
        tokenContract.transfer(to, amount);
    }
}
