const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const { Connection, JsonRpcProvider, fromB64, toB64 } = require('@mysten/sui.js')
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
    storeC: {},
    treasuryCap: {},
    lpCoin: {},
    userCoin: {},
  }

  const meson = adaptors.getContract(mesonAddress, Meson.abi, wallet_lp)
  const { tokens: coins } = await meson.getSupportedTokens()

  // Sui private key can be used as an Ethereum private key
  const mesonClient = await MesonClient.Create(meson)
  const swapSigner = new EthersWalletSwapSigner(new Wallet(SUI_USER_PRIVATE_KEY))
  const mesonClientForUser = await MesonClient.Create(meson.connect(wallet_user), swapSigner)

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

  const tx1 = await mesonClient.lock(signedRequest, wallet_user.address)
  console.log(`Locked: \t${tx1.hash}`)
  await tx1.wait()
  await logPoolBalance(wallet_lp, coins[1], meson)

  console.log()

//   const release = await swap.signForRelease(wallet_user.address, true)
//   const signedRelease = new SignedSwapRelease(release)

//   const tx2 = await mesonClient.release(signedRelease)
//   console.log(`Released: \t${tx2.hash}`)
//   await tx2.wait()
//   await logCoinBalance(user, coins[1])


//   const swapData2 = {
//     amount: '5000000',
//     fee: '0',
//     inToken: 1,
//     outToken: 2,
//     recipient: wallet_user.address,
//     salt: '0x80'
//   }
//   const swap2 = mesonClientForUser.requestSwap(swapData2, aptosShortCoinType)
//   const request2 = await swap2.signForRequest(true)
//   const signedRequest2 = new SignedSwapRequest(request2)

//   const tx3 = await mesonClientForUser.postSwap(signedRequest2, 1)
//   console.log(`Posted: \t${tx3.hash}`)
//   await tx3.wait()
//   await logCoinBalance(user, coins[0])


//   const release2 = await swap2.signForRelease(wallet_user.address, true)
//   const signedRelease2 = new SignedSwapRelease(release2)

//   const tx4 = await mesonClient.executeSwap(signedRelease2, true)
//   console.log(`Executed: \t${tx4.hash}`)
//   await tx4.wait()
//   await logPoolBalance(wallet_lp, coins[0], meson)
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

async function logPoolBalance(wallet, coin, meson) {
  const balance = await meson.poolTokenBalance(coin, wallet.address)
  console.log(`  Pool: ${utils.formatUnits(balance, 6)} ${coin.split('::')[2]}`)
}