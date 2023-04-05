const { JsonRpcProvider, devnetConnection, Secp256k1Keypair, RawSigner, TransactionBlock } = require('@mysten/sui.js');
const provider = new JsonRpcProvider(devnetConnection);

(async () => {

    // Load wallet
    const mnemonic = 'dad glow shoe exclude manual glance certain bachelor nose depend high jaguar moon giraffe truth dune budget erupt peace paddle twin salon wrestle hello'
    const myKeypair = Secp256k1Keypair.deriveKeypair(mnemonic)
    const mySigner = new RawSigner(myKeypair, provider)
    const myAddress = myKeypair.getPublicKey().toSuiAddress()       // 0xe61fe099d95b8d90b65c63d649ed96c56131d6db48df058e9dbd6e06722312fd
    console.log(myAddress)

    // Request from faucet 
    const requestNum = 500_000_000      // 500 USDC
    const module_name = '0xf5b8c6f59fd837f3a1f492e4aca23d98b297c32f899838c77c75047d5a20ef97::usdc'
    const txnRequestUSDC = new TransactionBlock()
    txnRequestUSDC.moveCall({
        target: `${module_name}::release`,
        arguments: [
            txnRequestUSDC.pure('0x01001dcd6500c00000000000f677815c000000000000634dcb98027d0102ca21'),
            txnRequestUSDC.pure('0xdead'),  // signature
            txnRequestUSDC.pure('0xcafe'),  // initiator
            txnRequestUSDC.object('0x4e8c2e80791a847e823c5162a9b1afa37fc0c3ec45d346881fd0c38595d87bb2'),
            // The USDC-faucet object ID (it's a shared object, not belong to anyone)
            txnRequestUSDC.object('0x17bc086075749d65db1b108f0fc65efcb68e032494a4b42ea2e09e63dd6aad72'),
            // The `encoded` recording object ID (it's also a shared object)
        ],
    })
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
    const destAddress = '0x442c1e065aeca62d4f6b6a430d06048b7fd1616855c8176a0ce156996866a111'
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