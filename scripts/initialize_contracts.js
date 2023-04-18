const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const { Connection, JsonRpcProvider, fromB64, TransactionBlock } = require('@mysten/sui.js')
const { utils } = require('ethers')
const { adaptors } = require('@mesonfi/sdk')
const presets = require('@mesonfi/presets').default

presets.useTestnet(true)

dotenv.config()

const {
  SUI_NODE_URL,
  SUI_LP_PRIVATE_KEY,
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

  const mesonAddress = ''

  
  const coins = presets.getNetwork('sui-testnet').tokens
  for (const coin of coins) {
    // const txBlock = new TransactionBlock()
    // const payload = {
    //   function: `${mesonAddress}::MesonStates::transferPremiumManager`,
    //   typeArguments: [],
    //   arguments: [tx.pure()],
    // }
    // txBlock.moveCall(payload)
    // const tx = await wallet.sendTransaction(txBlock)
    // console.log(`addSupportToken (${coin.symbol}): ${tx.hash}`)
    // await tx.wait()
  }
  

  const lp = adaptor.getWallet(SUI_LP_PRIVATE_KEY, client)
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

  let registered = false
  for (const coin of coins) {
    // const coinType = `${mesonAddress}::Coins::${coin.symbol}`

    // const tx1 = await lp.sendTransaction({
    //   function: `0x1::managed_coin::register`,
    //   type_arguments: [coinType],
    //   arguments: []
    // })
    // console.log(`register (${coin.symbol}): ${tx1.hash}`)
    // await tx1.wait()

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