import test from 'node:test'
import assert from 'node:assert/strict'

import {
  advanceGame,
  createInitialGameState,
  getUpgradeCost,
  loadGameState,
  mineBitcoin,
  purchaseUpgrade,
  saveGameState,
} from '../src/game/engine.js'

test('manual mining increases wallet and total mined by click power', () => {
  const initialState = createInitialGameState()
  const minedState = mineBitcoin(initialState)

  assert.equal(minedState.bitcoins, 1)
  assert.equal(minedState.totalMined, 1)
  assert.equal(minedState.clickPower, 1)
})

test('buying a click upgrade spends bitcoin and improves click power', () => {
  const fundedState = {
    ...createInitialGameState(),
    bitcoins: 20,
  }

  const upgradedState = purchaseUpgrade(fundedState, 'better-pickaxe')

  assert.equal(upgradedState.bitcoins, 5)
  assert.equal(upgradedState.upgrades['better-pickaxe'], 1)
  assert.equal(upgradedState.clickPower, 2)
})

test('passive mining adds bitcoin over time after buying a passive upgrade', () => {
  const stateWithUpgrade = purchaseUpgrade(
    {
      ...createInitialGameState(),
      bitcoins: 15,
    },
    'gpu-rig',
  )

  const advancedState = advanceGame(stateWithUpgrade, 5000)

  assert.equal(stateWithUpgrade.passiveRate, 0.2)
  assert.equal(advancedState.bitcoins, 6)
  assert.equal(advancedState.totalMined, 1)
})

test('upgrade cost increases after each level', () => {
  const initialState = createInitialGameState()
  const initialCost = getUpgradeCost(initialState, 'gpu-rig')
  const nextState = purchaseUpgrade(
    {
      ...initialState,
      bitcoins: 100,
    },
    'gpu-rig',
  )

  const secondCost = getUpgradeCost(nextState, 'gpu-rig')

  assert.equal(initialCost, 10)
  assert.equal(secondCost, 18)
})

test('saveGameState and loadGameState round-trip preserves bitcoins, totalMined, and derived rates', () => {
  const store = {}
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } }

  const original = purchaseUpgrade({ ...createInitialGameState(), bitcoins: 100 }, 'gpu-rig')
  saveGameState(original)
  const loaded = loadGameState()

  assert.equal(loaded.bitcoins, original.bitcoins)
  assert.equal(loaded.totalMined, original.totalMined)
  assert.equal(loaded.clickPower, original.clickPower)
  assert.equal(loaded.passiveRate, original.passiveRate)
  assert.equal(loaded.upgrades['gpu-rig'], 1)

  delete globalThis.localStorage
})

test('loadGameState returns null when storage is empty', () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} }
  assert.equal(loadGameState(), null)
  delete globalThis.localStorage
})

test('advanceGame ignores non-finite elapsed time input', () => {
  const initialState = createInitialGameState()
  const stateWithPassiveIncome = purchaseUpgrade(
    {
      ...initialState,
      bitcoins: 15,
    },
    'gpu-rig',
  )

  const advancedState = advanceGame(stateWithPassiveIncome, Number.NaN)

  assert.equal(advancedState, stateWithPassiveIncome)
})

test('buying an unknown upgrade is a no-op', () => {
  const initialState = {
    ...createInitialGameState(),
    bitcoins: 999,
  }

  const nextState = purchaseUpgrade(initialState, 'unknown-upgrade')

  assert.equal(nextState, initialState)
})

test('loadGameState returns null when saved amounts are invalid', () => {
  const store = { 'btc-clicker-save': JSON.stringify({ bitcoins: 'lots', totalMined: 10, upgrades: {} }) }
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } }

  assert.equal(loadGameState(), null)

  store['btc-clicker-save'] = JSON.stringify({ bitcoins: 10, totalMined: -5, upgrades: {} })
  assert.equal(loadGameState(), null)

  delete globalThis.localStorage
})

test('loadGameState sanitizes invalid upgrade levels', () => {
  const store = {
    'btc-clicker-save': JSON.stringify({
      bitcoins: 50,
      totalMined: 50,
      upgrades: { 'gpu-rig': 'many', 'better-pickaxe': 2.7, 'server-farm': -3 },
    }),
  }
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v } }

  const loaded = loadGameState()

  assert.equal(loaded.upgrades['gpu-rig'], 0)
  assert.equal(loaded.upgrades['better-pickaxe'], 2)
  assert.equal(loaded.upgrades['server-farm'], 0)
  assert.equal(loaded.clickPower, 3)

  delete globalThis.localStorage
})

test('purchaseUpgrade is a no-op when the wallet amount is not a finite number', () => {
  const brokenState = {
    ...createInitialGameState(),
    bitcoins: Number.NaN,
  }

  assert.equal(purchaseUpgrade(brokenState, 'gpu-rig'), brokenState)
})
