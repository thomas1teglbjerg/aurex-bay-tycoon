// Help for anything you right-click: "Help" in the game's own menu explains what the thing is and what it does.
// helpAt(element) walks up from the clicked element to the most specific thing it knows (a number, a button,
// a department, a pin on the map, a box) and returns { t: title, k: kind, d: text, tip }. Pure UI copy:
// numbers that come from the rules are read from content.js, never repeated here.
import * as E from '../supabase/functions/_shared/engine.js';
import { TYPES, SIZES, GOODS, RECIPES, DEPTS, DEPT_LOOK, STAFF, STOCKS, DISTRICT, WAREHOUSE_SITES, HOMES, SPEEDS, WORKER } from '../supabase/functions/_shared/content.js';
import { city, $, esc } from './util.js';

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const text = (el) => { if (!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('small, .sub, svg, .dot, u').forEach((x) => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); };
const h = (k, d, tip) => ({ k, d, tip });
// every department under every name it goes by (a hotel calls Operations its Front Desk & Housekeeping)
const ALL_DEPTS = [...DEPTS, ...Object.keys(DEPT_LOOK).flatMap((t) => E.OPS.deptsFor({ type: t }))];

// ---------------------------------------------------------------- numbers and words
const TERMS = {
  // top bar
  cash: h('Your money', 'Money you can spend right now. It counts up in real time while your companies earn, and drops when you buy, hire or pay wages.', 'Run low and you cannot hire, buy supplies or open departments. Borrow at the Bank of Aurex on the Market tab.'),
  'income / yr': h('Your money', 'What your empire is expected to earn in a game year: contract income (YPI) plus last month\'s company sales, minus wages, budgets, specialists, upkeep and interest.', 'Green is profit, red is loss.'),
  'net worth': h('Your money', 'Everything you own minus what you owe: cash, shares, companies at their value, your stake in co-owned companies, warehouses and stock in them, specialist contracts, homes and collections, minus loans.', 'Net worth plus Influence decides your rank in the city.'),
  rank: h('Ranking', 'Your place among all players in the city. The score is net worth plus Influence.', 'See the full list under Network → City ranking.'),
  // Empire
  'profit / yr (est.)': h('Your money', 'Expected yearly profit for your whole empire: contract income plus company sales from last month, scaled to a year, minus all running costs.'),
  'wages, budgets, interest': h('Your money', 'What your empire pays every year: worker wages, department budgets, specialists, warehouse upkeep, your own salary, maintenance and loan interest.'),
  influence: h('Standing', 'Influence is your clout in Aurex Bay. It adds directly to your score in the city ranking.', 'You gain it from film and music hits, established tech companies, specialists like a PR & Media Officer or Logistics Planner, prestige and some decisions.'),
  'next world card in': h('Economy', 'Time until the next World Card. Once a quarter a card hits the whole city and can switch the economy between boom, stable, recession and crisis.', 'A Market Research Associate in your team, or in your network, shows the next card early.'),
  // Bank
  debt: h('Bank of Aurex', 'What you owe the bank in total.'),
  rate: h('Bank of Aurex', 'Yearly interest on your loans. A bank or finance company in your portfolio, prestige and some specialists lower it.'),
  'interest / yr': h('Bank of Aurex', 'Interest you pay on your debt each year. It is taken from your cash continuously.'),
  'credit limit': h('Bank of Aurex', 'The most you can owe the bank. It grows with the value of the companies you own.'),
  // Coop
  treasury: h('Co-owned company', 'The shared cash of a co-owned parent company. Its companies earn into it and pay their costs from it.'),
  'value (nav)': h('Co-owned company', 'Net asset value: the treasury plus the value of every company it owns. Your stake is your share of this.'),
  dividend: h('Co-owned company', 'The share of the yearly income that is paid out to the owners by stake. The owners vote on it.'),
  // company dashboard
  'profit last month': h('Company', 'What this company earned last month after all its costs: sales, supply sales and contract income minus supplies, freight, wages, budgets and specialists.'),
  'sales last month': h('Company', 'Revenue from customer orders and supplies sold on the city market last month.'),
  'supplies bought': h('Company', 'What the company spent on supplies (raw materials and parts) last month.'),
  'wages & budgets / mo': h('Company', 'Monthly running cost of this company: worker wages plus department budgets such as marketing, research, training and compliance.'),
  output: h('Production', 'Units made last month out of the most the company can make (capacity). Capacity grows with size, level, Operations workers, shifts, morale and training.', 'Output falls when supplies run out or Operations is understaffed.'),
  'guests last month': h('Hotel', 'Guest stays checked in last month. Hotels make no finished stock: guests come, use food, linen, energy and media during their stay, and pay at check-in.'),
  'rooms this month': h('Hotel', 'Stays checked in this month out of the rooms you can fill. Front Desk & Housekeeping staff, shifts and morale decide how many rooms are ready.', 'When rooms run out, confirmed guests wait. If they wait too long, they book elsewhere.'),
  'guest stays': h('Booking', 'How many stays the booking is for. Each stay uses supplies when the guests check in. VIP stays use more.'),
  'finished stock': h('Production', 'Finished products waiting in stock, ready to deliver to your customers. Each month\'s production comes off the line over the following weeks, so stock keeps growing between months.', 'You can only deliver an order when finished stock covers all its units. Unsold stock lowers how much the company produces next month.'),
  clients: h('Sales', 'Customers who buy from this company regularly. Each client sends orders. A client whose mood drops too low leaves.', 'Answer and deliver orders on time to keep them happy. Sales calls and Marketing find new ones.'),
  reputation: h('Company', 'How customers see the company, from 0 to 100. Higher reputation raises demand.', 'It grows slowly when you deliver, and drops when orders are cancelled or you cannot meet demand. Campaigns and research can lift it.'),
  morale: h('Company', 'How happy the workers are, from 0 to 100. High morale gives more output; below 30 workers start to quit.', 'HR, better wages, training and team meetings raise it. Overtime and lean cost control lower it.'),
  staff: h('Company', 'Workers employed across all departments, and their wages per year.'),
  // accounts
  revenue: h('Accounts', 'Everything the company brought in for the period: customer sales, supply sales and contract income (YPI).'),
  costs: h('Accounts', 'Everything the company paid for the period: supplies, freight, wages, department budgets, specialists and maintenance.'),
  profit: h('Accounts', 'Revenue minus costs for the period.'),
  margin: h('Accounts', 'Profit as a share of revenue. 20% means 20 cents of every dollar is profit.'),
  produced: h('Accounts', 'Units made in the period.'),
  'avg. price': h('Accounts', 'Average price per unit sold to customers in the period.'),
  'unit cost': h('Accounts', 'What each unit cost to make: supplies, freight, wages and budgets divided by units produced.', 'If the unit cost is above the average price, every sale loses money.'),
  'run rate': h('Accounts', 'The period\'s profit scaled up to a full year.'),
  'customer sales': h('Accounts', 'Money from orders delivered to your clients.'),
  'supply sales': h('Accounts', 'Money from supplies this company made and sold on the city market or exported.'),
  'contract income (ypi)': h('Accounts', 'YPI, yearly passive income: steady income every company earns from long-term contracts. It is cut when the company runs short of supplies.'),
  supplies: h('Accounts', 'What the company paid for supplies.'),
  freight: h('Accounts', 'What the company paid carriers to ship supplies and deliveries.'),
  wages: h('Accounts', 'Pay for the company\'s workers. HR\'s wage setting changes it.'),
  'department budgets': h('Accounts', 'Spending set in departments: marketing campaigns, research, training and compliance.'),
  specialists: h('Accounts', 'Salaries of specialists who lead a department here. You pay them from your own account; they are shown here so you see the full cost.'),
  maintenance: h('Accounts', 'Fixed upkeep for heavy plants such as metal production.'),
  'total revenue': h('Accounts', 'Sum of all revenue lines.'),
  'total costs': h('Accounts', 'Sum of all cost lines.'),
  'operating profit': h('Accounts', 'Total revenue minus total costs: what the company really earned.'),
  'income statement': h('Accounts', 'The company\'s books for the chosen period: where the money came from and where it went.'),
  share: h('Accounts', 'Each line as a share of total revenue.'),
  'vs prev.': h('Accounts', 'Change against the period before.'),
  // orders
  units: h('Order', 'How many units the client wants. You need this much finished stock to deliver.'),
  'supply cost': h('Order', 'What the supplies inside these units cost you.'),
  earning: h('Order', 'Revenue minus supply cost: what this order earns before wages.'),
  // supplies market
  supply: h('Supplies market', 'Raw materials and parts that companies use to produce. Some are made by player companies, the rest only come from import.'),
  price: h('Supplies market', 'Today\'s price per unit on the city market. It moves with what players produce and need.'),
  'vs normal': h('Supplies market', 'How far the price is from its normal level. Red means expensive, green means cheap.'),
  trend: h('Supplies market', 'Price over the last months.'),
  import: h('Supplies market', 'Price to import from outside the city. Always available, and the ceiling for the market price.'),
  export: h('Supplies market', 'Price you get for exporting. Always possible, and the floor for the market price.'),
  'on offer': h('Supplies market', 'Units players have listed for sale right now.'),
  'bought last mo': h('Supplies market', 'Units bought on the city market last month.'),
  imported: h('Supplies market', 'Units imported from outside the city last month.'),
  'made / mo': h('Supplies', 'How much of this supply the company makes each month.'),
  'in stock': h('Supplies', 'Units in this company\'s store right now.'),
  market: h('Supplies', 'Today\'s city market price.'),
  // warehouses
  storage: h('Warehouse', 'How many units the warehouse can hold. Upgrades raise it.'),
  'import price': h('Warehouse', 'What importing through this warehouse costs compared with the normal import price.'),
  'partner carrier': h('Warehouse', 'The freight company with a terminal here. It ships faster and cheaper to and from this warehouse.'),
  upkeep: h('Warehouse', 'What owning the warehouse costs each year.'),
  // stocks
  'portfolio value': h('Stocks', 'What all your shares are worth at today\'s prices.'),
  invested: h('Stocks', 'What you paid for the shares you still hold.'),
  unrealized: h('Stocks', 'Gain or loss on shares you still hold. It only becomes real when you sell.'),
  realized: h('Stocks', 'Gain or loss you locked in by selling.'),
  'total return': h('Stocks', 'Unrealized plus realized gains.'),
  'this month': h('Stocks', 'How your portfolio moved this month.'),
  high: h('Stocks', 'The highest price in the period shown.'),
  low: h('Stocks', 'The lowest price in the period shown.'),
  'avg cost': h('Stocks', 'The average price you paid per share.'),
  value: h('Value', 'What it is worth at today\'s price.'),
  'p/l': h('Stocks', 'Profit or loss on the shares you hold.'),
  'you own': h('Stocks', 'Shares you hold in this stock.'),
  // personal life
  total: h('Personal wealth', 'All your private wealth: bank accounts, home equity and collections.'),
  'bank accounts': h('Personal wealth', 'Your private wallet and savings. Separate from your company cash.'),
  'home equity': h('Personal wealth', 'What your homes are worth minus the mortgages on them.'),
  collections: h('Personal wealth', 'The value of your art, watches, wine and cars.'),
  prestige: h('Personal life', 'How admired you are in the city, from homes, collections and dinner parties. Higher prestige tiers unlock perks, cheaper loans and yearly Influence.'),
  paid: h('Collection', 'What you paid for it.'),
  'you paid': h('Collection', 'What you paid for it.'),
  gain: h('Collection', 'Value now minus what you paid.'),
  'value now': h('Collection', 'What the item is worth today. Rare items tend to rise over time.'),
  'market value': h('Collection', 'What the item is worth on the open market today.'),
  'dealer price': h('Collection', 'What the dealer pays you right now. Dealers buy below market value but pay at once.'),
  estimate: h('Auction', 'The auction house\'s estimate of what the lot will sell for.'),
  reserve: h('Auction', 'The lowest price the seller accepts. Bids below it do not sell.'),
  'highest rival bid': h('Auction', 'The best bid from other collectors so far.'),
  'your max bid': h('Auction', 'The most you are willing to pay. The auction bids for you up to this.'),
  'running costs': h('Home', 'Yearly charges, property tax and upkeep for the home.'),
  'rent if let': h('Home', 'What tenants would pay you each year if you let the home.')
};

// ---------------------------------------------------------------- boxes (titles of panels)
const BOXES = {
  inbox: h('Empire', 'Things waiting for you: offers from other players, decisions to make and company to-dos.', 'Unanswered decisions are taken by your Autopilot.'),
  autopilot: h('Empire', 'When you don\'t answer a decision in time, your managers choose for you. Cautious picks the safe option, Bold the risky one.'),
  'your companies': h('Empire', 'Every company you own. Open one to run its departments, supplies and orders.'),
  warehouses: h('Logistics', 'Warehouses you own. They import cheaper, store supplies and truck them to your companies.'),
  'your activity': h('Empire', 'What happened to you and your companies lately.'),
  'your team': h('Specialists', 'Specialists under contract with you. Each has a passive bonus and can lead a department in one of your companies.', 'Find more on the Apex Talent website in the in-game browser.'),
  'world economy': h('Economy', 'The economy everyone in the city shares. Booms raise Trade income, recessions and crises cut it. World Cards change it once a quarter.'),
  'supplies market': h('Market', 'The city-wide market for supplies. Every company buys and sells here. Prices float between the export floor and the import ceiling.'),
  'your offers': h('Market', 'Supplies you have listed for sale. Buyers pay when they buy. Withdraw to take them back.'),
  'bank of aurex': h('Bank', 'Borrow money for growth and repay when you can. Interest is charged every year on what you owe.'),
  'aurex bay gazette': h('News', 'City news: World Cards, big deals, hits and what other players do.'),
  network: h('Network', 'Players you are connected with. Network partners can sign supply contracts and share market insight.'),
  'waiting for you': h('Network', 'Network requests and supply contract offers that need your answer.'),
  'your network': h('Network', 'Players you are connected with. Partners whose companies fit yours can sign supply contracts for synergy bonuses.'),
  'supply contracts': h('Network', 'Contracts between your company and a partner\'s company. The pair counts as a portfolio synergy, as if you owned both.'),
  'city ranking': h('Network', 'All players ranked by score: net worth plus Influence.'),
  'coop parent companies': h('Coop', 'Parent companies you co-own with other players. They own companies together and share the income by stake.'),
  invitations: h('Coop', 'Invitations to buy into another player\'s co-owned company.'),
  'found a coop': h('Coop', 'Start a co-owned parent company with your own stake. Invite other players to buy in.'),
  'other coops in the city': h('Coop', 'Co-owned companies run by other players. Some are open for anyone to buy in.'),
  'company board': h('Company', 'Notes for your team and coop partners. Everyone who runs this company can read them.'),
  accounts: h('Company', 'The company\'s income statement: revenue, costs and profit by month, 3 months or 12 months.'),
  'to-do': h('Company', 'Work that needs you because a department has no staff. Hire workers to hand it over.'),
  bookings: h('Hotel', 'Bookings from travel agents, tour operators and the odd VIP. Confirm, reject or ask for a better rate. Confirmed guests check in by themselves when a room is free and the supplies are there.', 'Unanswered or waiting guests book elsewhere and the channel gets upset. A full Reservations team confirms bookings for you. A VIP who leaves happy lifts reputation and brings more guests.'),
  'customer orders': h('Company', 'Orders from your clients. Accept, reject or counter-offer, then deliver from finished stock before the deadline.', 'Late, rejected or ignored orders upset clients until they leave. A full Sales team handles orders for you.'),
  'production & supplies': h('Company', 'The supplies this company needs to produce, how long your stock lasts and what is on the way. The percentage shows how much of production was supplied.', 'Run out and production stops. A full Procurement team restocks for you.'),
  departments: h('Company', 'The teams that run the company. Each department has workers, settings and an optional specialist head. Fully staffed, it works on its own.'),
  company: h('Company', 'Upgrade the company to the next level or sell it. Upgrading raises capacity, income and how many workers each department needs.'),
  'harvest & wine cellar': h('Vineyard', 'Once a year the vineyard harvests and may bottle a collectible wine. Cases wait in the cellar until you sell, auction or take them home.'),
  deliveries: h('Logistics', 'Shipments to and from this company and where they are now.'),
  'your shipments': h('Logistics', 'Everything you have on the road, at sea or in the air.'),
  rates: h('Logistics', 'What each carrier charges and how long it takes.'),
  'deliver orders': h('Logistics', 'Pick accepted orders and send them to your clients from finished stock.'),
  automation: h('Warehouse', 'What the warehouse does on its own: import, supply your companies and sell surplus. Needs a Logistics Planner.'),
  'personal wealth': h('Personal life', 'Your private money and possessions, kept apart from your companies.'),
  'homes for sale': h('Personal life', 'Homes you can buy in the city. Homes raise prestige, hold your collections and can be let.'),
  'your homes': h('Personal life', 'Homes you own, their rooms and mortgages.'),
  lifestyle: h('Personal life', 'How you live. A richer lifestyle costs more each year and raises prestige.'),
  'dinner party': h('Personal life', 'Host a dinner for other players to build prestige and relationships.'),
  'other collectors': h('Personal life', 'Other players who collect. Propose trades with them.'),
  'aurex bay auction house': h('Auction', 'Lots up for auction. Set your max bid; the highest bid above the reserve wins when the lot closes.'),
  dealer: h('Collection', 'Buy and sell collectibles right away at the dealer\'s price.'),
  sets: h('Collection', 'Complete a set of items to earn bonus prestige.'),
  'propose a trade': h('Collection', 'Offer items or cash to another player for theirs.'),
  'aurex bay stock exchange': h('Stocks', 'Buy and sell shares. Prices move every few minutes and follow the economy.'),
  portfolio: h('Stocks', 'What your shares are worth and how they have done.'),
  'your holdings': h('Stocks', 'Shares you own, what you paid and your gain or loss.'),
  build: h('Collection', 'Rooms in your home that hold collections.')
};

// ---------------------------------------------------------------- buttons (data-a)
const ACTIONS = {
  buy: h('Buy', 'Buy this company with your own cash. It starts earning at once and shows on the map in your colour.'),
  buyas: h('Buy', 'Buy this company with the treasury of your co-owned parent company.'),
  company: h('Open', 'Open the company dashboard: departments, supplies, orders and accounts.'),
  open: h('Open', 'Open the company card with its numbers, perks and owner.'),
  upgrade: h('Upgrade', 'Raise the company one level. It takes some months. Higher levels make more, earn more and need more workers.'),
  sell: h('Sell', 'Sell the company back to the market for 80% of its value.'),
  workers: h('Workers', `Hire (+) or lay off (−) one worker in this department. Hiring costs a one-off fee and every worker earns a yearly wage (${WORKER.salary * 1000}k).`, 'Workers / needed: fill the department to make it fully automated.'),
  deptOpen: h('Department', 'Open this department. It costs a one-off fee; then hire workers to run it.'),
  deptClose: h('Department', 'Close the department and let its workers go. Its work stops.'),
  assignHead: h('Specialist', 'Make this specialist head of the department. A head adds automation and their own bonus.'),
  unassignHead: h('Specialist', 'Take the specialist off as head. They stay in your team.'),
  staff: h('Specialist', 'Open the specialist\'s card: contract, stress, satisfaction and bonuses.'),
  buySupply: h('Supplies', 'Order this amount now. It takes the cheapest offers in the city first, then imports the rest, and ships with the carrier you picked.'),
  buyQty: h('Supplies', 'Change how many units to order.'),
  restock: h('Supplies', 'Let Procurement fill your stock up for this many months right away.'),
  listGoods: h('Supplies', 'List all stock of this supply on the city market at your Sales price. Buyers pay when they buy.'),
  exportGoods: h('Supplies', 'Sell all stock of this supply abroad at the export price. Always possible, but the lowest price.'),
  cancelOffer: h('Market', 'Take your offer off the market. The units go back to stock.'),
  deliverOpen: h('Orders', 'Open the delivery map to send accepted orders to your clients.'),
  order: h('Orders', 'Answer the order: accept it, reject it or ask for a better price.'),
  loan: h('Bank', 'Borrow money from the Bank of Aurex. Interest is charged every year on what you owe.'),
  repay: h('Bank', 'Pay back part or all of your loans.'),
  trade: h('Stocks', 'Buy or sell shares at today\'s price.'),
  policy: h('Autopilot', 'How your managers decide when you don\'t answer in time.'),
  decide: h('Decision', 'Pick this option. Its effect hits at once.'),
  scene: h('Task', 'Do this task yourself. It takes 20 seconds, then you choose what to do.'),
  task: h('Task', 'Handle this to-do now.'),
  gotoSupplies: h('Supplies', 'Jump to the supplies box to order by hand.'),
  gotoOrders: h('Orders', 'Jump to the customer orders.'),
  web: h('Web', 'Open the in-game web browser: auction house, dealers, homes, carriers, news and the talent market.'),
  tab: h('Go to', 'Switch to another part of the game.'),
  back: h('Back', 'Go back to where you came from.'),
  wh: h('Warehouse', 'Open the warehouse: stock, imports, automation and upgrades.'),
  netRequest: h('Network', 'Ask this player to join your network. Partners can sign supply contracts.'),
  netAccept: h('Network', 'Accept the network request.'),
  netDecline: h('Network', 'Decline the network request.'),
  netRemove: h('Network', 'Remove this player from your network.'),
  contract: h('Network', 'Offer a supply contract between your company and theirs.'),
  contractAccept: h('Network', 'Sign the supply contract.'),
  contractDecline: h('Network', 'Decline the supply contract.'),
  contractEnd: h('Network', 'End the supply contract.'),
  offer: h('Takeover', 'Offer to buy this company from its owner.'),
  offeramt: h('Takeover', 'Change how much you offer.'),
  offerAccept: h('Takeover', 'Accept the offer and sell the company.'),
  offerDecline: h('Takeover', 'Turn the offer down.'),
  hostileBid: h('Takeover', 'Bid for a company whose owner has been away for months. It is yours unless they come back and reject in time.'),
  vote: h('Coop', 'Vote on a proposal. Votes count by stake.'),
  hjoin: h('Coop', 'Buy into this co-owned company with the amount shown.'),
  hleave: h('Coop', 'Sell your stake and leave.'),
  hpayout: h('Coop', 'Propose how much of the income is paid out as dividend.'),
  hbuyin: h('Coop', 'Change the buy-in price for new owners.'),
  camt: h('Coop', 'Change how much you put in.'),
  bid: h('Auction', 'Bid on this lot.'),
  itemSell: h('Collection', 'Sell this item.'),
  itemBuy: h('Collection', 'Buy this item.'),
  cellar: h('Wine cellar', 'Sell the wine to the merchant, put it up for auction or move it to your own cellar.'),
  mapCity: h('Map', 'Back to the whole city.'),
  mapGo: h('Map', 'Go to the next or previous district.'),
  editLogo: h('Brand', 'Change your logo: symbol, colour and font.'),
  chat: h('Chat', 'Open a private chat with this player.'),
  playAs: h('Admin', 'Switch who you play as.')
};

// department settings by "dept.key"
const SETTINGS = {
  'ops.shifts': 'More shifts make more per month but pay higher wages for the extra hours.',
  'procurement.policy': 'Where Procurement buys: the cheapest offer in the city, your own companies first, your warehouses first, or import only.',
  'procurement.stock': 'How many months of supplies Procurement keeps in stock. More is safer but ties up cash.',
  'procurement.carrier': 'Which freight company ships your supplies. Faster costs more.',
  'sales.price': 'Budget sells more units at a lower price. Premium sells fewer at a higher price, and builds reputation with good technology.',
  'sales.b2b': 'Price for supplies this company lists on the city market: under, at or over the market price.',
  'social.intensity': 'How much you post on social media every month. Posting more grows customers and reputation faster but costs more each month. Ad campaigns on the city’s websites are launched separately in the Ad campaigns box.',
  'hr.wages': 'Higher wages lift morale and cost more. Below market saves money but morale falls.',
  'hr.training': 'Training costs a yearly budget and raises output and morale.',
  'finance.costs': 'Lean cuts running costs by 6% but lowers morale.',
  'rnd.budget': 'Research budget. More research reaches higher technology levels sooner: better quality, higher price and more demand.',
  'legal.level': 'Strict compliance costs a budget and keeps regulation fines away.'
};

const TABS = {
  map: h('Tab', 'The city map. Click a district to zoom in; pins show companies, warehouses and homes.', 'Gold pins are for sale.'),
  empire: h('Tab', 'Your empire: cash, inbox, companies, warehouses and your team of specialists.'),
  market: h('Tab', 'The economy, the supplies market, your offers and the Bank of Aurex.'),
  stocks: h('Tab', 'The Aurex Bay Stock Exchange: buy and sell shares.'),
  network: h('Tab', 'Other players: your network, supply contracts and the city ranking.'),
  coop: h('Tab', 'Companies you own together with other players.'),
  life: h('Tab', 'Your personal side: wallet, homes, collections, auctions and prestige.')
};

// ---------------------------------------------------------------- dynamic things from the rules' content
const perks = (def) => (def.perks || []).map((x) => `${x.t}: ${x.d}.`).concat((def.neg || []).map((x) => `${x.t} (risk): ${x.d}.`)).join(' ');
const goodsList = (o) => Object.keys(o).map((g) => GOODS[g].name.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1');
function typeHelp(type, l) {
  const def = TYPES[type], rec = RECIPES[type]; if (!def) return null;
  const made = rec && Object.keys(rec.out).length ? ` It also makes ${goodsList(rec.out)} for other companies.` : '';
  return { t: l ? (l.title || def.name) : def.name, k: def.sector, d: `A ${def.name.toLowerCase()} produces ${rec ? rec.unit : 'units'} from ${rec ? goodsList(rec.in) : 'supplies'} and sells them to its clients. It earns steady contract income (YPI) and Trade income that moves with the economy.${made}`,
    tip: perks(def) + (l ? ` ${SIZES[l.size].label}, level ${l.level}, ${l.district}.` : '') };
}
function deptHelp(d) {
  return { t: d.name, k: 'Department', d: `${d.desc} Fully staffed: ${d.auto} Without staff: ${d.without}`, tip: `Needs about ${d.need} worker${d.need > 1 ? 's' : ''} in a medium company. A specialist can lead it as head for extra automation.` };
}
function markHelp(key) {
  const c = city(), [k, id] = key.split(':');
  if (k === 'l') { const l = E.listing(c, id); return l && typeHelp(l.type, l); }
  if (k === 'w') { const s = WAREHOUSE_SITES.find((x) => x.id === id); return s && { t: s.name, k: 'Warehouse', d: `${s.desc} A warehouse stores supplies, imports them cheaper and trucks them to your companies.`, tip: 'Click the pin to see prices and buy it.' }; }
  if (k === 'h') { const x = HOMES.find((y) => y.id === id); return x && { t: x.name, k: 'Home', d: `${x.desc} Homes raise your prestige, hold your collections and can be let to tenants.`, tip: 'Click the pin to see the home.' }; }
  return null;
}
const ECON_TXT = { Boom: 'Business is booming: Trade income is higher and demand is up.', Stable: 'A steady economy: normal income and demand.', Recession: 'Customers spend less: Trade income and demand are down.', Crisis: 'A crisis: Trade income and demand fall hard. Some companies are hit extra.' };

// ---------------------------------------------------------------- what is under the pointer
export function helpAt(el, where = {}) {
  if (!el || !el.closest) return null;
  const q = (s) => el.closest(s), c = city();
  let x;
  if (q('#ctx, #helpcard')) return null;
  const term = (label) => { const key = norm(label).replace(/[:·]+$/, ''), e = TERMS[key]; return e ? { t: label, ...e } : null; };

  if ((x = q('#tabs [data-tab]'))) return { t: text(x), ...TABS[x.dataset.tab] };
  if (q('.who-c')) return { t: 'Players in the city', k: 'Top bar', d: 'Players online now, with their logo and initials. Dimmed means they have not done anything for 10 minutes.', tip: 'Right-click an icon to chat with that player.' };
  if ((x = q('.money > div'))) return term(text(x.querySelector('small')));
  if (q('#econ')) return { t: `Economy: ${c ? c.econ : ''}`, k: 'Economy', d: `${c ? ECON_TXT[c.econ] || '' : ''} A World Card can change it once a quarter.`, tip: 'See the Market tab for the latest card.' };
  if (q('#datelbl, .brand')) return { t: 'Game date', k: 'Time', d: `The date in Aurex Bay. W is the week of the month. At live speed one game year lasts one real week, so a month is about 14 hours.`, tip: 'Companies produce and sell every month; supplies and share prices move every week.' };
  if ((x = q('#speed'))) return { t: 'Game speed', k: 'Time', d: `How fast time runs. ${SPEEDS.map((s) => `${s.label}: ${s.note}`).join('. ')}.`, tip: 'Online, only the administrator changes the speed for everyone.' };
  if (q('#mylogo')) return { t: 'Your parent company', k: 'Brand', d: 'The logo of the parent company that owns your businesses. Click to open your empire.' };
  if (q('.adv')) return { t: 'Advertisement', k: 'Marketing', d: 'An ad campaign a company in Aurex Bay paid for. It runs for a few weeks on the city’s websites. Click it to see the company or the piece.', tip: 'Run your own from the Ad campaigns box of a company with a Marketing department.' };
  if (q('.adbox')) return { t: 'Ad campaigns', k: 'Marketing', d: 'Buy a few weeks of ads on the city’s websites. Advertise the company to win customers and reputation every week, or one piece it makes or you own to lift its market value.', tip: 'Pick a tone, flip through lines with Another line, then launch. A head of marketing makes campaigns 50% stronger.' };
  if (q('.webbtn')) return { ...ACTIONS.web, t: 'Web browser', k: 'Top bar' };
  if ((x = q('.mp[data-mk]'))) return markHelp(x.dataset.mk);
  if ((x = q('.zone[data-zone]'))) { const d = DISTRICT[x.dataset.zone]; return d && { t: d.name, k: 'District', d: d.blurb, tip: 'Click to zoom into the district and see its companies, warehouses and homes.' }; }
  if (q('.mn-crumb')) return { t: 'Where you are', k: 'Map', d: 'The part of the city you are looking at. In a district, ‹ Aurex Bay takes you back to the whole city and the arrows step to the previous or next district.' };

  // departments: a setting, the worker stepper, the head, or the department itself
  if ((x = q('.dept'))) {
    const name = text(x.querySelector('.dh b')), d = ALL_DEPTS.find((y) => y.name === name);
    if (d) {
      const set = q('.set');
      if (set) { const lab = text(set.querySelector('.cap')), s = d.settings.find((y) => y.label === lab); if (s) return { t: s.label, k: `${d.name} setting`, d: SETTINGS[`${d.id}.${s.k}`] || '', tip: `Options: ${s.opts.map((o) => o[1]).join(', ')}.` }; }
      if (q('.stepper, .wk > div:first-child')) return { ...ACTIONS.workers, t: 'Workers', k: d.name };
      if (q('.wk')) return { t: 'Automation', k: d.name, d: 'How much of the department\'s work runs by itself: workers hired out of workers needed, plus a head\'s bonus. At 100% you never have to do its tasks by hand.' };
      if (q('.head')) return { t: 'Department head', k: d.name, d: 'A specialist leading this department. Heads add automation and their own bonus to this company.' };
      if ((x = q('[data-a]')) && ACTIONS[x.dataset.a]) return { t: text(x) || d.name, ...ACTIONS[x.dataset.a] };
      return deptHelp(d);
    }
  }
  if ((x = q('.stat, .ofigs > div'))) { const r = term(text(x.querySelector('small'))); if (r) return r; }
  if ((x = q('.tbl th'))) { const r = term(text(x)); if (r) return r; }
  if ((x = q('.tbl.ac tr'))) { const r = term(text(x.querySelector('td'))); if (r) return r; }
  if ((x = q('.suprow'))) { const g = Object.values(GOODS).find((y) => y.name === text(x.querySelector('.supg b'))); if (g && !q('button')) return { t: g.name, k: 'Supply', d: `A supply this company needs. The line shows the need per month, your stock, how many months it lasts and what is on the way, plus market and import prices.${g.producer ? ` Made in the city by ${TYPES[g.producer].name} companies.` : ' Only available by import.'}`, tip: 'Order before it runs out: delivery takes days to weeks depending on the carrier.' }; }
  if ((x = q('.tbl tr'))) { const g = Object.values(GOODS).find((y) => y.name === text(x.querySelector('td b'))); if (g && !q('button')) return { t: g.name, k: 'Supply', d: `${g.producer ? `Made by ${TYPES[g.producer].name} companies and used by others.` : 'Only available by import.'} Sold in ${g.unit}.` }; }
  if ((x = q('.ocard'))) { if ((x = q('[data-a]')) && ACTIONS[x.dataset.a]) return { t: text(x), ...ACTIONS[x.dataset.a] }; return { t: 'Customer order', k: 'Order', d: 'A client wants these units. Accept to promise delivery before the deadline, reject, or counter-offer for a better price. Deliver from finished stock.', tip: 'The client gets upset by rejected, late or ignored orders.' }; }
  if (q('.chero')) { const l = where.company && E.listing(c, where.company); if (l) return typeHelp(l.type, l); }
  if ((x = q('[data-a]'))) {
    const a = x.dataset.a, e = ACTIONS[a];
    if (a === 'tab' && TABS[x.dataset.v]) return { t: text(x), ...TABS[x.dataset.v] };
    if (a === 'deptSet' || a === 'acctPeriod') { /* handled by its box */ } else if (e) return { t: text(x).slice(0, 60) || e.k, ...e };
  }
  if (q('#chat')) return { t: 'Chat', k: 'Players', d: 'Private messages between you and another player. Only the two of you can read them.', tip: 'Right-click a player\'s icon in the top bar to start a conversation.' };
  if (q('#web')) return { t: 'Web browser', k: 'Aurex Bay', d: 'The city\'s own websites: the auction house, dealers, estate agents, carriers, the talent market and the news.' };

  // a modal card
  if (q('#modal') && where.modal) {
    const m = where.modal;
    if (m.t === 'listing') { const l = E.listing(c, m.id); if (l) return typeHelp(l.type, l); }
    if (m.t === 'stock') { const s = STOCKS.find((y) => y.id === m.id); if (s) return { t: `${s.name} shares`, k: 'Stock', d: 'Shares you can buy and sell any time. The price ticks within each week and drifts with the economy: some stocks rise in booms, others in crises.' }; }
    if (m.t === 'staff') { const p = E.TAL.PERSON[m.id], r = p && STAFF.find((y) => y.id === p.kind); if (r) return { t: p.name, k: r.role, d: `${r.passive[0]}: ${r.passive[1]}`, tip: r.hq }; }
    if (m.t === 'wh') { const s = WAREHOUSE_SITES.find((y) => y.id === m.id); if (s) return { t: s.name, k: 'Warehouse', d: s.desc }; }
    if (m.t === 'deliv') return { ...BOXES['deliver orders'], t: 'Delivery map' };
  }

  // the box it sits in
  if ((x = q('.box'))) { const title = text(x.querySelector(':scope > h2')), e = BOXES[norm(title)]; if (e) return { t: title, ...e }; if (/'s empire$/.test(title)) return { t: 'Your empire', k: 'Empire', d: 'Your cash, counting in real time, and your overall numbers. Your companies keep earning while you are away.' }; }
  if (q('#panel') && TABS[where.tab]) return { gen: true, t: where.company ? 'Company dashboard' : text($('tabs').querySelector(`[data-tab="${where.tab}"]`)) || 'This page', ...(where.company ? { k: 'Company', d: 'Run one company: departments, supplies, customer orders, clients and accounts.' } : TABS[where.tab]) };
  if (q('#viewport')) return { gen: true, t: 'City map', ...TABS.map };
  return null;
}

// ---------------------------------------------------------------- the help card
export function showHelp(hp, x, y) {
  let box = $('helpcard');
  if (!box) { box = document.createElement('div'); box.id = 'helpcard'; box.className = 'helpcard'; box.setAttribute('role', 'dialog'); box.tabIndex = -1; box.hidden = true; $('app').appendChild(box); }
  box.innerHTML = `<button type="button" class="hc-x" aria-label="Close help">×</button>${hp.k ? `<span class="hc-k">${esc(hp.k)}</span>` : ''}<b class="hc-t">${esc(hp.t)}</b><p>${esc(hp.d)}</p>${hp.tip ? `<p class="hc-tip">${esc(hp.tip)}</p>` : ''}`;
  box.setAttribute('aria-label', `Help: ${hp.t}`);
  box.hidden = false;
  const r = box.getBoundingClientRect();
  box.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  box.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
  box.focus({ preventScroll: true });
}
export function hideHelp() { const b = $('helpcard'); if (b && !b.hidden) b.hidden = true; }
export function initHelp() {
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#helpcard')) hideHelp(); }, true);
  document.addEventListener('click', (e) => { if (e.target.closest('#helpcard .hc-x')) hideHelp(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideHelp(); });
  window.addEventListener('resize', hideHelp);
}
