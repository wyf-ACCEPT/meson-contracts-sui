// module Meson::MesonStates {
//     use sui::table;
//     use sui::object::{Self, UID};
//     use sui::coin::{Self, Coin};
//     use sui::tx_context::{Self, TxContext};

// }


// From Aptos
// module Meson::MesonStates {
//     use std::signer;
//     use std::table;
//     use std::timestamp;
//     use std::type_info;
//     use aptos_framework::coin;
//     use aptos_framework::coin::{Coin};
//     use Meson::MesonHelpers;

//     const DEPLOYER: address = @Meson;

//     const ENOT_DEPLOYER: u64 = 0;
//     const EUNAUTHORIZED: u64 = 1;
//     const ECOIN_INDEX_USED: u64 = 4;

//     const EPOOL_INDEX_CANNOT_BE_ZERO: u64 = 16;
//     const EPOOL_NOT_REGISTERED: u64 = 18;
//     const EPOOL_ALREADY_REGISTERED: u64 = 19;
//     const EPOOL_NOT_POOL_OWNER: u64 = 20;
//     const EPOOL_ADDR_NOT_AUTHORIZED: u64 = 21;
//     const EPOOL_ADDR_ALREADY_AUTHORIZED: u64 = 22;
//     const EPOOL_ADDR_AUTHORIZED_TO_ANOTHER: u64 = 23;

//     const ESWAP_NOT_EXISTS: u64 = 34;
//     const ESWAP_ALREADY_EXISTS: u64 = 35;
//     const ESWAP_COIN_MISMATCH: u64 = 38;
//     const ESWAP_BONDED_TO_OTHERS: u64 = 44;

//     friend Meson::MesonSwap;
//     friend Meson::MesonPools;
