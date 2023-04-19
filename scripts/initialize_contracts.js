const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const { Connection, JsonRpcProvider, fromB64, TransactionBlock } = require('@mysten/sui.js')
const { utils } = require('ethers')
const { adaptors } = require('@mesonfi/sdk')
const presets = require('@mesonfi/presets').default

const use_testnet = true
presets.useTestnet(use_testnet)

dotenv.config()

const {
  SUI_NODE_URL,
  SUI_LP_PRIVATE_KEY,
  SUI_USER_PRIVATE_KEY,
  AMOUNT_TO_DEPOSIT,
} = process.env

initialize('CDwr5yhwqRHpPQ17f4tuoYXG4585PB6pcVJ87HHwZ3Ce')

async function initialize(digest) {
  const keystore = fs.readFileSync(path.join(__dirname, '../.sui/sui.keystore'))
  const privateKey = utils.hexlify(fromB64(JSON.parse(keystore)[0])).replace('0x01', '0x')

  const connection = new Connection({ fullnode: SUI_NODE_URL })
  const provider = new JsonRpcProvider(connection)
  const wallet = adaptors.getWallet(privateKey, provider)
  const wallet_lp = adaptors.getWallet(SUI_LP_PRIVATE_KEY, provider)
  const wallet_user = adaptors.getWallet(SUI_USER_PRIVATE_KEY, provider)

  const deployTx = await wallet.client.getTransactionBlock({ digest, options: { showInput: true, showEffects: true, showObjectChanges: true } })
  console.log(deployTx)

  const mesonAddress = deployTx.objectChanges.filter(obj => obj.type == 'published')[0].packageId
  const objectID = {
    storeG: deployTx.objectChanges.filter(obj => obj.objectType == `${mesonAddress}::MesonStates::GeneralStore`)[0].objectId,
    adminCap: deployTx.objectChanges.filter(obj => obj.objectType == `${mesonAddress}::MesonStates::AdminCap`)[0].objectId,
    storeC: {},
    treasuryCap: {},
    lpCoin: {},
    userCoin: {},
  }


  const coins = presets.getNetwork('sui-testnet').tokens
  for (const coin of coins) {
    const txBlock = new TransactionBlock()
    const payload = {
      target: `${mesonAddress}::MesonStates::addSupportToken`,
      typeArguments: [`${mesonAddress}::${coin.symbol}::${coin.symbol}`],
      arguments: [
        txBlock.pure(objectID.adminCap),
        txBlock.pure(coin.tokenIndex),
        txBlock.pure(objectID.storeG),
      ],
    }
    txBlock.moveCall(payload)
    const tx = await wallet.sendTransaction(txBlock)
    console.log(`addSupportToken (${coin.symbol}): ${tx.hash}`)
    await tx.wait()

    const digest = tx.hash
    const addTokenTx = await wallet.client.getTransactionBlock({ digest, options: { showInput: true, showEffects: true, showObjectChanges: true } })
    objectID.storeC[coin.symbol] = addTokenTx.objectChanges.filter(obj => obj.objectType.includes('StoreForCoin'))[0].objectId
    objectID.treasuryCap[coin.symbol] = deployTx.objectChanges.filter(obj => obj.objectType == `0x2::coin::TreasuryCap<${mesonAddress}::${coin.symbol}::${coin.symbol}>`)[0].objectId
  }

  console.log(objectID.storeC)


  const lp = adaptors.getWallet(SUI_LP_PRIVATE_KEY, provider)
  const lpAddress = lp.address

  // const txBlock = new TransactionBlock()
  // const payload = {
  //   function: `${mesonAddress}::MesonStates::transferPremiumManager`,
  //   typeArguments: [],
  //   arguments: [tx.pure()],
  // }
  // txBlock.moveCall(payload)
  // const tx = await wallet.sendTransaction(txBlock)
  // console.log(`transferPremiumManager: ${tx.hash}`)
  // await tx.wait()


  if (!AMOUNT_TO_DEPOSIT) {
    return
  }

  let registered = false  // Register in meson
  for (const coin of coins) {
    const coinType = `${mesonAddress}::${coin.symbol}::${coin.symbol}`

    if (use_testnet) {
      for (const [lp_or_user_wallet, lp_or_user_dict] of [[wallet_lp, 'lpCoin'], [wallet_user, 'userCoin']]) {
        const txBlock = new TransactionBlock()
        const payload = {
          target: '0x2::coin::mint_and_transfer',
          typeArguments: [coinType],
          arguments: [
            txBlock.object(objectID.treasuryCap[coin.symbol]),
            txBlock.pure(1_000_000_000_000),
            txBlock.pure(lp_or_user_wallet.address),
          ]
        }
        txBlock.moveCall(payload)
        const tx = await wallet.sendTransaction(txBlock)
        console.log(`Transfer to ${lp_or_user_dict} (${coin.symbol}): ${tx.hash}`)
        await tx.wait()

        const digest = tx.hash
        const transferTokenTx = await wallet.client.getTransactionBlock({ digest, options: { showInput: true, showEffects: true, showObjectChanges: true } })
        objectID[lp_or_user_dict][coin.symbol] = transferTokenTx.objectChanges.filter(obj => obj.type == 'created')[0].objectId
      }
    }

    // const tx2 = await wallet.sendTransaction({
    //   function: `0x1::managed_coin::mint`,
    //   type_arguments: [coinType],
    //   arguments: [lpAddress, 1_000000_000000]
    // })
    // console.log(`mint (${coin.symbol}): ${tx2.hash}`)
    // await tx2.wait()

    // const func = registered ? 'deposit' : 'depositAndRegister'
    // const tx3 = await lp.sendTransaction({
    //   function: `${address}::MesonPools::${func}`,
    //   type_arguments: [coinType],
    //   arguments: [BigInt(AMOUNT_TO_DEPOSIT), 1],
    // })
    // console.log(`${func} (${coin.symbol}): ${tx3.hash}`)
    // await tx3.wait()
    // registered = true
  }
}