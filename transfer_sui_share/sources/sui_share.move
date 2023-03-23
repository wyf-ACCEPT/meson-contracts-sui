module transfer_sui_share::main {
    use sui::transfer;
    // use sui::coin;
    // use sui::sui::SUI;
    use sui::object::{Self, UID};
    use sui::tx_context::{TxContext};

    // public entry fun share_sui(c: coin::Coin<SUI>) {
    //     transfer::share_object(c);
    // }

    // public entry fun transfer_sui(c: coin::Coin<SUI>, recipient: address) {
    //     transfer::transfer(c, recipient);
    // }

    struct Something has key {
        id: UID,
        id_2: UID,
        value: u64,
    }

    fun init(ctx: &mut TxContext) {
        transfer::share_object(Something {
            id: object::new(ctx),
            id_2: object::new(ctx),
            value: 0,
        });
    }
}