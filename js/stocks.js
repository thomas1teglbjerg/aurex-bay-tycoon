// Aurex Bay Stock Exchange: portfolio with cost basis, profit and loss, and per-stock detail
import * as E from '../supabase/functions/_shared/engine.js';
import { STOCKS } from '../supabase/functions/_shared/content.js';
import { city, me, esc, M, P, N, shortDate, spark, lineChart } from './util.js';

const STOCK_BY = Object.fromEntries(STOCKS.map((s) => [s.id, s]));
const pct = (a, b) => (b ? (a / b - 1) * 100 : 0);
// live price between weekly closes (same rule the server uses for trades)
export const livePrice = (c, id) => E.priceAt(c, id, E.gameNow(c, Date.now()));
export const PX = (v) => (v < 1 ? (v * 1000).toFixed(1) + ' k' : (v >= 10 ? v.toFixed(2) : v.toFixed(3)) + ' M');
export const liveH = (c, id) => c.stocks[id].h.concat([livePrice(c, id)]);
export function position(p, id) {
  const c = city(), qty = p.shares[id] || 0, cost = (p.cost && p.cost[id]) || 0, value = qty * livePrice(c, id);
  return { qty, cost, value, avg: qty ? cost / qty : 0, pl: value - cost, plPct: cost ? (value / cost - 1) * 100 : 0, realized: (p.rlz && p.rlz[id]) || 0 };
}
function change(h, n) { if (h.length < 2) return 0; const a = h[Math.max(0, h.length - 1 - n)]; return pct(h[h.length - 1], a); }

export function stocksHTML(ui) {
  const c = city(), p = me(), ids = Object.keys(p.shares).filter((k) => p.shares[k] > 0);
  const pos = ids.map((id) => ({ id, ...position(p, id) }));
  const value = pos.reduce((a, x) => a + x.value, 0), cost = pos.reduce((a, x) => a + x.cost, 0), pl = value - cost, realized = p.realized || 0;
  const ph = (p.phist || []).slice(-36);
  const prevValue = ph.length ? ph[ph.length - 1][1] : value;
  const monthChange = value - prevValue; // since last month close
  const chart = ph.length >= 2 ? lineChart([{ v: ph.map((x) => x[1]).concat([value]), c: '#1b2b44', w: 2.5, fill: true }, { v: ph.map((x) => x[2]).concat([cost]), c: '#c4952b', dash: true }], ph.map((x) => shortDate(x[0])).concat(['Now']), { fmt: (v) => v.toFixed(1), label: 'Portfolio value and invested amount' }) : '<p class="empty">Your portfolio chart starts after your first month on the exchange.</p>';
  const rows = pos.sort((a, b) => b.value - a.value).map((x) => { const s = STOCK_BY[x.id], h = liveH(c, x.id);
    return `<tr data-a="stock" data-id="${x.id}" class="click"><td><div style="display:flex;align-items:center;gap:8px"><img src="img/k-${x.id}.jpg" alt="" class="certthumb"><b>${esc(s.name)}</b></div></td><td class="num">${x.qty}</td><td class="num">${M(x.avg)}</td><td class="num">${PX(livePrice(c, x.id))}</td><td class="num">${M(x.value)}</td><td class="num ${x.pl >= 0 ? 'up' : 'down'}">${M(x.pl, true)}</td><td class="num ${x.pl >= 0 ? 'up' : 'down'}">${P(x.plPct)}</td><td class="num ${change(h, 1) >= 0 ? 'up' : 'down'}">${P(change(h, 1))}</td></tr>`; }).join('');
  const market = STOCKS.map((s) => { const st = { p: livePrice(c, s.id) }, h = liveH(c, s.id), own = p.shares[s.id] || 0;
    return `<button class="mrow" data-a="stock" data-id="${s.id}"><img src="img/k-${s.id}.jpg" alt="" class="certthumb"><div class="grow"><b>${esc(s.name)}</b><span class="num">${own ? `You own ${own}` : 'Not owned'}</span></div>${spark(h.slice(-48), 64, 26)}<div class="right"><b class="num">${PX(st.p)}</b><span class="num ${change(h, 1) >= 0 ? 'up' : 'down'}">${P(change(h, 1))} 1w</span><span class="num ${change(h, 48) >= 0 ? 'up' : 'down'}">${P(change(h, 48))} 12m</span></div></button>`; }).join('');
  return `<h2 class="ph1">Aurex Bay Stock Exchange</h2>
  <div class="kpis">
    <div class="stat"><small>Portfolio value</small><b class="num">${M(value)}</b></div>
    <div class="stat"><small>Invested</small><b class="num">${M(cost)}</b></div>
    <div class="stat"><small>Unrealized</small><b class="num ${pl >= 0 ? 'up' : 'down'}">${M(pl, true)}</b><span class="sub ${pl >= 0 ? 'up' : 'down'}">${P(cost ? pl / cost * 100 : 0)}</span></div>
    <div class="stat"><small>Realized</small><b class="num ${realized >= 0 ? 'up' : 'down'}">${M(realized, true)}</b><span class="sub">from sales</span></div>
    <div class="stat"><small>Total return</small><b class="num ${pl + realized >= 0 ? 'up' : 'down'}">${M(pl + realized, true)}</b></div>
    <div class="stat"><small>This month</small><b class="num ${monthChange >= 0 ? 'up' : 'down'}">${M(monthChange, true)}</b><span class="sub ${monthChange >= 0 ? 'up' : 'down'}">${P(prevValue ? monthChange / prevValue * 100 : 0)}</span></div>
  </div>
  <div class="grid"><div class="col">
    <div class="box"><h2>Portfolio<small>VALUE VS INVESTED</small></h2><div class="in">${chart}<div class="btns" style="font-size:13px;gap:14px"><span><b style="color:#1b2b44">━</b> Market value</span><span><b style="color:#c4952b">╍</b> Invested</span></div></div></div>
    <div class="box"><h2>Your holdings<small>${pos.length} STOCKS</small></h2><div class="in">${rows ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Stock</th><th>Shares</th><th>Avg cost</th><th>Price</th><th>Value</th><th>P/L</th><th>P/L %</th><th>1w</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">You hold no shares yet. Pick a stock to buy your first shares.</p>'}</div></div>
  </div><div class="col">
    <div class="box"><h2>Market<small>12 STOCKS</small></h2><div class="in"><div class="rows">${market}</div><p class="empty" style="font-size:13px">Prices move monthly with the economy, quarterly with World Cards, and instantly when any player trades.</p></div></div>
  </div></div>`;
}

export function stockModal(id, qty) {
  const c = city(), p = me(), s = STOCK_BY[id], st = { p: livePrice(c, id) }, h = liveH(c, id), x = position(p, id);
  const hi = Math.max(...h), lo = Math.min(...h);
  const wk = c.wk ?? c.m * 4, labels = h.map((_, i) => shortDate(Math.max(0, Math.floor((wk - (h.length - 1 - i)) / 4))));
  const chart = lineChart([{ v: h, c: change(h, h.length - 1) >= 0 ? 'var(--good)' : 'var(--bad)', w: 2.5, fill: true }].concat(x.qty ? [{ v: h.map(() => x.avg), c: '#c4952b', dash: true, w: 1.5 }] : []), labels, { fmt: (v) => v.toFixed(2), label: `${s.name} share price` });
  return `<article class="sheet stockm"><img src="img/k-${id}.jpg" alt="${esc(s.name)} stock certificate" class="certbig">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap"><div><span class="cap">Share price</span><div class="hero-cash num">${PX(st.p)}</div></div>
      <div class="chips"><span class="chip ${change(h, 1) >= 0 ? 'good' : 'bad'}">${P(change(h, 1))} 1 week</span><span class="chip ${change(h, 4) >= 0 ? 'good' : 'bad'}">${P(change(h, 4))} 1 month</span><span class="chip ${change(h, 48) >= 0 ? 'good' : 'bad'}">${P(change(h, 48))} 12 months</span></div></div>
    ${chart}${x.qty ? '<div style="font-size:13px" class="muted"><b style="color:#c4952b">╍</b> your average cost</div>' : ''}
    <div class="kpis sm"><div class="stat"><small>High</small><b class="num">${M(hi)}</b></div><div class="stat"><small>Low</small><b class="num">${M(lo)}</b></div><div class="stat"><small>You own</small><b class="num">${x.qty}</b></div><div class="stat"><small>Avg cost</small><b class="num">${x.qty ? M(x.avg) : '—'}</b></div>
      <div class="stat"><small>Value</small><b class="num">${M(x.value)}</b></div><div class="stat"><small>P/L</small><b class="num ${x.pl >= 0 ? 'up' : 'down'}">${x.qty ? `${M(x.pl, true)} · ${P(x.plPct)}` : '—'}</b></div><div class="stat"><small>Realized</small><b class="num ${x.realized >= 0 ? 'up' : 'down'}">${M(x.realized, true)}</b></div></div>
    <div class="btns" style="align-items:center"><span class="cap">Shares</span><div class="stepper"><button data-a="sqty" data-v="-1" aria-label="Fewer">−</button><output class="num">${qty}</output><button data-a="sqty" data-v="1" aria-label="More">+</button></div>${[1, 10, 50].map((n) => `<button class="btn sm" data-a="sqtyset" data-v="${n}">${n}</button>`).join('')}</div>
    <div class="btns"><button class="btn gold" style="flex:1" data-a="trade" data-id="${id}" data-q="${qty}" ${p.cash < qty * st.p ? 'disabled' : ''}>Buy ${qty} · ${M(qty * st.p)}</button><button class="btn" style="flex:1" data-a="trade" data-id="${id}" data-q="${-qty}" ${x.qty ? '' : 'disabled'}>Sell ${Math.min(qty, x.qty) || qty}${x.qty ? ` · ${M(Math.min(qty, x.qty) * st.p)}` : ''}</button>${x.qty ? `<button class="btn" data-a="trade" data-id="${id}" data-q="${-x.qty}">Sell all</button>` : ''}</div>
    <p class="empty" style="font-size:13px">Every order moves the price by 0.2% per share. Cash available: ${M(p.cash)}.</p>
  </article>`;
}
