const { JsonRpcProvider, devnetConnection, Secp256k1Keypair, RawSigner, TransactionBlock, fromB64 } = require('@mysten/sui.js');
const provider = new JsonRpcProvider(devnetConnection);

(async () => {

    // Load wallet
    const privkey = fromB64('AV7rMzc7ulEmSpuQX9FOr2RLuiX7JaKbzZL+abLTHymn')
    const mnemonic = 'broccoli scene industry labor tortoise adult dinosaur wear fox fresh repeat antenna fury pact hotel sting enough vault like social prize leisure consider horse'
    // const myKeypair = Secp256k1Keypair.deriveKeypair(mnemonic)
    const myKeypair = Secp256k1Keypair.fromSecretKey(privkey.slice(1))
    const mySigner = new RawSigner(myKeypair, provider)
    const myAddress = myKeypair.getPublicKey().toSuiAddress()
    console.log(myAddress)

    // Request from faucet 
    const module_name = '0x2fd0a18a2369adfb8e334999737c03f37d2933f2b7ba30015926ceebdcf266a7::usdc'
    const admin_usdc = '0xabb49e821768020448ca53c1899c17b6b27c6637710b197f91c3bd6a37eaf3f2'
    const user_usdc = [
        '0xd3884b5a9f5284d40f0e998d3b6210cc49e1310a3c825e8d93446dfc911d447c',
        '0x8b9c9462b3ee51997a6454493f23ad0d369fd37d253256d105785c981de35524',
        '0x78e0770229fd88631c409af57166821f508ba4e03d251e1019a25f2b33fc24c9'
    ]
    const txn = new TransactionBlock()

    txn.moveCall({
        target: `${module_name}::transfer_merge_usdc`,
        arguments: [
            txn.makeMoveVec({ objects: user_usdc.map(obj => txn.object(obj)) }),
            txn.pure('0x938cf1367946f00cf48db68597d0153157da13fe90b64fcc42d9ac7984dc70bf'),
            txn.pure(747293),
        ],
    })
    txn.setGasBudget(99999999)
    const result1 = await mySigner.signAndExecuteTransactionBlock({ transactionBlock: txn })
    console.log(result1)
    console.log('========== Transfer succeed! ==========\n')

    // Show the information of all USDC objects that the address owns
    const usdcObjects = (await provider.getAllCoins({
        owner: myAddress
    })).data.filter(x => x.coinType == `${module_name}::USDC`)
    for (var element of usdcObjects) console.log((await provider.getObject({ id: element.coinObjectId })).data)
    console.log('========== USDC Object listed above. ==========\n')

})()