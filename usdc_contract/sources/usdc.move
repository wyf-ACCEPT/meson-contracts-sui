module usdc_contract::usdc {
    use std::option;
    use sui::transfer;
    use sui::url;
    use sui::object::{Self, UID};
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::tx_context::{Self, TxContext};

    const InitSupply: u64 = 100_000_000_000_000;
    const MaxGiveout: u64 = 5_000_000_000;
    const EAmountExceed: u64 = 0;

    struct USDC has drop {}

    struct Faucet has key, store {
        id: UID,
        coin: Coin<USDC>,
    }

    fun init(witness: USDC, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"USDC",
            b"Circle USD",
            b"Circle USD on Sui",
            option::some(url::new_unsafe_from_bytes(b"https://www.circle.com/hubfs/usdcoin-ondark.svg")),
            ctx,
        );

        let faucet_usdc = coin::mint(&mut treasury_cap, InitSupply, ctx);   // $100M supply
        let faucet = Faucet {
            id: object::new(ctx),
            coin: faucet_usdc,
        };
        transfer::share_object(faucet);

        let reserve_usdc = coin::mint(&mut treasury_cap, InitSupply, ctx);
        transfer::transfer(reserve_usdc, tx_context::sender(ctx));

        transfer::freeze_object(metadata);
        transfer::transfer(treasury_cap, tx_context::sender(ctx));
    }

    public entry fun admin_transfer(treasury_cap: TreasuryCap<USDC>, new_admin: address) {
        transfer::transfer(treasury_cap, new_admin);
    }

    public entry fun transfer(coin: &mut Coin<USDC>, recipient: address, amount: u64, ctx: &mut TxContext) {
        let giveout = coin::split(coin, amount, ctx);
        transfer::transfer(giveout, recipient);
    }

    public entry fun get_some(faucet: &mut Faucet, amount: u64, ctx: &mut TxContext) {
        assert!(amount <= MaxGiveout, EAmountExceed);
        transfer(
            &mut faucet.coin,
            tx_context::sender(ctx),
            amount,
            ctx,
        );
    }
}