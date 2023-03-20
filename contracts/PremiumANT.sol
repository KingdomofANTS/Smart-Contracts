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
import '@openzeppelin/contracts/utils/Strings.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import 'erc721a/contracts/extensions/ERC721AQueryable.sol';
import './interfaces/IANTShop.sol';
import './interfaces/IPremiumANT.sol';

contract PremiumANT is ERC721AQueryable, IPremiumANT, Ownable, Pausable, ReentrancyGuard {

    using Strings for uint256;
    using SafeMath for uint256;

    // Reference to ANTShop
    IANTShop public ANTShop;

    // minters
    mapping(address => bool) private minters;
    // info of Premium ANTs
    mapping(uint256 => ANTInfo) public premiumANTs;
    // info of Premium Batch
    mapping(uint256 => BatchInfo) public premiumBatches;
    // total number of minted Premium ANT
    uint256 public minted = 0;
    // start level of Premium ANTs
    uint256 public startLevel = 20;
    // max level of Premium ANTs
    uint256 public maxLevel = 40;
    // ANT Foood token id of ANTShop
    uint256 public antFoodTokenId = 0;
    // Leveling Potion token id of ANTShop
    uint256 public levelingPotionTokenId = 1;

    // Upgrade ANT Event
    event UpgradeANT(uint256 tokenId, address owner, uint256 currentLevel);
    // Mint event
    event Mint(address owner, uint256 quantity);

    // modifier to check _msgSender has minter role
    modifier onlyMinter() {
        require(minters[_msgSender()], 'PremiumANT: Caller is not the minter');
        _;
    }

    constructor(IANTShop _antShop) ERC721A('Premium ANT', 'ANTP') {
        ANTShop = _antShop;
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
    * @notice Override `_startTokenId` function of ERC721A contract to set start token id to `1`
    */

    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
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
    * @notice Return total used leveling potions amount of level
    * @param _level level to calculate the total used leveling potions
    */
    function getTotalPotions(uint256 _level) internal pure returns(uint256 totalPotions) {
        totalPotions = (_level.mul(_level.add(1))).div(2);
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
    * @notice Override `isApprovedForAll` function to give the approve permission if caller is minter
    */
    function isApprovedForAll(address owner, address operator) public view virtual override(ERC721A, IERC721A) returns (bool) {
        if(minters[owner] || minters[operator]){
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    /**
    * @notice Override `ownerOf` function to call from other contracts
    */
    function ownerOf(uint256 tokenId) public view override(ERC721A, IERC721A, IPremiumANT) returns (address) {
        return super.ownerOf(tokenId);
    }

    /**
    * @notice Returns an experience percentage number calculated by level.
    * @dev Added 2 digits after the decimal point. e.g. 6500 = 65.00%
    */

    function getANTExperience(uint256 tokenId) external view override returns(uint256) {
        ANTInfo memory ant = premiumANTs[tokenId];
        uint256 totalPotions = getTotalPotions(ant.level);
        uint256 remainderPotions = ant.remainPotions;
        uint256 experience = (totalPotions + remainderPotions) * 10 + (ant.level * 10 + remainderPotions * 10 / ant.level) * 2;
        return experience;
    }

    /**
    * @notice Override `transferFrom` function for IPremiumANTs interface
    */

    function transferFrom(address from, address to, uint256 _tokenId) public payable override(ERC721A, IERC721A, IPremiumANT) {
        super.transferFrom(from, to, _tokenId);
    }

    /**
    * @notice Check address has minterRole
    */

    function getMinterRole(address _address) public view returns(bool) {
        return minters[_address];
    }

    /**
    * @notice Return Batch information including name, mintedNums, baseURI, ...
    * @param batchIndex batch index to get the data
    */

    function getBatchInfo(uint256 batchIndex) public view returns(BatchInfo memory) {
        return premiumBatches[batchIndex];
    }

    /**
    * @notice Return max level of premium ant
    */

    function getMaxLevel() public view override returns(uint256){
        return maxLevel;
    }

    /**
    * @notice Return Premium ANT information including level, mintedNums, batchIndex, ...
    * @param tokenId tokenId to get Premium ANT information
    */

    function getANTInfo(uint256 tokenId) public view override returns(ANTInfo memory) {
        return premiumANTs[tokenId];
    }

    /**
    * @notice Override `tokenURI` function of ERC721A
    * @param tokenId tokenId to get Premium ANT metadata
    */

    function tokenURI(uint256 tokenId) public view override(ERC721A, IERC721A) returns(string memory) {
        require(tokenId <= totalSupply(), 'PremiumANT: Token does not exist.');
        ANTInfo memory _antInfo = premiumANTs[tokenId];
        BatchInfo memory _batchInfo = premiumBatches[_antInfo.batchIndex];
        return string(abi.encodePacked(_batchInfo.baseURI, _antInfo.tokenIdOfBatch.toString(), '.json'));
    }

    /**
    * @notice Mint Premium ANTs
    * @param batchIndex batch index for Premium ANT mint
    * @param recipient recipient wallet address to get a new Premium ANTs
    * @param quantity the number of tokens to mint
    */

    function mint(uint256 batchIndex, address recipient, uint256 quantity) external whenNotPaused {
        BatchInfo storage batchInfo = premiumBatches[batchIndex];
        require(recipient == tx.origin, 'PremiumANT: caller is not minter');
        require(batchInfo.maxSupply > 0, "PremiumANT: batch information has not yet been set");
        require(batchInfo.minted + quantity <= batchInfo.maxSupply, "PremiumANT: mint amount exceeds the maximum supply for this batch");
        require(ANTShop.balanceOf(_msgSender(), antFoodTokenId) >= batchInfo.mintPrice * quantity, "PremiumANT: insufficient balance");

        uint256 i = 0;
        uint256 tokenId = batchInfo.minted + 1;
        uint256 remainingPotions = 0;
        while (i < quantity) {
            premiumANTs[minted + i + 1] = ANTInfo({
                level: startLevel,
                remainPotions: remainingPotions,
                batchIndex: batchIndex,
                tokenIdOfBatch: tokenId
            });
            tokenId++;
            i++;
        }

        premiumBatches[batchIndex].minted += quantity;
        minted += quantity;
        ANTShop.burn(antFoodTokenId, batchInfo.mintPrice * quantity, _msgSender());
        _mint(recipient, quantity);
        emit Mint(recipient, quantity);
    }

    /**
    * @notice Upgrade Premium ANTs with Leveling Potions
    * @param tokenId Premium ant token id for upgrading
    * @param potionAmount Leveling potion amount for upgrading ant
    */

    function upgradePremiumANT(uint256 tokenId, uint256 potionAmount) external whenNotPaused {
        require(ownerOf(tokenId) == _msgSender(), "PremiumANT: you are not owner of this token");
        require(potionAmount > 0, "PremiumANT: leveling potion amount must be greater than zero");
        require(ANTShop.balanceOf(_msgSender(), levelingPotionTokenId) >= potionAmount, "PremiumANT: you don't have enough potions for upgrading");

        ANTInfo storage antInfo = premiumANTs[tokenId];
        require(antInfo.level < maxLevel, "Premium ANT: ant can no longer be upgraded");
        uint256 level = antInfo.level;
        uint256 remainPotions = antInfo.remainPotions + potionAmount;

        while (remainPotions >= level + 1) {
            level++;
            remainPotions -= level;
            if(level >= maxLevel) {
                break;
            }
        }

        antInfo.level = level;
        antInfo.remainPotions = remainPotions;

        if(level >= maxLevel) {
            ANTShop.burn(levelingPotionTokenId, potionAmount.sub(remainPotions), _msgSender());
            antInfo.remainPotions = 0;
        }
        else {
            ANTShop.burn(levelingPotionTokenId, potionAmount, _msgSender());
        }

        emit UpgradeANT(tokenId, _msgSender(), level);
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
    * @notice Function to upgrade premium ant
    * @dev This function can only be called by the minter
    * @param tokenId token id of premium ant for upgrading
    * @param potionAmount potion amount for upgrading
    */

    function ownerANTUpgrade(uint256 tokenId, uint256 potionAmount) external override onlyMinter {
        ANTInfo storage antInfo = premiumANTs[tokenId];
        if(antInfo.level >= maxLevel) {
            return;
        }
        uint256 level = antInfo.level;
        uint256 remainPotions = antInfo.remainPotions + potionAmount;

        while (remainPotions >= level + 1) {
            level++;
            remainPotions -= level;
            if(level >= maxLevel) {
                break;
            }
        }

        antInfo.level = level;
        antInfo.remainPotions = remainPotions;

        if(level >= maxLevel) {
            antInfo.remainPotions = 0;
        }

        emit UpgradeANT(tokenId, _msgSender(), level);
    }

    /**
    * @notice Function to mint Premium ANTs for free if caller is a minter
    * @dev This function can only be called by the owner
    * @param _batchIndex batch index for Premium ANT mint
    * @param recipient recipient wallet address to get a new Premium ANTs
    * @param quantity the number of tokens to mint
    */

    function ownerMint(uint256 _batchIndex, address recipient, uint256 quantity) external onlyMinter {
        BatchInfo storage batchInfo = premiumBatches[_batchIndex];
        require(batchInfo.maxSupply > 0, "PremiumANT: batch information has not yet been set");
        require(batchInfo.minted + quantity <= batchInfo.maxSupply, "PremiumANT: mint amount exceeds the maximum supply for this batch");

        uint256 startMinted = batchInfo.minted;
        uint256 endMinted = startMinted + quantity;

        for (uint256 i = 1; i <= quantity; i++) {
            premiumANTs[minted + i] = ANTInfo({
                level: startLevel,
                remainPotions: 0,
                batchIndex: _batchIndex,
                tokenIdOfBatch: startMinted + i
            });
        }

        batchInfo.minted = endMinted;
        minted = minted + quantity;
        _mint(recipient, quantity);
    }

    /**
    * @notice Function to update Premium ANTs level
    * @dev This function can only be called by the minter
    * @param tokenId Premium ant token id for updating level
    * @param newLevel the number of new level
    */

    function downgradeLevel(uint256 tokenId, uint256 newLevel) external override onlyMinter {
        premiumANTs[tokenId].level = newLevel;
        premiumANTs[tokenId].remainPotions = 0;
    }

    /**
    * @notice Function to set the start level of Premium ANT
    * @dev This function can only be called by the owner
    * @param _startLevel start level value
    */

    function setStartLevel(uint256 _startLevel) external onlyOwner {
        startLevel = _startLevel;
    }

    /**
    * @notice Function to set the max level of Premium ANT
    * @dev This function can only be called by the owner
    * @param _maxLevel max level value
    */

    function setMaxLevel(uint256 _maxLevel) external onlyOwner {
        maxLevel = _maxLevel;
    }

    /**
    * @notice Function to set the ANT Food token id of ANTShop
    * @dev This function can only be called by the owner
    * @param _antFoodTokenId the ANT Food token id of ANTShop
    */

    function setAntFoodTokenId(uint256 _antFoodTokenId) external onlyOwner {
        antFoodTokenId = _antFoodTokenId;
    }

    /**
    * @notice Function to set the leveling potion token id of ANTShop
    * @dev This function can only be called by the owner
    * @param _levelingPotionTokenId the leveling potion token id of ANTShop
    */

    function setLevelingPotionTokenId(uint256 _levelingPotionTokenId) external onlyOwner {
        levelingPotionTokenId = _levelingPotionTokenId;
    }

    /**
    * @notice Function to set the batch info including name, baseURI, maxSupply
    * @dev This function can only be called by the owner
    * @param _batchIndex batch index to set the batch information
    * @param _name Premium Batch name of batch index
    * @param _baseURI Premium Batch baseURI of batch index
    * @param _maxSupply Premium Batch maxSupply of batch index default => 1000
    */

    function setBatchInfo(uint256 _batchIndex, string calldata _name, string calldata _baseURI, uint256 _maxSupply, uint256 _antFoodAmountForMint) external onlyOwner {
        premiumBatches[_batchIndex].name = _name;
        premiumBatches[_batchIndex].baseURI = _baseURI;
        premiumBatches[_batchIndex].maxSupply = _maxSupply;
        premiumBatches[_batchIndex].mintPrice = _antFoodAmountForMint;
    }

    /**
    * enables owner to pause / unpause contract
    */
    function setPaused(bool _paused) external onlyOwner {
        if (_paused) _pause();
        else _unpause();
    }

    /**
    * @notice Function to grant mint role
    * @dev This function can only be called by the owner
    * @param _address address to get minter role
    */
    function addMinterRole(address _address) external onlyOwner {
        minters[_address] = true;
    }

    /**
    * @notice Function to revoke mint role
    * @dev This function can only be called by the owner
    * @param _address address to revoke minter role
    */
    function revokeMinterRole(address _address) external onlyOwner {
        minters[_address] = false;
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