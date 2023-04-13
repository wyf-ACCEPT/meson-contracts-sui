module Meson::MesonStates {
    /* ---------------------------- Constant variables ---------------------------- */
    use std::type_name::{Self, TypeName};
    use sui::table;
    use sui::transfer;
    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID};
    use sui::clock::{Self, Clock};
    use sui::tx_context::{Self, TxContext};
    use Meson::MesonHelpers;

    const ENOT_ADMIN: u64 = 0;
    const EUNAUTHORIZED: u64 = 1;
    const ECOIN_INDEX_USED: u64 = 4;

    const EPOOL_INDEX_CANNOT_BE_ZERO: u64 = 16;
    const EPOOL_NOT_REGISTERED: u64 = 18;
    const EPOOL_ALREADY_REGISTERED: u64 = 19;
    const EPOOL_NOT_POOL_OWNER: u64 = 20;
    const EPOOL_ADDR_NOT_AUTHORIZED: u64 = 21;
    const EPOOL_ADDR_ALREADY_AUTHORIZED: u64 = 22;
    const EPOOL_ADDR_AUTHORIZED_TO_ANOTHER: u64 = 23;

    const ESWAP_NOT_EXISTS: u64 = 34;
    const ESWAP_ALREADY_EXISTS: u64 = 35;
    const ESWAP_COIN_MISMATCH: u64 = 38;
    const ESWAP_BONDED_TO_OTHERS: u64 = 44;

//     const DEPLOYER: address = @Meson;
    friend Meson::MesonSwap;
    friend Meson::MesonPools;



    /* ---------------------------- Structures ---------------------------- */
    struct GeneralStore has key, store {
        id: UID,
        supported_coins: table::Table<u8, TypeName>,     // coin_index => CoinType
        pool_owners: table::Table<u64, address>,                    // pool_index => owner_addr
        pool_of_authorized_addr: table::Table<address, u64>,        // authorized_addr => pool_index
        posted_swaps: table::Table<vector<u8>, PostedSwap>,         // encoded_swap => posted_swap
        locked_swaps: table::Table<vector<u8>, LockedSwap>,         // swap_id => locked_swap
    }

    // Contains all the related tables (mappings).
    struct StoreForCoin<phantom CoinType> has key, store {
        id: UID,
        in_pool_coins: table::Table<u64, Coin<CoinType>>,           // pool_index => Coins
        pending_coins: table::Table<vector<u8>, Coin<CoinType>>,    // swap_id / [encoded_swap|ff] => Coins
    }

    struct PostedSwap has store {
        pool_index: u64,
        initiator: vector<u8>,
        from_address: address,
    }

    struct LockedSwap has store {
        pool_index: u64,
        until: u64,
        recipient: address,
    }

    struct AdminCap has key { id: UID }



    /* ---------------------------- Admin functions ---------------------------- */
    fun init(ctx: &mut TxContext) {
        let sender_addr = tx_context::sender(ctx);          // Notice: the sender is the `deployer`, different from which in Aptos
        transfer::transfer(AdminCap { id: object::new(ctx) }, sender_addr);     // Transfer the admin capability to the creator

        let store = GeneralStore {
            id: object::new(ctx),
            supported_coins: table::new<u8, TypeName>(ctx),
            pool_owners: table::new<u64, address>(ctx),
            pool_of_authorized_addr: table::new<address, u64>(ctx),
            posted_swaps: table::new<vector<u8>, PostedSwap>(ctx),
            locked_swaps: table::new<vector<u8>, LockedSwap>(ctx),
        };
        table::add(&mut store.pool_owners, 0, sender_addr);             // pool_index = 0 is premium_manager
        transfer::share_object(store);          // Make the store values a share object
    }


    // Named consistently with solidity contracts
    public entry fun transferPremiumManager(
        new_premium_manager: address,
        storeG: &mut GeneralStore,
        ctx: &mut TxContext,
    ) {
        let pool_owners = &mut storeG.pool_owners;
        let old_premium_manager = table::remove(pool_owners, 0);
        assert!(tx_context::sender(ctx) == old_premium_manager, EUNAUTHORIZED);
        table::add(pool_owners, 0, new_premium_manager);
    }


    // Named consistently with solidity contracts
    public entry fun addSupportToken<CoinType>(
        _: &AdminCap,
        coin_index: u8,
        storeG: &mut GeneralStore,
        ctx: &mut TxContext,
    ) {       // `&AdminCap` ensures the sender is the deployer
        let supported_coins = &mut storeG.supported_coins;
        if (table::contains(supported_coins, coin_index)) {
            table::remove(supported_coins, coin_index);
        };
        table::add(supported_coins, coin_index, type_name::get<CoinType>());

        let coin_store = StoreForCoin<CoinType> {
            id: object::new(ctx),
            in_pool_coins: table::new<u64, Coin<CoinType>>(ctx),
            pending_coins: table::new<vector<u8>, Coin<CoinType>>(ctx),
        };
        transfer::share_object(coin_store);
    }



    /* ---------------------------- Utils functions ---------------------------- */
    public(friend) fun coin_type_for_index(coin_index: u8, storeG: &GeneralStore): TypeName {
        *table::borrow(&storeG.supported_coins, coin_index)
    }

    public(friend) fun match_coin_type<CoinType>(coin_index: u8, storeG: &GeneralStore) {
        let type1 = type_name::get<CoinType>();
        let type2 = coin_type_for_index(coin_index, storeG);
        assert!(
            type_name::into_string(type1) == type_name::into_string(type2),
            ESWAP_COIN_MISMATCH
        );
    }

    public(friend) fun owner_of_pool(pool_index: u64, storeG: &GeneralStore): address {
        let pool_owners = &storeG.pool_owners;
        // TODO: do we need to check contains?
        assert!(table::contains(pool_owners, pool_index), EPOOL_NOT_REGISTERED);
        *table::borrow(pool_owners, pool_index)
    }

    public(friend) fun assert_is_premium_manager(addr: address, storeG: &GeneralStore) {
        assert!(addr == owner_of_pool(0, storeG), EUNAUTHORIZED);
    }

    public(friend) fun pool_index_of(authorized_addr: address, storeG: &GeneralStore): u64 {
        let pool_of_authorized_addr = &storeG.pool_of_authorized_addr;
        // TODO: do we need to check contains?
        assert!(table::contains(pool_of_authorized_addr, authorized_addr), EPOOL_ADDR_NOT_AUTHORIZED);
        *table::borrow(pool_of_authorized_addr, authorized_addr)
    }

    public(friend) fun pool_index_if_owner(addr: address, storeG: &GeneralStore): u64 {
        let pool_index = pool_index_of(addr, storeG);
        assert!(addr == owner_of_pool(pool_index, storeG), EPOOL_NOT_POOL_OWNER);
        pool_index
    }

    public(friend) fun register_pool_index(pool_index: u64, owner_addr: address, storeG: &mut GeneralStore) {
        assert!(pool_index != 0, EPOOL_INDEX_CANNOT_BE_ZERO);
        assert!(!table::contains(&storeG.pool_owners, pool_index), EPOOL_ALREADY_REGISTERED);
        assert!(!table::contains(&storeG.pool_of_authorized_addr, owner_addr), EPOOL_ADDR_ALREADY_AUTHORIZED);
        table::add(&mut storeG.pool_owners, pool_index, owner_addr);
        table::add(&mut storeG.pool_of_authorized_addr, owner_addr, pool_index);
    }

    public(friend) fun add_authorized(pool_index: u64, addr: address, storeG: &mut GeneralStore) {
        assert!(pool_index != 0, EPOOL_INDEX_CANNOT_BE_ZERO);
        assert!(!table::contains(&storeG.pool_of_authorized_addr, addr), EPOOL_ADDR_ALREADY_AUTHORIZED);
        table::add(&mut storeG.pool_of_authorized_addr, addr, pool_index);
    }

    public(friend) fun remove_authorized(pool_index: u64, addr: address, storeG: &mut GeneralStore) {
        assert!(pool_index == table::remove(&mut storeG.pool_of_authorized_addr, addr), EPOOL_ADDR_AUTHORIZED_TO_ANOTHER);
    }

    public(friend) fun coins_to_pool<CoinType>(pool_index: u64, coins_to_add: Coin<CoinType>, storeC: &mut StoreForCoin<CoinType>) {
        let in_pool_coins = &mut storeC.in_pool_coins;
        if (table::contains(in_pool_coins, pool_index)) {
            let current_coins = table::borrow_mut(in_pool_coins, pool_index);
            coin::join<CoinType>(current_coins, coins_to_add);
        } else {
            table::add(in_pool_coins, pool_index, coins_to_add);
        };
    }

    public(friend) fun coins_from_pool<CoinType>(
        pool_index: u64, 
        amount: u64, 
        storeC: &mut StoreForCoin<CoinType>, 
        ctx: &mut TxContext
    ): Coin<CoinType> {
        let current_coins = table::borrow_mut(&mut storeC.in_pool_coins, pool_index);
        coin::split<CoinType>(current_coins, amount, ctx)
    }

    public(friend) fun coins_to_pending<CoinType>(key: vector<u8>, coins: Coin<CoinType>, storeC: &mut StoreForCoin<CoinType>) {
        table::add(&mut storeC.pending_coins, key, coins);
    }

    public(friend) fun coins_from_pending<CoinType>(key: vector<u8>, storeC: &mut StoreForCoin<CoinType>): Coin<CoinType> {
        table::remove(&mut storeC.pending_coins, key)
    }



    /* ---------------------------- Swap-related functions ---------------------------- */
    public(friend) fun add_posted_swap(
        encoded_swap: vector<u8>,
        pool_index: u64,
        initiator: vector<u8>,
        from_address: address,
        storeG: &mut GeneralStore,
    ) {
        let posted_swaps = &mut storeG.posted_swaps;
        assert!(!table::contains(posted_swaps, encoded_swap), ESWAP_ALREADY_EXISTS);
        table::add(posted_swaps, encoded_swap, PostedSwap { pool_index, initiator, from_address });
    }

    public(friend) fun bond_posted_swap(
        encoded_swap: vector<u8>,
        pool_index: u64,
        storeG: &mut GeneralStore,
    ) {
        let posted = table::borrow_mut(&mut storeG.posted_swaps, encoded_swap);
        assert!(posted.from_address != @0x0, ESWAP_NOT_EXISTS);
        assert!(posted.pool_index == 0, ESWAP_BONDED_TO_OTHERS);
        posted.pool_index = pool_index;
    }

    public(friend) fun remove_posted_swap(
        encoded_swap: vector<u8>,
        clock_object: &Clock,       // The `Clock` object ID is `0x6`
        storeG: &mut GeneralStore,
    ): (u64, vector<u8>, address)  {
        
        let posted_swaps = &mut storeG.posted_swaps;
        // TODO: do we need to check contains?
        assert!(table::contains(posted_swaps, encoded_swap), ESWAP_NOT_EXISTS);

        let now_seconds = clock::timestamp_ms(clock_object) / 1000;

        if (MesonHelpers::expire_ts_from(encoded_swap) < now_seconds + MesonHelpers::get_MIN_BOND_TIME_PERIOD()) {
            // The swap cannot be posted again and therefore safe to remove it.
            let PostedSwap { pool_index, initiator, from_address } = table::remove(posted_swaps, encoded_swap);
            assert!(from_address != @0x0, ESWAP_NOT_EXISTS);
            (pool_index, initiator, from_address)
        } else {
            // The same swap information can be posted again, so only reset
            // part of the data to prevent double spending.
            let posted = table::borrow_mut(posted_swaps, encoded_swap);
            let pool_index = posted.pool_index;
            let initiator = posted.initiator;
            let from_address = posted.from_address;
            assert!(from_address != @0x0, ESWAP_NOT_EXISTS);

            posted.from_address = @0x0;
            (pool_index, initiator, from_address)
        }
    }

    public(friend) fun add_locked_swap(
        swap_id: vector<u8>,
        pool_index: u64,
        until: u64,
        recipient: address,
        storeG: &mut GeneralStore,
    ) {
        let locked_swaps = &mut storeG.locked_swaps;
        assert!(!table::contains(locked_swaps, swap_id), ESWAP_ALREADY_EXISTS);
        table::add(locked_swaps, swap_id, LockedSwap { pool_index, until, recipient });
    }


    public(friend) fun remove_locked_swap(
        swap_id: vector<u8>,
        clock_object: &Clock,
        storeG: &mut GeneralStore, 
    ): (u64, u64, address)  {
        let locked_swaps = &mut storeG.locked_swaps;

        let locked = table::borrow(locked_swaps, swap_id);
        assert!(locked.until != 0, ESWAP_NOT_EXISTS);
        let pool_index = locked.pool_index;
        let until = locked.until;
        let recipient = locked.recipient;

        let now_seconds = clock::timestamp_ms(clock_object) / 1000;

        if (until > now_seconds) {
            let locked_mut = table::borrow_mut(locked_swaps, swap_id);
            locked_mut.until = 0;
        } else {
            let LockedSwap { pool_index: _, until: _, recipient: _ } = table::remove(locked_swaps, swap_id);
        };

        (pool_index, until, recipient)
    }
}
