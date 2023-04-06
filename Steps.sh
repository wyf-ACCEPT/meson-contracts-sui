# Sui Client doc: https://docs.sui.io/devnet/build/cli-client

# 1 Create new package and a source file
sui move new my_first_package
touch my_first_package/sources/my_module.move

# 2 Build a package, test a package
sui move build --skip-fetch-latest-git-deps
sui move test --skip-fetch-latest-git-deps

# 3.1 Request faucet
sui client addresses            # 
sui client active-address       # show your using address
curl --location --request POST 'https://faucet.devnet.sui.io/gas' \
--header 'Content-Type: application/json' \
--data-raw '{
    "FixedAmountRequest": {
        "recipient": "0x702808ed57102c64fae4c009636adea8ff929b1be83d425cf41c7b3589adf6fa"
    }
}'

# 3.2 Publish a module
sui client publish --gas-budget 1000    # or `sui console` to enter interactive shell

# 4 Transfer
transfer --to 0x6184a02e810ef8a196ff5085b6dc75a918b2e8591064c2e69e26d47851d72092 --gas-budget 9999 --object-id 0xb4ad837bbdec1a378c9ea4423c3885eecd7cd61793b3b8f8499d7d1a3f496b74