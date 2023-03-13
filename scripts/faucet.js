const { JsonRpcProvider, devnetConnection, SignerWithProvider } = require('@mysten/sui.js')


// connect to Devnet
const provider = new JsonRpcProvider(devnetConnection);

// get tokens from the DevNet faucet server
(async () => {
  await provider.requestSuiFromFaucet(
    '0x4c31a393fe9f356888e3b7016095fb43b70b8e86',
  )
  SignerWithProvider
})()