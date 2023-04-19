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
  const user = adaptors.getWallet(SUI_USER_PRIVATE_KEY, provider)

  // const premiumRecipient = ''
  // const txBlock = new TransactionBlock()
  // const payload = {
  //   function: `0x2::transfer::transfer`,
  //   typeArguments: [`${mesonAddress}::MesonStates::AdminCap`],
  //   arguments: [
  //     txBlock.object(objectID.adminCap),
  //     txBlock.txn(premiumRecipient),
  //   ],
  // }
  // txBlock.moveCall(payload)
  // const tx = await wallet.sendTransaction(txBlock)
  // console.log(`TransferPremiumManager: ${tx.hash}`)
  // await tx.wait()


  if (!AMOUNT_TO_DEPOSIT) {
    return
  }

  let registered = true  // Register in meson
  for (const coin of coins) {
    const coinType = `${mesonAddress}::${coin.symbol}::${coin.symbol}`

    if (use_testnet) {
      for (const [lp_or_user_wallet, lp_or_user_str] of [[lp, 'lpCoin'], [user, 'userCoin']]) {
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
        console.log(`Transfer to ${lp_or_user_str} (${coin.symbol}): ${tx.hash}`)
        await tx.wait()

        const digest = tx.hash
        const transferTokenTx = await wallet.client.getTransactionBlock({ digest, options: { showInput: true, showEffects: true, showObjectChanges: true } })
        objectID[lp_or_user_str][coin.symbol] = transferTokenTx.objectChanges.filter(obj => obj.type == 'created')[0].objectId
      }
    }

    const func = registered ? 'deposit' : 'depositAndRegister'
    const txBlock = new TransactionBlock()
    const payload = {
      target: `${mesonAddress}::MesonPools::${func}`,
      typeArguments: [coinType],
      arguments: [
        txBlock.pure(AMOUNT_TO_DEPOSIT),
        txBlock.pure(155),    // A random pool index
        txBlock.object(objectID.lpCoin[coin.symbol]),
        txBlock.object(objectID.storeG),
        txBlock.object(objectID.storeC[coin.symbol]),        
      ]
    }
    txBlock.moveCall(payload)
    const tx = await lp.sendTransaction(txBlock)
    console.log(`${func} (${coin.symbol}): ${tx.hash}`)
    await tx.wait()

    const digest = tx.hash
    const transferTokenTx = await wallet.client.getTransactionBlock({ digest, options: { showInput: true, showEffects: true, showObjectChanges: true } })
    registered = true
  }
}