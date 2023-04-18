require('dotenv').config()
const { readFileSync } = require('fs')
const { Wallet, keccak256, assert } = require('ethers')
const { JsonRpcProvider, devnetConnection, Secp256k1Keypair, RawSigner, getTransferSuiTransaction, fromB64, DisplayFieldsBackwardCompatibleResponse, TransactionBlock } = require('@mysten/sui.js');
const { SuiAccountManager } = require('@scallop-dao/sui-kit')


class PublishLogParser {
    constructor() {
        this.publish_log_path = './scripts/publish-output.log'
        this.content = readFileSync(this.publish_log_path, 'utf-8')
    }

    parse() {
        return {
            AdminCap: this.content.match(/AdminCap"\),\n\s+"objectId": String\("(0x[0-9a-fA-F]+)"/)[1],
            GeneralStore: this.content.match(/GeneralStore"\),\n\s+"objectId": String\("(0x[0-9a-fA-F]+)"/)[1],
            PackageId: this.content.match(/"packageId": String\("(0x[0-9a-fA-F]+)"/)[1],
            ObjectUSDC: this.content.match(/Coin<0x[0-9a-fA-F]+::USDC::USDC>"\),\n\s+"objectId": String\("(0x[0-9a-fA-F]+)/)[1],
            ObjectUSDT: this.content.match(/Coin<0x[0-9a-fA-F]+::USDT::USDT>"\),\n\s+"objectId": String\("(0x[0-9a-fA-F]+)/)[1],
            ObjectUCT: this.content.match(/Coin<0x[0-9a-fA-F]+::UCT::UCT>"\),\n\s+"objectId": String\("(0x[0-9a-fA-F]+)/)[1],
            digest: this.content.match(/----- Transaction Digest ----\n(.+)/)[1]
        }
    }
}


class Utils {
    constructor() {
        // base requirements
        this.provider = new JsonRpcProvider(devnetConnection);
        this.request_typehash = '7b521e60f64ab56ff03ddfb26df49be54b20672b7acfffc1adeb256b554ccb25'
        this.release_typehash = 'd23291d9d999318ac3ed13f43ac8003d6fbd69a4b532aeec9ffad516010a208c'
        this.encoder = new TextEncoder()

        // bind functions
        this.sign_request = this.sign_request.bind(this)
        this.sign_release = this.sign_release.bind(this)

        // accounts
        this.alice = this.load_mnemonic(process.env.WALLET_1)
        this.bob = this.load_mnemonic(process.env.WALLET_2)
        this.carol = this.load_mnemonic(process.env.WALLET_3)
        this.alice_address = this.get_address(process.env.WALLET_1)
        this.bob_address = this.get_address(process.env.WALLET_2)
        this.carol_address = this.get_address(process.env.WALLET_3)
        this.initiator_wallet = new Wallet(process.env.INITIATOR_PRIVATE_KEY)
        this.initiator_address = this.initiator_wallet.address.slice(2)
        this.initiator_buffer = Buffer.from(this.initiator_address, 'hex')

        // objects (for SUI only)
        const parser = new PublishLogParser()
        this.object_ids = parser.parse()
        this.usdc_module = `${this.object_ids.PackageId}::USDC`
        this.usdt_module = `${this.object_ids.PackageId}::USDT`
        this.uct_module = `${this.object_ids.PackageId}::UCT`
        this.states = `${this.object_ids.PackageId}::MesonStates`
        this.swap = `${this.object_ids.PackageId}::MesonSwap`
        this.pools = `${this.object_ids.PackageId}::MesonPools`
        this.helpers = `${this.object_ids.PackageId}::MesonHelpers`
    }

    load_mnemonic(string) {
        return new RawSigner(Secp256k1Keypair.deriveKeypair(string), this.provider)
    }

    get_address(string) {
        return Secp256k1Keypair.deriveKeypair(string).getPublicKey().toSuiAddress()
    }

    add_length_to_hexstr(hexstring) {
        const u8ar = new Uint8Array(Buffer.from(hexstring, 'hex'))
        const u8ar_pro = new Uint8Array(u8ar.length + 1)
        u8ar_pro[0] = u8ar.length
        u8ar_pro.set(u8ar, 1)
        return u8ar_pro
    }

    get_expire_ts(delay = 90) {
        return Math.floor(Date.now() / 1e3 + 60 * delay)
    }

    build_encoded(amount, expireTs, outToken, inToken, return_bytes = true,
        salt = 'c00000000000e7552620', fee = '0000000000') {
        let version = '01'
        let amount_string = amount.toString(16).padStart(10, '0')
        let expireTs_string = expireTs.toString(16).padStart(10, '0')
        let outChain = '0310'
        let inChain = '0310'
        let encoded_hexstring = [version, amount_string, salt, fee, expireTs_string, outChain, outToken, inChain, inToken].join('')
        let encoded_bytes = Buffer.from(encoded_hexstring, 'hex')
        assert(amount < 0x0fffffffff, "Amount should less than $68719.476735!")
        assert(encoded_hexstring.length == 64, "Encodedswap length should be 64!")
        if (return_bytes) return encoded_bytes
        else return encoded_hexstring
    }

    get_swapID(encoded_hexstring, initiator, return_bytes = true) {
        let concat = encoded_hexstring + initiator
        assert(concat.length == 104 && typeof (concat) == 'string', "")
        let hash_hexstring = keccak256(Buffer.from(concat, 'hex')).slice(2)
        let hash_bytes = Buffer.from(hash_hexstring, 'hex')
        if (return_bytes) return hash_bytes
        else return hash_hexstring
    }

    buffer_to_hex(buffer) {
        return buffer.reduce((accumulator, currentValue) => {
            return accumulator + currentValue.toString(16).padStart(2, '0')
        }, '')
    }

    hex_timestamp_to_date(timestamp_hex) {
        if (timestamp_hex == '1111111111') return '[Closed]'
        return new Date(parseInt(timestamp_hex, 16) * 1e3)
    }

    sign_request(encoded_hexstring) {
        let content_hash = keccak256(Buffer.from(encoded_hexstring, 'hex')).slice(2)
        let digest_request = Buffer.from(keccak256(
            Buffer.from(this.request_typehash + content_hash, 'hex')
        ).slice(2), 'hex')
        let sig = this.initiator_wallet.signingKey.sign(digest_request)
        // return [Buffer.from(sig.r.slice(2), 'hex'), Buffer.from(sig.s.slice(2), 'hex'), sig.v - 27]
        let [r, s, v] = [Buffer.from(sig.r.slice(2), 'hex'), Buffer.from(sig.s.slice(2), 'hex'), sig.v - 27]
        s[0] += v*128
        return r.toString('hex') + s.toString('hex')
    }

    sign_release(encoded_hexstring, recipient_addr) {
        let content_hash = keccak256(Buffer.from(encoded_hexstring + recipient_addr, 'hex')).slice(2)
        let digest_release = Buffer.from(keccak256(
            Buffer.from(this.release_typehash + content_hash, 'hex')
        ).slice(2), 'hex')
        let sig = this.initiator_wallet.signingKey.sign(digest_release)
        // return [Buffer.from(sig.r.slice(2), 'hex'), Buffer.from(sig.s.slice(2), 'hex'), sig.v - 27]
        let [r, s, v] = [Buffer.from(sig.r.slice(2), 'hex'), Buffer.from(sig.s.slice(2), 'hex'), sig.v - 27]
        s[0] += v*128
        return r.toString('hex') + s.toString('hex')
    }

    async show_account_info() {
        console.log("========================== Account Balance Info ==========================")
        let info = await this.provider.getBalance({ owner: this.alice_address })
        console.log(`Alice ${this.alice_address} balance: ${info.totalBalance / 1e9} SUI`)
        info = await this.provider.getBalance({ owner: this.bob_address })
        console.log(`Bob ${this.bob_address} balance: ${info.totalBalance / 1e9} SUI`)
        info = await this.provider.getBalance({ owner: this.carol_address })
        console.log(`Carol ${this.carol_address} balance: ${info.totalBalance / 1e9} SUI`)
    }

//     async show_boxes(meson_index, is_in_chain) {
//         if (is_in_chain == true) {
//             console.log("Meson App boxes (encodedSwap -> postedValue): ")
//             let box_res = await this.client.getApplicationBoxes(meson_index).do()
//             for (let box of box_res.boxes) {
//                 let encoded_key = box.name
//                 let posted_value = (await this.client.getApplicationBoxByName(meson_index, encoded_key).do()).value
//                 if (posted_value.length == 84)
//                     console.log(
//                         `[EncodedSwap] %s, \n\t-> [PostedValue] (lp, initiator, from_address): \n\t\t\t(%s, \n\t\t\t%s, \n\t\t\t%s)`,
//                         this.buffer_to_hex(encoded_key),
//                         this.buffer_to_hex(posted_value.slice(0, 32)),
//                         this.buffer_to_hex(posted_value.slice(32, 52)),
//                         this.buffer_to_hex(posted_value.slice(52)),
//                     )
//             }
//         } else {
//             console.log("Meson App boxes (swapId -> lockedValue): ")
//             let box_res = await this.client.getApplicationBoxes(meson_index).do()
//             for (let box of box_res.boxes) {
//                 let swapid_key = box.name
//                 let locked_value = (await this.client.getApplicationBoxByName(meson_index, swapid_key).do()).value
//                 if (locked_value.length == 69)
//                     console.log(
//                         `[SwapID] %s, \n\t-> [LockedValue] (lp, until, recipient): \n\t\t\t(%s, \n\t\t\t%s, \n\t\t\t%s)`,
//                         this.buffer_to_hex(swapid_key),
//                         this.buffer_to_hex(locked_value.slice(0, 32)),
//                         this.hex_timestamp_to_date(this.buffer_to_hex(locked_value.slice(32, 37))),
//                         this.buffer_to_hex(locked_value.slice(37)),
//                     )
//             }
//         }
//     }
}



main = async () => {

    const utils = new Utils()
    await utils.show_account_info()

    const lp_deposit_amount = 1_000 * 1_000_000     // $1k to deposit
    const gas_budget = 299999999
    let txn_result, txn

//     const { initiator_buffer, initiator_address, listToUint8ArrayList, submit_transaction, submit_transaction_group, sp_func, get_swapID, sign_release, show_boxes } = utils
    const { provider, alice, bob, carol, alice_address, bob_address, carol_address, build_encoded, get_expire_ts, add_length_to_hexstr, sign_request, sign_release } = utils
    console.log("LP's coin object:")
    console.log(`USDC: ${utils.object_ids.ObjectUSDC}`)
    console.log(`USDT: ${utils.object_ids.ObjectUSDT}\n`)




    // --------------------------------------------------------------------------------------------
    console.log("\n# 1 Create App #")

    console.log("================== 1.1 Create Meson App ==================")
    console.log(`This step is finished in sui console.\n`)


    console.log("\n================== 1.2 Add USDC and USDT (Only called once) ==================")

    // const txnAddUSDC = new TransactionBlock()
    // txnAddUSDC.moveCall({
    //     target: `${utils.states}::addSupportToken`,
    //     typeArguments: [
    //         `${utils.usdc_module}::USDC`,
    //     ],
    //     arguments: [
    //         txnAddUSDC.pure(utils.object_ids.AdminCap),
    //         txnAddUSDC.pure(1),
    //         txnAddUSDC.pure(utils.object_ids.GeneralStore),
    //     ]
    // })
    // txnAddUSDC.setGasBudget(gas_budget)
    // txn_result = await alice.signAndExecuteTransactionBlock({ transactionBlock: txnAddUSDC })
    // console.log(txn_result)
    // console.log('========== Meson add USDC success! ==========')

    // Use sui explorer to find the StoreForCoin object ID!
    const StoreUSDC = '0x4ed2abc268c54be3112ea2028d4e3ec689438176be9e03e0339c82dc0ead42c1'

    
    // const txnAddUSDT = new TransactionBlock()
    // txnAddUSDT.moveCall({
    //     target: `${utils.states}::addSupportToken`,
    //     typeArguments: [
    //         `${utils.usdt_module}::USDT`,
    //     ],
    //     arguments: [
    //         txnAddUSDT.pure(utils.object_ids.AdminCap),
    //         txnAddUSDT.pure(2),
    //         txnAddUSDT.pure(utils.object_ids.GeneralStore),
    //     ]
    // })
    // txnAddUSDT.setGasBudget(gas_budget)
    // txn_result = await alice.signAndExecuteTransactionBlock({ transactionBlock: txnAddUSDT })
    // console.log(txn_result)
    // console.log('========== Meson add USDT success! ==========\n')

    // Use sui explorer to find the StoreForCoin object ID!
    const StoreUSDT = '0xb1d2bd988b063a2ca2c764550f593427f18b9dab85991dc3d23e1d4446333f85'


    console.log("\n================== 1.3 Transfer USDC and USDT to LP and User ==================")
    console.log(`This step is finished in sui console.\n`)




    // --------------------------------------------------------------------------------------------
    console.log("\n# 2 LP deposit #")


    console.log("\n================== 2.1 Find LP objects (USDC, USDT) ==================")
    let usdcObjects = (await provider.getAllCoins({
        owner: bob_address
    })).data.filter(x => x.coinType == `${utils.usdc_module}::USDC`)
    for (var element of usdcObjects) console.log((await provider.getObject({ id: element.coinObjectId })).data)
    console.log('========== LP USDC Object listed above. ==========\n')
    let usdtObjects = (await provider.getAllCoins({
        owner: bob_address
    })).data.filter(x => x.coinType == `${utils.usdt_module}::USDT`)
    for (var element of usdtObjects) console.log((await provider.getObject({ id: element.coinObjectId })).data)
    console.log('========== LP USDT Object listed above. ==========\n')

    let lp_usdc_object = usdcObjects[0].coinObjectId
    let lp_usdt_object = usdtObjects[0].coinObjectId


    console.log("\n================== 2.2 LP deposit (and register) to Meson ==================")
    // txn = new TransactionBlock()
    // txn.moveCall({
    //     target: `${utils.pools}::depositAndRegister`,
    //     typeArguments: [
    //         `${utils.usdc_module}::USDC`,
    //     ],
    //     arguments: [
    //         txn.pure(lp_deposit_amount),
    //         txn.pure(155),          // A random pool index
    //         txn.object(lp_usdc_object),
    //         txn.object(utils.object_ids.GeneralStore),
    //         txn.object(StoreUSDC),
    //     ],
    // })
    // txn.setGasBudget(gas_budget)
    // txn_result = await bob.signAndExecuteTransactionBlock({ transactionBlock: txn })
    // console.log(txn_result)
    console.log(`LP(Bob) registers a new pool and deposits ${lp_deposit_amount / 1e6} USDC into Meson Pools!\n`)

    // txn = new TransactionBlock()
    // txn.moveCall({
    //     target: `${utils.pools}::deposit`,
    //     typeArguments: [
    //         `${utils.usdt_module}::USDT`,
    //     ],
    //     arguments: [
    //         txn.pure(lp_deposit_amount),
    //         txn.pure(155),
    //         txn.object(lp_usdt_object),
    //         txn.object(utils.object_ids.GeneralStore),
    //         txn.object(StoreUSDT),
    //     ],
    // })
    // txn.setGasBudget(gas_budget)
    // txn_result = await bob.signAndExecuteTransactionBlock({ transactionBlock: txn })
    // console.log(txn_result)
    console.log(`LP(Bob) deposits ${lp_deposit_amount / 1e6} USDT into Meson Pools!\n`)



    // --------------------------------------------------------------------------------------------
    console.log("\n# 3 Swap! #")


    console.log("================== 3.0 Init, Find User objects (USDC, USDT) ==================")

    const amount_swap = 17 * 1_000_000
    const encoded_hexstring = build_encoded(amount_swap, get_expire_ts(), '02', '01', false)
    console.log(`EncodedSwap: ${encoded_hexstring}`)
    
    usdcObjects = (await provider.getAllCoins({
        owner: carol_address
    })).data.filter(x => x.coinType == `${utils.usdc_module}::USDC`)
    for (var element of usdcObjects) console.log((await provider.getObject({ id: element.coinObjectId })).data)
    console.log('========== User USDC Object listed above. ==========\n')
    usdtObjects = (await provider.getAllCoins({
        owner: carol_address
    })).data.filter(x => x.coinType == `${utils.usdt_module}::USDT`)
    for (var element of usdtObjects) console.log((await provider.getObject({ id: element.coinObjectId })).data)
    console.log('========== User USDT Object listed above. ==========\n')

    let user_usdc_object = usdcObjects[0].coinObjectId
    let user_usdt_object = usdtObjects[0].coinObjectId

    const recipient_20 = utils.initiator_address.toLowerCase()
    const recipient_32 = '0x' + recipient_20 + '000000000000000000000000'

    console.log("\n\n================== 3.1 PostSwap & BondSwap ==================")

    let sig_req = sign_request(encoded_hexstring)
    console.log("Complete request signing!")

    txn = new TransactionBlock()
    txn.moveCall({
        target: `${utils.swap}::postSwap`,
        typeArguments: [
            `${utils.usdc_module}::USDC`,
        ],
        arguments: [
            txn.pure(add_length_to_hexstr(encoded_hexstring)),
            txn.pure(add_length_to_hexstr(sig_req)),
            txn.pure(add_length_to_hexstr(utils.initiator_address)),
            txn.pure(155),
            txn.object(user_usdc_object),
            txn.object('0x6'),
            txn.object(utils.object_ids.GeneralStore),
            txn.object(StoreUSDC),
        ],
    })
    txn.setGasBudget(gas_budget)
    txn_result = await carol.signAndExecuteTransactionBlock({ transactionBlock: txn })
    console.log(txn_result)  // For the mutable Coin Object, signer needs to be User(Carol).
    console.log("Step 1.1. User(Carol) signed posted swap successfully!\n")


    // txn = new TransactionBlock()
    // txn.moveCall({
    //     target: `${utils.swap}::bondSwap`,
    //     typeArguments: [
    //         `${utils.usdc_module}::USDC`,
    //     ],
    //     arguments: [
    //         txn.pure(add_length_to_hexstr(encoded_hexstring)),
    //         txn.pure(155),
    //         txn.object(utils.object_ids.GeneralStore),
    //     ],
    // })
    // txn.setGasBudget(gas_budget)
    // txn_result = await bob.signAndExecuteTransactionBlock({ transactionBlock: txn })
    // console.log(txn_result)
    // console.log("Step 1.2. LP(Bob) Bonded swap success!\n")      // Execute failed?


    console.log("\n\n================== 3.2 Lock ==================")

    txn = new TransactionBlock()
    txn.moveCall({
        target: `${utils.pools}::lock`,
        typeArguments: [
            `${utils.usdt_module}::USDT`,
        ],
        arguments: [
            txn.pure(add_length_to_hexstr(encoded_hexstring)),
            txn.pure(add_length_to_hexstr(sig_req)),
            txn.pure(add_length_to_hexstr(utils.initiator_address)),
            txn.pure(recipient_32),
            txn.object(utils.object_ids.GeneralStore),
            txn.object(StoreUSDT),
            txn.object('0x6'),
        ],
    })
    txn.setGasBudget(gas_budget)
    txn_result = await bob.signAndExecuteTransactionBlock({ transactionBlock: txn })
    console.log(txn_result)
    console.log("Step 2. LP(Bob) lock assets successfully!\n")


    console.log("\n\n================== 3.3 Release ==================")

    let sig_rel = sign_release(encoded_hexstring, recipient_20)
    console.log("Complete release signing!")

    txn = new TransactionBlock()
    txn.moveCall({
        target: `${utils.pools}::release`,
        typeArguments: [
            `${utils.usdt_module}::USDT`,
        ],
        arguments: [
            txn.pure(add_length_to_hexstr(encoded_hexstring)),
            txn.pure(add_length_to_hexstr(sig_rel)),
            txn.pure(add_length_to_hexstr(utils.initiator_address)),
            txn.object(utils.object_ids.GeneralStore),
            txn.object(StoreUSDT),
            txn.object('0x6'),
        ],
    })
    txn.setGasBudget(gas_budget)
    txn_result = await alice.signAndExecuteTransactionBlock({ transactionBlock: txn })
    console.log(txn_result) // For fee waived swap, signer needs to be the premium Manager(Alice).
    console.log("Step 3. User(Carol) release assets successfully, called by Manager(Alice)!\n")


    console.log("\n\n================== 3.4 ExecuteSwap ==================")

    txn = new TransactionBlock()
    txn.moveCall({
        target: `${utils.swap}::executeSwap`,
        typeArguments: [
            `${utils.usdc_module}::USDC`,
        ],
        arguments: [
            txn.pure(add_length_to_hexstr(encoded_hexstring)),
            txn.pure(add_length_to_hexstr(sig_rel)),
            txn.pure(add_length_to_hexstr(recipient_20)),
            txn.pure(true),
            txn.object(utils.object_ids.GeneralStore),
            txn.object(StoreUSDC),
            txn.object('0x6'),
        ],
    })
    txn.setGasBudget(gas_budget)
    txn_result = await bob.signAndExecuteTransactionBlock({ transactionBlock: txn })
    console.log(txn_result)
    console.log("Step 4. LP(Bob) executeSwap success!\n")

}

main()