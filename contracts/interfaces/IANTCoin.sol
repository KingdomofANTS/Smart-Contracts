// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.13;

interface IANTCoin {

  function mint(
    address receipt,
    uint256 _amount
  ) external;

  function burn(
    address receipt,
    uint256 _amount
  ) external;

  function balanceOf(address account) external returns (uint256);
}
