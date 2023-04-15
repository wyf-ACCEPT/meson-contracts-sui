# Build and test the packages.
sui move build
sui move test

# We recommend you to publish the meson contracts and save the related log to `publish-output.log`.
sui client publish --gas-budget 199999999 > ./scripts/publish-output.log

# You can view the generated objects via explorer (https://explorer.sui.io/).

# Transfer USDC, USDT to LP and User.
sui console

pay --input-coins 0x8019d2ae9ca7bbde317dc02ff3197e9cadc88407d6989a81211cf4d09d52c9ad --recipients 0x57646a5dfb78c090bbd45a8f6ce71d1001aee73aa73a4eb52ad2d6b296d78bcb 0x938cf1367946f00cf48db68597d0153157da13fe90b64fcc42d9ac7984dc70bf --amounts 54000000000 54000000000 --gas-budget 199999999

pay --input-coins 0xcddd628ace93d02618beae1d4380758cb7ef9ac138b5a530f3fce053e6215f87 --recipients 0x57646a5dfb78c090bbd45a8f6ce71d1001aee73aa73a4eb52ad2d6b296d78bcb 0x938cf1367946f00cf48db68597d0153157da13fe90b64fcc42d9ac7984dc70bf --amounts 54000000005 54000000005 --gas-budget 199999999
