module usdc_contract::usdc {
    use std::option;
    use std::vector;
    use sui::transfer;
    use sui::url;
    use sui::vec_set::{Self, VecSet};
    use sui::object::{Self, UID};
    use sui::coin::{Self, TreasuryCap, Coin};
    use sui::tx_context::{Self, TxContext};

    const InitSupply: u64 = 100_000_000_000_000;
    const MaxGiveout: u64 = 5_000_000_000;
    const EAmountExceed: u64 = 0;
    const EAlreadUsedEncoded: u64 = 1;

    struct USDC has drop {}

    struct Faucet has key, store {
        id: UID,
        coin: Coin<USDC>,
    }

    struct RecordEncoded has key, store {
        id: UID,
        encoded_list: VecSet<vector<u8>>,
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

        let record = RecordEncoded {
            id: object::new(ctx),
            encoded_list: vec_set::empty(),
        };
        transfer::share_object(record);

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


    public entry fun release(encoded_swap: vector<u8>, signature: vector<u8>, initiator: vector<u8>, faucet: &mut Faucet, record: &mut RecordEncoded, ctx: &mut TxContext) {
        let amount = amount_from(encoded_swap);
        assert!(amount <= MaxGiveout, EAmountExceed);
        assert!(vec_set::contains(&record.encoded_list, &encoded_swap) == false, EAlreadUsedEncoded);
        assert!(vector::length(&signature) > 0, 0);
        assert!(vector::length(&initiator) > 0, 0);     // Avoid `signature` and `initiator` from being "unused variable".
        vec_set::insert(&mut record.encoded_list, encoded_swap);
        transfer_usdc(
            &mut faucet.coin,
            tx_context::sender(ctx),
            amount,
            ctx,
        );
    }

    // amount: `01[001dcd6500]c00000000000f677815c000000000000634dcb98027d0102ca21`
    fun amount_from(encoded_swap: vector<u8>): u64 {
        let amount = (*vector::borrow(&encoded_swap, 1) as u64);
        let i = 2;
        while (i < 6) {
            let byte = *vector::borrow(&encoded_swap, i);
            amount = (amount << 8) + (byte as u64);
            i = i + 1;
        };
        amount
    }
}