const { JsonRpcProvider, devnetConnection, Secp256k1Keypair, RawSigner, TransactionBlock } = require('@mysten/sui.js');
const provider = new JsonRpcProvider(devnetConnection);

(async () => {

    // Load wallet
    const mnemonic = 'broccoli scene industry labor tortoise adult dinosaur wear fox fresh repeat antenna fury pact hotel sting enough vault like social prize leisure consider horse'
    const myKeypair = Secp256k1Keypair.deriveKeypair(mnemonic)
    const mySigner = new RawSigner(myKeypair, provider)
    const myAddress = myKeypair.getPublicKey().toSuiAddress()       // 0x44acc9799ced77c669c376aae77cee0d64ae31f48db81e4a0e5862a3ad8ae00e
    console.log(myAddress)

    // Request from faucet 
    const module_name = '0xf89dc9da6d442eed24e2524ff3d1f31dc76c0e5d0bcaaa913b3530f6a7e9585::usdc'
    const txnRequestUSDC = new TransactionBlock()

    // Notice: There's no function in sui ts-sdk to upload hex-string param, so we have to convert it into Uint8Array mannully and insert the length of the array at the first location of the array.
    const encoded = new Uint8Array(Buffer.from(
        '01001dcd6500c00000000000f677815c000000000060634dcb98027d0102ca21', 'hex'
    ))
    const encoded_with_length = new Uint8Array(encoded.length + 1)
    encoded_with_length[0] = encoded.length
    encoded_with_length.set(encoded, 1)
    const padding = new Uint8Array(Buffer.from('00', 'hex'))
    const padding_with_length = new Uint8Array(padding.length + 1)
    padding_with_length[0] = padding.length
    padding_with_length.set(padding, 1)

    txnRequestUSDC.moveCall({
        target: `${module_name}::release`,
        arguments: [
            txnRequestUSDC.pure(encoded_with_length),
            txnRequestUSDC.pure(padding_with_length),  // signature
            txnRequestUSDC.pure(padding_with_length),  // initiator
            txnRequestUSDC.object('0x1214501fc9024b5020725c09f2d687ef91cc833394da158014cd9237fa2eab17'),
            // The USDC-faucet object ID (it's a shared object, not belong to anyone)
            txnRequestUSDC.object('0xadb80bec1c09d1653fc103d204984c23ae2fd3f0e39a11620f1c8a25f1cd4a89'),
            // The `encoded` recording object ID (it's also a shared object)
        ],
    })
    txnRequestUSDC.setGasBudget(99999999)
    const result1 = await mySigner.signAndExecuteTransactionBlock({ transactionBlock: txnRequestUSDC })
    console.log(result1)
    console.log('========== Request succeed! ==========\n')

    // Show the information of all USDC objects that the address owns
    const usdcObjects = (await provider.getAllCoins({
        owner: myAddress
    })).data.filter(x => x.coinType == `${module_name}::USDC`)
    for (var element of usdcObjects) console.log((await provider.getObject({ id: element.coinObjectId })).data)
    console.log('========== USDC Object listed above. ==========\n')

    // Transfer
    const usdcObjectUsed = usdcObjects[0].coinObjectId
    const transferNum = 120_000_000
    const destAddress = '0x57646a5dfb78c090bbd45a8f6ce71d1001aee73aa73a4eb52ad2d6b296d78bcb'
    const txnTransferUSDC = new TransactionBlock()
    txnTransferUSDC.moveCall({
        target: `${module_name}::transfer_usdc`,
        arguments: [
            txnTransferUSDC.object(usdcObjectUsed),
            txnTransferUSDC.pure(destAddress),
            txnTransferUSDC.pure(transferNum),
        ]
    })
    const result2 = await mySigner.signAndExecuteTransactionBlock({ transactionBlock: txnTransferUSDC })
    console.log(result2)
    console.log('========== Transfer succeed! ==========\n')

})()