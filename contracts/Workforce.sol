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
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import './interfaces/IPremiumANT.sol';
import './interfaces/IBasicANT.sol';
import './interfaces/IANTCoin.sol';

contract Workforce is Ownable, Pausable, ReentrancyGuard {

    using SafeMath for uint256;

    // stake information for ANT
    struct StakeANT {
        uint256 tokenId; // ant token id
        address owner; // owner of staked ant
        uint256 batchIndex; // batch index of ants
        uint256 antCStakeAmount; // ant coin amount
        uint256 originTimestamp; // staked timestamp
    }

    // Reference to ANTCoin
    IANTCoin public antCoin;
    // Reference to Basic ANT
    IBasicANT public basicANT;
    // Reference to PremiumANT
    IPremiumANT public premiumANT;

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
    // maximum stake period
    uint256 public maxStakePeriod = 3 * 365 days; // 3 years
    // a cycle for reward
    uint256 public cycleStakePeriod = 1 * 365 days; // 1 year
    // total number of staked Basic ANTs
    uint256 public totalBasicANTStaked;
    // total number of staked Premium ANTs
    uint256 public totalPremiumANTStaked;
    // initialize level after unstaking ant
    uint256 public initLevelAfterUnstake = 1;
    // premium or basic ant batch index for getting extra apy
    uint256 public batchIndexForExtraAPY = 0;
    // extra apy for work ants
    uint256 public extraAPY = 500; // 500 => 5.00 %

    // Events
    // basic ant stake event
    event StakeBasicANT(uint256 id, address owner);
    // basic ant unstake event
    event UnStakeBasicANT(uint256 id, address owner);
    // premium ant stake event
    event StakePremiumANT(uint256 id, address owner);
    // premium ant unstake event
    event UnStakePremiumANT(uint256 id, address owner);

    // modifier to check _msgSender has minter role
    modifier onlyMinter() {
        require(minters[_msgSender()], 'Workforce: Caller is not the minter');
        _;
    }

    constructor(IANTCoin _antCoin, IPremiumANT _premiumANT, IBasicANT _basicANT) {
        antCoin = _antCoin;
        premiumANT = _premiumANT;
        basicANT = _basicANT;
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
    * @notice Return Baisc ANT Stake information
    */

    function getBasicANTStakeInfo(uint256 _tokenId) external view returns(StakeANT memory) {
        return basicANTWorkforce[_tokenId];
    }

    /**
    * @notice Return Baisc ANT Stake information
    */

    function pendingRewardOfBasicToken(uint256 _tokenId) public view returns(uint256 pendingAmount) {
        StakeANT memory _stakeANTInfo = basicANTWorkforce[_tokenId];
        uint256 antExperience = basicANT.getANTExperience(_tokenId); // 3000 => 30.00%
        uint256 stakePeriod = block.timestamp.sub(_stakeANTInfo.originTimestamp);
        uint256 _extraAPY = _stakeANTInfo.batchIndex == batchIndexForExtraAPY ? extraAPY : 0; // extra 5% APY for worker ant
        if(stakePeriod > maxStakePeriod) {
            pendingAmount = _stakeANTInfo.antCStakeAmount.mul(antExperience.add(_extraAPY)).mul(maxStakePeriod).div(cycleStakePeriod.mul(100));
        }
        else {
            pendingAmount = _stakeANTInfo.antCStakeAmount.mul(antExperience.add(_extraAPY)).mul(stakePeriod).div(cycleStakePeriod.mul(100));
        }
    }

    /**
    * @notice Return Premium ANT Stake information
    */

    function pendingRewardOfPremiumToken(uint256 _tokenId) public view returns(uint256 pendingAmount) {
        StakeANT memory _stakeANTInfo = premiumANTWorkforce[_tokenId];
        uint256 antExperience = premiumANT.getANTExperience(_tokenId); // 3000 => 30.00%
        uint256 _extraAPY = _stakeANTInfo.batchIndex == batchIndexForExtraAPY ? extraAPY : 0; // extra 5% APY for worker ant
        uint256 stakePeriod = block.timestamp.sub(_stakeANTInfo.originTimestamp);
        if(stakePeriod > maxStakePeriod) {
            pendingAmount = _stakeANTInfo.antCStakeAmount.mul(antExperience.add(_extraAPY)).mul(maxStakePeriod).div(cycleStakePeriod.mul(100));
        }
        else {
            pendingAmount = _stakeANTInfo.antCStakeAmount.mul(antExperience.add(_extraAPY)).mul(stakePeriod).div(cycleStakePeriod.mul(100));
        }
    }

    /**
    * @notice Return Premium ANT Stake information
    */

    function getPremiumANTStakeInfo(uint256 _tokenId) external view returns(StakeANT memory) {
        return premiumANTWorkforce[_tokenId];
    }

    /**
    * @notice Stake PremiumANT into Workforce with ANTCoin
    * @param _tokenId premium ant token id for stake
    * @param _antCAmount ant coin stake amount
    */

    function stakePremiumANT(uint256 _tokenId, uint256 _antCAmount) external {
        require(premiumANT.ownerOf(_tokenId) == _msgSender(), 'Workforce: you are not owner of this token');
        require(antCoin.balanceOf(_msgSender()) >= _antCAmount, 'Workforce: insufficient ant coin balance');
        IPremiumANT.ANTInfo memory _premiumANTInfo = premiumANT.getANTInfo(_tokenId);
        premiumANTWorkforce[_tokenId] = StakeANT({
            tokenId: _tokenId,
            owner: _msgSender(),
            antCStakeAmount: _antCAmount,
            batchIndex: _premiumANTInfo.batchIndex,
            originTimestamp: block.timestamp
        });
        premiumANTStakedNFTs[_msgSender()].push(_tokenId);
        premiumANTStakedNFTsIndicies[_tokenId] = premiumANTStakedNFTs[_msgSender()].length - 1;
        totalPremiumANTStaked += 1;
        premiumANT.transferFrom(_msgSender(), address(this), _tokenId);
        antCoin.transferFrom(_msgSender(), address(this), _antCAmount);
        emit StakePremiumANT(_tokenId, _msgSender());
    }

    /**
    * @notice Stake BasicANT into Workforce with ANTCoin
    * @param _tokenId basic ant token id for stake
    * @param _antCAmount ant coin stake amount
    */

    function stakeBasicANT(uint256 _tokenId, uint256 _antCAmount) external {
        require(basicANT.ownerOf(_tokenId) == _msgSender(), 'Workforce: you are not owner of this token');
        require(antCoin.balanceOf(_msgSender()) >= _antCAmount, 'Workforce: insufficient ant coin balance');
        IBasicANT.ANTInfo memory _basicANTInfo = basicANT.getANTInfo(_tokenId);
        basicANTWorkforce[_tokenId] = StakeANT({
            tokenId: _tokenId,
            owner: _msgSender(),
            antCStakeAmount: _antCAmount,
            batchIndex: _basicANTInfo.batchIndex,
            originTimestamp: block.timestamp
        });
        basicANTStakedNFTs[_msgSender()].push(_tokenId);
        basicANTStakedNFTsIndicies[_tokenId] = basicANTStakedNFTs[_msgSender()].length - 1;
        totalBasicANTStaked += 1;
        basicANT.transferFrom(_msgSender(), address(this), _tokenId);
        antCoin.transferFrom(_msgSender(), address(this), _antCAmount);
        emit StakeBasicANT(_tokenId, _msgSender());
    }

    /**
    * @notice UnStake Premium ANT from Workforce with reward
    * @param _tokenId Premium ant token id for unstake
    */

    function unStakePremiumANT(uint256 _tokenId) external {
        StakeANT memory _stakeANTInfo = premiumANTWorkforce[_tokenId];
        require(_stakeANTInfo.owner == _msgSender(), 'Workforce: you are not owner of this premium ant');
        uint256 rewardAmount = pendingRewardOfPremiumToken(_tokenId);
        premiumANT.downgradeLevel(_tokenId, initLevelAfterUnstake);
        premiumANT.transferFrom(address(this), _msgSender(), _tokenId);
        antCoin.transferFrom(address(this), _msgSender(), _stakeANTInfo.antCStakeAmount);
        antCoin.mint(_msgSender(), rewardAmount);
        emit UnStakePremiumANT(_tokenId, _msgSender());
    }

    /**
    * @notice UnStake Baisc ANT from Workforce with reward
    * @param _tokenId Baisc ant token id for unstake
    */

    function unStakeBasicANT(uint256 _tokenId) external {
        StakeANT memory _stakeANTInfo = basicANTWorkforce[_tokenId];
        require(_stakeANTInfo.owner == _msgSender(), 'Workforce: you are not owner of this basic ant');
        uint256 rewardAmount = pendingRewardOfBasicToken(_tokenId);
        basicANT.downgradeLevel(_tokenId, initLevelAfterUnstake);
        basicANT.transferFrom(address(this), _msgSender(), _tokenId);
        antCoin.transferFrom(address(this), _msgSender(), _stakeANTInfo.antCStakeAmount);
        antCoin.mint(_msgSender(), rewardAmount);
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
    * @notice Set ANTCoin contract address
    * @dev This function can only be called by the owner
    * @param _antCoin ANTCoin contract address
    */

    function setANTCoinContract(IANTCoin _antCoin) external onlyOwner {
        antCoin = _antCoin;
    }

    /**
    * @notice Set premium ant contract address
    * @dev This function can only be called by the owner
    * @param _premiumANT Premium ANT contract address
    */

    function setPremiumANTContract(IPremiumANT _premiumANT) external onlyOwner {
        premiumANT = _premiumANT;
    }

    /**
    * @notice Set basic ant contract address
    * @dev This function can only be called by the owner
    * @param _basicANT Basic ANT contract address
    */

    function setBasicANTContract(IBasicANT _basicANT) external onlyOwner {
        basicANT = _basicANT;
    }

    /**
    * @notice Set max stake period by timestamp
    * @dev This function can only be called by the owner
    * @param _maxStakePeriod max stake period timestamp
    */

    function setMaxStakePeriod(uint256 _maxStakePeriod) external onlyOwner {
        maxStakePeriod = _maxStakePeriod;
    }

    /**
    * @notice Set cycle stake period by timestamp
    * @dev This function can only be called by the owner
    * @param _cycleStakePeriod one reward cycle period timestamp
    */

    function setCycleStakePeriod(uint256 _cycleStakePeriod) external onlyOwner {
        cycleStakePeriod = _cycleStakePeriod;
    }

    /**
    * @notice Set init level after unstake ant
    * @dev This function can only be called by the owner
    * @param _level init level value
    */

    function setInitLevelAfterUnstake(uint256 _level) external onlyOwner {
        initLevelAfterUnstake = _level;
    }

    /**
    * @notice Set extra apy percentage
    * @dev This function can only be called by the owner
    * @param _extraAPY extra apy percentage e.g. 500 = 5.00 %
    */

    function setExtraAPY(uint256 _extraAPY) external onlyOwner {
        extraAPY = _extraAPY;
    }

    /**
    * @notice Set batch index for extra apy
    * @dev This function can only be called by the owner
    * @param _batchIndexForExtraAPY batch index value for extra apy
    */

    function setBatchIndexForExtraAPY(uint256 _batchIndexForExtraAPY) external onlyOwner {
        batchIndexForExtraAPY = _batchIndexForExtraAPY;
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
}