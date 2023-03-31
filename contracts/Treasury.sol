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
import '@openzeppelin/contracts/utils/Strings.sol';
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import './interfaces/IUniswapV2Router02.sol';
import './interfaces/IUniswapV2Pair.sol';
import './interfaces/IWETH.sol';

contract Treasury is ERC20, Ownable, Pausable, ReentrancyGuard {

    struct Asset {
        address asset;
        address aggregator;
    }

    IUniswapV2Router02 public immutable uniswapV2Router;

    // assets info array
    Asset[] private _activeAssets;

    // minters
    mapping(address => bool) private minters;

    // buy / sell tax rates
    uint256 public buyTaxFee = 50; // 50 = 5%
    uint256 public sellTaxFee = 50; // 50 = 5% 

    uint256 public constant PRECISION = 1e18;
    uint256 public constant PRECISION_E8 = 1e8;

    address public _wETH;
    address public antCToken;
    address public antCLPToken;
    address public maticUSDAggregater;
    address public teamWallet;
 
    // modifier to check _msgSender has minter role
    modifier onlyMinter() {
        require(minters[_msgSender()], "Treasury: Caller is not the minter");
        _;
    }
    
    constructor(address _quickswapRouter, address antCAddress) ERC20("KOA Treasury Token", "KOATT") {
        IUniswapV2Router02 _uniswapV2Router = IUniswapV2Router02(_quickswapRouter);
        // Set the rest of the contract variables
        uniswapV2Router = _uniswapV2Router;
        _wETH = uniswapV2Router.WETH();
        antCToken = antCAddress;
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
    * @notice Initialize the active assets array to empty
    */

    function _clearActiveAssets() internal {
        delete (_activeAssets);
    }

    /**
    * @notice Function to deposit the ant coin to ant coin treasury pool
    * @param _depositAmount depoist eth amount for ant coin treasury pool
    */

    function _depositToANTCTreasury(uint256 _depositAmount) internal {
        _swapExactETHforTokens(_depositAmount, antCToken);
    }

    /**
    * @notice Swan and distribute ETH to each assets
    * @param _distributeAmount Amount of ETH to distribute
    */

    function _distributeToAssets(uint256 _distributeAmount) internal {
        require(_activeAssets.length > 0, "Treasury: No assets in treasury");
        
        uint256 amountForSwap = _distributeAmount / _activeAssets.length;

        for(uint256 i; i < _activeAssets.length; i++) {
            _swapExactETHforTokens(amountForSwap, _activeAssets[i].asset);
        }
    }

    /**
    * @notice Function to add liquidity
    * @param _depositAmount ETH deposit amount to add liquidity pool
    */

    function _addLiquidity(uint256 _depositAmount) internal {
        uint256[] memory amounts = _swapExactETHforTokens(_depositAmount / 2, antCToken);
        IERC20(antCToken).approve(address(uniswapV2Router), amounts[1]);
            uniswapV2Router.addLiquidityETH{ value: _depositAmount / 2 }(
            antCToken,
            amounts[1],
            0, // Slippage is unavoidable
            0, // Slippage is unavoidable
            address(this),
            block.timestamp + 300
        );
    }

    /**
    * @notice Exchange the Matic to ERC20 token amounts
    * @param _amount Amount of ETH to swap
    * @param _tokenAddress ERC20 token address for exchange
    * @return amounts the token exchanged values
    */

    function _swapExactETHforTokens(uint256 _amount, address _tokenAddress) internal returns(uint256[] memory amounts) {
        address[] memory path = new address[](2);
        path[0] = uniswapV2Router.WETH();
        path[1] = _tokenAddress;
        amounts = uniswapV2Router.swapExactETHForTokens(_amount, path, address(this), block.timestamp + 300);
    }

    /**
    * @notice Return USD value of total treasury helds, 1000 = $1, 2500 = $2.5
    */

    function _calcTotalValueOfTreasury() internal view returns(uint256 _usdAmount) {
        // total ant coin value
        address[] memory _antCMaticPair;
        _antCMaticPair[0] = uniswapV2Router.WETH();
        _antCMaticPair[1] = antCToken;
        uint256[] memory _antCAmountsIn = uniswapV2Router.getAmountsIn(IERC20(antCToken).balanceOf(address(this)), _antCMaticPair);
        (, int256 _maticUSDPrice, , , ) = AggregatorV3Interface(maticUSDAggregater).latestRoundData();
        _usdAmount += _antCAmountsIn[0] * uint256(_maticUSDPrice) * 1000 / (PRECISION * PRECISION_E8);
        // total LP value
        uint256 totalLPTokenAmount = IERC20(antCLPToken).balanceOf(address(this));
        _usdAmount += totalLPTokenAmount * _calcLPTokenUSDPrice() * 1000 / IERC20Metadata(antCLPToken).decimals();
        // total treasury assets value
        for(uint256 i; i < _activeAssets.length; i++) {
            uint256 _assetBalance = IERC20(_activeAssets[i].asset).balanceOf(address(this));
            (, int _asssetUSDPrice, , , ) = AggregatorV3Interface(_activeAssets[i].aggregator).latestRoundData();
            _usdAmount += _assetBalance * uint256(_asssetUSDPrice) * 1000 / (PRECISION * 10**IERC20Metadata(_activeAssets[i].asset).decimals());
        }
    }

    /**
    * @notice Return USD value of one LP token. 4500 = $4.5, 30 = $0.003
    */

    function _calcLPTokenUSDPrice() public view returns(uint256) {
        IUniswapV2Pair pair = IUniswapV2Pair(antCLPToken);
        address tokenA = pair.token0();
        address tokenB = pair.token1();
        (uint256 reservesA, uint256 reservesB, ) = pair.getReserves();

        uint256 lpTotalSupply = pair.totalSupply();
        uint256 lpTokenPrice = 0;

        // Get the USD value of TokenA
        uint256 tokenAPrice = getTokenUSDPriceForLP(tokenA, reservesA);
        // Get the USD value of TokenB
        uint256 tokenBPrice = getTokenUSDPriceForLP(tokenB, reservesB);
        lpTokenPrice = (tokenAPrice * reservesA * 2) / lpTotalSupply;
        lpTokenPrice += (tokenBPrice * reservesB * 2) / lpTotalSupply;
        
        return lpTokenPrice;
    }

    function getTokenUSDPriceForLP(address token, uint256 reserve) internal view returns (uint256) {
        if (token == uniswapV2Router.WETH()) {
            // reserve already in wei
            return reserve * _getMaticUSDPrice(1e8); // 1 ETH = 1e8 USD (chainlink feed)
        } else {
            address[] memory path = new address[](2);
            path[0] = token;
            path[1] = uniswapV2Router.WETH();
            uint256[] memory amounts = uniswapV2Router.getAmountsOut(reserve, path);
           
            // decimals already adjusted in getAmountsOut()
            return amounts[1] * _getMaticUSDPrice(1e18) / 1e18;
        }
    }

    function _getMaticUSDPrice(uint256 _amount) internal view returns(uint256) {
        (, int256 _maticUSDPrice, , , ) = AggregatorV3Interface(maticUSDAggregater).latestRoundData();
        return uint256(_maticUSDPrice) * _amount;
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
    * ███████ ██   ██ ████████
    * ██       ██ ██     ██
    * █████     ███      ██
    * ██       ██ ██     ██
    * ███████ ██   ██    ██
    * This section has external functions
    */

    /**
     * @dev Override decimals to set the default value to 1
     */

    function decimals() public view virtual override returns (uint8) {
        return 8;
    }

    /**
    * @notice Check address has minterRole
    */

    function getMinterRole(address _address) public view returns(bool) {
        return minters[_address];
    }

    /**
     * @notice Returns an array of assets included in the index
     * @return assets An array of assets included in the index with all information about them
     */

    function getActiveAssets() external view returns (Asset[] memory assets) {
        return _activeAssets;
    }

    /**
     * @notice Returns the price of KOATT tokens, 1000 = $1
     */

    function getKOATTPrice() public view returns(uint256) {
        return _calcTotalValueOfTreasury() / totalSupply();
    }

    function buyKOATTETH() external payable {
        require(msg.value >= 0, "Treasury: insufficient funds");
        uint256 taxFee = msg.value * buyTaxFee / 1000;
        uint256 usdPriceOfETH = _getMaticUSDPrice(msg.value - taxFee) * 1000 / (PRECISION_E8 * PRECISION);
        uint256 _mintAmount = usdPriceOfETH / getKOATTPrice();
        _mint(msg.sender, _mintAmount * 10 ** decimals());
        _safeTransferETH(teamWallet, taxFee);
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
    * @notice Function to deposit the funds to each teasury pools
    * @dev This function can only be called by the owner
    */

    function depositFundsETH() external payable onlyOwner {
        require(msg.value > 0, "Treasury: deposit ETH can not be zero");
        IWETH(_wETH).deposit{value: msg.value}();
        uint256 depositAmount = msg.value;
        _depositToANTCTreasury(depositAmount * 20 / 100);
        _addLiquidity(depositAmount * 20 / 100);
        _distributeToAssets(depositAmount * 60 / 100);
    }

    /**
    * @notice Add the asset information with asset address and usd price feed
    * @dev This function can only be called by the owner
    * @param _assetAddresses array of asseet token addresses
    * @param _aggregators array of chainlink oracle price feed addresses
    */

    function addActiveAssets(address[] memory _assetAddresses, address[] memory _aggregators) external onlyOwner {
        require(_assetAddresses.length == _aggregators.length, "Treasury: Invalid assets info");
        for(uint256 i; i < _assetAddresses.length; i++) {
            require(_assetAddresses[i] != address(0x0) && _aggregators[i] != address(0x0), "Treasury: asset address can't be zero address");
            Asset memory asset;
            asset.asset = _assetAddresses[i];
            asset.aggregator = _aggregators[i];
            _activeAssets.push(asset);
        }
    }

    /**
    * @notice Update the asset information with asset address and usd price feed
    * @dev This function can only be called by the owner
    * @param _assetAddresses array of asseet token addresses
    * @param _aggregators array of chainlink oracle price feed addresses
    */

    function updateActiveAssets(address[] memory _assetAddresses, address[] memory _aggregators) external onlyOwner {
        _clearActiveAssets();
        require(_assetAddresses.length == _aggregators.length, "Treasury: Invalid assets info");
        for(uint256 i; i < _assetAddresses.length; i++) {
            require(_assetAddresses[i] != address(0x0) && _aggregators[i] != address(0x0), "Treasury: asset address can't be zero address");
            Asset memory asset;
            asset.asset = _assetAddresses[i];
            asset.aggregator = _aggregators[i];
            _activeAssets.push(asset);
        }
    }

    /**
    * @notice Set a new ant coin token contract address
    * @dev This function can only be called by the owner
    * @param _antCToken ant coin smart contract address
    */

    function setANTCToken(address _antCToken) external onlyOwner {
        require(_antCToken != address(0x0), "Treasury: ant coin address can not be null");
        antCToken = _antCToken;
    }

    /**
    * @notice Set a new ant coin lp token contract address
    * @dev This function can only be called by the owner
    * @param _antCLPToken ant coin lp smart contract address
    */

    function setANTCLPToken(address _antCLPToken) external onlyOwner {
        require(_antCLPToken != address(0x0), "Treasury: ant coin lp token address can not be null");
        antCLPToken = _antCLPToken;
    }

    /**
    * @notice Set Matic/USD Chainlink Oracle Price Feed address
    * @dev This function can only be called by the owner
    * @param _aggregatorAddress the aggregator address to get a real-time usd price of MATIC
    */

    function setMaticUSDAggregatorAddress(address _aggregatorAddress) external onlyOwner {
        maticUSDAggregater = _aggregatorAddress;
    }

    /**
    * @notice Set Buy Tax Fee Rate
    * @dev This function can only be called by the owner
    * @param _buyTaxFee buy tax fee rate
    */

    function setBuyTaxFee(uint256 _buyTaxFee) external onlyOwner {
        buyTaxFee = _buyTaxFee;
    }

    /**
    * @notice Set Sell Tax Fee Rate
    * @dev This function can only be called by the owner
    * @param _sellTaxFee sell tax fee rate
    */

    function setSellTaxFee(uint256 _sellTaxFee) external onlyOwner {
        sellTaxFee = _sellTaxFee;
    }

    /**
    * @notice Set Team Wallet Address to get the tax fee
    * @dev This function can only be called by the owner
    * @param _teamWallet team wallet address
    */

    function setTeamWallet(address _teamWallet) external onlyOwner {
        require(_teamWallet != address(0x0), "Treasury: Team wallet address can not be null");
        teamWallet = _teamWallet;
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

    // To recieve ETH from uniswapV2Router when swaping
    receive() external payable {}
}