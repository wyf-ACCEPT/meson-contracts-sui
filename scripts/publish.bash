# Build and test the packages.
sui move build
sui move test

# We recommend you to publish the meson contracts and save the related log to `publish-output.log`.
sui client publish --gas-budget 999999999 > ./scripts/publish-output.log

# You can view the generated objects via explorer (https://explorer.sui.io/).

# Transfer USDC, USDT to LP and User.
sui console

pay --input-coins 0x464dddd44a9c52877eaa17d6f3c47bf8d1e1fe412bb51a772c67bdedb84ace7b --recipients 0x57646a5dfb78c090bbd45a8f6ce71d1001aee73aa73a4eb52ad2d6b296d78bcb 0x938cf1367946f00cf48db68597d0153157da13fe90b64fcc42d9ac7984dc70bf --amounts 54000000000 54000000000 --gas-budget 999999999

pay --input-coins 0x44488979a53d9bbd8c65c0ef54b5f8c397082623b1b979f4f04c5948e33f5d86 --recipients 0x57646a5dfb78c090bbd45a8f6ce71d1001aee73aa73a4eb52ad2d6b296d78bcb 0x938cf1367946f00cf48db68597d0153157da13fe90b64fcc42d9ac7984dc70bf --amounts 54000000005 54000000005 --gas-budget 999999999
