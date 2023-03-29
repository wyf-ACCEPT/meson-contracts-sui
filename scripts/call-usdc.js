const { JsonRpcProvider, devnetConnection, Secp256k1Keypair, RawSigner, TransactionBlock } = require('@mysten/sui.js');
const provider = new JsonRpcProvider(devnetConnection);

(async () => {

    // Load wallet
    const mnemonic = 'dad glow shoe exclude manual glance certain bachelor nose depend high jaguar moon giraffe truth dune budget erupt peace paddle twin salon wrestle hello'
    const myKeypair = Secp256k1Keypair.deriveKeypair(mnemonic)
    const mySigner = new RawSigner(myKeypair, provider)
    const myAddress = myKeypair.getPublicKey().toSuiAddress()       // 0xe61fe099d95b8d90b65c63d649ed96c56131d6db48df058e9dbd6e06722312fd
    console.log(mySigner)

    // // Request from faucet 
    // const requestNum = 500_000_000      // 500 USDC
    // const txnRequestUSDC = new TransactionBlock()
    // txnRequestUSDC.moveCall({
    //     target: '0xa2d36504375b900bacb2a20af88bfc7b4337e42d8604019d3db20f9df2903ce::usdc::get_some',
    //     arguments: [
    //         txnRequestUSDC.object('0x447dc03fd7eba4db5759d00aafc88b14ee533cd79261cf43612509761505b5a7'),
    //         // The USDC-faucet object ID (it's a shared object, not belong to anyone)
    //         txnRequestUSDC.pure(requestNum),
    //     ],
    // })
    // const result1 = await mySigner.signAndExecuteTransactionBlock({ transactionBlock: txnRequestUSDC })
    // console.log(result1)
    // console.log('========== Request succeed! ==========\n')

    // Show the information of all USDC objects that the address owns
    const usdcObjects = (await provider.getAllCoins({
        owner: myAddress
    })).data.filter(x => x.coinType == '0xa2d36504375b900bacb2a20af88bfc7b4337e42d8604019d3db20f9df2903ce::usdc::USDC')
    for (var element of usdcObjects) console.log((await provider.getObject({ id: element.coinObjectId })).data)
    console.log('========== USDC Object listed above. ==========\n')

    // Transfer
    const usdcObjectUsed = usdcObjects[0].coinObjectId
    const transferNum = 120_000_000
    const destAddress = '0x442c1e065aeca62d4f6b6a430d06048b7fd1616855c8176a0ce156996866a111'
    const txnTransferUSDC = new TransactionBlock()
    txnTransferUSDC.moveCall({
        target: '0xa2d36504375b900bacb2a20af88bfc7b4337e42d8604019d3db20f9df2903ce::usdc::transfer_usdc',
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