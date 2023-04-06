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

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import './interfaces/IANTCoin.sol';
import './interfaces/IRandomizer.sol';
import './interfaces/IPremiumANT.sol';
import './interfaces/IBasicANT.sol';
import './interfaces/IPurse.sol';

contract Tasks is Ownable, Pausable, ReentrancyGuard {

    using SafeMath for uint256;

    // stake information for ANT
    struct StakeANT {
        uint256 tokenId; // ant token id
        address owner; // owner of staked ant
        uint256 originTimestamp; // staked timestamp
        uint256 rewardIndex; // reward Index 0 = Common, 1 = Uncommon, 2 = Rare, 3 = Ultra rare, 4 => Legendary
    }

    // Reference to randomizer
    IRandomizer public randomizer;
    // Reference to ANTCoin
    IANTCoin public antCoin;
    // Reference to PremiumANT
    IPremiumANT public premiumANT;
    // Reference to BasicANT
    IBasicANT public basicANT;
    // Reference to Purse
    IPurse public purse;
    // Purse reward amount
    uint256[5] public rewardsAmount;
    uint256[2][5] public rewardLevels;

    // minters
    mapping(address => bool) private minters;

    // Workforce for Basic ANT
    mapping(uint256 => StakeANT) public basicANTWorkforce;
    // Workforce for Premium ANT
    mapping(uint256 => StakeANT) public premiumANTWorkforce;
    // staked token id array for Basic ANT
    mapping(address => uint256[]) public basicANTStakedNFTs;
    // staked token id array for Premium ANT
    mapping(address => uint256[]) public premiumANTStakedNFTs;
    // array indices of each token id for Basic ANT
    mapping(uint256 => uint256) public basicANTStakedNFTsIndicies;
    // array indices of each token id for Premium ANT
    mapping(uint256 => uint256) public premiumANTStakedNFTsIndicies;

    uint256 public stakePeriod = 30 days;

    // ant coin stake fee
    uint256 public antCStakeFee = 1000 ether; // 1000 ant coin for stake fee
    uint256 public totalPremiumANTStaked = 0;
    uint256 public totalBasicANTStaked = 0;
    uint256 public minimumLevelForStake = 5;
    
    // modifier to check _msgSender has minter role
    modifier onlyMinter() {
        require(minters[_msgSender()], "Tasks: Caller is not the minter");
        _;
    }

    // Events
    // basic ant stake event
    event StakeBasicANT(uint256 id, address owner);
    // basic ant unstake event
    event UnStakeBasicANT(uint256 id, address owner);
    // premium ant stake event
    event StakePremiumANT(uint256 id, address owner);
    // premium ant unstake event
    event UnStakePremiumANT(uint256 id, address owner);

    constructor(IRandomizer _randomizer, IANTCoin _antCoin, IPremiumANT _premiumANT, IBasicANT _basicANT, IPurse _purse) {
        randomizer = _randomizer;
        antCoin = _antCoin;
        premiumANT = _premiumANT;
        basicANT = _basicANT;
        purse = _purse;
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
    * @notice Check address has minterRole
    */

    function getMinterRole(address _address) public view returns(bool) {
        return minters[_address];
    }

    /**
    * @notice Return the purses rewards amount of each pools
    */
    
    function getRewardsAmount() external view returns(uint256[5] memory) {
        return rewardsAmount;
    }

    /**
    * @notice Return the reward level numbers
    */

    function getRewardLevels() external view returns(uint256[2][5] memory) {
        return rewardLevels;
    }

    /**
    * @notice Return Premium ANT Stake information
    */

    function getPremiumANTStakeInfo(uint256 _tokenId) external view returns(StakeANT memory) {
        return premiumANTWorkforce[_tokenId];
    }

    /**
    * @notice Return Basic ANT Stake information
    */

    function getBasicANTStakeInfo(uint256 _tokenId) external view returns(StakeANT memory) {
        return basicANTWorkforce[_tokenId];
    }

    /**
    * @notice Return Staked Premium ANTs token ids
    * @param _owner user address to get the staked premium ant token ids
    */

    function getPremiumANTStakedByAddress(address _owner) public view returns(uint256[] memory) {
        return premiumANTStakedNFTs[_owner];
    }

    /**
    * @notice Return Staked Basic ANTs token ids
    * @param _owner user address to get the staked basic ant token ids
    */

    function getBasicANTStakedByAddress(address _owner) public view returns(uint256[] memory) {
        return basicANTStakedNFTs[_owner];
    }

    /**
    * @notice Return a random reward index
    * @param _tokenId ant token id for stake
    * @param _type ant type, true => Premium ANT, false => Basic ANT
    */

    function getRewardIndexForNFT(uint256 _tokenId, bool _type) internal view returns(uint256) {
        uint256 _antLevel = 0;
        if(_type) {
            IPremiumANT.ANTInfo memory _premiumANTInfo = premiumANT.getANTInfo(_tokenId);
            _antLevel = _premiumANTInfo.level;    
        }
        else {
            IBasicANT.ANTInfo memory _basicANTInfo = basicANT.getANTInfo(_tokenId);
            _antLevel = _basicANTInfo.level;
        }
        uint256[] memory _availableIndex = new uint256[](5);
        uint256 count = 0;
        for(uint256 i = 0; i < 5; i++) {
            if(_antLevel >= rewardLevels[i][0] && _antLevel <= rewardLevels[i][1]) {
                _availableIndex[count] = i;
                count++;
            }
        }
        uint256 random = randomizer.randomToken(_tokenId) % count;
        return _availableIndex[random];
    }

    /**
    * @notice Stake PremiumANT into Tasks Pool with ANTCoin fee
    * @param _tokenId premium ant token id for stake
    */

    function stakePremiumANT(uint256 _tokenId) external whenNotPaused {
        require(premiumANT.ownerOf(_tokenId) == _msgSender(), 'Workforce: you are not owner of this token');
        require(antCoin.balanceOf(_msgSender()) >= antCStakeFee, 'Workforce: insufficient ant coin balance');
        uint256 _randomRewardIndex = getRewardIndexForNFT(_tokenId, true);
        premiumANTWorkforce[_tokenId] = StakeANT({
            tokenId: _tokenId,
            owner: _msgSender(),
            originTimestamp: block.timestamp,
            rewardIndex: _randomRewardIndex
        });
        premiumANTStakedNFTs[_msgSender()].push(_tokenId);
        premiumANTStakedNFTsIndicies[_tokenId] = premiumANTStakedNFTs[_msgSender()].length - 1;
        totalPremiumANTStaked += 1;
        premiumANT.transferFrom(_msgSender(), address(this), _tokenId);
        antCoin.burn(_msgSender(), antCStakeFee);
        emit StakePremiumANT(_tokenId, _msgSender());
    }

    /**
    * @notice Stake BasicANT into Tasks Pool with ANTCoin fee
    * @param _tokenId basic ant token id for stake
    */

    function stakeBasicANT(uint256 _tokenId) external whenNotPaused {
        require(basicANT.ownerOf(_tokenId) == _msgSender(), 'Tasks: you are not owner of this token');
        require(antCoin.balanceOf(_msgSender()) >= antCStakeFee, 'Tasks: insufficient ant coin balance');
        uint256 _randomRewardIndex = getRewardIndexForNFT(_tokenId, false);
        basicANTWorkforce[_tokenId] = StakeANT({
            tokenId: _tokenId,
            owner: _msgSender(),
            originTimestamp: block.timestamp,
            rewardIndex: _randomRewardIndex
        });
        basicANTStakedNFTs[_msgSender()].push(_tokenId);
        basicANTStakedNFTsIndicies[_tokenId] = basicANTStakedNFTs[_msgSender()].length - 1;
        totalBasicANTStaked += 1;
        basicANT.transferFrom(_msgSender(), address(this), _tokenId);
        antCoin.burn(_msgSender(), antCStakeFee);
        emit StakeBasicANT(_tokenId, _msgSender());
    }

    /**
    * @notice Unstake PremiumANT from Tasks pool and get the reward as purses token
    * @param _tokenId premium ant token id for unStake
    */

    function unStakePremiumANT(uint256 _tokenId) external whenNotPaused {
        StakeANT memory _stakeANTInfo = premiumANTWorkforce[_tokenId];
        uint256 _stakedPeriod = block.timestamp - _stakeANTInfo.originTimestamp;
        require(_stakeANTInfo.owner == _msgSender(), 'Tasks: you are not owner of this premium ant');
        require(_stakedPeriod >= stakePeriod, "Tasks: you can not unstake the ANT early");
        uint256 _rewardAmount = rewardsAmount[_stakeANTInfo.rewardIndex];
        premiumANT.transferFrom(address(this), _msgSender(), _tokenId);
        purse.mint(_msgSender(), _rewardAmount);
        uint256 lastStakedNFTs = premiumANTStakedNFTs[_msgSender()][premiumANTStakedNFTs[_msgSender()].length - 1];
        premiumANTStakedNFTs[_msgSender()][premiumANTStakedNFTsIndicies[_tokenId]] = lastStakedNFTs;
        premiumANTStakedNFTsIndicies[premiumANTStakedNFTs[_msgSender()][premiumANTStakedNFTs[_msgSender()].length - 1]] = premiumANTStakedNFTsIndicies[_tokenId];
        premiumANTStakedNFTs[_msgSender()].pop();
        totalPremiumANTStaked -= 1;
        delete premiumANTStakedNFTsIndicies[_tokenId];
        delete premiumANTWorkforce[_tokenId];
        emit UnStakePremiumANT(_tokenId, _msgSender());
    }

    /**
    * @notice Unstake BasicANT from Tasks pool and get the reward as purses token
    * @param _tokenId basic ant token id for unStake
    */

    function unStakeBasicANT(uint256 _tokenId) external whenNotPaused {
        StakeANT memory _stakeANTInfo = basicANTWorkforce[_tokenId];
        uint256 _stakedPeriod = block.timestamp - _stakeANTInfo.originTimestamp;
        require(_stakeANTInfo.owner == _msgSender(), 'Tasks: you are not owner of this basic ant');
        require(_stakedPeriod >= stakePeriod, "Tasks: you can not unstake the ANT early");
        uint256 _rewardAmount = rewardsAmount[_stakeANTInfo.rewardIndex];
        basicANT.transferFrom(address(this), _msgSender(), _tokenId);
        purse.mint(_msgSender(), _rewardAmount);
        uint256 lastStakedNFTs = basicANTStakedNFTs[_msgSender()][basicANTStakedNFTs[_msgSender()].length - 1];
        basicANTStakedNFTs[_msgSender()][basicANTStakedNFTsIndicies[_tokenId]] = lastStakedNFTs;
        basicANTStakedNFTsIndicies[basicANTStakedNFTs[_msgSender()][basicANTStakedNFTs[_msgSender()].length - 1]] = basicANTStakedNFTsIndicies[_tokenId];
        basicANTStakedNFTs[_msgSender()].pop();
        totalBasicANTStaked -= 1;
        delete basicANTStakedNFTsIndicies[_tokenId];
        delete basicANTWorkforce[_tokenId];
        emit UnStakeBasicANT(_tokenId, _msgSender());
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
    * @notice Set tasks pool stake period timestamp
    * @dev This function can only be called by the owner
    * @param _stakePeriod stake period timestamp
    */

    function setStakePeriod(uint256 _stakePeriod) external onlyOwner {
        stakePeriod = _stakePeriod;
    }

    /**
    * @notice Set purse rewards amouont Common, Uncommon, Rare, Ultra rare, Lengendery
    * @dev This function can only be called by the owner
    * @param _rewardAmount the array of purse reward amount
    */

    function setRewardsAmount(uint256[5] memory _rewardAmount) external onlyOwner {
        rewardsAmount = _rewardAmount;
    }

    /**
    * @notice Set reward level numbers, e.g. Commong: 5-19, Uncommon: 10-25....
    * @dev This function can only be called by the owner
    * @param _rewardLevels the array for reward levels
    */

    function setRewardLevels(uint256[2][5] memory _rewardLevels) external onlyOwner {
        for(uint256 i = 0; i < 5; i++) {
            require(_rewardLevels[i][0] <= _rewardLevels[i][1], "Tasks: index0 should be less than index1 value");
            rewardLevels[i][0] = _rewardLevels[i][0];
            rewardLevels[i][1] = _rewardLevels[i][1];
        } 
    }

    /**
    * @notice Set ant coin stake fee
    * @dev This function can only be called by the owner
    * @param _antCStakeFee ant coin stake fee amount
    */

    function setANTCStakeFee(uint256 _antCStakeFee) external onlyOwner {
        antCStakeFee = _antCStakeFee;
    }

    /**
    * @notice Set minimum level number for stake
    * @dev This function can only be called by the owner
    * @param _minimumLevelForStake minimum level number
    */

    function setMinimumLevelForStake(uint256 _minimumLevelForStake) external onlyOwner {
        minimumLevelForStake = _minimumLevelForStake;
    }

    /**
    * @notice Set a randomizer contract address
    * @dev This function can only be called by the owner
    * @param _randomizer the randomizer address
    */

    function setRandomizerContract(IRandomizer _randomizer) external onlyOwner {
        require(address(_randomizer) != address(0x0), "Tasks: randomizer contract address can't be null");
        randomizer = _randomizer;
    }

    /**
    * @notice Set ant coin contract
    * @dev This function can only be called by the owner
    * @param _antCoin ant coin smart contract address
    */

    function setANTCoinContract(IANTCoin _antCoin) external onlyOwner {
        require(address(_antCoin) != address(0x0), "Tasks: antcoin contract address can't be null");
        antCoin = _antCoin;
    }

    /**
    * @notice Set purse contract
    * @dev This function can only be called by the owner
    * @param _purse purse smart contract address
    */

    function setPurseContract(IPurse _purse) external onlyOwner {
        require(address(_purse) != address(0x0), "Tasks: purse contract address can't be null");
        purse = _purse;
    }

    /**
    * @notice Set Basic ANT contract
    * @dev This function can only be called by the owner
    * @param _basicANT Basic ANT smart contract address
    */

    function setBasicANTContract(IBasicANT _basicANT) external onlyOwner {
        require(address(_basicANT) != address(0x0), "Tasks: BasicANT contract address can't be null");
        basicANT = _basicANT;
    }

    /**
    * @notice Set Premium ANT contract
    * @dev This function can only be called by the owner
    * @param _premiumANT Premium ANT smart contract address
    */

    function setPremiumANTContract(IPremiumANT _premiumANT) external onlyOwner {
        require(address(_premiumANT) != address(0x0), "Tasks: PremiumANT contract address can't be null");
        premiumANT = _premiumANT;
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