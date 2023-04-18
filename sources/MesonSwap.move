/// @title MesonSwap
/// @notice The class to receive and process swap requests on the initial chain side.
/// Methods in this class will be executed by swap initiators or LPs
/// on the initial chain of swaps.
module Meson::MesonSwap {
    use std::vector;
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};
    use Meson::MesonHelpers;
    use Meson::MesonStates::{Self, GeneralStore, StoreForCoin};

    const EPOOL_INDEX_CANNOT_BE_ZERO: u64 = 16;
    const EPOOL_INDEX_MISMATCH: u64 = 17;

    const ESWAP_EXPIRE_TOO_EARLY: u64 = 42;
    const ESWAP_EXPIRE_TOO_LATE: u64 = 43;
    const ESWAP_CANNOT_CANCEL_BEFORE_EXPIRE: u64 = 45;


    // Named consistently with solidity contracts
    /// `encoded_swap` in format of `version:uint8|amount:uint40|salt:uint80|fee:uint40|expire_ts:uint40|out_chain:uint16|out_coin:uint8|in_chain:uint16|in_coin:uint8`
    ///   version: Version of encoding
    ///   amount: The amount of coins of this swap, always in decimal 6. The amount of a swap is capped at $100k so it can be safely encoded in uint48;
    ///   salt: The salt value of this swap, carrying some information below:
    ///     salt & 0x80000000000000000000 == true => will release to an owa address, otherwise a smart contract;
    ///     salt & 0x40000000000000000000 == true => will waive *service fee*;
    ///     salt & 0x08000000000000000000 == true => use *non-typed signing* (some wallets such as hardware wallets don't support EIP-712v1);
    ///     salt & 0x0000ffffffffffffffff: customized data that can be passed to integrated 3rd-party smart contract;
    ///   fee: The fee given to LPs (liquidity providers). An extra service fee maybe charged afterwards;
    ///   expire_ts: The expiration time of this swap on the initial chain. The LP should `executeSwap` and receive his funds before `expire_ts`;
    ///   out_chain: The target chain of a cross-chain swap (given by the last 2 bytes of SLIP-44);
    ///   out_coin: Also named `out_token` for EVM chains. The index of the coin on the target chain;
    ///   in_chain: The initial chain of a cross-chain swap (given by the last 2 bytes of SLIP-44);
    ///   in_coin: Also named `out_token` for EVM chains. The index of the coin on the initial chain.
    public entry fun postSwap<CoinType>(
        encoded_swap: vector<u8>,
        signature: vector<u8>, // must be signed by `initiator`
        initiator: vector<u8>, // an eth address of (20 bytes), the signer to sign for release
        pool_index: u64,
        coin_from_sender: &mut Coin<CoinType>, // TODO: accept multiple coin objects of the same type?
        clock_object: &Clock,
        storeG: &mut GeneralStore,
        storeC: &mut StoreForCoin<CoinType>,
        ctx: &mut TxContext,
    ) {
        MesonHelpers::is_encoded_valid(encoded_swap);
        MesonHelpers::for_initial_chain(encoded_swap);
        MesonStates::match_coin_type<CoinType>(MesonHelpers::in_coin_index_from(encoded_swap), storeG);
        MesonHelpers::is_eth_addr(initiator);

        let amount = MesonHelpers::amount_from(encoded_swap);
        MesonHelpers::assert_amount_within_max(amount);

        // Assertion about time-lock.
        let now_seconds = clock::timestamp_ms(clock_object) / 1000;
        let delta = MesonHelpers::expire_ts_from(encoded_swap) - now_seconds;
        assert!(delta > MesonHelpers::get_MIN_BOND_TIME_PERIOD(), ESWAP_EXPIRE_TOO_EARLY);
        assert!(delta < MesonHelpers::get_MAX_BOND_TIME_PERIOD(), ESWAP_EXPIRE_TOO_LATE);

        MesonHelpers::check_request_signature(encoded_swap, signature, initiator);

        vector::push_back(&mut encoded_swap, 0xff); // so it cannot be identical to a swap_id
        MesonStates::add_posted_swap(encoded_swap, pool_index, initiator, tx_context::sender(ctx), storeG);
        let coins = coin::split(coin_from_sender, amount, ctx);
        MesonStates::coins_to_pending(encoded_swap, coins, storeC);
    }


    // Named consistently with solidity contracts
    public entry fun bondSwap<CoinType>(
        encoded_swap: vector<u8>,
        pool_index: u64,
        storeG: &mut GeneralStore,
        ctx: &mut TxContext,
    ) {
        let sender_addr = tx_context::sender(ctx);
        assert!(pool_index == MesonStates::pool_index_of(sender_addr, storeG), EPOOL_INDEX_MISMATCH);
        MesonStates::bond_posted_swap(encoded_swap, pool_index, storeG);
    }


    // Named consistently with solidity contracts
    public entry fun cancelSwap<CoinType>(
        encoded_swap: vector<u8>,
        storeG: &mut GeneralStore,
        storeC: &mut StoreForCoin<CoinType>,
        clock_object: &Clock,
    ) {
        let now_seconds = clock::timestamp_ms(clock_object) / 1000;
        let expire_ts = MesonHelpers::expire_ts_from(encoded_swap);
        assert!(expire_ts < now_seconds, ESWAP_CANNOT_CANCEL_BEFORE_EXPIRE);

        vector::push_back(&mut encoded_swap, 0xff); // so it cannot be identical to a swap_id
        let (_, _, from_address) = MesonStates::remove_posted_swap(encoded_swap, clock_object, storeG);
        let coins = MesonStates::coins_from_pending(encoded_swap, storeC);
        transfer::public_transfer(coins, from_address);
    }


    // Named consistently with solidity contracts
    public entry fun executeSwap<CoinType>(
        encoded_swap: vector<u8>,
        signature: vector<u8>,
        recipient: vector<u8>,
        deposit_to_pool: bool,
        storeG: &mut GeneralStore,
        storeC: &mut StoreForCoin<CoinType>,
        clock_object: &Clock,
    ) {
        let posted_swap_key = copy encoded_swap;
        vector::push_back(&mut posted_swap_key, 0xff); // so it cannot be identical to a swap_id

        let (pool_index, initiator, _) = MesonStates::remove_posted_swap(posted_swap_key, clock_object, storeG);
        assert!(pool_index != 0, EPOOL_INDEX_CANNOT_BE_ZERO);

        MesonHelpers::check_release_signature(encoded_swap, recipient, signature, initiator);

        let coins = MesonStates::coins_from_pending(posted_swap_key, storeC);
        if (deposit_to_pool) {
            MesonStates::coins_to_pool(pool_index, coins, storeC);
        } else {
            transfer::public_transfer(coins, MesonStates::owner_of_pool(pool_index, storeG));
        }
    }
}
