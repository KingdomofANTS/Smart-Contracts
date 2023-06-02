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
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol';
import './interfaces/IUniswapV2Router02.sol';
import './interfaces/IUniswapV2Pair.sol';
import './interfaces/IWETH.sol';

contract Treasury is ERC20, Ownable, Pausable, ReentrancyGuard {

    using SafeMath for uint256;

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
            if(_activeAssets[i].asset != _wETH){
                _swapExactETHforTokens(amountForSwap, _activeAssets[i].asset);
            }
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
        amounts = uniswapV2Router.swapExactETHForTokens{value: _amount}(_amount, path, address(this), block.timestamp + 300);
    }

    /**
    * @notice Return USD value of total treasury helds, 1000 = $1, 2500 = $2.5
    */

    function _calcTotalValueOfTreasury() internal view returns(uint256 _usdAmount) {
        // total ant coin value
        _usdAmount += _calcANTCUSDValue(IERC20(antCToken).balanceOf(address(this)));
        // total LP value
        uint256 totalLPTokenAmount = IERC20(antCLPToken).balanceOf(address(this));
        _usdAmount += totalLPTokenAmount * _calcLPTokenUSDPrice() * 1000 / IERC20Metadata(antCLPToken).decimals();
        // total treasury assets value
        for(uint256 i; i < _activeAssets.length; i++) {
            uint256 _assetBalance = IERC20(_activeAssets[i].asset).balanceOf(address(this));
            (, int _assetUSDPrice, , , ) = AggregatorV3Interface(_activeAssets[i].aggregator).latestRoundData();
            _usdAmount += _assetBalance * uint256(_assetUSDPrice) * 1000 / (PRECISION * 10**IERC20Metadata(_activeAssets[i].asset).decimals());
        }
    }

    /**
    * @notice Return a usd price of the ant coin amount
    */

    function _calcANTCUSDValue(uint256 _antCAmount) internal view returns(uint256) {
        address[] memory _antCMaticPair;
        _antCMaticPair[0] = uniswapV2Router.WETH();
        _antCMaticPair[1] = antCToken;
        uint256[] memory _antCAmountsIn = uniswapV2Router.getAmountsIn(_antCAmount, _antCMaticPair);
        (, int256 _maticUSDPrice, , , ) = AggregatorV3Interface(maticUSDAggregater).latestRoundData();
        return _antCAmountsIn[0] * uint256(_maticUSDPrice) * 1000 / (PRECISION * PRECISION_E8);
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
        lpTokenPrice = (tokenAPrice * reservesA * 2) * 1000 / lpTotalSupply;
        lpTokenPrice += (tokenBPrice * reservesB * 2) * 1000 / lpTotalSupply;
        
        return lpTokenPrice;
    }

    /**
    * @notice Return a usd price for one LP token
    * @param token the token address of LP pair
    * @param reserve the reserved token amount
    */

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

    /**
    * @notice Return usd price of MATIC
    * @param _amount matic amount to get the usd price
    */

    function _getMaticUSDPrice(uint256 _amount) internal view returns(uint256) {
        (, int256 _maticUSDPrice, , , ) = AggregatorV3Interface(maticUSDAggregater).latestRoundData();
        return uint256(_maticUSDPrice) * _amount;
    }

    /**
    * @notice Return asset usd price regarding the asset info
    * @param _assetId asset id of treasury active assets
    */

    function _getAssetUSDPrice(uint256 _assetId) internal view returns(uint256) {
        Asset memory _asset = _activeAssets[_assetId];
        (, int256 _usdPrice, , , ) = AggregatorV3Interface(_asset.aggregator).latestRoundData();
        return uint256(_usdPrice);
    }

    /**
    * @notice Return the current treasury pools(antc, antlp, assets) value percentage. e.g. 450 = 4.5%, 200 = 2%
    */

    function _getCurrentTreasuryHelds() public view returns(uint256, uint256, uint256) {
        // total ant coin value
        uint256 antCValue = _calcANTCUSDValue(IERC20(antCToken).balanceOf(address(this)));
        // total LP value
        uint256 totalLPTokenAmount = IERC20(antCLPToken).balanceOf(address(this));
        uint256 antLPValue = totalLPTokenAmount * _calcLPTokenUSDPrice() * 1000 / IERC20Metadata(antCLPToken).decimals();
        // total treasury assets value
        uint256 assetsValue;
        for(uint256 i; i < _activeAssets.length; i++) {
            uint256 _assetBalance = IERC20(_activeAssets[i].asset).balanceOf(address(this));
            (, int _assetUSDPrice, , , ) = AggregatorV3Interface(_activeAssets[i].aggregator).latestRoundData();
            assetsValue += _assetBalance * uint256(_assetUSDPrice) * 1000 / (PRECISION * 10**IERC20Metadata(_activeAssets[i].asset).decimals());
        }
        uint256 totalValue = antCValue.add(antLPValue).add(assetsValue);
        return (antCValue.mul(100).div(totalValue), antLPValue.mul(100).div(totalValue), assetsValue.mul(100).div(totalValue));
    }

    function _antCTransfer(uint256 _antCUSDForPay, address _sender) internal {
        // ant coin transfer
        uint256 _maticUSDPrice = _getMaticUSDPrice(1);
        uint256 _maticAmountForANTC = _antCUSDForPay.mul(PRECISION_E8).div(_maticUSDPrice);
        
        address[] memory _antCMaticPair = new address[](2);
        
        _antCMaticPair[0] = uniswapV2Router.WETH();
        _antCMaticPair[1] = antCToken;
        
        uint256[] memory _antCAmountsOut = uniswapV2Router.getAmountsOut(_maticAmountForANTC.mul(PRECISION).div(100), _antCMaticPair);
        IERC20Metadata(antCToken).transfer(_sender, _antCAmountsOut[1]);
    }

    function _antLPTransfer(uint256 antCLPUSDForPay, address sender) internal {
        uint256 lptokenUSDPrice = _calcLPTokenUSDPrice();
        uint256 lpTokenAmountForPay = antCLPUSDForPay.div(lptokenUSDPrice);
        IERC20(antCLPToken).transfer(sender, lpTokenAmountForPay);
    }

    function _assetsTransfer(uint256 assetsUSDForPay, address sender) internal {
        uint256 assetsTotalValue = 0;
        uint256[] memory assetHeldRate = new uint256[](_activeAssets.length);
        for (uint256 i = 0; i < _activeAssets.length; i++) {
            address asset = _activeAssets[i].asset;
            uint256 assetBalance = IERC20(asset).balanceOf(address(this));
            (, int _assetUSDPrice, , , ) = AggregatorV3Interface(_activeAssets[i].aggregator).latestRoundData();
            assetsTotalValue += assetBalance * uint256(_assetUSDPrice) * 1000 / (PRECISION_E8 * 10**IERC20Metadata(asset).decimals());
        }

        for (uint256 i = 0; i < _activeAssets.length; i++) {
            address asset = _activeAssets[i].asset;
            uint256 assetBalance = IERC20(asset).balanceOf(address(this));
            (, int _assetUSDPrice, , , ) = AggregatorV3Interface(_activeAssets[i].aggregator).latestRoundData();
            assetHeldRate[i] = (assetBalance * uint256(_assetUSDPrice) * 1000 / (PRECISION_E8 * 10**IERC20Metadata(asset).decimals())) * 100 / assetsTotalValue;

            uint256 assetPriceForPay = assetHeldRate[i].mul(assetsUSDForPay).mul(PRECISION_E8).mul(10 ** IERC20Metadata(asset).decimals()).div(uint256(_assetUSDPrice).mul(10000));
            IERC20(asset).transfer(sender, assetPriceForPay);
        }
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
        return _calcTotalValueOfTreasury().div(totalSupply());
    }

    /**
    * @notice buy KOATT token by Matic
    */

    function buyKOATTETH() external payable {
        require(msg.value >= 0, "Treasury: insufficient funds");
        uint256 taxFee = msg.value.mul(buyTaxFee).div(1000);
        uint256 usdPriceOfETH = _getMaticUSDPrice(msg.value.sub(taxFee)).mul(1000).div(PRECISION_E8.mul(PRECISION));
        uint256 _mintAmount = usdPriceOfETH.div(getKOATTPrice());
        _mint(msg.sender, _mintAmount.mul(10 ** decimals()));
        _safeTransferETH(teamWallet, taxFee);
    }

    /**
    * @notice Buy KOATT token by ant coins
    * @param _antCAmount ant coin amount to buy KOATT token
    */

    function buyKOATTANTC(uint256 _antCAmount) external {
        require(IERC20(antCToken).balanceOf(_msgSender()) >= _antCAmount, "Treasury: insufficient ANTC balance");
        require(IERC20(antCToken).allowance(_msgSender(), address(this)) >= _antCAmount, "Treasury: insufficient ANTC allowance");
        uint256 taxFee = _antCAmount.mul(buyTaxFee).div(1000);
        uint256 _antCUSDPrice = _calcANTCUSDValue(_antCAmount.sub(taxFee));
        uint256 _mintAmount = _antCUSDPrice.div(getKOATTPrice());
        _mint(msg.sender, _mintAmount.mul(10 ** decimals()));
        IERC20(antCToken).transferFrom(_msgSender(), address(this), _antCAmount);
        IERC20(antCToken).transfer(teamWallet, taxFee);
    }

    /**
    * @notice Buy KOATT token by asset such as btc or usdt
    * @param _assetId asset id number of treasury assets
    * @param _amount asset amount for buying KOATT tokens
    */

    function buyKOATTAsset(uint256 _assetId, uint256 _amount) external {
        require(_assetId < _activeAssets.length, "Treasury: invalid asset id");
        Asset memory _asset = _activeAssets[_assetId];
        require(IERC20Metadata(_asset.asset).balanceOf(_msgSender()) >= _amount, "Treasury: insufficient asset balance");
        require(IERC20Metadata(_asset.asset).allowance(_msgSender(), address(this)) >= _amount, "Treasury: insufficient asset allownace");
        uint256 taxFee = _amount.mul(buyTaxFee).div(1000);
        uint256 _assetUSDPrice = _getAssetUSDPrice(_assetId);
        uint256 KOATTPrice = getKOATTPrice();
        uint256 _mintAmount = _amount.mul(_assetUSDPrice).div(KOATTPrice.mul(1000).mul(10**IERC20Metadata(_asset.asset).decimals()));
        _mint(_msgSender(), _mintAmount.mul(10 ** decimals()));
        IERC20Metadata(_asset.asset).transferFrom(_msgSender(), address(this), _amount);
        IERC20Metadata(_asset.asset).transfer(teamWallet, _amount.sub(taxFee));
    }

    /**
    * @notice Sell KOATT token, seller will receive antcoin, antlp, assets
    * @param _sellAmount sell KOATT token amount
    */

    function sellKOATTAsset(uint256 _sellAmount) external {
        address sender = _msgSender();
        require(balanceOf(sender) >= _sellAmount, "Insufficient KOATT token balance");
        
        (uint256 _antCPercentage, uint256 _antCLPPercentage, uint256 _assetsPercentage) = _getCurrentTreasuryHelds();
        
        uint256 koattPrice = getKOATTPrice();
        uint256 totalUSDPriceForPay = _sellAmount.mul(koattPrice).div(10**decimals());
        uint256 antCUSDForPay = _antCPercentage.mul(totalUSDPriceForPay).div(10000);
        uint256 antCLPUSDForPay = _antCLPPercentage.mul(totalUSDPriceForPay).div(10000);
        uint256 assetsUSDForPay = _assetsPercentage.mul(totalUSDPriceForPay).div(10000);

        // ant coin transfer
        _antCTransfer(antCUSDForPay, sender);

        // ant lp token transfer
        _antLPTransfer(antCLPUSDForPay, sender);

        // assets transfer
        _assetsTransfer(assetsUSDForPay, sender);
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