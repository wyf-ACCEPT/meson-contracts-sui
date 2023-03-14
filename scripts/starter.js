const { JsonRpcProvider, devnetConnection, Ed25519Keypair, RawSigner, getTransferSuiTransaction } = require('@mysten/sui.js');
const { readFileSync } = require('fs');

// connect to Devnet
const provider = new JsonRpcProvider(devnetConnection);

(async () => {

  // const myAddress = '0x4c31a393fe9f356888e3b7016095fb43b70b8e86'

  // // # Get tokens from the DevNet faucet server
  // await provider.requestSuiFromFaucet(myAddress)

  // // # Lookup objects
  // const objects = await provider.getObjectsOwnedByAddress(myAddress)
  // console.log(objects)

  // // # Fetch tx detail
  // const bal = await provider.getBalance(myAddress)
  // const txns = await provider.getTransactions({FromAddress: myAddress})
  // const txn0 = await provider.getTransactionWithEffects('AypZMVRzZ7icCsFd6TxdQhcsRkmXVsAkbUGLApcZWD3k')

  // # Create Aaccount
  const newKeypair = new Ed25519Keypair()
  const newSigner = new RawSigner(newKeypair, provider)
  const newAddress = newKeypair.getPublicKey().toSuiAddress()
  console.log(newAddress)

  const mnemonic = readFileSync('../wallet-dev', 'utf-8')
  const myKeypair = Ed25519Keypair.deriveKeypair(mnemonic)
  const myPubkeyHex = Array.from(myKeypair.keypair.publicKey).map(b => b.toString(16).padStart(2, '0')).join('')
  const mySigner = new RawSigner(myKeypair, provider)
  const myAddress = myKeypair.getPublicKey().toSuiAddress()

  // // ## Transfer $Sui as `object`
  // const txnTransferObject = await mySigner.transferObject({
  //   objectId: '0x00111499450b9d058b5fca247c3aef86bb0ba629',
  //   gasBudget: 1000,
  //   recipient: '0xd84058cb73bdeabe123b56632713dcd65e1a6c92',
  // })
  // console.log(txnTransferObject)

  // # Merge coin
  const txnMergeCoin = await mySigner.mergeCoin({
    primaryCoin: '0x1f213e0ed36fd6c68c67359462cd345fac2969d6',
    coinToMerge: '0x24638549bd56b799681149954bdbba2c6c1e7fe3',
    gasBudget: 1000,
  })
  console.log(txnMergeCoin)


})()