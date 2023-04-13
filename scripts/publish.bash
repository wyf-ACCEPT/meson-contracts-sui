# Build and test the packages.
sui move build
sui move test

# We recommend you to publish the meson contracts and save the related log to `publish-output.log`.
sui client publish --gas-budget 999999999 > ./scripts/publish-output.log

# You can view the generated objects via explorer (https://explorer.sui.io/).

# Transfer USDC, USDT to LP and User.
