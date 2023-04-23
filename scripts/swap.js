const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const { Connection, JsonRpcProvider, fromB64, toB64, TransactionBlock } = require('@mysten/sui.js')
const { Wallet, utils } = require('ethers')
const { 
    adaptors,
    MesonClient,
    EthersWalletSwapSigner,
    SignedSwapRequest,
    SignedSwapRelease,
 } = require('@mesonfi/sdk')
const { ERC20, Meson } = require('@mesonfi/contract-abis')

dotenv.config()

const {
  SUI_NODE_URL,
  SUI_FAUCET_URL,
  PRIVATE_KEY,
  SUI_LP_PRIVATE_KEY,
  SUI_USER_PRIVATE_KEY
} = process.env

swap('CDwr5yhwqRHpPQ17f4tuoYXG4585PB6pcVJ87HHwZ3Ce')

async function swap(digest) {
  if (!SUI_LP_PRIVATE_KEY) {
    throw new Error('Please set SUI_LP_PRIVATE_KEY in .env')
  } else if (!SUI_USER_PRIVATE_KEY) {
    throw new Error('Please set SUI_USER_PRIVATE_KEY in .env')
  } else if (!PRIVATE_KEY){
    throw new Error('Please set PRIVATE_KEY in .env')
  }

  const connection = new Connection({ fullnode: SUI_NODE_URL, faucet: SUI_FAUCET_URL })
  const provider = new JsonRpcProvider(connection)
  const wallet = adaptors.getWallet(PRIVATE_KEY, provider)
  const wallet_lp = adaptors.getWallet(SUI_LP_PRIVATE_KEY, provider)
  const wallet_user = adaptors.getWallet(SUI_USER_PRIVATE_KEY, provider)

  const deployTx = await wallet.client.getTransactionBlock({ digest, options: { showInput: true, showEffects: true, showObjectChanges: true } })
  console.log(deployTx)

  const mesonAddress = deployTx.objectChanges.filter(obj => obj.type == 'published')[0].packageId
  const objectID = {
    storeG: deployTx.objectChanges.filter(obj => obj.objectType == `${mesonAddress}::MesonStates::GeneralStore`)[0].objectId,
    adminCap: deployTx.objectChanges.filter(obj => obj.objectType == `${mesonAddress}::MesonStates::AdminCap`)[0].objectId,
    storeC: { USDC: '0xa2631c90841d799df8eb3d3664a7b175cf959af8e764c1237f207ce838e5adf2' },
    treasuryCap: {},
    lpCoin: { USDC: '0xdea0ae4fe289ca0369b1e49d880ecf98bb06cbe15f492b33972001f7f73d6d90' },
    userCoin: { USDC: '0xc991e596e610fac02842e510f5039344ef795d644efb803f74539845091fef9f' },
  }

  const meson = adaptors.getContract(mesonAddress, Meson.abi, wallet_lp)
  const { tokens: coins } = await meson.getSupportedTokens()

  // Sui private key can be used as an Ethereum private key
  const mesonClient = await MesonClient.Create(meson)
  const swapSigner = new EthersWalletSwapSigner(new Wallet(SUI_USER_PRIVATE_KEY))
  const mesonClientForUser = await MesonClient.Create(meson.connect(wallet_user), swapSigner)

  
  let txb, tx, payload

  const swapData = {
    amount: '12000000',
    fee: '1000',
    inToken: 1,
    outToken: 1,
    recipient: wallet_user.address,
    salt: '0x80'
  }
  const suiShortCoinType = await meson.getShortCoinType()
  const swap = mesonClientForUser.requestSwap(swapData, suiShortCoinType)
  const request = await swap.signForRequest(true)
  const signedRequest = new SignedSwapRequest(request)
  const release = await swap.signForRelease(wallet_user.address, true)
  const signedRelease = new SignedSwapRelease(release)

  txb = new TransactionBlock()
  payload = {
    target: `${mesonAddress}::MesonPools::lock`,
    typeArguments: [`${mesonAddress}::USDC::USDC`],
    arguments: [
      txb.pure(add_length_to_hexstr(signedRequest.encoded.slice(2))),
      txb.pure(add_length_to_hexstr(signedRequest.signature.slice(2))),
      txb.pure(add_length_to_hexstr(signedRequest.initiator.slice(2))),
      txb.pure(wallet_user.address),
      txb.object(objectID.storeG),
      txb.object(objectID.storeC.USDC),
      txb.object('0x6'),
    ],
  }
  txb.moveCall(payload)
  tx = await wallet_lp.sendTransaction(txb)
  console.log(`Locked: \t${tx.hash}`)
  await tx.wait()


  txb = new TransactionBlock()
  payload = {
    target: `${mesonAddress}::MesonPools::release`,
    typeArguments: [`${mesonAddress}::USDC::USDC`],
    arguments: [
      txb.pure(add_length_to_hexstr(signedRelease.encoded.slice(2))),
      txb.pure(add_length_to_hexstr(signedRelease.signature.slice(2))),
      txb.pure(add_length_to_hexstr(signedRelease.initiator.slice(2))),
      txb.object(objectID.storeG),
      txb.object(objectID.storeC.USDC),
      txb.object('0x6'),
    ],
  }
  txb.moveCall(payload)
  tx = await wallet_lp.sendTransaction(txb)
  console.log(`Released: \t${tx.hash}`)
  await tx.wait()

  console.log("===================== Swap 1 passed! =====================")


  const swapData2 = {
    amount: '5000000',
    fee: '0',
    inToken: 1,
    outToken: 1,
    recipient: wallet_user.address,
    salt: '0x80'
  }
  const swap2 = mesonClientForUser.requestSwap(swapData2, suiShortCoinType)
  const request2 = await swap2.signForRequest(true)
  const signedRequest2 = new SignedSwapRequest(request2)
  const release2 = await swap2.signForRelease(wallet_user.address, true)
  const signedRelease2 = new SignedSwapRelease(release2)

  txb = new TransactionBlock()
  payload = {
    target: `${mesonAddress}::MesonSwap::postSwap`,
    typeArguments: [`${mesonAddress}::USDC::USDC`],
    arguments: [
      txb.pure(add_length_to_hexstr(signedRequest2.encoded.slice(2))),
      txb.pure(add_length_to_hexstr(signedRequest2.signature.slice(2))),
      txb.pure(add_length_to_hexstr(signedRequest2.initiator.slice(2))),
      txb.pure(155),      // Same as the one in `initialize_contracts.js`
      txb.object(objectID.userCoin.USDC),
      txb.object('0x6'),
      txb.object(objectID.storeG),
      txb.object(objectID.storeC.USDC),
    ],
  }
  txb.moveCall(payload)
  tx = await wallet_user.sendTransaction(txb)
  console.log(`Posted: \t${tx.hash}`)
  await tx.wait()


  txb = new TransactionBlock()
  payload = {
    target: `${mesonAddress}::MesonSwap::executeSwap`,
    typeArguments: [`${mesonAddress}::USDC::USDC`],
    arguments: [
      txb.pure(add_length_to_hexstr(signedRelease2.encoded.slice(2))),
      txb.pure(add_length_to_hexstr(signedRelease2.signature.slice(2))),
      txb.pure(add_length_to_hexstr(wallet_user.address.slice(2, 42))),
      txb.pure(true),
      txb.object(objectID.storeG),
      txb.object(objectID.storeC.USDC),
      txb.object('0x6'),
    ],
  }
  txb.moveCall(payload)
  tx = await wallet_lp.sendTransaction(txb)
  console.log(`Executed: \t${tx.hash}`)
  await tx.wait()

  console.log("===================== Swap 2 passed! =====================")

}


function add_length_to_hexstr(hexstring) {
    const u8ar = new Uint8Array(Buffer.from(hexstring, 'hex'))
    const u8ar_pro = new Uint8Array(u8ar.length + 1)
    u8ar_pro[0] = u8ar.length
    u8ar_pro.set(u8ar, 1)
    return u8ar_pro
}

// async function logWalletInfo(wallet, coins, meson) {
//   console.log(`  Balance: ${utils.formatUnits(await wallet.getBalance(wallet.address), 8)} APT`)
//   for (let i = 0; i < coins.length; i++) {
//     await logCoinBalance(wallet, coins[i])
//   }
//   if (meson) {
//     for (let i = 0; i < coins.length; i++) {
//       await logPoolBalance(wallet, coins[i], meson)
//     }
//   }
// }

// async function logCoinBalance(wallet, coin) {
//   const coinContract = adaptor.getContract(coin, ERC20.abi, wallet)
//   const decimals = await coinContract.decimals()
//   const balance = await coinContract.balanceOf(wallet.address)
//   console.log(`  Coin: ${utils.formatUnits(balance, decimals)} ${coin.split('::')[2]}`)
// }

// async function logPoolBalance(wallet, coin, meson) {
//   const balance = await meson.poolTokenBalance(coin, wallet.address)
//   console.log(`  Pool: ${utils.formatUnits(balance, 6)} ${coin.split('::')[2]}`)
// }