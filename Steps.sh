# 1 Create new package and a source file
sui move new my_first_package
touch my_first_package/sources/my_module.move

# 2 Build a package, test a package
sui move build --skip-fetch-latest-git-deps
sui move test --skip-fetch-latest-git-deps