module try_upgrade::example {
    use sui::transfer;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};

    struct SwordAdmin has key {
        id: UID,
    }

    struct Sword has key, store {
        id: UID,
        attack: u64,
    }

    fun init(ctx: &mut TxContext) {
        transfer::transfer(
            SwordAdmin { id: object::new(ctx) },
            tx_context::sender(ctx)
        );
        transfer::transfer(
            Sword { id: object::new(ctx), attack: 10 },
            tx_context::sender(ctx)
        );
    }

    public entry fun transfer_sword(obj: Sword, recipient: address) {
        transfer::public_transfer(obj, recipient);
    }
    
    // public entry fun mint_sword(_: &SwordAdmin, attack: u64, recipient)

}