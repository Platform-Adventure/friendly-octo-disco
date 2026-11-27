import test from 'node:test'
import assert from 'node:assert/strict'

import { createGameStore } from '../src/game/store.js'

test('store start/stop uses global timer APIs and does not require window', () => {
  const originalSetInterval = globalThis.setInterval
  const originalClearInterval = globalThis.clearInterval
  const calls = { set: 0, clear: 0 }
  const fakeTimerId = Symbol('timer')

  globalThis.setInterval = (callback, delay) => {
    calls.set += 1
    assert.equal(typeof callback, 'function')
    assert.equal(delay, 250)
    return fakeTimerId
  }

  globalThis.clearInterval = (timerId) => {
    calls.clear += 1
    assert.equal(timerId, fakeTimerId)
  }

  try {
    const store = createGameStore()

    store.start()
    store.start()
    store.stop()
    store.stop()

    assert.equal(calls.set, 1)
    assert.equal(calls.clear, 1)
  } finally {
    globalThis.setInterval = originalSetInterval
    globalThis.clearInterval = originalClearInterval
  }
})

test('store save flushes passive earnings that the autosave throttle skipped, and is a no-op when nothing changed', () => {
  const saved = { 'btc-clicker-save': JSON.stringify({ bitcoins: 0, totalMined: 0, upgrades: { 'gpu-rig': 5 } }) }
  const originalSetInterval = globalThis.setInterval
  const originalClearInterval = globalThis.clearInterval
  const originalNow = performance.now
  let now = 10_000
  let tick

  globalThis.localStorage = { getItem: (k) => saved[k] ?? null, setItem: (k, v) => { saved[k] = v } }
  globalThis.setInterval = (callback) => { tick = callback; return 1 }
  globalThis.clearInterval = () => {}
  performance.now = () => now

  const savedBitcoins = () => JSON.parse(saved['btc-clicker-save']).bitcoins

  try {
    const store = createGameStore()
    store.start()

    now += 500
    tick()
    now += 250
    tick()

    assert.ok(savedBitcoins() < store.getState().bitcoins)

    store.save()
    assert.equal(savedBitcoins(), store.getState().bitcoins)

    delete saved['btc-clicker-save']
    store.save()
    assert.equal(saved['btc-clicker-save'], undefined)
    store.stop()
  } finally {
    globalThis.setInterval = originalSetInterval
    globalThis.clearInterval = originalClearInterval
    performance.now = originalNow
    delete globalThis.localStorage
  }
})
