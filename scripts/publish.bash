# Build and test the packages.
sui move build
sui move test

# We recommend you to publish the meson contracts and save the related log to `publish-output.log`.
sui client publish --gas-budget 199999999 > ./scripts/publish-output.log

# You can view the generated objects via explorer (https://explorer.sui.io/).

# Transfer USDC, USDT to LP and User.
sui console

pay --input-coins 0x40a4fa8b51f74f2fbebcdf98939b09f4e09ceee857032443caf1ae4564b07f2d --recipients 0x57646a5dfb78c090bbd45a8f6ce71d1001aee73aa73a4eb52ad2d6b296d78bcb 0x938cf1367946f00cf48db68597d0153157da13fe90b64fcc42d9ac7984dc70bf --amounts 54000000000 54000000000 --gas-budget 199999999

pay --input-coins 0xe86f934d44be6c6a3c012b7dce54300ccb1ac0e2b16f5de00365b93d805c37f8 --recipients 0x57646a5dfb78c090bbd45a8f6ce71d1001aee73aa73a4eb52ad2d6b296d78bcb 0x938cf1367946f00cf48db68597d0153157da13fe90b64fcc42d9ac7984dc70bf --amounts 54000000005 54000000005 --gas-budget 199999999
