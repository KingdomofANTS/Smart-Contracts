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

interface IPremiumANTs {

    struct BatchInfo {
        string name;
        string baseURI;
        uint256 minted;
        uint256 maxSupply;
        uint256 mintPrice;
    }

    struct ANTInfo {
        uint256 level;
        uint256 remainPotions;
        uint256 batchIndex;
        uint256 tokenIdOfBatch;
    }

    function transferFrom(address from, address to, uint256 tokenId) external payable;
}