const dotenv = require('dotenv')
const { adaptors } = require('@mesonfi/sdk')
const presets = require('@mesonfi/presets').default

const use_testnet = true
const networkId = use_testnet ? 'sui-testnet' : 'sui'
presets.useTestnet(use_testnet)

dotenv.config()
module.exports = { get_metadata }

get_metadata('95uWVLj131occtfUyZpATc3Nk4VYbJcScUkAkcFQX1Wr')

async function get_metadata(digest) {
  const network = presets.getNetwork(networkId)
  const client = presets.createNetworkClient(networkId, [network.url])
  const wallet = adaptors.getWallet(undefined, client)

  const deployTx = await wallet.waitForTransaction(digest)

  const mesonAddress = deployTx.changes.find(obj => obj.type == 'published')?.packageId
  // console.log('mesonAddress', mesonAddress)
  
  const metadata = {
    storeG: deployTx.changes.find(obj => obj.objectType == `${mesonAddress}::MesonStates::GeneralStore`)?.objectId,
    adminCap: deployTx.changes.find(obj => obj.objectType == `${mesonAddress}::MesonStates::AdminCap`)?.objectId,
    treasuryCap: {},
  }

  const coins = deployTx.changes.filter(obj => obj.objectType?.startsWith('0x2::coin::TreasuryCap'))
    .map(obj => {
      const [_, addr] = /0x2::coin::TreasuryCap<(.*)>/.exec(obj.objectType)
      const [p, module, symbol] = addr.split('::')
      const match = network.tokens.find(t => t.symbol === symbol)
      if (match) {
        return { name: match.name, symbol, decimals: match.decimals, addr, tokenIndex: match.tokenIndex }
      }
      return { addr, symbol }
    })
  
  for (const coin of coins) {
    if (!coin.tokenIndex) {
      continue
    }
    metadata.treasuryCap[coin.tokenIndex.toString()] = deployTx.changes.find(obj => obj.objectType == `0x2::coin::TreasuryCap<${coin.addr}>`)?.objectId
  }

  return metadata
}