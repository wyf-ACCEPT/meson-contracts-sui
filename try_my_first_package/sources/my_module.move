module my_first_package::my_module {
    // Part 1: imports
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table;

    struct Save has store {
        va: u64,
    }

    struct Storage has key, store {
        id: UID,
        st: table::Table<u64, Save>,
    }

    fun init() {

    }

    public fun change() {
        
    }

    // #[test]
    // public fun test_sword_create() {
    //     use sui::tx_context;
    //     use sui::transfer;
    //     use std::debug;

    //     // create a dummy TxContext for testing
    //     let ctx = tx_context::dummy();

    //     // create a sword
    //     let sword = Sword {
    //         id: object::new(&mut ctx),
    //         magic: 42,
    //         strength: 7,
    //     };

    //     // check if accessor functions return correct values
    //     assert!(magic(&sword) == 42 && strength(&sword) == 7, 1);

    //     // let Sword { id: _1, magic: _2, strength: _3 } = sword;
    //     // object::delete(_1);
    //     let dummy_address = @0x111111;
    //     transfer::transfer(sword, dummy_address);

    //     debug::print_stack_trace();
        
    // }

    // #[test]
    // fun test_sword_transactions() {
    //     use sui::test_scenario;

    //     // create test addresses representing users
    //     let admin = @0xBABE;
    //     let initial_owner = @0xCAFE;
    //     let final_owner = @0xFACE;

    //     // first transaction to emulate module initialization
    //     let scenario_val = test_scenario::begin(admin);
    //     let scenario = &mut scenario_val;
    //     {
    //         init(test_scenario::ctx(scenario));
    //     };
    //     // second transaction executed by admin to create the sword
    //     test_scenario::next_tx(scenario, admin);
    //     {
    //         // create the sword and transfer it to the initial owner
    //         sword_create(42, 7, initial_owner, test_scenario::ctx(scenario));
    //     };
    //     // third transaction executed by the initial sword owner
    //     test_scenario::next_tx(scenario, initial_owner);
    //     {
    //         // extract the sword owned by the initial owner
    //         let sword = test_scenario::take_from_sender<Sword>(scenario);
    //         // transfer the sword to the final owner
    //         sword_transfer(sword, final_owner, test_scenario::ctx(scenario))
    //     };
    //     // fourth transaction executed by the final sword owner
    //     test_scenario::next_tx(scenario, final_owner);
    //     {
    //         // extract the sword owned by the final owner
    //         let sword = test_scenario::take_from_sender<Sword>(scenario);
    //         // verify that the sword has expected properties
    //         assert!(magic(&sword) == 42 && strength(&sword) == 7, 1);
    //         // return the sword to the object pool (it cannot be simply "dropped")
    //         test_scenario::return_to_sender(scenario, sword)
    //     };
    //     test_scenario::end(scenario_val);
    // }
}