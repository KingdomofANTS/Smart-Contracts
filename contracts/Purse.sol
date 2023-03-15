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

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import 'erc721a/contracts/extensions/ERC721AQueryable.sol';
import './interfaces/IANTShop.sol';
import './interfaces/IRandomizer.sol';
import './interfaces/IPurse.sol';

contract Purse is ERC721AQueryable, IPurse, Ownable, Pausable {

    using SafeMath for uint256;

    // Reference to ANTShop
    IANTShop public antShop;
    // Reference to Randomizer
    IRandomizer public randomizer;
    // array of Purse Category 0 => Common, 1 => UnCommon, 2 => Rare, 3 => Ultra Rare, 4 => Lengendary
    PurseCategory[] public purseCategories;

    // minters
    mapping(address => bool) private minters;
    // tokenId => category id
    mapping(uint256 => uint256) public purseInfo;
    // ANTFood token id of ANTShop
    uint256 public antFoodTokenId = 0;
    // Leveling Potion token id of ANTShop
    uint256 public levelingPotionTokenId = 1;
    // Lottery ticket token id of ANTShop
    uint256 public lotteryTicketTokenId = 2;
    // total number of minted Premium ANT
    uint256 public minted = 0;

    // modifier to check _msgSender has minter role
    modifier onlyMinter() {
        require(minters[_msgSender()], 'Purse: Caller is not the minter');
        _;
    }

    // Mint event
    event Mint(address owner, uint256 quantity);
    // Purse category event
    event PurseCategoryEvent(address owner, uint256 tokenId, string categoryName);

    constructor(IRandomizer _randomizer, IANTShop _antShop) ERC721A("Purse Token", "Purse") {
        randomizer = _randomizer;
        antShop = _antShop;
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
    * @notice Override `_startTokenId` function of ERC721A contract to set start token id to `1`
    */

    function _startTokenId() internal view virtual override returns (uint256) {
        return 1;
    }

    /**
    * @notice Return sum value of arr array
    * @param arr uint256 array to calculate the sum value
    */

    function getSumValue(uint256[] memory arr) internal pure returns (uint256) {
        uint256 total = 0;
        uint256 len = arr.length;
        assembly {
            let p := add(arr, 0x20)
            for {
                let i := 0
            } lt(i, len) {
                i := add(i, 1)
                p := add(p, 0x20)
            } {
                total := add(total, mload(p))
            }
        }
        return total;
    }

    /**
    * @notice Return randomness pruse category id
    * @param _tokenId purse token id to get random category item
    */

    function getPurseCategoryRarity(uint256 _tokenId) internal view returns(uint256 categoryType) {
        require(purseCategories.length > 0, "Purse: purse categories have not set been yet");

        uint256 random = randomizer.randomToken(_tokenId).mod(100);

        uint256 raritySum = 0;
        for (uint256 i = 0; i < purseCategories.length; i++) {
            raritySum += purseCategories[i].rarity;

            if (random < raritySum) {
                categoryType = i;
                break;
            }
        }
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
    * @notice Check address has minterRole
    */

    function getMinterRole(address _address) public view returns(bool) {
        return minters[_address];
    }

    /**
    * @notice Return category name of token Id
    * @param tokenId purse token id to get category data
    */

    function getPurseCateogryInfoOfToken(uint256 tokenId) public view returns(string memory) {
        require(tokenId <= minted, "Purse: token doesn't exist");
        PurseCategory memory _purseCategory = purseCategories[tokenId];
        return _purseCategory.categoryName;
    }

    /**
    * @notice Return purse category information
    * @param _infoId purse info id to get category data
    */

    function getPurseCateogryInfo(uint256 _infoId) public view returns(PurseCategory memory) {
        require(_infoId < purseCategories.length, "Purse: token doesn't exist");
        return purseCategories[_infoId];
    }

    /**
    * @notice Use purse  token to get reward with randomness
    * @param tokenId purse token id to get reward
    */

    function usePurseReward(uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(owner == _msgSender(), "Purse: you are not owner of this token");

        PurseCategory storage purseCategory = purseCategories[purseInfo[tokenId]];
        uint256 random = randomizer.randomToken(tokenId).mod(100);

        if (random < purseCategory.antFoodRarity) {
            antShop.mint(antFoodTokenId, purseCategory.antFoodRewardAmount, owner);
        } else if (random < purseCategory.levelingPotionRarity) {
            antShop.mint(levelingPotionTokenId, purseCategory.levelingPotionRewardAmount, owner);
        } else {
            antShop.mint(lotteryTicketTokenId, purseCategory.lotteryTicketRewardAmount, owner);
        }
        _burn(tokenId); // burn used purse token
        emit PurseCategoryEvent(_msgSender(), tokenId, purseCategory.categoryName);
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
    * @notice Mint the purse tokens
    * @dev This function can only be called by the minter
    * @param recipient recipient wallet address to mint the purse tokens
    * @param quantity purse token qunatity to mint
    */

    function mint(address recipient, uint256 quantity) external override onlyMinter {
        for(uint256 i = 1; i <= quantity; i ++) {
            purseInfo[minted + i] = getPurseCategoryRarity(minted + i);
            purseCategories[purseInfo[minted + i]].minted += 1;
        }
        minted += quantity;
        _mint(recipient, quantity);
        emit Mint(recipient, quantity);
    }

    /**
    * @notice Set Multiple Purse Category struct data
    * @dev This function can only be called by the owner
    * @param _names array of category names
    * @param _rarities array of rarities. total value should be 100
    * @param _antFoodRarities array of rarities. total value should be 100
    * @param _levelingPotionsRarities array of rarities. total value should be 100
    * @param _lotteryTicketRarities array of rarities. total value should be 100
    * @param _antFoodRewardAmounts array of 
    * @param _levelingPotionAmounts array of leveling potions amounts
    * @param _lotteryTicketAmounts array of lottery ticket amounts
    * @param _minted array of minted token amounts
    */

    function addMultiPurseCategories(string[] memory _names, uint256[] memory _rarities, uint256[] memory _antFoodRarities, uint256[] memory _levelingPotionsRarities, uint256[] memory _lotteryTicketRarities, uint256[] memory _antFoodRewardAmounts, uint256[] memory _levelingPotionAmounts, uint256[] memory _lotteryTicketAmounts, uint256[] memory _minted) external onlyOwner {
        require(_names.length == _rarities.length && _rarities.length == _antFoodRarities.length && _antFoodRarities.length == _levelingPotionsRarities.length && _levelingPotionsRarities.length == _lotteryTicketRarities.length && _lotteryTicketRarities.length == _antFoodRewardAmounts.length && _antFoodRewardAmounts.length == _levelingPotionAmounts.length && _levelingPotionAmounts.length == _lotteryTicketAmounts.length, "Purse: invalid purse category data");
        require(getSumValue(_rarities) == 100, "Purse: invalid purse category data");
        delete purseCategories;
        for(uint256 i = 0; i < _rarities.length; i ++) {
            require(_antFoodRarities[i] + _levelingPotionsRarities[i] + _lotteryTicketRarities[i] == 100, "Purse: invalid purse category data");
            purseCategories.push(PurseCategory({
                categoryName: _names[i], rarity: _rarities[i], antFoodRarity: _antFoodRarities[i], 
                levelingPotionRarity: _levelingPotionsRarities[i], lotteryTicketRarity: _lotteryTicketRarities[i], 
                antFoodRewardAmount: _antFoodRewardAmounts[i], levelingPotionRewardAmount: _levelingPotionAmounts[i], 
                lotteryTicketRewardAmount: _lotteryTicketAmounts[i], minted: _minted[i]
            }));
        }
    }

    /**
    * @notice Update Purse Category struct data
    * @dev This function can only be called by the owner
    * @param _names array of category names
    * @param _rarities array of rarities. total value should be 100
    * @param _antFoodRarities array of rarities. total value should be 100
    * @param _levelingPotionsRarities array of rarities. total value should be 100
    * @param _lotteryTicketRarities array of rarities. total value should be 100
    * @param _antFoodRewardAmounts array of 
    * @param _levelingPotionAmounts array of leveling potions amounts
    * @param _lotteryTicketAmounts array of lottery ticket amounts
    */

    function updatePurseCategories(string[] memory _names, uint256[] memory _rarities, uint256[] memory _antFoodRarities, uint256[] memory _levelingPotionsRarities, uint256[] memory _lotteryTicketRarities, uint256[] memory _antFoodRewardAmounts, uint256[] memory _levelingPotionAmounts, uint256[] memory _lotteryTicketAmounts) external onlyOwner {
        require(_names.length == _rarities.length && _rarities.length == _antFoodRarities.length && _antFoodRarities.length == _levelingPotionsRarities.length && _levelingPotionsRarities.length == _lotteryTicketRarities.length && _lotteryTicketRarities.length == _antFoodRewardAmounts.length && _antFoodRewardAmounts.length == _levelingPotionAmounts.length && _levelingPotionAmounts.length == _lotteryTicketAmounts.length, "Purse: invalid purse category data");
        require(_names.length == purseCategories.length, "Purse: length doesn't match with purseCategory");
        require(getSumValue(_rarities) == 100, "Purse: invalid purse category data");
        for(uint256 i = 0; i < _rarities.length; i ++) {
            require(_antFoodRarities[i] + _levelingPotionsRarities[i] + _lotteryTicketRarities[i] == 100, "Purse: invalid purse category data");
            purseCategories[i] = PurseCategory({
                categoryName: _names[i], rarity: _rarities[i], antFoodRarity: _antFoodRarities[i], 
                levelingPotionRarity: _levelingPotionsRarities[i], lotteryTicketRarity: _lotteryTicketRarities[i], 
                antFoodRewardAmount: _antFoodRewardAmounts[i], levelingPotionRewardAmount: _levelingPotionAmounts[i], 
                lotteryTicketRewardAmount: _lotteryTicketAmounts[i], minted: purseCategories[i].minted
            });
        }
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
    * @notice Function to set the lottery ticket token id of ANTShop
    * @dev This function can only be called by the owner
    * @param _lotteryTicketTokenId the lottery ticket token id of ANTShop
    */

    function setLotteryTicketTokenId(uint256 _lotteryTicketTokenId) external onlyOwner {
        lotteryTicketTokenId = _lotteryTicketTokenId;
    }

    /**
    * @notice Set randomizer contract address
    * @dev This function can only be called by the owner
    * @param _randomizer Randomizer contract address
    */

    function setRandomizerContract(IRandomizer _randomizer) external onlyOwner {
        randomizer = _randomizer;
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