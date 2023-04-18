const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const { Connection, JsonRpcProvider, fromB64, toB64 } = require('@mysten/sui.js')
const { utils } = require('ethers')
const { adaptors } = require('@mesonfi/sdk')

dotenv.config()

const {
  SUI_NODE_URL,
  SUI_FAUCET_URL,
  PRIVATE_KEY,
} = process.env

prepare()

async function prepare() {
  const connection = new Connection({ fullnode: SUI_NODE_URL, faucet: SUI_FAUCET_URL })
  const provider = new JsonRpcProvider(connection)
  const wallet = adaptors.getWallet(PRIVATE_KEY, provider)

  console.log(`Address created: ${wallet.address}`)

  if (SUI_FAUCET_URL) {
    await provider.requestSuiFromFaucet(wallet.address)
  
    const bal = await wallet.getBalance(wallet.address)
    console.log(`Balance: ${utils.formatUnits(bal, 9)} SUI`)
  }


  const suiConfigDir = path.join(__dirname, '../.sui')
  const configYaml = `---
keystore:
  File: ${path.join(suiConfigDir, 'sui.keystore')}
envs:
  - alias: devnet
    rpc: "${SUI_NODE_URL}"
    ws: ~
active_env: devnet
active_address: "${wallet.address}"
`

  const pk = toB64(new Uint8Array([1, ...fromB64(wallet.keypair.export().privateKey)]))
  const keystore = JSON.stringify([pk], null, 2)

  if (!fs.existsSync(suiConfigDir)){
    fs.mkdirSync(suiConfigDir)
  }
  fs.writeFileSync(path.join(suiConfigDir, 'config.yaml'), configYaml)
  fs.writeFileSync(path.join(suiConfigDir, 'sui.keystore'), keystore)

//   const moveTomlFile = path.join(__dirname, '../Move.toml')
//   const moveToml = fs.readFileSync(moveTomlFile, 'utf8')
//   const newMoveToml = moveToml.replace(/(?<=Meson = ")0x.*(?=")/, key.address)
//   fs.writeFileSync(moveTomlFile, newMoveToml)
}
