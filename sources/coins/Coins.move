// These 3 modules are only deployed on testnet/devnet!

module Meson::USDC {
    use std::option;
    use sui::transfer;
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::tx_context::{Self, TxContext};

    const InitSupply: u64 = 100_000_000_000_000;
    const MaxGiveout: u64 = 5_000_000_000;
    const EAmountExceed: u64 = 0;

    struct USDC has drop {}

    fun init(witness: USDC, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"USDC",
            b"Circle USD",
            b"Circle USD on Sui",
            option::none(),
            ctx,
        );

        let reserve_usdc = coin::mint(&mut treasury_cap, InitSupply, ctx);
        transfer::public_transfer(reserve_usdc, tx_context::sender(ctx));

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    public entry fun admin_transfer(treasury_cap: TreasuryCap<USDC>, new_admin: address) {
        transfer::public_transfer(treasury_cap, new_admin);
    }

    public entry fun transfer_usdc(coin: &mut Coin<USDC>, recipient: address, amount: u64, ctx: &mut TxContext) {
        let giveout = coin::split(coin, amount, ctx);
        transfer::public_transfer(giveout, recipient);
    }
}

module Meson::USDT {
    use std::option;
    use sui::transfer;
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::tx_context::{Self, TxContext};

    const InitSupply: u64 = 100_000_000_000_000;
    const MaxGiveout: u64 = 5_000_000_000;
    const EAmountExceed: u64 = 0;

    struct USDT has drop {}

    fun init(witness: USDT, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"USDT",
            b"Tether USD",
            b"Tether USD on Sui",
            option::none(),
            ctx,
        );

        let reserve_usdt = coin::mint(&mut treasury_cap, InitSupply, ctx);
        transfer::public_transfer(reserve_usdt, tx_context::sender(ctx));

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    public entry fun admin_transfer(treasury_cap: TreasuryCap<USDT>, new_admin: address) {
        transfer::public_transfer(treasury_cap, new_admin);
    }

    public entry fun transfer_usdt(coin: &mut Coin<USDT>, recipient: address, amount: u64, ctx: &mut TxContext) {
        let giveout = coin::split(coin, amount, ctx);
        transfer::public_transfer(giveout, recipient);
    }
}

module Meson::UCT {
    use std::option;
    use sui::transfer;
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::tx_context::{Self, TxContext};

    const InitSupply: u64 = 100_000_000_000_000;
    const MaxGiveout: u64 = 5_000_000_000;
    const EAmountExceed: u64 = 0;

    struct UCT has drop {}

    fun init(witness: UCT, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"UCT",
            b"USD Coupon Token",
            b"USD Coupon Token on Sui",
            option::none(),
            ctx,
        );

        let reserve_uct = coin::mint(&mut treasury_cap, InitSupply, ctx);
        transfer::public_transfer(reserve_uct, tx_context::sender(ctx));

        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
    }

    public entry fun admin_transfer(treasury_cap: TreasuryCap<UCT>, new_admin: address) {
        transfer::public_transfer(treasury_cap, new_admin);
    }

    public entry fun transfer_uct(coin: &mut Coin<UCT>, recipient: address, amount: u64, ctx: &mut TxContext) {
        let giveout = coin::split(coin, amount, ctx);
        transfer::public_transfer(giveout, recipient);
    }
}
