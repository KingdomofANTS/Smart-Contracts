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

contract ANTFood is ERC20, Ownable {

    // Mint method. true => Matic mint, false => mint with tokens
    bool public mintMethod = false;
    // Matic mint price
    uint256 public mintPrice = 0.02 ether;
    // Token address for ANTFood mint
    address public tokenAddressForMint;
    // Token amount for ANTFood mint
    uint256 public tokenAmountForMint;

    // minters
    mapping(address => bool) private minters;
    // modifier to check _msgSender has minter role
    modifier onlyMinter() {
        require(minters[_msgSender()], "ANTFood: Caller is not the minter");
        _;
    }

    constructor() ERC20("ANTFood", "ANTF") {
        minters[_msgSender()] = true;
    }

    /**
    * ██ ███    ██ ████████
    * ██ ████   ██    ██
    * ██ ██ ██  ██    ██
    * ██ ██  ██ ██    ██
    * ██ ██   ████    ██
    * This section has internal only functions
    */

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
    * ███████ ██   ██ ████████
    * ██       ██ ██     ██
    * █████     ███      ██
    * ██       ██ ██     ██
    * ███████ ██   ██    ██
    * This section has external functions
    */

    /**
    * @notice Mint ANT Food tokens to receipt address
    * @param receipt Receipt address to mint the tokens
    * @param _amount The amount to mint the tokens
    */

    function mint(address receipt, uint256 _amount) public payable {
        if(mintMethod) {
            require(msg.value >= mintPrice * _amount, "ANTFood: Pay amount is not enough to mint");
        }
        else {
            require(IERC20(tokenAddressForMint).balanceOf(msg.sender) >= tokenAmountForMint * _amount, "ANTFood: pay token amount is not enough to mint");
            require(IERC20(tokenAddressForMint).allowance(msg.sender, address(this)) >= tokenAmountForMint * _amount, "ANTFood: should approve tokens to transfer");
            IERC20(tokenAddressForMint).transferFrom(msg.sender, address(this), tokenAmountForMint * _amount);
        }
        _mint(receipt, _amount);
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
    * @notice Mint ANT Food tokens to receipt address for free if caller is minter
    * @dev Modifer to require msg.sender to be minter
    * @param receipt Receipt address to mint the tokens
    * @param _amount The amount to mint the tokens
    */
    function ownerMint(address receipt, uint256 _amount) public onlyMinter {
        _mint(receipt, _amount);
    }

    /**
    * @notice Burn ANT Food tokens
    * @param _amount The amount to mint the tokens
    */

    function burn(address account, uint256 _amount) external onlyMinter {
        _burn(account, _amount);
    }

    /**
    * @notice Function to grant mint role
    * @param _address address to get minter role
    */
    function addMinterRole(address _address) external onlyOwner {
        minters[_address] = true;
    }

    /**
    * @notice Function to revoke mint role
    * @param _address address to revoke minter role
    */
    function revokeMinterRole(address _address) external onlyOwner {
        minters[_address] = false;
    }

    /**
    * @notice Function to set mint method
    *         true => matic mint, false => tokens mint
    */
    function setMintMethod(bool _mintMethod) external onlyOwner {
        mintMethod = _mintMethod;
    }

    /**
    * @notice Function to set matic mint price for minting
    * @param _mintPrice matic price for minting
    */
    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        require(_mintPrice > 0, "ANTFood: mint price must be greater than zero");
        mintPrice = _mintPrice;
    }

    /**
    * @notice Function to set mint token address
    * @param _tokenAddress token address for minting
    */
    function setTokenAddressForMint(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(0x0), "ANTFood: Token Address couldn't be zero address");
        tokenAddressForMint = _tokenAddress;
    }

    /**
    * @notice Function to set mint token amount
    * @param _tokenAmount token amount for minting
    */
    function setTokenAmountForMint(uint256 _tokenAmount) external onlyOwner {
        require(_tokenAmount > 0, "ANTFood: Token amount must be greater than zero");
        tokenAmountForMint = _tokenAmount;
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
