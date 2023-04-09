# Build and test the packages.
sui move build
sui move test

# We recommend you to publish the meson contracts package using sui client.
sui console

# --- You're in sui console now. If you don't have a wallet, use `new-address -h` to learn more.
publish --gas-budget 99999

# You can view the generated objects via explorer (https://explorer.sui.io/).