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

import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './interfaces/IANTShop.sol';

contract Marketplace is Pausable, Ownable, ReentrancyGuard {

    // info for minting each antshop items
    struct MintInfo {
        bool mintMethod;
        bool isSet;
        uint256 mintPrice;
        uint256 tokenAmountForMint;
        address tokenAddressForMint;
    }

    mapping(uint256 => MintInfo) public mintInfo;
    
    // reference to the ANTShop
    IANTShop public ANTShop;
    
    constructor(IANTShop _antShop) {
        ANTShop = _antShop;
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
    * @notice Sell ANTShop Tokens
    */

    function buyTokens(uint256 _typeId, uint256 _quantity, address _receipient) external payable whenNotPaused nonReentrant {
        IANTShop.TypeInfo memory typeInfo = ANTShop.getInfoForType(_typeId);
        MintInfo memory _mintInfo = mintInfo[_typeId];
        require(typeInfo.isSet, "Marketplace: type info not set in ANTShop");
        require(_mintInfo.isSet, "Marketplace: mint info not set");
        if(_mintInfo.mintMethod){
            require(msg.value >= _mintInfo.mintPrice * _quantity, "Marketplace: Insufficient Matic");
        }
        else {
            require(_mintInfo.tokenAddressForMint != address(0x0), "Marketplace: token address can't be null");
            require(IERC20(_mintInfo.tokenAddressForMint).balanceOf(_msgSender()) > _mintInfo.tokenAmountForMint * _quantity, "Marketplace: Insufficient Tokens");
            require(IERC20(_mintInfo.tokenAddressForMint).allowance(_msgSender(), address(this)) > _mintInfo.tokenAmountForMint * _quantity, "Marketplace: Insufficient Tokens");
            IERC20(_mintInfo.tokenAddressForMint).transferFrom(_msgSender(), address(this), _mintInfo.tokenAmountForMint * _quantity);
        }
        ANTShop.mint(_typeId, _quantity, _receipient);
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
    * @notice Set mint information like mint price, token address and amount for minting
    * @dev This function can only be called by the owner
    * @param _typeId type id for mint info 0 => ANTFood, 1 => Leveling Potion
    * @param _mintPrice matic for minting
    * @param _tokenAddressForMint token addres for minting
    * @param _tokenAmountForMint token token amount for minting
    */

    function setMintInfo(uint256 _typeId, uint256 _mintPrice, address _tokenAddressForMint, uint256 _tokenAmountForMint) external onlyOwner {
        mintInfo[_typeId].mintPrice = _mintPrice;
        mintInfo[_typeId].tokenAddressForMint = _tokenAddressForMint;
        mintInfo[_typeId].tokenAmountForMint = _tokenAmountForMint;
        mintInfo[_typeId].isSet = true;
    }

    /**
    * @notice Set mint method true => Matic mint, false => custom token mint
    * @dev This function can only be called by the owner
    * @param _typeId type id for mint info 0 => ANTFood, 1 => Leveling Potion
    * @param _mintMethod mint method value
    */

    function setMintMethod(uint256 _typeId, bool _mintMethod) external onlyOwner {
        mintInfo[_typeId].mintMethod = _mintMethod;
    }

    /**
    * @notice Set a new ANTShop smart contract address
    * @dev This function can only be called by the owner
    * @param _antShop Reference to ANTShop
    */

    function setANTShop(IANTShop _antShop) external onlyOwner {
        require(address(_antShop) != address(0x0), "Marketplace: ANTShop address can't be null address");
        ANTShop = _antShop;
    }

    /**
    * enables owner to pause / unpause contract
    */
    function setPaused(bool _paused) external onlyOwner {
        if (_paused) _pause();
        else _unpause();
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