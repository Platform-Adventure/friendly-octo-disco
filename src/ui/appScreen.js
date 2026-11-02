import bitcoinIcon from '../assets/bitcoin.svg'
import { getUpgradeCost } from '../game/engine.js'
import { UPGRADE_DEFINITIONS } from '../models/upgrades.js'

const formatAmount = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: value < 10 && value % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value)

const formatEffect = (upgrade) => {
  const amount = formatAmount(upgrade.effectPerLevel)
  return upgrade.kind === 'click'
    ? `+${amount} BTC per click`
    : `+${amount} BTC per second`
}

const views = new WeakMap()

const getUpgradeMarkup = () =>
  UPGRADE_DEFINITIONS.map((upgrade) => `
      <li class="upgrade-card">
        <div class="upgrade-card__top">
          <div>
            <h3>${upgrade.name}</h3>
            <small data-field="level-${upgrade.id}">Level 0</small>
          </div>
          <span class="upgrade-card__meta" data-field="cost-${upgrade.id}"></span>
        </div>
        <div class="upgrade-card__effect">${formatEffect(upgrade)}</div>
        <p>${upgrade.description}</p>
        <button type="button" data-action="buy-upgrade" data-upgrade-id="${upgrade.id}" disabled>
          Need more BTC
        </button>
      </li>
    `).join('')

const buildView = (root, actions) => {
  root.innerHTML = `
    <main class="screen">
      <section class="hero">
        <div class="hero__badge">
          <img src="${bitcoinIcon}" alt="" class="hero__icon" />
          Friendly Octo Disco
        </div>
        <h1>Bitcoin Mining Clicker</h1>
        <p>
          Tap to mine Bitcoin, reinvest your wallet into upgrades, and let passive income
          scale up while you chase the next big haul.
        </p>
      </section>

      <section class="layout">
        <section class="panel panel--mine">
          <div class="stats" aria-label="Current mining stats">
            <article class="stat">
              <span class="stat__label">Wallet</span>
              <span class="stat__value" data-field="bitcoins"></span>
            </article>
            <article class="stat">
              <span class="stat__label">Total mined</span>
              <span class="stat__value" data-field="totalMined"></span>
            </article>
            <article class="stat">
              <span class="stat__label">Click power</span>
              <span class="stat__value" data-field="clickPower"></span>
            </article>
            <article class="stat">
              <span class="stat__label">Passive rate</span>
              <span class="stat__value" data-field="passiveRate"></span>
            </article>
          </div>

          <div class="mine-area">
            <button type="button" class="mine-button" data-action="mine">
              <span class="mine-button__inner">
                <img src="${bitcoinIcon}" alt="" class="mine-button__icon" />
                <span class="mine-button__label">Mine Bitcoin</span>
                <span class="mine-button__hint" data-field="clickHint"></span>
              </span>
            </button>
            <p>Passive miners tick every quarter second to keep the wallet growing.</p>
          </div>
        </section>

        <aside class="panel panel--upgrades">
          <h2>Upgrades</h2>
          <p>Spend Bitcoin to boost manual clicks and unlock faster passive mining.</p>
          <ul class="upgrade-list">
            ${getUpgradeMarkup()}
          </ul>
        </aside>
      </section>

      <p class="footer-note">Tip: buy a GPU Rig first to unlock passive income, then stack click power for faster bursts.</p>
    </main>
  `

  const view = {
    bitcoins: root.querySelector('[data-field="bitcoins"]'),
    totalMined: root.querySelector('[data-field="totalMined"]'),
    clickPower: root.querySelector('[data-field="clickPower"]'),
    passiveRate: root.querySelector('[data-field="passiveRate"]'),
    clickHint: root.querySelector('[data-field="clickHint"]'),
    upgrades: UPGRADE_DEFINITIONS.map((upgrade) => ({
      level: root.querySelector(`[data-field="level-${upgrade.id}"]`),
      cost: root.querySelector(`[data-field="cost-${upgrade.id}"]`),
      button: root.querySelector(`[data-upgrade-id="${upgrade.id}"]`),
    })),
  }

  root.querySelector('[data-action="mine"]').addEventListener('click', actions.onMine)
  view.upgrades.forEach(({ button }, index) => {
    button.addEventListener('click', () => actions.onBuyUpgrade(UPGRADE_DEFINITIONS[index].id))
  })

  return view
}

const updateView = (view, state) => {
  view.bitcoins.textContent = `${formatAmount(state.bitcoins)} BTC`
  view.totalMined.textContent = `${formatAmount(state.totalMined)} BTC`
  view.clickPower.textContent = `${formatAmount(state.clickPower)} BTC`
  view.passiveRate.textContent = `${formatAmount(state.passiveRate)} BTC/s`
  view.clickHint.textContent = `+${formatAmount(state.clickPower)} BTC this tap`

  UPGRADE_DEFINITIONS.forEach((upgrade, index) => {
    const level = state.upgrades[upgrade.id] ?? 0
    const cost = getUpgradeCost(state, upgrade.id)
    const disabled = cost === null || !(state.bitcoins >= cost)
    const refs = view.upgrades[index]

    refs.level.textContent = `Level ${level}`
    refs.cost.textContent = `${cost} BTC`
    refs.button.disabled = disabled
    refs.button.textContent = disabled ? 'Need more BTC' : `Buy for ${cost} BTC`
  })
}

export function renderApp(root, state, actions) {
  let view = views.get(root)

  if (!view) {
    view = buildView(root, actions)
    views.set(root, view)
  }

  updateView(view, state)
}
