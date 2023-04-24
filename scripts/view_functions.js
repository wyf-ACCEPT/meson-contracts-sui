const dotenv = require('dotenv')
const fs = require('fs')
const path = require('path')
const { Connection, JsonRpcProvider, fromB64, toB64 } = require('@mysten/sui.js')
const { utils } = require('ethers')
const { adaptors } = require('@mesonfi/sdk')

const { get_metadata } = require('./get_metadata')
dotenv.config()

const {
  SUI_NODE_URL,
  SUI_FAUCET_URL,
  PRIVATE_KEY,
  SUI_LP_PRIVATE_KEY,
  SUI_USER_PRIVATE_KEY
} = process.env

main()


async function main() {
  const connection = new Connection({ fullnode: SUI_NODE_URL, faucet: SUI_FAUCET_URL })
  const provider = new JsonRpcProvider(connection)

  const metadata = await get_metadata('95uWVLj131occtfUyZpATc3Nk4VYbJcScUkAkcFQX1Wr')

  // console.log("\ngetSupportedTokens: ")
  // console.log(await getSupportedTokens(provider, metadata))

  // console.log("\nownerOfPool (Overall): ")
  // console.log(await ownerOfPoolList(provider, metadata))

  // console.log("\nownerOfPool (Specified): ")
  // console.log(await ownerOfPool(provider, metadata, 1))

  // console.log("\npoolOfAuthorizedAddrList (Overall): ")
  // console.log(await poolOfAuthorizedAddrList(provider, metadata))

  // console.log("\npoolOfAuthorizedAddrList (Specified): ")
  // console.log(await poolOfAuthorizedAddr(
  //   provider, metadata, '0x612ab2d8d1d9f250b458fb5e41b4c7989d5997cb67f8263b65a79dbac541d631'
  // ))

}


async function getSupportedTokens(provider, metadata) {
  const storeG_content = (await provider.getObject({
    id: metadata.storeG, options: { showContent: true }
  })).data.content.fields
  
  const supported_coins_raw = (await provider.getDynamicFields({ 
    parentId: storeG_content.supported_coins.fields.id.id 
  })).data

  const supported_coins_list = await Promise.all(supported_coins_raw.map(async coin_raw => ({
    tokenId: coin_raw.name.value,
    tokenName: (await provider.getObject(
      { id: coin_raw.objectId, options: { showContent: true } }
    )).data.content.fields.value.fields.name
  })))

  return supported_coins_list
}


async function ownerOfPoolList(provider, metadata) {
  const storeG_content = (await provider.getObject({
    id: metadata.storeG, options: { showContent: true }
  })).data.content.fields

  const pool_owners_raw = (await provider.getDynamicFields({ 
    parentId: storeG_content.pool_owners.fields.id.id 
  })).data

  const pool_owners_list = await Promise.all(pool_owners_raw.map(async pool_raw => ({
    poolId: pool_raw.name.value,
    address: (await provider.getObject(
      { id: pool_raw.objectId, options: { showContent: true } }
    )).data.content.fields.value
  })))

  return pool_owners_list
}


async function ownerOfPool(provider, metadata, poolId) {
  const storeG_content = (await provider.getObject({
    id: metadata.storeG, options: { showContent: true }
  })).data.content.fields

  const pool_owners_raw = (await provider.getDynamicFields({ 
    parentId: storeG_content.pool_owners.fields.id.id 
  })).data

  try {
    const pool = pool_owners_raw.filter(pool => pool.name.value == poolId)[0]
    const pool_address = (await provider.getObject(
      { id: pool.objectId, options: { showContent: true } }
    )).data.content.fields.value
    return pool_address
  } 
  catch(err) {
    console.log("Wrong poolId!")
  }
}


async function poolOfAuthorizedAddrList(provider, metadata) {
  const storeG_content = (await provider.getObject({
    id: metadata.storeG, options: { showContent: true }
  })).data.content.fields

  const auth_addr_raw = (await provider.getDynamicFields({ 
    parentId: storeG_content.pool_of_authorized_addr.fields.id.id 
  })).data

  const auth_addr_list = await Promise.all(auth_addr_raw.map(async auth => ({
    address: auth.name.value,
    poolId: (await provider.getObject(
      { id: auth.objectId, options: { showContent: true } }
    )).data.content.fields.value
  })))

  return auth_addr_list
}


async function poolOfAuthorizedAddr(provider, metadata, address) {
  const storeG_content = (await provider.getObject({
    id: metadata.storeG, options: { showContent: true }
  })).data.content.fields

  const auth_addr_raw = (await provider.getDynamicFields({ 
    parentId: storeG_content.pool_of_authorized_addr.fields.id.id 
  })).data

  try {
    const pool = auth_addr_raw.filter(auth => auth.name.value == address)[0]
    const poolId = (await provider.getObject(
      { id: pool.objectId, options: { showContent: true } }
    )).data.content.fields.value
    return poolId
  } 
  catch(err) {
    console.log("Unauthrized address!")
  }
}