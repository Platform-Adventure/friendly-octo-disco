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

test('store save persists the latest passive earnings immediately', () => {
  const saved = {}
  globalThis.localStorage = { getItem: (k) => saved[k] ?? null, setItem: (k, v) => { saved[k] = v } }

  try {
    const store = createGameStore()

    store.mine()
    delete saved['btc-clicker-save']
    store.save()

    assert.equal(JSON.parse(saved['btc-clicker-save']).bitcoins, store.getState().bitcoins)
  } finally {
    delete globalThis.localStorage
  }
})
