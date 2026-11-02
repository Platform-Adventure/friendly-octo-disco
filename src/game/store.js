import { advanceGame, createInitialGameState, loadGameState, mineBitcoin, purchaseUpgrade, saveGameState } from './engine.js'

const SAVE_INTERVAL_MS = 1000

export function createGameStore() {
  let state = loadGameState() ?? createInitialGameState()
  let timerId
  let lastUpdated = performance.now()
  let lastSavedAt = 0
  const listeners = new Set()

  const notify = (persist) => {
    const now = performance.now()

    if (persist || now - lastSavedAt >= SAVE_INTERVAL_MS) {
      lastSavedAt = now
      saveGameState(state)
    }

    for (const listener of listeners) {
      listener(state)
    }
  }

  const tick = () => {
    const now = performance.now()
    const nextState = advanceGame(state, now - lastUpdated)
    lastUpdated = now

    if (nextState !== state) {
      state = nextState
      notify(false)
    }
  }

  return {
    getState() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    start() {
      if (timerId) {
        return
      }

      lastUpdated = performance.now()
      timerId = globalThis.setInterval(tick, 250)
    },
    stop() {
      if (!timerId) {
        return
      }

      globalThis.clearInterval(timerId)
      timerId = undefined
    },
    mine() {
      state = mineBitcoin(state)
      notify(true)
    },
    buyUpgrade(upgradeId) {
      const nextState = purchaseUpgrade(state, upgradeId)

      if (nextState !== state) {
        state = nextState
        notify(true)
      }
    },
  }
}
