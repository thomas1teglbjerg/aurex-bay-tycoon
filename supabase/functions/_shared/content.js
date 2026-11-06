// Aurex Bay Tycoon — static game content. Shared by the web client and the Supabase Edge Function.

export const TYPES = {
  bank: { name: 'Community Bank', sector: 'Finance · Retail Banking', price: 9, trade: 0.9, ypi: 1.4, group: 'finance', tags: ['Finance', 'Loans'],
    perks: [{ t: 'House Bank', d: '−0.5 points interest on your bank loans' }], neg: [{ t: 'Bad Loans', d: '−0.5 M YPI during a recession' }] },
  dealer: { name: 'Car Dealership', sector: 'Automotive · Retail', price: 9, trade: 1.1, ypi: 1.2, group: 'service', tags: ['Automotive', 'Retail'],
    perks: [{ t: 'Trade-ins', d: '+YPI with a Car Factory or Auto Repair in the portfolio' }], neg: [{ t: 'Credit Squeeze', d: 'No Trade during a recession' }] },
  restaurant: { name: 'Restaurant & Café', sector: 'Food & Drink · Hospitality', starter: true, price: 3.5, trade: 0.5, ypi: 0.8, group: 'service', tags: ['Food', 'Starter'],
    perks: [{ t: 'Neighbourhood Spot', d: '+0.2 M YPI for each other company you own in the same district (max 3)' }], neg: [{ t: 'Tight Wallets', d: '−0.3 M YPI during a recession' }] },
  autorepair: { name: 'Auto Repair', sector: 'Automotive · Service', starter: true, price: 4, trade: 0.6, ypi: 0.9, group: 'service', tags: ['Automotive', 'Starter'],
    perks: [{ t: 'Steady Work', d: 'Cars always break: Trade unaffected by recessions' }], neg: [{ t: 'Thin Margins', d: 'No Trade bonus during a boom' }] },
  clothing: { name: 'Clothing Store', sector: 'Fashion · Street Retail', starter: true, price: 4, trade: 0.6, ypi: 0.9, group: 'service', tags: ['Fashion', 'Starter'],
    perks: [{ t: 'Street Style', d: 'Cashes in when fashion goes viral, and +0.3 M YPI during a boom' }], neg: [{ t: 'Tight Wallets', d: '−0.3 M YPI during a recession' }] },
  fashion: { name: 'Fashion House', sector: 'Luxury Goods · Retail Sector', price: 14, trade: 1.5, ypi: 2.5, group: 'media', tags: ['Fashion', 'Luxury'],
    perks: [{ t: 'Influencer Marketing', d: '+1 M YPI with a PR & Media Officer at HQ' }], neg: [] },
  hotel: { name: 'Hotel & Resort', sector: 'Luxury Goods · Service Industry', price: 18, trade: 2, ypi: 3, group: 'service', tags: ['Tourism', 'Luxury'],
    perks: [{ t: 'Economic Boom Advantage', d: '+1 M YPI during a boom' }], neg: [{ t: 'Recession Sensitivity', d: '−1 M YPI during a recession' }] },
  metal: { name: 'Metal Production', sector: 'Manufacturing · Raw Materials', price: 15, trade: 2, ypi: 2.5, group: 'industry', tags: ['Manufacturing', 'Industry'],
    perks: [{ t: 'Industry Synergy', d: '+1 M YPI to Car and Chip Factories in the same portfolio' }], neg: [{ t: 'Crisis Disposal', d: '−3 M YPI during a crisis' }, { t: 'High Maintenance', d: '2 M maintenance per year' }] },
  textile: { name: 'Textile Mill', sector: 'Manufacturing · Textiles', starter: true, price: 12, trade: 1.2, ypi: 1.8, group: 'industry', tags: ['Textiles', 'Industry', 'Starter'],
    perks: [{ t: 'Local Fabric', d: 'Weaves the textiles clothing stores, fashion houses, hotels and the paper buy, and sells them on the city market' }, { t: 'Mill Synergy', d: '+YPI to Clothing Stores and Fashion Houses in the portfolio' }],
    neg: [{ t: 'Fast Fashion Slump', d: '−0.3 M YPI during a recession' }] },
  chemical: { name: 'Chemical Plant', sector: 'Industry · Specialty Chemicals', price: 16, trade: 1.6, ypi: 2.4, group: 'industry', tags: ['Chemicals', 'Industry', 'Premium'],
    perks: [{ t: 'Local Chemicals', d: 'Makes the chemicals pharma, chip factories, textile mills, vineyards and garages buy, and sells them on the city market' }, { t: 'Chemical Synergy', d: '+YPI to Pharma and Chip Factories in the portfolio' }],
    neg: [{ t: 'Safety Inspections', d: '1 M maintenance per year' }, { t: 'Spill Risk', d: '−1 M YPI during a crisis' }] },
  construction: { name: 'Construction Company', sector: 'Industry · Construction & Renovation', price: 14, trade: 1.4, ypi: 2, group: 'industry', tags: ['Construction', 'Industry', 'Renovation'],
    perks: [{ t: 'Building Contracts', d: 'Builds and renovates offices, hotels, shops and homes for corporate clients, using concrete, steel, chemicals and energy' }, { t: 'Builder Synergy', d: '+YPI to Hotels and Restaurants in the portfolio; Metal Production in the portfolio boosts it' }],
    neg: [{ t: 'Building Freeze', d: '−0.5 M YPI during a recession (+0.5 M in a boom)' }] },
  concrete: { name: 'Concrete Plant', sector: 'Industry · Building Materials', price: 10, trade: 1, ypi: 1.4, group: 'industry', tags: ['Concrete', 'Industry', 'Building Materials'],
    perks: [{ t: 'Local Concrete', d: 'Mixes cement, gravel and sand into concrete when you start a batch, and sells it to construction companies and the city market' }, { t: 'Builder Synergy', d: '+YPI to Construction Companies in the portfolio' }],
    neg: [{ t: 'Kiln Upkeep', d: '0.5 M maintenance per year' }, { t: 'Building Freeze', d: '−0.3 M YPI during a recession' }] },
  power: { name: 'Power Plant', sector: 'Utilities · Power Generation', price: 24, trade: 0.8, ypi: 1.2, group: 'industry', tags: ['Energy', 'Utilities', 'Industry'],
    perks: [{ t: 'Own Power', d: 'Turns imported natural gas into electricity and sells it to the city market, where every company buys its energy' }, { t: 'Grid Premium', d: 'Power sells dearer in an energy shortage or oil shock (+0.5 M YPI meanwhile)' }, { t: 'Grid Synergy', d: '+YPI to Metal Production and Data Centers in the portfolio' }],
    neg: [{ t: 'Low Passive Yield', d: 'Earns mainly by selling power, less YPI than other industry' }, { t: 'Turbine Overhaul', d: '1 M maintenance per year' }, { t: 'Gas Bill', d: 'Natural gas is import only and gets dearer in an energy shortage or oil shock' }] },
  car: { name: 'Car Factory', sector: 'Automotive Manufacturing', price: 21, trade: 3, ypi: 3.5, group: 'industry', tags: ['Automotive', 'Industry'],
    perks: [{ t: 'Metal Synergy', d: '+1 M Trade with Metal Production in the portfolio' }], neg: [{ t: 'Energy Dependence', d: 'No Trade income during an energy shortage or oil shock' }] },
  finance: { name: 'Finance & Banking', sector: 'Finance · Banking Sector', price: 22, trade: 3, ypi: 3.5, group: 'finance', tags: ['Finance', 'Loans'],
    perks: [{ t: 'Loan Benefits', d: '−2 points interest on your bank loans' }, { t: 'Stock Portfolio', d: '+1 M YPI if you hold 2+ different stocks' }], neg: [{ t: 'Recession Vulnerability', d: 'No YPI during a recession' }] },
  chip: { name: 'Chip Factory', sector: 'Tech · Microchips', price: 26, trade: 2, ypi: 4.5, group: 'tech', tags: ['Microchip', 'Tech'],
    perks: [{ t: 'Data & Pharma Influence', d: '+1 M YPI to Data & Software and Pharma in the portfolio' }, { t: 'Established', d: '+2 Influence after one year' }], neg: [{ t: 'Cyber Risk', d: 'Exposed to cyberattacks without an IT Systems Engineer' }] },
  data: { name: 'Data & Software', sector: 'Tech · AI · Digital Industry', price: 34, trade: 3, ypi: 4, group: 'tech', tags: ['Tech', 'AI'],
    perks: [{ t: 'AI Trend', d: '±1 M YPI following the AI stock' }, { t: 'Established', d: '+2 Influence after one year' }], neg: [{ t: 'Cyberattack Risk', d: 'Exposed to cyberattacks without an IT Systems Engineer' }] },
  pharma: { name: 'Pharma Industry', sector: 'Pharmaceuticals · Healthcare', price: 38, trade: 4, ypi: 5, group: 'health', tags: ['Pharma', 'Healthcare'],
    perks: [{ t: 'Crisis Immunity', d: 'Trade unaffected by recessions' }, { t: 'Emergency Profits', d: '+3 M YPI during a crisis' }], neg: [] },
  music: { name: 'Music Studio', sector: 'Media & Entertainment · Music', price: 12, trade: 1.2, ypi: 1.8, group: 'media', tags: ['Media', 'Music'],
    perks: [{ t: 'Hit Single', d: '+3 M & +1 Influence on a hit (2 in 6 per year) when Marketing runs or a PR & Media Officer leads it' }, { t: 'Studio Buzz', d: '+1 Influence per year' }], neg: [{ t: 'Fickle Charts', d: '−0.4 M YPI during a recession' }] },
  film: { name: 'Film Production', sector: 'Media & Entertainment', price: 38, trade: 2.5, ypi: 3.5, group: 'media', tags: ['Media', 'Influence'],
    perks: [{ t: 'Influence Boost', d: '+1 Influence per year' }, { t: 'Blockbuster Success', d: '+8 M & +1 Influence on a blockbuster (2 in 6 per year)' }], neg: [{ t: 'Influencer Staff Requirement', d: 'Blockbusters need a PR & Media Officer at HQ' }] },
  newspaper: { name: 'Newspaper', sector: 'Media · News & Publishing', price: 14, trade: 1, ypi: 1.6, group: 'media', tags: ['Media', 'Community'],
    perks: [{ t: 'Ad Desk', d: 'Every ad campaign in the city is booked through the paper: you set the price and keep the money' }, { t: 'Front Page', d: 'Pick the story of the week; the company on the front page wins customers and reputation' }], neg: [{ t: 'Thin Ad Pages', d: '−0.3 M YPI during a recession' }] },
  vineyard: { name: 'Vineyard', sector: 'Food & Drink · Wine Estate', price: 12, trade: 1.2, ypi: 1.6, group: 'service', tags: ['Wine', 'Collectibles'],
    perks: [{ t: 'Vintage Year', d: 'Every harvest: 50% chance to bottle a collectible wine. Sell it to the dealer, at auction or to other players' }, { t: 'Estate Specialists', d: 'Each specialist leading a department raises the odds and the rarity' }, { t: 'House Wine', d: '+YPI to a Restaurant in the portfolio' }],
    neg: [{ t: 'Small Harvests', d: 'Small estates rarely bottle anything above Rare and never a Legendary' }, { t: 'Crisis Hangover', d: '−0.4 M YPI during a crisis' }] }
};

// Portfolio synergies: owning (or contracting with) the first type boosts the second
export const SYNERGY = [['car', 'dealer'], ['autorepair', 'dealer'], ['car', 'autorepair'], ['metal', 'car'], ['metal', 'chip'], ['chip', 'data'], ['chip', 'pharma'], ['film', 'fashion'], ['hotel', 'fashion'], ['finance', 'data'], ['vineyard', 'restaurant'], ['newspaper', 'film'], ['newspaper', 'music'], ['textile', 'clothing'], ['textile', 'fashion'], ['chemical', 'pharma'], ['chemical', 'chip'], ['metal', 'construction'], ['construction', 'hotel'], ['construction', 'restaurant'], ['concrete', 'construction'], ['power', 'metal'], ['power', 'data']];
// yearly maintenance in M per size multiplier (heavy plants)
export const MAINT = { metal: 2, chemical: 1, concrete: 0.5, power: 1 };

export const SIZES = { S: { label: 'Small', mult: 0.6 }, M: { label: 'Medium', mult: 1 }, L: { label: 'Large', mult: 1.5 } };

// ---------------------------------------------------------------- the map
// Two levels: the whole city (MAP, 1448 × 1086) where you pick a district, and a district view with pins.
// box = the district's area on the city map. A district with its own picture (img, w, h) shows it; the others
// show their part of the city map. Everything placed in a district has p = [x, y] as fractions of that view;
// its city-map position (x, y), used for distances and traffic, is worked out from the box.
export const MAP = { w: 1448, h: 1086, img: 'img/map.jpg' };
export const DISTRICTS = [
  { id: 'aurex', name: 'Aurex City', box: { x: 550, y: 170, w: 520, h: 290 }, img: 'img/dist-aurex.jpg', w: 2576, h: 1450, blurb: 'The financial core: glass towers, head offices and the best addresses for money and data.' },
  { id: 'harbor', name: 'Harbor Row', box: { x: 40, y: 530, w: 600, h: 470 }, img: 'img/dist-harbor.jpg', w: 2576, h: 1717, blurb: 'The container port: cranes, warehouses, tank farms and heavy industry by the water.' },
  { id: 'ironport', name: 'Ironport', box: { x: 250, y: 250, w: 300, h: 280 }, img: 'img/dist-ironport.jpg', w: 2576, h: 1932, blurb: 'Old brick blocks, depots and loading docks under the elevated highways.' },
  { id: 'marina', name: 'Marina Bay', box: { x: 550, y: 460, w: 820, h: 180 }, img: 'img/dist-marina.jpg', w: 1671, h: 941, blurb: 'Yachts, waterfront hotels, beach clubs and penthouses along the bay.' },
  { id: 'sunset', name: 'Sunset Strand', box: { x: 0, y: 150, w: 250, h: 380 }, img: 'img/dist-sunset.jpg', w: 2576, h: 1932, blurb: 'The long beach, the pier and its ferris wheel, surf shops and holiday homes.' },
  { id: 'crown', name: 'Crown Hills', ly: 0.96, box: { x: 260, y: 0, w: 880, h: 170 }, img: 'img/dist-crown.jpg', w: 2576, h: 1452, blurb: 'Green hillsides, gated villas and quiet labs with a view of the bay.' },
  { id: 'greenfield', name: 'Greenfield', box: { x: 1070, y: 60, w: 340, h: 300 }, img: 'img/dist-greenfield.jpg', w: 2576, h: 1451, blurb: 'Parks, a golf course and the business parks out by the airport road.' },
  { id: 'nevus', name: 'Nevus Isle', box: { x: 780, y: 640, w: 600, h: 380 }, img: 'img/dist-nevus.jpg', w: 2576, h: 1932, blurb: 'The island across the bridge: research campuses, golf and cliffside estates.' }
];
DISTRICTS.forEach((d) => { d.x = Math.round(d.box.x + d.box.w / 2); d.y = Math.round(d.box.y + d.box.h / 2); });
export const DISTRICT = Object.fromEntries(DISTRICTS.map((d) => [d.id, d]));
export function placeOn(d, p) { const b = DISTRICT[d].box; return { x: Math.round(b.x + p[0] * b.w), y: Math.round(b.y + p[1] * b.h) }; }

// 39 unique listings: [type, district, size, x, y within the district view, title, own picture in img/]
export const LISTINGS = [
  ['clothing', 'ironport', 'S', 0.24, 0.31, 'Eastbridge Supply Co.'], ['fashion', 'aurex', 'L', 0.6, 0.72], ['fashion', 'marina', 'S', 0.54, 0.5],
  ['hotel', 'marina', 'L', 0.2, 0.3], ['hotel', 'marina', 'M', 0.42, 0.4], ['hotel', 'sunset', 'S', 0.45, 0.4, null, 'c-hotel-sunset'],
  ['metal', 'harbor', 'L', 0.4, 0.53], ['metal', 'ironport', 'S', 0.08, 0.1], ['metal', 'harbor', 'M', 0.44, 0.66],
  ['car', 'harbor', 'L', 0.53, 0.46], ['dealer', 'ironport', 'M', 0.42, 0.83, 'Kazen Motors'], ['car', 'aurex', 'S', 0.3, 0.84],
  ['finance', 'aurex', 'L', 0.5, 0.34, 'Bank of Aurex', 'c-bankofaurex'], ['finance', 'aurex', 'M', 0.76, 0.36, 'Harbor Trust', 'c-harbortrust'], ['bank', 'ironport', 'S', 0.48, 0.44, 'Aurex Bank'],
  ['chip', 'nevus', 'L', 0.44, 0.25], ['chip', 'greenfield', 'M', 0.28, 0.17], ['chip', 'harbor', 'S', 0.47, 0.36],
  ['data', 'aurex', 'L', 0.24, 0.26], ['data', 'aurex', 'M', 0.9, 0.58], ['data', 'nevus', 'S', 0.62, 0.42],
  ['pharma', 'nevus', 'L', 0.78, 0.63], ['pharma', 'greenfield', 'M', 0.43, 0.3], ['pharma', 'crown', 'S', 0.86, 0.38],
  ['film', 'crown', 'L', 0.11, 0.17], ['music', 'ironport', 'M', 0.75, 0.88, 'Watertower Sound'], ['film', 'harbor', 'S', 0.58, 0.3],
  ['autorepair', 'ironport', 'S', 0.3, 0.6, 'Kingside Auto Works'],
  ['restaurant', 'ironport', 'S', 0.62, 0.6, 'Ground Café'],
  ['vineyard', 'greenfield', 'S', 0.66, 0.2, 'Greenfield Hill Vines'], ['vineyard', 'crown', 'M', 0.815, 0.6, 'Aurex Bay Vineyard'], ['vineyard', 'nevus', 'L', 0.33, 0.42, 'Nevus Cliff Estate'],
  ['newspaper', 'aurex', 'M', 0.8, 0.5, 'The Aurex Gazette', 'c-gazette'],
  ['textile', 'ironport', 'S', 0.07, 0.84, 'S.O.F.T Textiles'],
  ['chemical', 'harbor', 'L', 0.31, 0.37, 'SAFE Chemicals'],
  ['construction', 'greenfield', 'M', 0.5, 0.82, 'Structura Construction'],
  ['concrete', 'harbor', 'M', 0.695, 0.51, 'Bayside Concrete', 'c-concrete'],
  ['power', 'harbor', 'L', 0.38, 0.2, 'Aurex Energy'],
  ['power', 'ironport', 'M', 0.3, 0.39, 'Aurex City PowerPlant', 'c-powerplant']
].map(([type, d, size, px, py, title, img], i) => ({ id: 'L' + (i + 1), type, d, p: [px, py], district: DISTRICT[d].name, size, ...(title ? { title } : {}), ...(img ? { img } : {}), ...placeOn(d, [px, py]) }));

// the national bank: the Bank of Aurex site in Aurex City (bankofaurex.ab in the in-game browser)
export const CENTRAL_BANK = 'L13';
// national bank rules (central.js): the bank rate the governor steers, levies, and how both move the economy
export const CENTRAL = {
  start: 8, min: 2, max: 10, step: 0.25, moveMax: 0.5, neutral: 6, quarter: 3,
  calm: [5, 8],                  // between these the rate leaves the economy alone
  ownerCut: 0.1,                 // the bank earns this share of the interest other tycoons pay on bank loans
  levyMax: 10, levyPick: 3,      // up to 10% on one of the 3 most crowded sectors and one of the 3 most traded supplies
  levyLoad: 8,                   // levies above this (sector % + supply % / 2) weigh on the economy
  tiltMax: 0.25,                 // at most this much extra chance that a world card moves the economy one step
  px: [0.85, 1.25], pxMove: 0.012, // supply price index: cheap money lifts it, dear money lowers it (per month at the extremes)
  extreme: [3, 9], extremeMonths: 12, ministry: 0.2, // a year outside 3–9% and the Finance Ministry may step in each month
  needTier: 3, needFinance: 6,   // Elite prestige and Finance level 6 to buy the bank
  mortgage: 0.5, savings: 0.3    // personal mortgage and savings rates follow the bank rate by this share
};

export const STAFF = [
  { id: 'michael', role: 'Junior Financial Analyst', name: 'Michael Turner', cost: 1.5, upkeep: 0.5, passive: ['Loan Bonus', 'Gain +0.5 M when taking a loan. Your interest drops 1 M a year.'], hq: 'Head of Finance: running costs −5% in that company.', tags: 'Finance · Risk' },
  { id: 'anika', role: 'IT Systems Engineer', name: 'Anika Rao', cost: 1.5, upkeep: 0.5, passive: ['System Stability', 'The tech company she works in earns +1 M YPI'], hq: 'Head of R&D: research 50% faster and cyberattacks on that company are blocked.', tags: 'Tech · Stability · Infrastructure' },
  { id: 'sofia', role: 'PR & Media Officer', name: 'Sofia Lindström', cost: 2, upkeep: 0.5, passive: ['Public Relations', 'Gain +2 Influence every year. Her media or fashion company +1 M YPI.'], hq: 'Head of Marketing: campaigns and ads 50% stronger.', tags: 'Communication · Marketing' },
  { id: 'robert', role: 'Compliance Assistant', name: 'Robert Hayes', cost: 2, upkeep: 0.5, passive: ['Regulation Shield', 'Auditors never fine the company he works in.'], hq: 'Head of Legal & Compliance: full protection from regulation fines.', tags: 'Regulation · Defense' },
  { id: 'emily', role: 'HR Recruitment Officer', name: 'Emily Carter', cost: 2, upkeep: 0.5, passive: ['Talent Network', 'Specialists cost −0.5 M to recruit.'], hq: 'Head of HR: hiring costs −50% and morale +8 in that company.', tags: 'HR · Growth · Infrastructure' },
  { id: 'carlos', role: 'Logistics Planner', name: 'Carlos Mendoza', cost: 4, upkeep: 1, passive: ['Supply Chain', 'Runs your warehouses: auto-import, auto-supply and warehouse sourcing. +1 Influence a year, and his industrial company +1 M YPI.'], hq: 'Head of Procurement: supplies 5% cheaper for that company.', tags: 'Transport · Mobility' },
  { id: 'marco', role: 'Workshop Chief', name: 'Marco Vitale', cost: 1, upkeep: 0.3, passive: ['Quick Turnaround', 'The auto repair, dealership or car company he works in earns +1 M YPI.'], hq: 'Head of Operations: output +10% in that company.', tags: 'Operations · Automotive' },
  { id: 'jason', role: 'Market Research Associate', name: 'Jason Miller', cost: 4, upkeep: 0.5, passive: ['Market Insight', 'Mails you a technical research note before each World Card. You decide if your network gets it too.'], hq: 'Head of Sales: +50% sales automation in that company.', tags: 'Strategy · Information' }
];

// drift per year: [boom, stable, recession, crisis]
export const STOCKS = [
  { id: 'pharma', name: 'Pharma', d: [0.03, 0.04, 0.03, 0.25], p: 1.4 },
  { id: 'ai', name: 'AI', d: [0.2, 0.08, -0.15, -0.1], p: 1.8 },
  { id: 'oil', name: 'Oil', d: [0.08, 0.03, -0.1, 0.05], p: 1.1 },
  { id: 'gold', name: 'Gold', d: [-0.03, 0.02, 0.12, 0.18], p: 1.5 },
  { id: 'energy', name: 'Energy', d: [0.06, 0.04, -0.05, 0.02], p: 0.9 },
  { id: 'diamonds', name: 'Diamonds', d: [0.12, 0.03, -0.14, -0.12], p: 1.2 },
  { id: 'military', name: 'Military Tech', d: [0.02, 0.03, 0.04, 0.22], p: 1.0 },
  { id: 'streaming', name: 'Streaming Services', d: [0.1, 0.05, -0.03, 0.12], p: 1.3 },
  { id: 'taxi', name: 'Taxi Services', d: [0.08, 0.03, -0.1, -0.25], p: 0.7 },
  { id: 'airline', name: 'Clowd Airline', d: [0.12, 0.03, -0.18, -0.35], p: 0.8 },
  { id: 'fashion', name: 'Demiware Fashion', d: [0.14, 0.03, -0.14, -0.15], p: 1.0 },
  { id: 'watches', name: 'Louis Vanthoben Watches', d: [0.12, 0.03, -0.1, -0.08], p: 1.6 }
];

// One World Card is drawn every game quarter (about 42 real hours at normal speed)
// small things that happen to a company at a random moment in the week (about one every three weeks per company)
// fx: rep / morale / rp are points, cust a customer change (0.04 = +4%), cash M × size, stock = share of one supply lost
// guard: a department that turns a bad one around when it is at least half staffed (or has a head)
export const HAPPENINGS = [
  { id: 'review', title: 'A glowing review', text: 'A popular local blogger raved about {co}.', kind: 'good', fx: { rep: 3, cust: 0.03 } },
  { id: 'press', title: 'Featured in the Aurex Bay Herald', text: 'The paper ran a story on {co}. New faces are coming in.', kind: 'good', fx: { cust: 0.05 } },
  { id: 'idea', title: 'A worker had a good idea', text: 'A small fix on the floor at {co} that nobody had thought of.', kind: 'good', fx: { rp: 12, morale: 3 } },
  { id: 'tip', title: 'A loyal customer tipped the team', text: 'The crew at {co} is in a good mood today.', kind: 'good', fx: { morale: 6 } },
  { id: 'refund', title: 'An old invoice was paid', text: 'A client who had forgotten {co} finally paid up.', kind: 'good', fx: { cash: 0.06 } },
  { id: 'breakdown', title: 'A machine broke down', text: 'Repairs at {co} cost money and a day of work.', kind: 'bad', fx: { cash: -0.08, morale: -3 }, guard: 'ops', saved: 'Your Operations team fixed it before the shift ended.' },
  { id: 'complaint', title: 'An angry post went viral', text: 'A customer of {co} is complaining online.', kind: 'bad', fx: { rep: -3, cust: -0.02 }, guard: 'social', saved: 'Your marketing team answered quickly and turned it around.' },
  { id: 'inspection', title: 'Surprise inspection', text: 'City inspectors went through {co}.', kind: 'bad', fx: { cash: -0.1 }, guard: 'legal', saved: 'Every permit was in order. No fine.' },
  { id: 'theft', title: 'Supplies went missing', text: 'Part of a delivery at {co} is gone.', kind: 'bad', fx: { stock: 0.08 }, guard: 'procurement', saved: 'Procurement had counted everything. The missing crates turned up.' },
  { id: 'sick', title: 'Flu at the workplace', text: 'Half the team at {co} called in sick.', kind: 'bad', fx: { morale: -5 }, guard: 'hr', saved: 'HR had cover ready. Nobody noticed.' },
  { id: 'heatwave', title: 'A busy day', text: 'Sunny weather brought a rush of customers to {co}.', kind: 'good', fx: { cust: 0.02, rep: 1 } }
];

// Mail (Empire › Mail): a happening arrives as an e-mail from someone in the department it concerns.
// body: what they write ({co} = the company); opts: the answers you can give, fx as in HAPPENINGS (cash in M × size),
// gamble: [chance, fx when it works, fx when not]; d: the line under an answer (built from fx when left out).
// safe: what a cautious autopilot answers when you leave the mail for two weeks. saved: the mail when the department handled it.
export const MAIL_HAP = {
  review: { dept: 'social', subj: 'A blogger loves us', body: 'A popular local blogger just raved about {co}. Do we put money behind it, or let it run by itself?',
    opts: [{ l: 'Boost the post', fx: { cash: -0.02, rep: 3, cust: 0.05 } }, { l: 'Say thanks and let it run', safe: true, fx: { rep: 3, cust: 0.03 } }] },
  press: { dept: 'sales', subj: 'We are in the Herald', body: 'The Aurex Bay Herald ran a story on {co} this morning. New faces are already coming in.' },
  idea: { dept: 'ops', subj: 'A small fix from the floor', body: 'One of our people at {co} found a fix on the line that nobody had thought of. Should we reward it?',
    opts: [{ l: 'Pay a small bonus', fx: { cash: -0.02, rp: 12, morale: 6 } }, { l: 'Thank them at the morning meeting', safe: true, fx: { rp: 12, morale: 3 } }] },
  tip: { dept: 'hr', subj: 'Good mood on the team', body: 'A loyal customer tipped the whole crew at {co} today. Spirits are high.' },
  refund: { dept: 'finance', subj: 'An old invoice was paid', body: 'A client who had forgotten about {co} finally paid up.' },
  breakdown: { dept: 'ops', subj: 'A machine broke down', body: 'One of our machines at {co} broke down this morning. We can call the express repair service, or fix it ourselves over a few days.',
    saved: 'A machine at {co} broke down this morning. The team had it running again before the shift ended. Nothing for you to do.',
    opts: [{ l: 'Call the express repair', fx: { cash: -0.12, morale: -1 } }, { l: 'Fix it ourselves', safe: true, fx: { cash: -0.05, morale: -5, cust: -0.01 } }] },
  complaint: { dept: 'social', subj: 'An angry post about us went viral', body: 'A customer of {co} posted an angry review last night and it is spreading fast. How do we answer?',
    saved: 'A customer of {co} posted an angry review last night. We answered within the hour and turned it around. Nothing for you to do.',
    opts: [{ l: 'Apologise and refund them', safe: true, fx: { cash: -0.02, rep: -1 } }, { l: 'Ignore it', fx: { rep: -3, cust: -0.02 } },
      { l: 'Answer with a joke', d: 'Half the time it wins people over (reputation +3, customers +4%). Otherwise reputation −6, customers −4%.', fx: { gamble: [0.5, { rep: 3, cust: 0.04 }, { rep: -6, cust: -0.04 }] } }] },
  inspection: { dept: 'legal', subj: 'City inspectors want to fine us', body: 'City inspectors went through {co} today and want to fine us over a missing permit. We can pay, or fight it.',
    saved: 'City inspectors went through {co} today. Every permit was in order. No fine.',
    opts: [{ l: 'Pay the fine', safe: true, fx: { cash: -0.1 } }, { l: 'Contest it', d: 'Even odds: no fine at all, or the fine plus legal costs (about twice as much).', fx: { gamble: [0.5, {}, { cash: -0.2 }] } }] },
  theft: { dept: 'procurement', subj: 'Supplies went missing', body: 'Part of a delivery at {co} is gone. We can bring in a night guard and get some of it back, or write it off.',
    saved: 'Part of a delivery at {co} looked missing, but we had counted everything. The crates turned up. Nothing for you to do.',
    opts: [{ l: 'Hire a night guard', fx: { cash: -0.03, stock: 0.03 } }, { l: 'Write it off', safe: true, fx: { stock: 0.08 } }] },
  sick: { dept: 'hr', subj: 'Half the team is sick', body: 'The flu is going around {co}. Half the team called in sick today.',
    saved: 'The flu is going around {co}, but we had cover ready. Nobody noticed. Nothing for you to do.',
    opts: [{ l: 'Bring in temps', fx: { cash: -0.04, morale: -1 } }, { l: 'Push through with who we have', safe: true, fx: { morale: -5 } }] },
  heatwave: { dept: 'sales', subj: 'A busy day', body: 'Sunny weather brought a rush of customers to {co} today.' }
};
// people in your companies who write to you (a stable name per company and department)
export const MAIL_NAMES = {
  first: ['Maria', 'Jonas', 'Leila', 'Tom', 'Aisha', 'Pete', 'Hanna', 'Omar', 'Grace', 'Felix', 'Nora', 'Viktor', 'Rosa', 'Ben', 'Ines', 'Kai', 'Lucy', 'Mateo', 'Freya', 'Sami'],
  last: ['Holt', 'Brandt', 'Moreau', 'Okafor', 'Lindqvist', 'Costa', 'Weber', 'Nakamura', 'Doyle', 'Petersen', 'Rossi', 'Haddad', 'Kowalski', 'Byrne', 'Sato', 'Vega']
};
// who sends a decision: someone in that company's department, or someone outside
export const DEC_FROM = {
  union: { dept: 'hr' }, wedding: { dept: 'sales' }, datasale: { dept: 'sales' }, fasttrack: { dept: 'legal' }, star: { dept: 'ops' }, session: { dept: 'ops' }, expansion: { dept: 'procurement' },
  profile: { ext: ['Nina Alvarez', 'Business editor, Aurex Bay Gazette'], k: 'press' }, charity: { ext: ['Office of the Mayor', 'City Hall, Aurex Bay'], k: 'city' }
};
export const GAZETTE = { name: 'The Aurex Bay Gazette', role: 'Monthly business briefing', items: 5 };

export const WORLD = [
  { id: 'boom', title: 'Economic Boom', econ: 'Boom', text: 'Consumer spending surges across Aurex Bay. Luxury stores report record sales and hotels are fully booked.', shock: { diamonds: 0.08, watches: 0.08, fashion: 0.06 }, at: [255, 470] },
  { id: 'recession', title: 'Recession Hits Aurex Bay', econ: 'Recession', text: 'Unemployment climbs and spending dries up. Investors flee to gold while banks tighten lending.', shock: { gold: 0.06 }, at: [830, 440] },
  { id: 'pandemic', title: 'Global Pandemic', econ: 'Crisis', text: 'A new virus shuts down borders. Pharma labs work around the clock, airlines ground their fleets and streaming explodes.', shock: { pharma: 0.2, airline: -0.2, taxi: -0.1, streaming: 0.12 }, at: [1290, 815] },
  { id: 'oil', title: 'Vaelon Oil Shock', econ: null, text: 'Supply cuts in the Vaelon fields send oil prices soaring. Factories that run on cheap energy feel the pain.', shock: { oil: 0.3, airline: -0.15, taxi: -0.1, energy: 0.1 }, fx: 'energy', at: [520, 690] },
  { id: 'energy', title: 'Energy Shortage', econ: null, text: 'Rolling blackouts hit the industrial districts. Production lines in Ironport and Southgate stand still for weeks.', shock: { energy: 0.2, oil: 0.06 }, fx: 'energy', at: [330, 860] },
  { id: 'cyber', title: 'Cyberattack Wave', econ: null, text: 'A coordinated hacker group targets data centers on Nevus Isle and in Aurex City. Unprotected systems go dark.', shock: { ai: -0.12 }, fx: 'cyber', at: [1135, 255] },
  { id: 'regulation', title: 'Regulation Crackdown', econ: null, text: 'City Hall announces audits of tech and finance companies. Fines are expected for anyone caught unprepared.', shock: { ai: -0.04 }, fx: 'regulation', at: [830, 440] },
  { id: 'viral', title: 'Demiware Fashion Goes Viral', econ: null, text: 'A street-style campaign shot in the Old Grid takes over every feed. Fashion is the hottest ticket in town.', shock: { fashion: 0.25 }, fx: 'viral', at: [610, 380] },
  { id: 'aibreak', title: 'AI Breakthrough', econ: 'Boom', text: 'An Aurex City lab unveils a model that writes software by itself. Tech stocks rally hard.', shock: { ai: 0.25, streaming: 0.08 }, fx: 'ai', at: [1135, 255] },
  { id: 'tension', title: 'Military Tension Overseas', econ: null, text: 'Border disputes escalate abroad. Defense contractors win new orders while travel bookings cool.', shock: { military: 0.25, gold: 0.06, airline: -0.08 }, at: [800, 830] },
  { id: 'tourism', title: 'Luxury Tourism Season', econ: null, text: 'Cruise ships line up at Harbor Row. Wealthy visitors spend freely on hotels, watches and diamonds.', shock: { watches: 0.12, diamonds: 0.08 }, fx: 'tourism', at: [255, 470] },
  { id: 'crash', title: 'Stock Market Crash', econ: 'Crisis', text: 'Panic selling wipes out a year of gains in a single afternoon. Only gold and defense hold their value.', shock: { ai: -0.2, streaming: -0.12, airline: -0.12, fashion: -0.12, gold: 0.1 }, at: [830, 440] },
  { id: 'recovery', title: 'Recovery Takes Hold', econ: 'Stable', text: 'Hiring picks up and consumers return to the shops. Analysts call the worst over.', shock: { taxi: 0.06, airline: 0.06 }, at: [610, 380] },
  { id: 'calm', title: 'A Steady Quarter', econ: 'Stable', text: 'No surprises this quarter. Markets move sideways and businesses get on with the work.', shock: {}, at: [610, 380] }
];

// Market insight: the research note a Market Research Associate mails before each World Card.
// It never names the card: the specialist tells what their contacts see per sector and leaves the conclusion to the player.
export const INSIGHT = {
  // per stock: what the specialist hears when it is about to go up, and when it is about to go down
  hint: {
    pharma: ['Lab suppliers tell me reagent orders are through the roof. Someone is getting the pharma labs ready for a busy quarter.', 'The pharma labs are cancelling reagent orders. Not a good sign for that sector.'],
    ai: ['GPU lease rates are climbing fast. The AI people are buying every chip they can get.', 'Data centers are quietly handing back GPU leases. The AI crowd is nervous.'],
    oil: ['Oil traders are paying up for barrels months ahead. They expect crude to get a lot dearer.', 'Crude buyers are holding back. Oil looks soft.'],
    gold: ['The vaults on Harbor Row are taking in more bullion than usual. Money is looking for a safe place.', 'Bullion is leaving the vaults. Investors feel brave enough to skip gold.'],
    energy: ['Power for next quarter is selling at a premium. The utilities stand to gain.', 'Power prices for next quarter are sliding. Energy companies will feel it.'],
    diamonds: ['Bids at the rough-stone tenders are high. Diamond dealers expect rich buyers.', 'Diamond tenders are going unsold. The luxury buyers have gone quiet.'],
    military: ['Defence filings at City Hall have piled up. Contractors are lining up new orders.', 'Defence contracts are being postponed. Military tech could cool off.'],
    streaming: ['Bandwidth at night is way above normal. People are staying home and streaming.', 'Evening bandwidth is down. People are out, not watching.'],
    taxi: ['Ride-hail surge pricing is everywhere. The taxis can barely keep up.', 'Taxi drivers are idling at the ranks. Ride demand is drying up.'],
    airline: ['Forward bookings at Clowd are full. Everyone wants to fly.', 'Forward bookings at Clowd Airline are collapsing. People are cancelling trips.'],
    fashion: ['The textile mills have more orders than they can sew. Demiware is betting on a big season.', 'Textile mills are cutting shifts. Fashion looks weak.'],
    watches: ['Second-hand Vanthoben watches sell above list price. Luxury demand is hot.', 'Second-hand luxury watches are piling up at the dealers. Luxury is cooling.']
  },
  strong: ['This one is big.', 'I would bet on this one.', 'Very clear signal.'],
  weak: ['Smaller move, I think.', 'Not huge, but real.'],
  rumour: 'One more thing, but only a rumour I could not confirm: {x}',
  macro: {
    Boom: 'On the big picture: hiring is up, people are borrowing to spend, and the shops are full. It feels like good times are coming.',
    Recession: 'On the big picture: jobless claims are rising and the banks are tightening loans. I would not be surprised if the economy slows down.',
    Crisis: 'On the big picture: the market is very jumpy and the banks barely lend to each other. Something serious may be coming. Brace for it.',
    Stable: 'On the big picture: things are calming down. Normal numbers, normal mood.',
    none: 'On the big picture: nothing changes, as far as I can tell.'
  },
  fx: { energy: 'The grid operator warns that power reserves are almost gone. Factories that need a lot of energy could stand still.', cyber: 'Hacker forums are full of chatter about breaking into data centers. Tech companies without good protection should watch out.',
    regulation: 'City Hall is hiring auditors. Tech and finance companies should get their papers in order.', viral: 'Old Grid streetwear is all over social media right now. Fashion stores could cash in.',
    tourism: 'The cruise berths at Harbor Row are fully booked. Hotels will be busy.', ai: 'Aurex City labs have filed a record number of patents. Something big may come out of them.' },
  open: ['Here is what my contacts tell me about the coming quarter.', 'A few things I picked up this week that you should know about.', 'My read on what is coming. I only tell you what I see; the trades are your call.'],
  close: ['When it hits, I do not know. Probably within the quarter.', 'I cannot tell you the day. Most likely before the quarter is out.']
};

// Decisions land in a player's inbox. If nobody answers before the deadline, the autopilot picks by policy.
export const DECISIONS = [
  { id: 'union', needs: 'car', title: 'Union Demands at Your Car Factory', text: 'Workers want a raise and threaten to walk out before the new model launch.',
    options: [{ l: 'Accept the raise', d: '−1 M now, +1 Influence', safe: true, fx: { cash: -1, inf: 1 } }, { l: 'Refuse', d: '50% chance of a strike costing 3 M', fx: { gamble: [0.5, -3, 0] } }] },
  { id: 'wedding', needs: 'hotel', title: 'Celebrity Wedding Request', text: 'A pop star wants to book your entire hotel for a three-day wedding. The tabloids will be watching.',
    options: [{ l: 'Host the wedding', d: '+2 M, 30% risk of scandal (−1 Influence)', fx: { cash: 2, risk: [0.3, -1] } }, { l: 'Decline politely', d: 'Nothing happens', safe: true, fx: {} }] },
  { id: 'datasale', needs: 'data', title: 'Offer for Your User Data', text: 'An advertising giant offers to buy anonymized user data from your software company.',
    options: [{ l: 'Sell the data', d: '+4 M, −2 Influence', fx: { cash: 4, inf: -2 } }, { l: 'Protect your users', d: '+1 Influence', safe: true, fx: { inf: 1 } }] },
  { id: 'fasttrack', needs: 'pharma', title: 'Fast-Track Approval', text: 'Lobbyists say they can get your new drug approved a year early. Not cheap, not guaranteed.',
    options: [{ l: 'Pay the lobbyists', d: '−2 M now, 60% chance of +6 M', fx: { cash: -2, gamble: [0.6, 6, 0] } }, { l: 'Wait for normal approval', d: 'Nothing happens', safe: true, fx: {} }] },
  { id: 'star', needs: 'film', title: 'Your Lead Actor Wants More', text: 'The star of your next production demands double pay, or walks.',
    options: [{ l: 'Pay up', d: '−2 M, +1 Influence', fx: { cash: -2, inf: 1 } }, { l: 'Recast the role', d: '−1 Influence', safe: true, fx: { inf: -1 } }] },
  { id: 'session', needs: 'music', title: 'A Rising Rapper Wants Studio Time on Credit', text: 'She has a million followers and no money. Her manager offers a cut of the album instead of the studio fee.',
    options: [{ l: 'Take the cut', d: '−1 M in lost fees, 40% chance of +4 M', fx: { cash: -1, gamble: [0.4, 4, 0] } }, { l: 'Cash only', d: 'Nothing happens', safe: true, fx: {} }] },
  { id: 'expansion', needs: 'metal', title: 'Cheap Scrap Metal Offer', text: 'A broker offers a shipload of scrap at half price. The paperwork looks thin.',
    options: [{ l: 'Buy the shipment', d: '+3 M, 40% risk of a 4 M fine', fx: { cash: 3, gamble: [0.4, -4, 0] } }, { l: 'Pass', d: 'Nothing happens', safe: true, fx: {} }] },
  { id: 'profile', needs: null, title: 'Interview Request', text: 'The Aurex Bay Gazette wants an exclusive profile of you for its business section.',
    options: [{ l: 'Give the interview', d: '+1 Influence', safe: true, fx: { inf: 1 } }, { l: 'Stay out of the spotlight', d: 'Nothing happens', fx: {} }] },
  { id: 'charity', needs: null, title: 'Charity Gala Invitation', text: 'The mayor asks you to sponsor the Harbor Row charity gala.',
    options: [{ l: 'Sponsor the gala', d: '−1 M, +2 Influence', fx: { cash: -1, inf: 2 } }, { l: 'Send flowers', d: 'Nothing happens', safe: true, fx: {} }] }
];

export const BOTS = [
  { id: 'bot-ellen', name: 'Ellen Sörensen', color: '#2f6fb0', avatar: 'img/a-ellen.jpg', style: 'aggressive' },
  { id: 'bot-lars', name: 'Lars Hansen', color: '#c0392b', avatar: 'img/a-lars.jpg', style: 'balanced' },
  { id: 'bot-linda', name: 'Linda Martins', color: '#2e8b57', avatar: 'img/a-linda.jpg', style: 'cautious' },
  { id: 'bot-victor', name: 'Victor Kahn', color: '#8e44ad', style: 'aggressive' },
  { id: 'bot-priya', name: 'Priya Nair', color: '#d35400', style: 'balanced' },
  { id: 'bot-jonas', name: 'Jonas Berg', color: '#16a085', style: 'cautious' },
  { id: 'bot-amara', name: 'Amara Okafor', color: '#b7950b', style: 'balanced' },
  { id: 'bot-diego', name: 'Diego Ramos', color: '#5d6d7e', style: 'aggressive' },
  { id: 'bot-hana', name: 'Hana Kim', color: '#c2185b', style: 'cautious' }
];

export const SPEEDS = [
  { id: 1, label: 'Live', note: '1 year per week' },
  { id: 7, label: 'Day', note: '1 year per day' },
  { id: 168, label: 'Fast', note: '1 year per hour' },
  { id: 2016, label: 'Demo', note: '1 year per 5 minutes' }
];

export const CONFIG = { START_CASH: 20, PLAYER_START_CASH: 10, SEASON_YEARS: 10, HQ_CAP: 3, LOAN_RATE: 8, YEAR_MS: 7 * 24 * 3600 * 1000, HISTORY_MONTHS: 9 };

// ---------------------------------------------------------------- supplies
// Prices are in M per unit. Import = base × 1.5 for goods players can make, × 1.1 for raw goods only importers sell (always available, the ceiling). Export = base × 0.7 (always possible, the floor).
// Between the two, the market price moves with supply and demand from every company in the city.
export const GOODS = {
  steel: { name: 'Steel', base: 0.004, unit: 't', producer: 'metal' },
  aluminum: { name: 'Aluminum', base: 0.006, unit: 't', producer: 'metal' },
  chips: { name: 'Microchips', base: 0.012, unit: 'k pcs', producer: 'chip' },
  software: { name: 'Cloud software', base: 0.008, unit: 'licenses', producer: 'data' },
  media: { name: 'Media content', base: 0.01, unit: 'packages', producer: 'film' },
  // imp: import price over base (default 1.5 for goods the city makes, 1.1 for import-only); the grid imports power cheaper than a ship
  energy: { name: 'Energy', base: 0.002, unit: 'MWh', producer: 'power', imp: 1.25 },
  fuel: { name: 'Natural gas', base: 0.0006, unit: 'MWh gas', producer: null },
  textiles: { name: 'Textiles', base: 0.003, unit: 'bales', producer: 'textile' },
  chemicals: { name: 'Chemicals', base: 0.007, unit: 'drums', producer: 'chemical' },
  // fresh: real ms a batch keeps before it hardens and is thrown out (OPS.freshStep)
  concrete: { name: 'Concrete', base: 0.0025, unit: 't', producer: 'concrete', fresh: 48 * 3600 * 1000 },
  cement: { name: 'Cement', base: 0.003, unit: 't', producer: null },
  gravel: { name: 'Gravel', base: 0.0004, unit: 't', producer: null },
  sand: { name: 'Sand', base: 0.0004, unit: 't', producer: null },
  water: { name: 'Water', base: 0.00005, unit: 'm³', producer: null, mains: true }, // from the mains: paid as used, never stocked
  food: { name: 'Food & beverages', base: 0.002, unit: 'crates', producer: null }
};

// cap = units per game month for a Medium, level 1 company with a full operations team
export const RECIPES = {
  bank: { cap: 20, unit: 'client accounts', in: { software: 0.2, energy: 0.2 }, out: {} },
  dealer: { cap: 12, unit: 'cars sold', in: { energy: 0.3, software: 0.1 }, out: {} },
  restaurant: { cap: 40, unit: 'tables served', in: { food: 1, energy: 0.2 }, out: {} },
  autorepair: { cap: 30, unit: 'repair jobs', in: { steel: 0.2, chemicals: 0.2, energy: 0.3 }, out: {} },
  metal: { cap: 40, unit: 'production runs', in: { energy: 1.5 }, out: { steel: 0.6, aluminum: 0.4 } },
  chip: { cap: 30, unit: 'wafer batches', in: { aluminum: 0.3, energy: 1, chemicals: 0.4 }, out: { chips: 1 } },
  car: { cap: 10, unit: 'cars', in: { steel: 3, aluminum: 1.5, chips: 1, energy: 2 }, out: {} },
  data: { cap: 25, unit: 'subscriptions', in: { chips: 0.3, energy: 1 }, out: { software: 1 } },
  pharma: { cap: 15, unit: 'treatment batches', in: { chemicals: 2, chips: 0.5, software: 0.5 }, out: {} },
  music: { cap: 20, unit: 'recording sessions', in: { software: 0.4, energy: 0.3 }, out: { media: 0.4 } },
  film: { cap: 12, unit: 'productions', in: { software: 1, energy: 1 }, out: { media: 1 } },
  power: { cap: 160, unit: 'MWh generated', in: { fuel: 1.6, water: 0.5 }, out: { energy: 1 } },
  chemical: { cap: 30, unit: 'reactor batches', in: { energy: 1, steel: 0.2 }, out: { chemicals: 1 } },
  construction: { cap: 20, unit: 'building projects', in: { concrete: 1.5, steel: 0.8, chemicals: 0.2, energy: 0.4 }, out: {} },
  // concrete: 1 part cement, 2 sand, 4 gravel, 0.5 water by weight (7.5 parts make 7.5 t), plus mixer power
  // yard: what the company's Warehouse box holds at most, raw materials and finished goods (raw materials start half full).
  // manual: nothing is used by the month; the owner mixes batches by hand (OPS.mixStart/mixEnd, a slider game in js/mixer.js)
  concrete: { cap: 600, unit: 't mixed', in: { cement: 1 / 7.5, sand: 2 / 7.5, gravel: 4 / 7.5, water: 0.5 / 7.5, energy: 0.02 }, out: { concrete: 1 }, yard: { gravel: 4000, sand: 2000, cement: 1000, concrete: 2000 }, manual: true,
    mixNote: 'Recipe: 1 part cement, 2 parts sand, 4 parts gravel and ½ part water, plus 20 kWh of power per tonne. Water comes straight from the mains and is paid as you mix.' },
  textile: { cap: 40, unit: 'loom runs', in: { energy: 0.5, chemicals: 0.1 }, out: { textiles: 1 } },
  clothing: { cap: 40, unit: 'garment drops', in: { textiles: 1, energy: 0.2 }, out: {} },
  fashion: { cap: 20, unit: 'collections', in: { textiles: 3, media: 0.3 }, out: {} },
  // guests: no finished stock and no deliveries. Bookings come in, guests check in when a room and supplies are free, and use the supplies during their stay.
  hotel: { cap: 25, unit: 'guest stays', in: { food: 2, textiles: 0.5, energy: 1, media: 0.3 }, out: {}, guests: { client: 'Booking channel' } },
  finance: { cap: 20, unit: 'client accounts', in: { software: 0.5, energy: 0.5 }, out: {} },
  newspaper: { cap: 30, unit: 'editions', in: { software: 0.3, energy: 0.2, textiles: 0.2 }, out: {} },
  vineyard: { cap: 20, unit: 'barrels', in: { chemicals: 0.3, energy: 0.3, food: 0.2 }, out: {} }
};

// ---------------------------------------------------------------- departments
// need = workers for full automation in a Medium level-1 company. head = the specialist card that can lead it.
export const DEPTS = [
  { id: 'ops', name: 'Operations', head: 'marco', need: 4, cost: 0, desc: 'Runs production. More workers means more output.',
    settings: [{ k: 'shifts', label: 'Shifts', opts: [[1, 'One shift'], [2, 'Two shifts'], [3, 'Around the clock']] }],
    manual: { id: 'overtime', label: 'Plan next month’s production', note: 'A 20-second walk on the floor, then choose overtime' },
    auto: 'Workers keep the lines running.', without: 'Output drops to 30% of capacity.' },
  { id: 'procurement', name: 'Procurement', head: 'carlos', need: 2, cost: 0.5, desc: 'Buys supplies from the city market or imports them.',
    settings: [{ k: 'policy', label: 'Sourcing', opts: [['cheapest', 'Cheapest'], ['own', 'Own companies first'], ['warehouse', 'My warehouses first (needs Carlos)'], ['import', 'Import only']] }, { k: 'stock', label: 'Stock target', opts: [[1, '1 month'], [2, '2 months'], [3, '3 months']] }, { k: 'carrier', label: 'Freight carrier', opts: [['bolt', 'Bolt Air · fast'], ['ridge', 'Ridgeway · standard'], ['harbor', 'Harborline · cheap']] }],
    manual: { id: 'restock', label: 'Order supplies', note: 'Pick a carrier and order each supply by hand' },
    auto: 'Restocks every month by your sourcing rules.', without: 'You restock by hand. Run out and production stops.' },
  { id: 'sales', name: 'Sales', head: 'jason', need: 2, cost: 0.5, desc: 'Closes customer orders and sells surplus supplies.',
    settings: [{ k: 'price', label: 'Price level', opts: [['budget', 'Budget'], ['standard', 'Standard'], ['premium', 'Premium']] }, { k: 'b2b', label: 'Supply pricing', opts: [['undercut', 'Undercut −8%'], ['market', 'Market price'], ['premium', 'Premium +8%']] }],
    manual: { id: 'findCustomers', label: 'Make sales calls', note: '20 seconds, then pick which lead to chase' },
    auto: 'Answers, ships and archives customer orders and lists surplus supplies automatically.', without: 'You answer every order, deliver it on the map and archive cancellations yourself.' },
  { id: 'social', name: 'Marketing', head: 'sofia', need: 1, cost: 0.4, desc: 'Grows your customer base and reputation, and runs ad campaigns on the city’s websites.',
    settings: [{ k: 'intensity', label: 'Social media', opts: [['off', 'Off'], ['normal', 'Steady'], ['viral', 'Go big']] }],
    manual: { id: 'postCampaign', label: 'Shoot a campaign', note: '20 seconds in the studio, then choose how to launch' },
    auto: 'Runs your campaign plan every month.', without: 'Nothing is posted unless you do it.' },
  { id: 'hr', name: 'HR', head: 'emily', need: 1, cost: 0.4, desc: 'Keeps people motivated, paid right and trained.',
    settings: [{ k: 'wages', label: 'Wages', opts: [['low', 'Below market'], ['market', 'Market'], ['high', 'Above market']] }, { k: 'training', label: 'Training', opts: [['off', 'Off'], ['on', 'On']] }],
    manual: { id: 'teamMeeting', label: 'Hold a team meeting', note: '20 seconds with the team, then decide what to offer' },
    auto: 'Morale moves steadily toward your wage and training level.', without: 'Morale slowly slides. Unhappy workers quit.' },
  { id: 'finance', name: 'Finance', head: 'michael', need: 1, cost: 0.4, desc: 'Controls costs and closes the books.',
    settings: [{ k: 'costs', label: 'Cost control', opts: [['normal', 'Normal'], ['lean', 'Lean −6%']] }],
    manual: { id: 'reviewBooks', label: 'Close the monthly books', note: 'Go through invoices, then act on what you find' },
    auto: 'Books close themselves and costs drop 3%.', without: 'Unclosed books add 5% to running costs.' },
  { id: 'rnd', name: 'R&D', head: 'anika', need: 2, cost: 0.8, desc: 'Research raises product quality, price and demand.',
    settings: [{ k: 'budget', label: 'Research budget', opts: [['off', 'Off'], ['low', 'Low'], ['high', 'High']] }],
    manual: { id: 'runExperiment', label: 'Run an experiment', note: '20 seconds in the lab, then choose the next step' },
    auto: 'Researches every month within budget. Protects systems from cyberattacks when fully staffed.', without: 'Research only happens when you run experiments.' },
  { id: 'legal', name: 'Legal & Compliance', head: 'robert', need: 1, cost: 0.4, desc: 'Keeps regulators and lawsuits away.',
    settings: [{ k: 'level', label: 'Compliance', opts: [['basic', 'Basic'], ['strict', 'Strict']] }],
    manual: { id: 'reviewContracts', label: 'Review contracts', note: 'Go through clauses with your lawyer' },
    auto: 'Strict compliance makes this company immune to regulation fines.', without: 'Fines hit unless you review contracts yourself.' }
];
// Small companies run lean: no HR, Finance, R&D or Legal. The owner looks after the few people there are.
export const SMALL_SKIP = ['hr', 'finance', 'rnd', 'legal'];
export const DEPT_DEFAULTS = { ops: { shifts: 1 }, procurement: { policy: 'cheapest', stock: 1, carrier: 'ridge' }, sales: { price: 'standard', b2b: 'market' }, social: { intensity: 'normal' }, hr: { wages: 'market', training: 'off' }, finance: { costs: 'normal' }, rnd: { budget: 'low' }, legal: { level: 'basic' } };
export const WORKER = { salary: 0.08, hireFee: 0.02 };

// ---------------------------------------------------------------- clients and orders
// B2B companies have a few large corporate clients who negotiate hard but stay loyal.
// B2C companies sell through many retail channels with smaller, faster, more impatient orders.
export const MARKET_KIND = { bank: 'b2c', dealer: 'b2c', restaurant: 'b2c', autorepair: 'b2c', metal: 'b2b', textile: 'b2b', chemical: 'b2b', power: 'b2b', construction: 'b2b', concrete: 'b2b', chip: 'b2b', data: 'b2b', finance: 'b2b', pharma: 'b2b', car: 'b2c', clothing: 'b2c', fashion: 'b2c', hotel: 'b2c', music: 'b2c', film: 'b2c', vineyard: 'b2c', newspaper: 'b2c' };
export const CLIENT_RULES = {
  b2b: { start: 4, weight: [1, 2.5], orderChance: 0.55, expire: 3, renegotiate: 0.6, rejectHit: 18, label: 'Corporate client' },
  b2c: { start: 6, weight: [0.4, 1.2], orderChance: 0.7, expire: 2, renegotiate: 0.42, rejectHit: 10, label: 'Retail channel' }
};
// rare VIP guests at a human-run hotel: share = rooms they take (of a month's capacity), mult = price per stay, sup = supplies per stay, rep = reputation after a good stay
export const VIP_GUESTS = [
  { id: 'prince', name: 'The Crown Prince of Valdoria', text: 'wants the whole top floor for a private state visit', share: 0.2, mult: 6, sup: 2.2, rep: 6, cust: 0.06, news: true },
  { id: 'filmstar', name: 'Film star Mara Quinn', text: 'is shooting in Aurex Bay and needs suites for her and her crew', share: 0.25, mult: 4.5, sup: 1.8, rep: 5, cust: 0.08, news: true },
  { id: 'founder', name: 'Tech founder Idris Kade', text: 'is closing a deal in the city and wants total discretion', share: 0.12, mult: 5, sup: 1.6, rep: 3, cust: 0.03 },
  { id: 'orchestra', name: 'The Silverline Orchestra', text: 'is on tour and needs rooms for 80 musicians', share: 0.35, mult: 2.8, sup: 1.5, rep: 4, cust: 0.05 },
  { id: 'delegation', name: 'A Gulf trade delegation', text: 'is in town for a week of meetings and banquets', share: 0.3, mult: 4, sup: 2.4, rep: 4, cust: 0.04 },
  { id: 'sailing', name: 'The national sailing team', text: 'trains in the bay before the regatta', share: 0.3, mult: 3, sup: 2, rep: 3, cust: 0.05 },
  { id: 'collector', name: 'A reclusive art collector', text: 'asks for the best suite and a private chef, price no object', share: 0.06, mult: 8, sup: 2.5, rep: 3, cust: 0.02 }
];
export const VIP = { week: 1 / 40 }; // chance per week for each human-run hotel, scaled by reputation
export const CLIENT_NAMES = {
  bank: ['Ironport households', 'Old Grid shop owners', 'Harbor Row dock workers', 'Small business loans', 'First-time home buyers', 'Ironport Shipyards payroll', 'Student accounts', 'Local savings club'],
  dealer: ['Walk-in buyers', 'Ironport Couriers', 'Aurex Taxi Co', 'First-car buyers', 'Harbor Row Rentals', 'Family trade-ins', 'Online leads', 'City Fleet Services', 'Rideshare drivers'],
  restaurant: ['Walk-ins', 'Office lunch orders', 'Weekend brunch crowd', 'Ironport Shipyards canteen', 'Delivery apps', 'Old Grid Gallery events', 'Night shift regulars', 'Aurex Bay Food Tours', 'Birthday parties'],
  autorepair: ['Aurex Taxi Co', 'Ironport Couriers', 'Harbor Row Rentals', 'Old Grid Car Club', 'Midtown Rideshare', 'Kestrel Delivery Vans', 'Sunset Strand Rentals', 'City Fleet Services', 'Walk-in customers'],
  metal: ['Ironport Shipyards', 'Southgate Assembly', 'Bluewater Engineering', 'Aurex Rail Works', 'Harbor Cranes Ltd', 'Kestrel Robotics', 'Crown Bridge Builders', 'Lagoon Marine'],
  chemical: ['Nevus Pharma Labs', 'Kestrel Semiconductors', 'S.O.F.T Textiles', 'Crown Hills Vintners', 'Aurex Water Works', 'Harbor Coatings Ltd', 'Greenfield Agro', 'City Fleet Services'],
  power: ['City of Aurex Bay', 'Aurex Transit', 'Ironport Shipyards', 'Harbor Row Port Authority', 'Midtown Holdings', 'Kestrel Semiconductors', 'Sunset Resorts Group', 'Aurex Water Works'],
  construction: ['City of Aurex Bay', 'Midtown Holdings', 'Sunset Resorts Group', 'Harbor Logistics', 'Crown Hills Estates', 'Greenfield Business Park', 'Aurex Rail Works', 'Old Grid Housing Trust'],
  concrete: ['Structura Construction', 'City of Aurex Bay', 'Aurex Rail Works', 'Crown Bridge Builders', 'Harbor Row Port Authority', 'Greenfield Business Park', 'Old Grid Housing Trust', 'Midtown Holdings'],
  textile: ['Eastbridge Supply Co.', 'Demiware Apparel', 'Old Grid Upholstery', 'Harbor Sailmakers', 'Aurex Uniform Co', 'Sunset Surf & Style', 'Hotel linen services', 'Crown Hills Atelier'],
  chip: ['Kestrel Robotics', 'Aurex Devices', 'Nevus Instruments', 'Midtown Telecom', 'Greenfield Sensors', 'Harbor Drones', 'Solace Computing', 'Vantage Auto Systems'],
  data: ['Aurex Transit', 'Midtown Holdings', 'Harbor Logistics', 'Sunset Resorts Group', 'Crown Insurance', 'Greenfield Labs', 'City of Aurex Bay', 'Northlagoon Energy'],
  finance: ['Harbor Logistics', 'Ironport Shipyards', 'Aurex Real Estate', 'Crown Hills Family Office', 'Southgate Assembly', 'Midtown Retail Group', 'Lagoon Marine', 'Greenfield Farms'],
  pharma: ['Nevus Medical Group', 'Aurex General Hospital', 'Crown Hills Clinics', 'PharmaPlus Chain', 'Harbor Health', 'Greenfield Care Homes', 'Midtown Pharmacy Co', 'Sunset Wellness'],
  car: ['Midtown Auto Mall', 'Harbor Row Motors', 'Crown Hills Car Gallery', 'Sunset Strand Rentals', 'Greenfield Fleet Leasing', 'Old Grid Garage', 'Aurex Taxi Co', 'Ironport Truck Center', 'Nevus Isle EV Hub'],
  clothing: ['Walk-in shoppers', 'Ironport skaters', 'Old Grid students', 'Harbor Row dock workers', 'Online drops', 'Sunset Surf & Style', 'Night market stall', 'Local sports clubs', 'Vintage collectors'],
  fashion: ['Boutique Lumen', 'Old Grid Department Store', 'Aurex Mall', 'Sunset Surf & Style', 'Crown Hills Atelier', 'Harbor Outlet', 'Midtown Sneaker Lab', 'Lagoon Resort Shops', 'Nevus Concept Store'],
  hotel: ['Northwind Travel', 'Cruise Terminal Desk', 'Aurex Business Travel', 'Wedding Planners Co', 'Conference Bureau', 'Sunset Tour Operators', 'Harbor Row Events', 'Crown Hills Golf Club', 'Airport Shuttle Partners'],
  music: ['StreamBay', 'Aurex FM', 'Old Grid Jazz Club', 'Ironport warehouse nights', 'Indie artists', 'Midtown ad agencies', 'Sunset Open Air', 'Crown Hills Film Festival', 'Podcast networks'],
  newspaper: ['Harbor Row newsstands', 'Aurex City subscribers', 'Crown Hills home delivery', 'Midtown coffee bars', 'Ironport commuters', 'Hotel lobbies', 'Old Grid library', 'Sunset Strand kiosks', 'Online readers'],
  vineyard: ['Cellar Door wine merchants', 'Crown Hills Golf Club', 'Marina Bay restaurants', 'Wine club members', 'Sunset Strand beach bars', 'Aurex Bay Hotel', 'Tasting room visitors', 'Wedding Planners Co', 'Duty-free at the airport'],
  film: ['Grand Cinema Midtown', 'Harbor Row Drive-in', 'StreamBay', 'Crown Hills Film Festival', 'Old Grid Arthouse', 'Nevus Media Network', 'Sunset Open Air', 'Aurex TV', 'Lagoon IMAX']
};

// ---------------------------------------------------------------- interactive tasks
// Each takes about 20 real seconds in the client (people talk, things happen), then asks for a decision.
// Effects are applied by the engine (ops.doTask) using the chosen option id.
export const INTERACTIONS = {
  teamMeeting: { dept: 'hr', title: 'Team meeting', scene: 'The team gathers in the break room.', seconds: 20,
    lines: { high: ['Honestly, things are going well.', 'The new schedule works for me.', 'Can we keep Fridays like this?', 'Good quarter, everyone.'], mid: ['The night shift is getting long.', 'We could use one more pair of hands.', 'Pay is okay, but not great.', 'When do we get the new tools?'], low: ['People are thinking about leaving.', 'We are working weekends again.', 'Nobody listens to us.', 'My salary has not moved in years.'] },
    ask: 'The team asks for something in return.',
    options: [{ id: 'bonus', label: 'Pay a team bonus', note: 'Costs 0.05 M per worker, +18 morale' }, { id: 'listen', label: 'Promise to look into it', note: '+9 morale' }, { id: 'firm', label: 'Hold the line on targets', note: '+3 morale, +10% output next month' }] },
  findCustomers: { dept: 'sales', title: 'Sales calls', scene: 'You work the phones and visit prospects.', seconds: 20,
    lines: { high: ['They want a meeting next week!', 'Great fit for our product.', 'They already know our brand.'], mid: ['Send them a proposal.', 'They are talking to competitors too.', 'Call back after the holidays.'], low: ['They hung up.', 'Price is the only thing they ask about.', 'No budget this quarter.'] },
    ask: 'Three leads look promising. Which do you chase?',
    options: [{ id: 'big', label: 'Chase one big account', note: '55% chance of a large client' }, { id: 'small', label: 'Sign two small clients', note: 'Two small clients, guaranteed' }, { id: 'discount', label: 'Win one with a discount', note: 'One client, guaranteed, pays 10% less' }] },
  postCampaign: { dept: 'social', title: 'Campaign shoot', scene: 'The content team is filming in the studio.', seconds: 20,
    lines: { high: ['This one could go viral.', 'Lighting is perfect.', 'Comments are already rolling in.'], mid: ['Let us try another take.', 'Is the logo visible enough?', 'Engagement is steady.'], low: ['Nobody is sharing it.', 'We need a better hook.', 'The trend already passed.'] },
    ask: 'The edit is ready. How do you launch it?',
    options: [{ id: 'influencer', label: 'Pay an influencer to share it', note: 'Costs 0.1 M × size, +7% customers' }, { id: 'story', label: 'Behind-the-scenes story', note: '+3% customers, +4 reputation' }, { id: 'flash', label: 'Flash sale announcement', note: '+9% customers, −3 reputation' }] },
  reviewBooks: { dept: 'finance', title: 'Closing the books', scene: 'You go through invoices with the bookkeeper.', seconds: 20,
    lines: { high: ['Everything reconciles.', 'Cash flow looks healthy.', 'Margins are up this month.'], mid: ['Two invoices are missing.', 'Supplier fees went up again.', 'This subscription looks unused.'], low: ['We are bleeding cash on supplies.', 'Three clients pay late.', 'The numbers do not add up.'] },
    ask: 'The bookkeeper found something.',
    options: [{ id: 'cut', label: 'Cancel unused subscriptions', note: 'Running costs −4% next month' }, { id: 'chase', label: 'Chase late payers', note: 'Collect 1–3% of last month’s sales' }, { id: 'close', label: 'Just close the books', note: 'No penalty this month' }] },
  runExperiment: { dept: 'rnd', title: 'Lab experiment', scene: 'The prototype is on the test bench.', seconds: 20,
    lines: { high: ['Readings are off the charts!', 'It held under full load.', 'This could be a patent.'], mid: ['Temperature is creeping up.', 'Run it again with new settings.', 'Promising, not conclusive.'], low: ['It broke again.', 'We are missing a component.', 'Back to the drawing board.'] },
    ask: 'Results are in. What next?',
    options: [{ id: 'push', label: 'Push the prototype to its limit', note: '70% chance of +30 research, else +5' }, { id: 'iterate', label: 'Safe iteration', note: '+15 research' }, { id: 'share', label: 'Share findings with partners', note: '+10 research, +3 reputation' }] },
  reviewContracts: { dept: 'legal', title: 'Contract review', scene: 'Your lawyer walks you through the contracts.', seconds: 20,
    lines: { high: ['Clauses are airtight.', 'Regulators will be satisfied.', 'Good template work.'], mid: ['This liability clause is vague.', 'The supplier contract renews automatically.', 'We should add a data clause.'], low: ['This exposes us to fines.', 'Who signed this?', 'We have no compliance log.'] },
    ask: 'How thorough do you want to be?',
    options: [{ id: 'tight', label: 'Rewrite the risky clauses', note: 'Covered against fines for 4 months, costs 0.1 M' }, { id: 'standard', label: 'Standard review', note: 'Covered for 3 months' }, { id: 'skim', label: 'Quick skim', note: 'Covered for 1 month' }] },
  overtime: { dept: 'ops', title: 'Production planning', scene: 'You walk the floor with the shift leaders.', seconds: 20,
    lines: { high: ['We can handle more volume.', 'Machines are running smoothly.', 'The crew is motivated.'], mid: ['Line 2 needs maintenance.', 'We are close to full capacity.', 'Some people want extra hours.'], low: ['Everyone is exhausted.', 'Another breakdown this morning.', 'Overtime again?'] },
    ask: 'How do you boost next month’s output?',
    options: [{ id: 'paid', label: 'Paid overtime', note: '+20% output, −4 morale, costs 0.03 M per worker' }, { id: 'volunteer', label: 'Ask for volunteers', note: '+10% output, −8 morale' }, { id: 'none', label: 'Keep normal hours', note: '+4 morale' }] }
};
// ---------------------------------------------------------------- how departments and tasks look in a business that works differently
// Same rules and the same specialist heads, but the names, texts and scenes of a real hotel.
export const DEPT_LOOK = {
  hotel: {
    ops: { name: 'Front Desk & Housekeeping', desc: 'Checks guests in and gets rooms ready. More staff means more rooms you can fill.',
      settings: { shifts: { label: 'Staffing', opts: [[1, 'Day shift'], [2, 'Day and evening'], [3, 'Open 24/7']] } },
      manual: { label: 'Plan next month’s occupancy', note: 'A 20-second round with housekeeping, then choose extra shifts' },
      auto: 'Reception and housekeeping keep every room turned around.', without: 'Only 30% of the rooms are ready for guests.' },
    procurement: { name: 'Purchasing', desc: 'Buys food for the kitchen, linen, energy and in-room media.',
      manual: { label: 'Order supplies', note: 'Pick a carrier and order food, linen and the rest by hand' },
      auto: 'Keeps the kitchen and linen room stocked every month.', without: 'You order by hand. Run out and guests are turned away.' },
    sales: { name: 'Reservations & Events', desc: 'Takes bookings from travel agents, tour operators, conferences and VIPs.',
      settings: { price: { label: 'Room rates', opts: [['budget', 'Value'], ['standard', 'Standard'], ['premium', 'Luxury']] }, b2b: { label: 'Resale pricing' } },
      manual: { label: 'Call travel agents', note: '20 seconds, then pick which partner to sign' },
      auto: 'Confirms bookings and keeps the calendar full.', without: 'You confirm every booking yourself. Unanswered guests book elsewhere.' },
    social: { name: 'Marketing & Guest Relations', desc: 'Reviews, travel sites and social media bring more guests.',
      settings: { intensity: { label: 'Social media' } },
      manual: { label: 'Shoot a hotel campaign', note: '20 seconds by the pool, then choose how to launch' },
      auto: 'Runs campaigns and answers reviews every month.', without: 'No campaigns and nobody answers reviews.' },
    hr: { name: 'Human Resources', desc: 'Hires, trains and keeps the hotel staff happy.',
      manual: { label: 'Hold a staff briefing', note: '20 seconds with the team, then decide what to offer' } },
    finance: { name: 'Finance & Revenue', desc: 'Watches room rates, costs and the monthly books.',
      manual: { label: 'Close the monthly books', note: 'Go through invoices and the night audit' } },
    rnd: { name: 'Spa & Restaurant', desc: 'Upgrades the restaurant, spa and suites. Raises quality, room rates and demand.',
      settings: { budget: { label: 'Investment' } },
      manual: { label: 'Test a new menu or treatment', note: '20 seconds in the kitchen and spa, then choose the next step' },
      auto: 'The chef and spa team improve the offer every month within budget.', without: 'Nothing new on the menu unless you test it yourself.' },
    legal: { name: 'Licences & Safety', desc: 'Keeps the alcohol licence, fire safety and food hygiene in order.',
      manual: { label: 'Run a safety inspection', note: 'Walk through kitchen, fire exits and the bar with your manager' },
      auto: 'Strict compliance makes this hotel immune to inspection fines.', without: 'Fines hit unless you run the inspection yourself.' }
  }
};
export const SCENE_LOOK = {
  hotel: {
    overtime: { title: 'Occupancy planning', scene: 'You walk the floors with the head of housekeeping.',
      lines: { high: ['Every room is ready by noon.', 'We can take a full house.', 'The new linen cart is a dream.'], mid: ['The third floor needs a deep clean.', 'We are almost fully booked.', 'Some of the team want extra shifts.'], low: ['Everyone is exhausted.', 'Two rooms are out of order again.', 'Double shifts again?'] },
      ask: 'How many extra rooms do you open next month?',
      options: [{ id: 'paid', label: 'Paid extra shifts', note: '+20% rooms, −4 morale, costs 0.03 M per worker' }, { id: 'volunteer', label: 'Ask for volunteers', note: '+10% rooms, −8 morale' }, { id: 'none', label: 'Keep the normal rota', note: '+4 morale' }] },
    findCustomers: { title: 'Calls to travel agents', scene: 'You call tour operators and conference planners.',
      lines: { high: ['They want our rooms for their autumn tours!', 'Their clients loved the spa.', 'They already know our name.'], mid: ['Send them our rates.', 'They are comparing three hotels.', 'Call back after the season.'], low: ['They are fully contracted.', 'Price is the only question.', 'No conferences this quarter.'] },
      ask: 'Three partners are interested. Which do you sign?',
      options: [{ id: 'big', label: 'Chase one big tour operator', note: '55% chance of a large booking partner' }, { id: 'small', label: 'Sign two small travel agents', note: 'Two small partners, guaranteed' }, { id: 'discount', label: 'Win one with a group rate', note: 'One partner, guaranteed, pays 10% less' }] },
    postCampaign: { title: 'Hotel campaign shoot', scene: 'The photographer is shooting at the pool and in the suites.',
      lines: { high: ['The sunset over the pool is perfect.', 'Guests are already sharing it.', 'This suite sells itself.'], mid: ['One more take at the bar.', 'Is the logo in frame?', 'The reviews are steady.'], low: ['Nobody is sharing it.', 'A bad review is going around.', 'It rained all morning.'] } },
    teamMeeting: { title: 'Staff briefing', scene: 'Reception, kitchen and housekeeping meet before the shift.',
      lines: { high: ['Guests keep thanking us.', 'The new rota works.', 'Great reviews this week.'], mid: ['Evenings are getting long.', 'We need one more on reception.', 'Tips are down.'], low: ['People are thinking about leaving.', 'We are short on every shift.', 'Nobody listens to us.'] } },
    reviewBooks: { title: 'Night audit and books', scene: 'You go through the night audit with the revenue manager.',
      lines: { high: ['Every room is billed.', 'Revenue per room is up.', 'Margins look healthy.'], mid: ['Two minibar bills are missing.', 'Laundry costs went up.', 'This booking site fee looks high.'], low: ['We are losing money on food.', 'Three tour operators pay late.', 'The numbers do not add up.'] } },
    runExperiment: { title: 'New menu and spa test', scene: 'The chef plates a tasting menu and the spa tries a new treatment.',
      lines: { high: ['Guests asked for seconds!', 'The new treatment is booked out.', 'This could win a star.'], mid: ['The sauce needs more work.', 'Try it again with the new oil.', 'Promising, not there yet.'], low: ['The dish came back.', 'We are missing an ingredient.', 'Back to the old menu.'] },
      ask: 'The tasting is over. What next?',
      options: [{ id: 'push', label: 'Put it on the menu tonight', note: '70% chance of +30 research, else +5' }, { id: 'iterate', label: 'Refine it quietly', note: '+15 research' }, { id: 'share', label: 'Invite food critics', note: '+10 research, +3 reputation' }] },
    reviewContracts: { title: 'Safety inspection', scene: 'You walk the kitchen, fire exits and bar with your manager.',
      lines: { high: ['The kitchen is spotless.', 'Every fire door closes.', 'The licence is up to date.'], mid: ['One fire extinguisher is out of date.', 'The bar log has gaps.', 'The fridge runs a bit warm.'], low: ['This would fail an inspection.', 'Who signed this off?', 'There is no hygiene log.'] },
      ask: 'How thorough do you want to be?',
      options: [{ id: 'tight', label: 'Fix every issue now', note: 'Covered against fines for 4 months, costs 0.1 M' }, { id: 'standard', label: 'Standard inspection', note: 'Covered for 3 months' }, { id: 'skim', label: 'Quick walk-through', note: 'Covered for 1 month' }] }
  }
};
export const COLLEAGUES = ['Maya', 'Tom', 'Aisha', 'Lukas', 'Jin', 'Sara', 'Omar', 'Elena', 'Viktor', 'Nora', 'Ben', 'Lea'];

// ---------------------------------------------------------------- warehouses
// Import goods into a warehouse, store them, then truck them to your companies. Travel time follows map distance.
// mode: how imports reach the site. importMult × the normal import price; importDays = game days until imports arrive.
export const WAREHOUSE_SITES = [
  { id: 'W1', name: 'Airport Cargo Terminal', d: 'greenfield', p: [0.1, 0.3], mode: 'air', price: 30, upkeep: 1.5, cap: 3000, importMult: 1.05, importDays: 2, exportMult: 1.05, desc: 'Cargo planes land daily. The fastest imports in the city and the biggest storage, at a premium.' },
  { id: 'W2', name: 'Harbor Row Container Port', d: 'harbor', p: [0.22, 0.5], mode: 'sea', price: 22, upkeep: 1.2, cap: 2500, importMult: 0.82, importDays: 20, exportMult: 1.15, desc: 'Container ships bring the cheapest imports, but they take weeks. Best export prices in town.' },
  { id: 'W3', name: 'Ridgeway Haulage', d: 'ironport', p: [0.08, 0.38], img: 'img/w-ridgeway.jpg', mode: 'rail', price: 12, upkeep: 0.6, cap: 1500, importMult: 0.92, importDays: 8, exportMult: 1, desc: 'Ridgeway’s own terminal: freight trains from the mainland and a truck fleet that reaches the whole city.' },
  { id: 'W4', name: 'Pier 9 Logistics Park', d: 'harbor', p: [0.7, 0.52], mode: 'road', price: 10, upkeep: 0.5, cap: 1200, importMult: 0.97, importDays: 6, exportMult: 1, desc: 'Trucks from the coastal highway. Close to Nevus Isle and the east side.' },
  { id: 'W5', name: 'Crown Hills Depot', d: 'crown', p: [0.9, 0.2], mode: 'road', price: 8, upkeep: 0.4, cap: 900, importMult: 0.98, importDays: 6, exportMult: 0.95, desc: 'A small depot in the north. Cheap to own, short trips to the Old Grid and the hills.' }
];
// direct sales between tycoons (deals.js): an offer waits openWeeks for an answer; when the seller delivers it, they have deliverWeeks to send it.
// The price per unit must stay between minPrice and maxPrice × the supply's normal price. When the seller delivers, the buyer pays them halfway between Ridgeway's and Harborline's freight (DEAL.fee).
export const DEALS = { openWeeks: 4, deliverWeeks: 4, minPrice: 0.25, maxPrice: 4 };
// quote requests on a company website: a tycoon asks, the company answers with an offer, the buyer accepts (quotes.js)
export const QUOTES = { minQty: 10, maxQty: 2000, maxWeeks: 12, answerWeeks: 2, acceptWeeks: 2, maxOpen: 6, markup: 1.15, tiers: [[250, 0.05], [1000, 0.1]] };
// the city's own buyer on the plant's website: now and then it orders concrete for road works at the current mixing cost + 10%
export const ROADS = { id: 'roads', name: 'City Road Maintenance', role: 'Aurex Bay public works', week: 0.3, qty: [30, 200], weeks: [2, 5], markup: 1.1,
  jobs: ['Pothole repairs on the harbour road', 'A new kerb line along the avenue', 'Resurfacing a junction', 'Bridge deck patching', 'A new bus stop platform', 'Repairs to the sea wall walkway', 'Footpath renewal by the school'] };
// company websites that take quote requests: host → the listing and the good it sells
export const SITE_CO = { 'baysideconcrete.ab': { lid: 'L37', g: 'concrete' } };
export const LOGISTICS = { truckDaysPer100px: 0.9, minTruckDays: 1, bulkDiscountQty: 500, bulkDiscount: 0.05, upgradeCostMult: 0.5, levelCap: 1.5 };

// ---------------------------------------------------------------- personal life
// Money is in M like the rest of the game. Your personal wallet is separate from your empire's cash.
// Rooms decide which collections a home can hold. cap = slots, add = install cost when the room is optional, null = impossible here.
export const HOMES = [
  { id: 'H1', name: 'Old Grid Loft', d: 'ironport', p: [0.36, 0.18], price: 4.8, units: 8, charges: 0.06, prestige: 25, growth: 0.05, img: 'h1',
    desc: 'A converted brick warehouse on a leafy corner. Tall arched windows, exposed beams and a view of the Aurex City skyline.',
    rooms: { art: { cap: 8 }, watch: { cap: 12 }, wine: { cap: 40, add: 0.35 }, car: null }, noCar: 'No garage in this building. Street parking only.' },
  { id: 'H2', name: 'Midtown Studio Tower', d: 'ironport', p: [0.94, 0.63], price: 1.6, units: 20, charges: 0.03, prestige: 5, growth: 0.035, img: 'h2',
    desc: 'A compact studio in a low white block in Ironport, by the elevated highway. Small, honest and cheap: a smart first step on the property ladder.',
    rooms: { art: { cap: 3, add: 0.04 }, watch: { cap: 6, add: 0.06 }, wine: { cap: 6, add: 0.03 }, car: null }, noCar: 'No parking. The street is full of taxis.',
    names: { art: ['Storage unit', 'Racks and padding in the basement storage unit'], wine: ['Kitchen wine rack', 'Wine rack under the kitchen counter'] } },
  { id: 'H3', name: 'Sunset Strand Beach House', d: 'sunset', p: [0.72, 0.38], price: 9.5, units: 3, charges: 0.09, prestige: 40, growth: 0.045, img: 'h3',
    desc: 'Glass, teak and sand. A double garage opens onto the coast road.',
    rooms: { art: { cap: 5 }, watch: { cap: 8, add: 0.08 }, wine: { cap: 30 }, car: { cap: 2 } } },
  { id: 'H4', name: 'Crown Hills Villa', d: 'crown', p: [0.66, 0.84], price: 18, units: 2, charges: 0.16, prestige: 60, growth: 0.04, img: 'h4',
    desc: 'A gated hillside villa with a stone cellar, a six-car garage and gallery walls made for big canvases.',
    rooms: { art: { cap: 12 }, watch: { cap: 20 }, wine: { cap: 120 }, car: { cap: 6 } } },
  { id: 'H5', name: 'Harbor Row Penthouse', d: 'marina', p: [0.11, 0.09], price: 26, units: 4, charges: 0.22, prestige: 70, growth: 0.03, img: 'h5',
    desc: 'Two floors on top of the harbor. A car elevator brings your collection right up to the living room.',
    rooms: { art: { cap: 16 }, watch: { cap: 20 }, wine: { cap: 60, add: 0.6 }, car: { cap: 3 } } }
];
export const ROOMS = {
  living: { name: 'Living room', short: 'Home', blurb: 'Your finances, lifestyle and dinner parties.' },
  art: { name: 'Gallery', short: 'Art', unit: 'walls', blurb: 'Paintings and sculpture. Lend pieces to the museum for prestige.', install: 'Gallery lighting and hanging rails' },
  wine: { name: 'Wine cellar', short: 'Wine', unit: 'cases', blurb: 'Cases age in the cellar. Each wine has a peak year.', install: 'Climate-controlled wine wall' },
  watch: { name: 'Watch room', short: 'Watches', unit: 'slots', blurb: 'A lit display case and a safe.', install: 'Display case and safe' },
  car: { name: 'Garage', short: 'Cars', unit: 'bays', blurb: 'Classic and modern cars. They cost upkeep.', install: 'Garage' }
};
export const LIFESTYLES = [
  { id: 'modest', name: 'Modest', cost: 0.08, prestige: 0, note: 'Takeaway on weeknights. Nobody notices you.' },
  { id: 'comfortable', name: 'Comfortable', cost: 0.2, prestige: 20, note: 'Good restaurants, a tailor, a driver now and then.' },
  { id: 'lavish', name: 'Lavish', cost: 0.6, prestige: 60, note: 'Private chef, gala tables and the best seats in town.' }
];
export const SALARIES = [0, 0.25, 0.5, 1, 2, 4]; // M per year, paid monthly from your empire
export const TAX = { brackets: [[0.5, 0.3], [2, 0.45], [Infinity, 0.52]], dividend: 0.27, donationCredit: 0.3 };
export const LIFE = { startWallet: 0.4, downMin: 0.2, closing: 0.02, sellFee: 0.03, mortgageYears: 30, mortgageBase: 4.5, rentYield: 0.035, propTax: 0.006, upkeep: 0.004,
  dealerMarkup: 1.15, dealerBuyback: 0.8, auctionPremium: 0.1, sellerFee: 0.1, reserve: 0.8, lendFee: 0.015, overdraft: 0.1 };
export const RARITY = { Common: { pts: 2, drift: -0.005, col: '#7d8a9c' }, Rare: { pts: 6, drift: 0.01, col: '#2f6fb0' }, Epic: { pts: 15, drift: 0.02, col: '#8e44ad' }, Legendary: { pts: 40, drift: 0.035, col: '#c99a33' } };
export const PRESTIGE_TIERS = [
  { min: 0, name: 'Newcomer' }, { min: 60, name: 'Known' }, { min: 150, name: 'Respected' }, { min: 300, name: 'Elite' }, { min: 550, name: 'Icon' }
];
export const PRESTIGE_PERKS = [
  'Bank rate −0.5 pp per tier',
  'New clients start 2 mood happier per tier',
  '+1 Influence per tier every year',
  'Epic lots need Known, Legendary lots need Elite'
];
// annual drift of each collection market by economy, and monthly noise
export const COLLECT_CATS = {
  art: { name: 'Art', drift: { Boom: 0.12, Stable: 0.05, Recession: -0.03, Crisis: -0.12 }, noise: 0.03, care: 0.004, careName: 'insurance' },
  wine: { name: 'Wine', drift: { Boom: 0.06, Stable: 0.04, Recession: 0.01, Crisis: -0.04 }, noise: 0.015, care: 0, careName: '' },
  watch: { name: 'Watches', drift: { Boom: 0.1, Stable: 0.04, Recession: -0.02, Crisis: -0.1 }, noise: 0.025, care: 0.003, careName: 'servicing' },
  car: { name: 'Cars', drift: { Boom: 0.09, Stable: 0.04, Recession: -0.03, Crisis: -0.1 }, noise: 0.02, care: 0.015, careName: 'upkeep' }
};
// Collector cards. v = value in M at the start of the season. ed = how many exist in the city. peak = game year a wine is at its best.
export const COLLECTIBLES = [
  { id: 'a1', cat: 'art', name: 'Harbor at Dusk', maker: 'Mira Kestrel', year: 1962, rarity: 'Rare', v: 0.9, ed: 1, set: 'kestrel', medium: 'Oil on canvas' },
  { id: 'a6', cat: 'art', name: 'Ironport Morning', maker: 'Mira Kestrel', year: 1965, rarity: 'Rare', v: 0.7, ed: 1, set: 'kestrel', medium: 'Oil on canvas' },
  { id: 'a7', cat: 'art', name: 'Lagoon Study', maker: 'Mira Kestrel', year: 1967, rarity: 'Common', v: 0.35, ed: 1, set: 'kestrel', medium: 'Gouache on paper' },
  { id: 'a2', cat: 'art', name: 'Crown of Static', maker: 'Jules Okafor-Lind', year: 1983, rarity: 'Epic', v: 4.2, ed: 1, set: 'crowns', medium: 'Acrylic and oil stick' },
  { id: 'a10', cat: 'art', name: 'Untitled (Gold)', maker: 'Jules Okafor-Lind', year: 1986, rarity: 'Rare', v: 1.6, ed: 1, set: 'crowns', medium: 'Acrylic on canvas' },
  { id: 'a3', cat: 'art', name: 'Two Black Fields', maker: 'Anselm Vey', year: 1958, rarity: 'Legendary', v: 9.5, ed: 1, medium: 'Oil on canvas' },
  { id: 'a4', cat: 'art', name: 'Blue No. 7', maker: 'Ines Marlowe', year: 1961, rarity: 'Epic', v: 3.1, ed: 1, medium: 'Pigment and resin' },
  { id: 'a5', cat: 'art', name: 'Walking Figure', maker: 'Teo Brandt', year: 1949, rarity: 'Legendary', v: 11, ed: 1, medium: 'Bronze' },
  { id: 'a8', cat: 'art', name: 'Neon Grid I', maker: 'Sasha Ruiz', year: 2009, rarity: 'Common', v: 0.12, ed: 5, medium: 'Screen print' },
  { id: 'a9', cat: 'art', name: 'Silver Dial', maker: 'Sasha Ruiz', year: 2014, rarity: 'Rare', v: 0.6, ed: 1, medium: 'Mixed media' },
  { id: 'w1', cat: 'wine', name: 'Château Vaillon Grand Vin 2020', maker: 'Château Vaillon', year: 2020, rarity: 'Rare', v: 0.045, ed: 12, set: 'verlaine', peak: 9, medium: 'Saint-Émilion Grand Cru · wooden case', img: '58% 62%' },
  { id: 'w7', cat: 'wine', name: 'Château Vaillon 2010', maker: 'Château Vaillon', year: 2010, rarity: 'Rare', v: 0.05, ed: 12, set: 'verlaine', peak: 9, medium: 'Case of 6 · red', img: 'center 40%' },
  { id: 'w6', cat: 'wine', name: 'Château Vaillon 1990', maker: 'Château Vaillon', year: 1990, rarity: 'Legendary', v: 0.24, ed: 3, set: 'verlaine', peak: 2, medium: 'Case of 6 · red', img: 'center 40%' },
  { id: 'w2', cat: 'wine', name: 'Domaine Aubrac Grand Cru 2010', maker: 'Domaine Aubrac', year: 2010, rarity: 'Epic', v: 0.11, ed: 6, peak: 7, medium: 'Case of 6 · red' },
  { id: 'w3', cat: 'wine', name: 'Sol Alto Reserva 2015', maker: 'Bodega Sol Alto', year: 2015, rarity: 'Common', v: 0.012, ed: 40, peak: 4, medium: 'Case of 6 · red' },
  { id: 'w4', cat: 'wine', name: 'Ridgeback Cabernet 2012', maker: 'Ridgeback Estate', year: 2012, rarity: 'Rare', v: 0.03, ed: 20, peak: 5, medium: 'Case of 6 · red' },
  { id: 'w5', cat: 'wine', name: 'Maison Clairet Brut 2008', maker: 'Maison Clairet', year: 2008, rarity: 'Rare', v: 0.025, ed: 20, peak: 3, medium: 'Case of 6 · sparkling' },
  { id: 'w8', cat: 'wine', name: 'Tenuta Rossa 2013', maker: 'Tenuta Rossa', year: 2013, rarity: 'Common', v: 0.018, ed: 30, peak: 8, medium: 'Case of 6 · red' },
  { id: 'w9', cat: 'wine', name: 'Kaito 25 Year Single Malt', maker: 'Kaito Distillery', year: 1999, rarity: 'Epic', v: 0.09, ed: 8, peak: 99, medium: 'Case of 3 · whisky' },
  { id: 't1', cat: 'watch', name: 'Vanthoben Chronomaster Panda', maker: 'Vanthoben', year: 1969, rarity: 'Epic', v: 0.42, ed: 2, set: 'aurel', medium: 'Steel chronograph' },
  { id: 't4', cat: 'watch', name: 'Vanthoben Red-Blue GMT', maker: 'Vanthoben', year: 1983, rarity: 'Rare', v: 0.11, ed: 3, set: 'aurel', medium: 'Steel GMT' },
  { id: 't8', cat: 'watch', name: 'Vanthoben Chronograph Rose', maker: 'Vanthoben', year: 2016, rarity: 'Rare', v: 0.15, ed: 3, set: 'aurel', medium: 'Rose gold, blue dial, automatic', img: '64% 50%' },
  { id: 't2', cat: 'watch', name: 'Halden Deep 300', maker: 'Halden', year: 1978, rarity: 'Rare', v: 0.09, ed: 4, medium: 'Steel diver' },
  { id: 't3', cat: 'watch', name: 'Vauclair Perpetual Calendar', maker: 'Vauclair', year: 1995, rarity: 'Legendary', v: 1.4, ed: 1, medium: 'Platinum' },
  { id: 't5', cat: 'watch', name: 'Lindqvist Rectangle', maker: 'Lindqvist', year: 1972, rarity: 'Common', v: 0.03, ed: 6, medium: 'Gold, leather strap' },
  { id: 't6', cat: 'watch', name: 'Halden Diver Green', maker: 'Halden', year: 2010, rarity: 'Common', v: 0.025, ed: 6, medium: 'Steel diver' },
  { id: 't7', cat: 'watch', name: 'Vauclair Tourbillon', maker: 'Vauclair', year: 2018, rarity: 'Epic', v: 0.36, ed: 2, medium: 'Rose gold' },
  { id: 'c1', cat: 'car', name: 'Varenne GT 1967', maker: 'Varenne', year: 1967, rarity: 'Legendary', v: 6.5, ed: 1, set: 'lemans', medium: 'V12 coupé' },
  { id: 'c2', cat: 'car', name: 'Moretti Stradale', maker: 'Moretti', year: 1972, rarity: 'Epic', v: 2.4, ed: 1, set: 'lemans', medium: 'Mid-engine V8' },
  { id: 'c3', cat: 'car', name: 'Halsey Roadster', maker: 'Halsey', year: 1958, rarity: 'Rare', v: 0.45, ed: 2, medium: 'Open two-seater' },
  { id: 'c4', cat: 'car', name: 'Vellano V9 Coupé', maker: 'Vellano', year: 1971, rarity: 'Rare', v: 0.24, ed: 3, medium: 'Air-cooled flat-six coupé', img: '58% 60%' },
  { id: 'c5', cat: 'car', name: 'Aurex Motors Prototype', maker: 'Aurex Motors', year: 2021, rarity: 'Epic', v: 1.2, ed: 1, medium: 'Electric hypercar' },
  { id: 'c6', cat: 'car', name: 'Nordvik Rally', maker: 'Nordvik', year: 1985, rarity: 'Rare', v: 0.3, ed: 2, medium: 'Group B rally car' },
  { id: 'c7', cat: 'car', name: 'Brasco 440', maker: 'Brasco', year: 1970, rarity: 'Common', v: 0.12, ed: 3, medium: 'Muscle car' }
];
// Vineyards bottle a collectible wine at harvest (once a year). odds = rarity weights by estate size; top = the rarest a size can make.
// Each specialist leading a department adds perHead to the chance and bump × rating to the chance of one rarity step up.
export const VINTAGE = {
  chance: 0.5, perHead: 0.08, maxChance: 0.85, bump: 0.04, maxBump: 0.6, harvest: 34,
  odds: { S: { Common: 72, Rare: 25, Epic: 3, Legendary: 0 }, M: { Common: 55, Rare: 33, Epic: 10, Legendary: 2 }, L: { Common: 40, Rare: 38, Epic: 17, Legendary: 5 } },
  top: { S: 'Epic', M: 'Legendary', L: 'Legendary' },
  cases: { Common: 10, Rare: 6, Epic: 3, Legendary: 1 },
  value: { Common: [0.012, 0.02], Rare: [0.025, 0.05], Epic: [0.08, 0.12], Legendary: [0.2, 0.3] },
  // the labels a vineyard can bottle, by rarity. Three houses: Bayline (everyday to mid), Château Vaillon (every tier), Crown Hills (only the fine end).
  // pic = picture img/<pic>.jpg. These wines are never sold by the dealer or the auction house: only players' vineyards make them.
  labels: [
    { id: 'pb1', rarity: 'Common', maker: 'Bayline Vineyards', name: 'Bayline Cabernet Sauvignon 2018', color: 'red', pic: 'x-pb1' },
    { id: 'pb2', rarity: 'Common', maker: 'Bayline Vineyards', name: 'Aurex Bay Cabernet Sauvignon 2015', color: 'red', pic: 'x-pb2' },
    { id: 'pv1', rarity: 'Common', maker: 'Château Vaillon', name: 'Château Vaillon Saint-Émilion', color: 'red', pic: 'x-w7' },
    { id: 'pb3', rarity: 'Rare', maker: 'Bayline Vineyards', name: 'Bayline Estate Reserve 2018', color: 'red', pic: 'x-pb3' },
    { id: 'pb4', rarity: 'Rare', maker: 'Bayline Vineyards', name: 'Bayline Silver Edition 2020', color: 'red', pic: 'x-pb4' },
    { id: 'pv2', rarity: 'Rare', maker: 'Château Vaillon', name: 'Château Vaillon Grand Vin', color: 'red', pic: 'x-w7' },
    { id: 'pc1', rarity: 'Rare', maker: 'Crown Hills Vineyards', name: 'Crown Hills Cabernet Sauvignon 2018', color: 'red', pic: 'x-pc1' },
    { id: 'pv3', rarity: 'Epic', maker: 'Château Vaillon', name: 'Château Vaillon Grand Cru Réserve', color: 'red', pic: 'x-w7' },
    { id: 'pc2', rarity: 'Epic', maker: 'Crown Hills Vineyards', name: 'Crown Hills Cabernet Sauvignon 2000', color: 'red', pic: 'x-pc2' },
    { id: 'pv4', rarity: 'Legendary', maker: 'Château Vaillon', name: 'Château Vaillon Grand Cru 1990', color: 'red', pic: 'x-pv4' },
    { id: 'pc3', rarity: 'Legendary', maker: 'Crown Hills Vineyards', name: 'Crown Hills Cabernet Sauvignon 1970', color: 'red', pic: 'x-pc3' }
  ]
};
// Auto repair shops build a collectible tuner car once a year for the Aurex Bay Tuner Show. Same odds model as VINTAGE;
// the rarity picks the model (each model has the rarities it can come in) and a trim. builds = how many cars of one run.
export const TUNER = {
  chance: 0.5, perHead: 0.08, maxChance: 0.85, bump: 0.04, maxBump: 0.6, harvest: 14,
  odds: VINTAGE.odds, top: VINTAGE.top,
  cases: { Common: 4, Rare: 3, Epic: 2, Legendary: 1 },
  value: { Common: [0.05, 0.09], Rare: [0.12, 0.2], Epic: [0.3, 0.5], Legendary: [0.8, 1.2] },
  models: [
    { id: 'trailhawk', name: 'Rivermore Trailhawk', body: 'Lifted off-road SUV', pic: 'x-tuner-trailhawk', rar: ['Common', 'Rare', 'Epic'] },
    { id: 'takemi', name: 'Takemi VTEC', body: 'Tuned sport sedan', pic: 'x-tuner-takemi', rar: ['Common', 'Rare', 'Epic'] },
    { id: 'gtrs', name: 'Valtor GT-RS', body: 'Widebody turbo coupé', pic: 'x-tuner-gtrs', rar: ['Rare', 'Epic', 'Legendary'] }
  ],
  trims: { Common: ['Street', 'Daily Driver'], Rare: ['Stage 2', 'Sport'], Epic: ['Stage 3', 'Track Spec'], Legendary: ['Time Attack', 'One-Off'] }
};
// Car dealerships get their own collectible cars on the same model (never tuner cars): mid-range Valtor Motors (Z37, R-500, and the
// expensive GT-R) and exclusive Bergwald (never Common). vx = the model's value multiplier. An empty models list switches it off.
export const DEALER_CARS = { ...TUNER, harvest: 22,
  // Common = a mid-range Valtor; fewer cars per run than a tuner shop
  odds: { S: { Common: 45, Rare: 40, Epic: 15, Legendary: 0 }, M: { Common: 35, Rare: 38, Epic: 21, Legendary: 6 }, L: { Common: 25, Rare: 38, Epic: 27, Legendary: 10 } },
  cases: { Common: 3, Rare: 2, Epic: 1, Legendary: 1 },
  value: { Common: [0.08, 0.14], Rare: [0.18, 0.3], Epic: [0.45, 0.7], Legendary: [1.1, 1.6] },
  models: [
    { id: 'va-z37', name: 'Valtor Z37', body: 'Sports coupé', pic: 'x-valtor-z37', rar: ['Common', 'Rare'] },
    { id: 'va-r500', name: 'Valtor R-500', body: 'Roadster', pic: 'x-valtor-r500', rar: ['Common', 'Rare'], vx: 1.1 },
    { id: 'va-gtr', name: 'Valtor GT-R', body: 'Supercar coupé', pic: 'x-valtor-gtr', rar: ['Epic', 'Legendary'], vx: 1.4 },
    { id: 'bw-x7', name: 'Bergwald X7', body: 'Exclusive luxury SUV', pic: 'x-bergwald-x7', rar: ['Rare', 'Epic'] },
    { id: 'bw-s7', name: 'Bergwald S7', body: 'Exclusive sportback saloon', pic: 'x-bergwald-s7', rar: ['Rare', 'Epic'] },
    { id: 'bw-gt', name: 'Bergwald GT', body: 'Exclusive grand tourer coupé', pic: 'x-bergwald-gt', rar: ['Rare', 'Epic', 'Legendary'] },
    { id: 'bw-crown', name: 'Bergwald Crown Hills', body: 'Exclusive stretched limousine', pic: 'x-bergwald-crown', rar: ['Epic', 'Legendary'] }
  ],
  trims: { Common: ['Signature'], Rare: ['Signature'], Epic: ['Launch Edition'], Legendary: ['Founders Edition'] } };
// Companies that make a collectible once a year. spec = the odds table above; cat = the collection it joins.
// words = what the UI and the notes call things (the output, one unit, where it waits, the shop that buys it, the yearly event).
export const CRAFT = {
  vineyard: { spec: VINTAGE, cat: 'wine', words: { item: 'vintage', unit: 'case', units: 'cases', store: 'estate cellar', home: 'own cellar', dealer: 'Cellar Door', dealerKind: 'wine merchant', event: 'harvest', box: 'Harvest & wine cellar', made: 'bottled', who: 'estate', place: 'cellar', empty: 'Wine you bottle lands here' } },
  autorepair: { spec: TUNER, cat: 'car', words: { item: 'tuner car', unit: 'car', units: 'cars', store: 'workshop garage', home: 'own garage', dealer: 'Coastline Classics', dealerKind: 'classic car dealer', event: 'tuner show', box: 'Tuner builds & garage', made: 'built', who: 'shop', place: 'garage', none: 'The team worked on customer cars all season, but no build was good enough for the show.', empty: 'Tuner cars you build land here' } },
  dealer: { spec: DEALER_CARS, cat: 'car', words: { item: 'collector car', unit: 'car', units: 'cars', store: 'showroom', home: 'own garage', dealer: 'Coastline Classics', dealerKind: 'classic car dealer', event: 'launch event', box: 'Collector cars & showroom', made: 'unveiled', who: 'dealership', place: 'showroom', none: 'Only regular stock this year, no collector edition for the launch.', empty: 'Collector cars from Valtor and Bergwald land here' } }
};
export const SETS = {
  kestrel: { name: 'The Kestrel Harbors', bonus: 0.12, prestige: 40 },
  crowns: { name: 'Okafor-Lind Crowns', bonus: 0.15, prestige: 40 },
  verlaine: { name: 'Vaillon Vertical', bonus: 0.1, prestige: 30 },
  aurel: { name: 'Vanthoben Trinity', bonus: 0.12, prestige: 35 },
  lemans: { name: 'Le Mans Legends', bonus: 0.15, prestige: 60 }
};
// A dinner party at home: pick guests and a case of wine. Better wine, stronger effect.
export const DINNER = {
  seconds: 20, title: 'Dinner party', scene: 'Candles are lit. Your guests arrive at the loft.',
  lines: ['What a view.', 'Is this the Vaillon? Remarkable.', 'Tell us how you started.', 'I hear you are buying in Old Grid.', 'Another glass, please.', 'We should do business together.', 'Your gallery is the talk of the town.', 'I have a piece you might like.'],
  guests: [
    { id: 'clients', label: 'Your best clients', note: 'Every client in your companies gets happier' },
    { id: 'bankers', label: 'Bankers and investors', note: 'Lower bank rate for 12 months' },
    { id: 'collectors', label: 'Collectors and dealers', note: 'A private sale offer below market value' }
  ],
  names: ['Isabel Moreau', 'Henrik Dahl', 'Ama Boateng', 'Kenji Ito', 'Clara Vos', 'Rafael Ortiz', 'Signe Holm', 'Marcus Webb']
};

// ---------------------------------------------------------------- specialists as a market
// Every specialist is a real person who can work for one tycoon at a time. kind = the role (see STAFF);
// a tycoon can hold one specialist per role. rating 1–5 sets salary, transfer value and how strong they are as a head.
export const TALENT = [
  { id: 'michael', kind: 'michael', name: 'Michael Turner', rating: 3, img: true }, { id: 't-priya', kind: 'michael', name: 'Priya Shah', rating: 4 }, { id: 't-henrik', kind: 'michael', name: 'Henrik Vos', rating: 2 },
  { id: 'anika', kind: 'anika', name: 'Anika Rao', rating: 3, img: true }, { id: 't-diego', kind: 'anika', name: 'Diego Alvarez', rating: 5 }, { id: 't-mei', kind: 'anika', name: 'Mei Lin', rating: 2 },
  { id: 'sofia', kind: 'sofia', name: 'Sofia Lindström', rating: 3, img: true }, { id: 't-jamal', kind: 'sofia', name: 'Jamal Reed', rating: 4, img: true }, { id: 't-clara', kind: 'sofia', name: 'Clara Novak', rating: 2 },
  { id: 'robert', kind: 'robert', name: 'Robert Hayes', rating: 3, img: true }, { id: 't-ingrid', kind: 'robert', name: 'Ingrid Falk', rating: 4 }, { id: 't-tomas', kind: 'robert', name: 'Tomás Silva', rating: 2 },
  { id: 'emily', kind: 'emily', name: 'Emily Carter', rating: 3, img: true }, { id: 't-yara', kind: 'emily', name: 'Yara Haddad', rating: 4 }, { id: 't-noah', kind: 'emily', name: 'Noah Brooks', rating: 2, img: true },
  { id: 'carlos', kind: 'carlos', name: 'Carlos Mendoza', rating: 4, img: true }, { id: 'mack', kind: 'carlos', name: 'Mack Brennan', rating: 1, img: true, starter: true, role: 'Logistics Operator', pay: 0.6 }, { id: 't-olga', kind: 'carlos', name: 'Olga Petrova', rating: 3 }, { id: 't-sam', kind: 'carlos', name: 'Sam Okoye', rating: 2 },
  { id: 'marco', kind: 'marco', name: 'Marco Vitale', rating: 2, img: true, starter: true }, { id: 't-dana', kind: 'marco', name: 'Dana Kowalski', rating: 3 }, { id: 't-viktor', kind: 'marco', name: 'Viktor Hale', rating: 4 },
  { id: 'rohan', kind: 'jason', name: 'Rohan Mehta', rating: 3, img: true, role: 'Sales Executive', pay: 1.1,
    bio: 'Top seller at Kazen Motors three years running. Remembers every customer’s name, their kids’ names and what they drove in 2009. Has never met a deal he could not close.',
    passive: ['Can Sell Anything', 'Customer demand +15% in the company where he heads Sales, and +1 M YPI at a car dealership.'] },
  { id: 'dario', kind: 'marco', name: 'Dario Russo', rating: 4, img: true, role: 'General Manager', pay: 2,
    bio: 'Turned around two failing dealerships in the last downturn. Calm, demanding and allergic to excuses. When the market drops, his numbers do not.',
    passive: ['Steady Hand', 'Recessions and crises never cut customer demand in the company where he heads Operations.'] },
  { id: 'jason', kind: 'jason', name: 'Jason Miller', rating: 3, img: true }, { id: 't-elena', kind: 'jason', name: 'Elena Rossi', rating: 5, img: true }, { id: 't-kofi', kind: 'jason', name: 'Kofi Mensah', rating: 2 },
  { id: 'laurent', kind: 'marco', name: 'Laurent Beaumont', rating: 5, img: true, role: 'Master Sommelier', pay: 1.8,
    bio: 'Forty harvests in Crown Hills. Names the vintage, the slope and the weather that year from one sip, and has sent back wine at every five-star table in the bay.',
    passive: ['Grand Palate', 'At a hotel, restaurant or vineyard where he heads Operations: +1 M YPI. At a vineyard: +15% chance of a collectible vintage and +20% chance it comes out one rarity higher.'] },
  { id: 'elise', kind: 'jason', name: 'Elise Marchand', rating: 4, img: true, role: 'Sommelier', pay: 1.4,
    bio: 'Grew up between the barrels at Crown Hills. Runs the wine list at the best tables in Aurex Bay and has the case sold before the cork is out.',
    passive: ['Perfect Pairing', 'At a hotel, restaurant or vineyard where she heads Sales: customer demand +12% and +0.5 M YPI. At a vineyard: +10% vintage chance and +10% rarity chance.'] }
];
// Sommeliers pay off in hospitality: where one heads a department of these types. ypi × size; demand multiplies;
// chance / bump add to the vineyard's vintage odds (VINTAGE).
export const SOMMELIER = {
  types: ['hotel', 'restaurant', 'vineyard'],
  laurent: { ypi: 1, demand: 1, chance: 0.15, bump: 0.2 },
  elise: { ypi: 0.5, demand: 1.12, chance: 0.1, bump: 0.1 }
};
export const TALENT_TITLE = ['Junior', 'Associate', '', 'Senior', 'Star'];
// salary ask per year = base[kind] × mult[rating]; signing fee for free agents = fee × mult
export const TALENT_RULES = {
  base: { marco: 0.35, michael: 0.5, anika: 0.5, sofia: 0.55, robert: 0.5, emily: 0.5, carlos: 0.8, jason: 0.6 },
  mult: [0.55, 0.75, 1, 1.4, 2], feeMult: [0.5, 0.75, 1, 1.5, 2.4], maxYears: 4,
  stressBase: 3, burnout: 90, leaveMonths: 2, boredomHead: 3, boredomIdle: 6, quitBelow: 22, notice: 2, xpPerRating: 30,
  vacationCooldown: 6, challengeCooldown: 3, scoutMonths: 12, scoutFee: 0.05, offerMonths: 2
};
// inactive owners and the hostile takeover market
export const TAKEOVER = { inactiveMonths: 4, bidMonths: 2, minBid: 0.8, botChance: 0.35, rejectFee: 0.03 };

// ---------------------------------------------------------------- freight carriers
// Supplies you buy and goods you export travel with one of three carriers. Freight = fee + pct × cargo value.
// Cargo bought from other players inside the city takes the local leg (shorter, 40% of the rate).
// partner: a warehouse where the carrier has its own terminal and gives a better deal.
export const CARRIERS = [
  { id: 'bolt', name: 'Bolt Air Express', short: 'Bolt Air', host: 'boltexpress.ab', mode: 'air', color: '#e11d48', days: [2, 3], localDays: [0.5, 1], pct: 0.12, fee: 0.02, delay: 0.03, delayDays: [1, 2], dmgChance: 0, dmg: [0, 0], bulkQty: 0, bulk: 0,
    tag: 'Fastest in the bay. Insured, tracked and expensive.', partner: { site: 'W1', days: 0.5, cost: 0.7, note: 'Express lane at the Airport Cargo Terminal: half the time, 30% cheaper.' } },
  { id: 'ridge', name: 'Ridgeway Haulage', short: 'Ridgeway', host: 'ridgeway.ab', mode: 'road', color: '#2563eb', days: [6, 9], localDays: [1, 2], pct: 0.05, fee: 0.01, delay: 0.12, delayDays: [2, 4], dmgChance: 0.04, dmg: [0.03, 0.08], bulkQty: 500, bulk: 0.25,
    tag: 'Trucks and freight trains. Reliable, fair prices, bulk discounts.', partner: { site: 'W3', days: 0.8, cost: 0.8, note: 'Ridgeway’s home terminal in Ironport: faster and 20% cheaper.' } },
  { id: 'harbor', name: 'Harborline Shipping', short: 'Harborline', host: 'harborline.ab', mode: 'sea', color: '#0f766e', days: [16, 24], localDays: [3, 5], pct: 0.02, fee: 0.004, delay: 0.3, delayDays: [4, 10], dmgChance: 0.15, dmg: [0.04, 0.12], bulkQty: 0, bulk: 0,
    tag: 'Container ships. Cheapest by far, but slow and often late.', partner: { site: 'W2', days: 1, cost: 0.8, delay: 0, note: 'Berths at Harbor Row Container Port: never delayed there, 20% cheaper.' } }
];

// place warehouses and homes from their district position
[...WAREHOUSE_SITES, ...HOMES].forEach((o) => Object.assign(o, { district: DISTRICT[o.d].name }, placeOn(o.d, o.p)));

// ---------------------------------------------------------------- Marketing: ad campaigns on the city's websites
// A campaign runs for a few weeks and shows ads in the in-game browser. Cost per week = perWeek × company size.
// Company campaigns grow customers and reputation every week; a product campaign lifts the market value of that one piece.
// The house ad: one advertisement run by the administrator / system (never by players). It shows in the
// Gazette box on the Market tab and stays fixed on The Aurex Gazette website. Change it here.
export const HOUSE_AD = { img: 'img/x-bergwald-s7.jpg', pos: '50% 60%', from: 'Bergwald', head: 'Bergwald cars is coming to Aurex Bay', line: 'See you soon' };
// [file under img/, name, group]: every car and company picture plus a few others (the select groups them)
export const HOUSE_PICS = [
  ['x-bergwald-s7', 'Bergwald S7', 'Cars'],
  ['x-bergwald-x7', 'Bergwald X7', 'Cars'],
  ['x-bergwald-gt', 'Bergwald GT', 'Cars'],
  ['x-bergwald-crown', 'Bergwald Crown Hills', 'Cars'],
  ['x-valtor-z37', 'Valtor Z37', 'Cars'],
  ['x-valtor-r500', 'Valtor R-500', 'Cars'],
  ['x-valtor-gtr', 'Valtor GT-R', 'Cars'],
  ['x-tuner-gtrs', 'Valtor GT-RS', 'Cars'],
  ['x-tuner-takemi', 'Takemi VTEC', 'Cars'],
  ['x-tuner-trailhawk', 'Rivermore Trailhawk', 'Cars'],
  ['x-c4', 'Vellano V9', 'Cars'],
  ['c-autorepair', 'Auto Repair', 'Companies'],
  ['c-bank', 'Community Bank', 'Companies'],
  ['c-bankofaurex', 'Bank of Aurex', 'Companies'],
  ['c-car', 'Car Factory', 'Companies'],
  ['c-dealer', 'Car Dealership', 'Companies'],
  ['c-chemical', 'Chemical Plant', 'Companies'],
  ['c-chip', 'Chip Factory', 'Companies'],
  ['c-clothing', 'Clothing Store', 'Companies'],
  ['c-concrete', 'Bayside Concrete', 'Companies'],
  ['c-construction', 'Structura Construction', 'Companies'],
  ['c-data', 'Data & Software', 'Companies'],
  ['c-fashion', 'Fashion House', 'Companies'],
  ['c-film', 'Film Production', 'Companies'],
  ['c-finance', 'Finance & Banking', 'Companies'],
  ['c-harbortrust', 'Harbor Trust', 'Companies'],
  ['c-hotel', 'Hotel & Resort', 'Companies'],
  ['c-hotel-sunset', 'Sunset hotel', 'Companies'],
  ['c-metal', 'Metal Production', 'Companies'],
  ['c-music', 'Music Studio', 'Companies'],
  ['c-pharma', 'Pharma Industry', 'Companies'],
  ['c-power', 'Aurex Energy', 'Companies'],
  ['c-powerplant', 'Aurex City PowerPlant', 'Companies'],
  ['c-restaurant', 'Restaurant & Café', 'Companies'],
  ['c-gazette', 'The Aurex Gazette', 'Companies'],
  ['c-textile', 'Textile Mill', 'Companies'],
  ['c-vineyard', 'Vineyard', 'Companies'],
  ['h1-watch', 'Watches', 'Other'],
  ['h1-wine', 'Wine', 'Other'],
  ['h1-art', 'Art', 'Other'],
  ['h1-ext', 'Villa', 'Other'],
  ['map', 'Aurex Bay', 'Other']
];

// The Aurex Gazette as a company (gazette.js): its owner runs the city's ad desk, prints press releases and picks the front page
export const PAPER = {
  id: 'L33',                       // The Aurex Gazette site in Aurex City
  rate: [0.5, 2], rateStep: 0.25,  // ad price multiplier the owner sets (1 = the normal Marketing price)
  press: [0.05, 0.5], pressStart: 0.1, pressStep: 0.05, // price of one press release (M)
  pressWeeks: 4,                   // one press release per company every 4 weeks
  pressRep: 3, pressCust: 0.02,    // what a press release does for the company
  reviewWait: 1 / 48,              // ads waiting for approval: the autopilot approves after one week
  front: { rep: 4, cust: 0.04, paperRep: 1, cands: 3 }, // the front page story of the week
  PRESS: {
    open: ['{co} opens its doors', '{owner} invites Aurex Bay to {co} in {d}.'],
    grow: ['{co} is growing', 'More {thing} for Aurex Bay: {co} in {d} expands.'],
    hire: ['{co} is hiring', '{co} in {d} is looking for new people.'],
    thanks: ['{co} thanks its customers', 'A year of {thing} in {d}. {owner} says thank you.'],
    news: ['Big news from {co}', 'Something new is coming from {co} in {d}. Watch this space.']
  },
  PRESS_LABEL: { open: 'Grand opening', grow: 'We are growing', hire: 'We are hiring', thanks: 'Thank you', news: 'Big news' },
  FRONT: [
    ['{co} is the talk of {d}', 'Customers queue around the block at {co}.'],
    ['Inside {co}', 'A day with the team behind {thing} in {d}.'],
    ['How {co} won {d}', '{owner} on building one of the busiest {type} businesses in town.'],
    ['{co}: a {d} success story', 'Readers vote it the best place for {thing} this season.'],
    ['The people of {co}', 'Meet the staff who keep {co} running.']
  ]
};
export const AD = { perWeek: 0.04, weeks: [2, 4, 8], cust: 0.015, rep: 0.5, lift: 0.004, head: 1.5,
  tones: [['irony', 'Ironic'], ['sarcasm', 'Sarcastic'], ['wink', 'Tongue-in-cheek']] };
// what each business sells, for the ad copy
export const AD_NOUN = { bank: 'banking', dealer: 'cars', restaurant: 'dinner', autorepair: 'repairs', clothing: 'clothes', fashion: 'fashion', hotel: 'hotel rooms', metal: 'steel', textile: 'fabric', power: 'electricity', chemical: 'chemicals', construction: 'renovations', concrete: 'concrete', car: 'cars', finance: 'investments', chip: 'microchips', data: 'software', pharma: 'medicine', music: 'music', film: 'films', vineyard: 'wine', newspaper: 'the news' };
// besides what it makes itself, a company may advertise pieces from the owner's collection that fit its trade
export const AD_CATS = { dealer: ['car'], autorepair: ['car'], car: ['car'], vineyard: ['wine'], restaurant: ['wine'], hotel: ['wine', 'art'], fashion: ['watch', 'art'], clothing: ['watch'], bank: ['art', 'watch'], finance: ['art', 'watch'], film: ['art'], music: ['art'] };
// [headline, line]. {co} company, {d} district, {thing} what it sells, {type} kind of business, {item} {maker} {year} a piece, {owner} the tycoon
export const AD_COPY = {
  co: {
    irony: [['Absolutely nobody needs {thing}.', 'That is why half of {d} buys it from {co}.'], ['Another totally ordinary {type}.', 'Ordinarily the best in Aurex Bay. {co}.'], ['Warning: may cause satisfaction.', 'Side effects include coming back. {co}, {d}.'], ['We tried being mediocre once.', 'It did not suit us. {co}, {d}.'], ['Our rivals love this ad.', 'They read it every morning. {co}.']],
    sarcasm: [['Sure, go to the other place.', 'We will be here when you are done regretting it. {co}, {d}.'], ['Oh, you are happy with your {thing}?', 'How charming. {co} would like a word.'], ['Cheaper exists. So does disappointment.', '{co}, {d}. You get what you pay for.'], ['Please do not tell anyone about us.', 'We are far too busy being the best {type} in {d}.'], ['Yes, it really is this good.', 'No, we will not calm down. {co}.']],
    wink: [['{thing}, but make it Aurex Bay.', '{co} in {d}. Come say hi.'], ['Your mother would approve.', 'Probably. {co}, {d}.'], ['Life is short. Choose the good {thing}.', '{co} · {d}'], ['Made with love. And a spreadsheet.', '{co} in {d}.'], ['We would wink, but this is a banner.', 'Imagine one. {co}, {d}.']]
  },
  type: {
    bank: { wink: [['We love your money.', 'Almost as much as you do. {co}, {d}.']], sarcasm: [['Keep it under the mattress, then.', 'Mattresses pay 0% interest. {co} does a bit better.']] },
    dealer: { irony: [['Walking is great exercise.', 'Ignore this ad from {co}.']], sarcasm: [['Your car makes that noise on purpose, right?', 'Trade it in at {co}, {d}.']] },
    restaurant: { wink: [['Calories eaten at {co} do not count.', 'Science is still checking. {d}.']], irony: [['Do not come hungry.', 'You will leave with a doggy bag anyway. {co}.']] },
    autorepair: { sarcasm: [['That warning light is probably fine.', 'Said every customer of {co}. Twice.']], wink: [['We speak fluent engine.', 'Clunk, rattle, fixed. {co}, {d}.']] },
    clothing: { sarcasm: [['Wearing that again? Bold.', 'Or pop into {co} in {d}.']], wink: [['Dress for the job you want.', 'Tycoon, obviously. {co}.']] },
    fashion: { irony: [['Fashion is fleeting.', 'This season it flees straight to {co}.']], sarcasm: [['Last season called.', 'It wants its coat back. {co}, {d}.']] },
    hotel: { wink: [['Room service has feelings too.', 'Order anyway. {co}, {d}.']], irony: [['Terrible views. Just the sea.', 'From every single room. {co}.']] },
    chemical: { irony: [['Safety first. Also second.', 'Chemistry you can trust from {co}, {d}.']], wink: [['We have great chemistry.', 'By the drum from {co}.']] },
    power: { irony: [['Blackouts build character.', 'Or plug into {co}, {d}.']], wink: [['We have the power.', 'And we are happy to share it. {co}.']] },
    construction: { irony: [['Your walls are fine. Probably.', 'Ask {co} in {d} before they decide otherwise.']], wink: [['We raise the roof.', 'Then we put it back properly. {co}.']], sarcasm: [['Love that 1970s kitchen.', 'Said nobody. Renovate with {co}.']] },
    concrete: { irony: [['Built to last. Unlike your excuses.', 'Concrete by the truckload from {co}, {d}.']], wink: [['We take things for granite.', 'Then we pour concrete. {co}.']], sarcasm: [['Sand castles are charming.', 'Until the tide. Build with {co}.']] },
    textile: { wink: [['Soft on the skin, hard on prices.', 'Fabric by the bale from {co}, {d}.']], irony: [['Your shirt came from somewhere.', 'Probably {co}.']] },
    metal: { irony: [['Soft skills? We prefer steel.', 'Strong opinions, stronger alloys. {co}.']], wink: [['Heavy metal, quiet prices.', '{co}, {d}.']] },
    car: { sarcasm: [['Bicycles are lovely. In the rain.', 'Or drive one built by {co}.']], wink: [['0 to happy in 4 seconds.', 'Built in {d} by {co}.']] },
    finance: { irony: [['Past results guarantee nothing.', 'Ours just keep happening anyway. {co}.']], sarcasm: [['Keep picking stocks with a dartboard.', 'We will keep beating it. {co}, {d}.']] },
    chip: { wink: [['Small chips. Big ideas.', 'Not the kind you dip. {co}.']], irony: [['Smaller than your problems.', 'And much faster. {co}.']] },
    data: { sarcasm: [['Have you tried turning it off and on?', '{co} already did. Twice. {d}.']], wink: [['Our AI wrote this ad.', 'Then it asked for a raise. {co}.']] },
    pharma: { wink: [['Read one of these ads daily.', 'With food. {co}, {d}.']], irony: [['Side effects may include feeling better.', 'Ask your doctor about {co}.']] },
    music: { sarcasm: [['Silence is golden.', 'Ours went platinum. {co}.']], wink: [['Earworm guaranteed.', 'Sorry in advance. {co}, {d}.']] },
    film: { irony: [['Spoiler: it ends well.', 'For {co}, anyway.']], wink: [['Popcorn not included.', 'Drama is. {co}.']] },
    vineyard: { wink: [['In vino veritas.', 'And the truth is: {co} is better. {d}.']], sarcasm: [['Sure, serve the cheap stuff.', 'Your guests will smile politely. {co}.']] }
  },
  item: {
    wine: { irony: [['Do not drink this.', '{item} ({year}) is far too good for a Tuesday.'], ['Grape juice, basically.', 'Very old, very rare grape juice. {item}, {year}.']], sarcasm: [['Fine. Keep your supermarket rosé.', 'Someone else will enjoy {item}, {year}.'], ['Your guests deserve better.', 'Probably. {item} by {maker}.']], wink: [['Aged better than any of us.', '{item} · {maker} · {year}'], ['Pairs well with bragging.', '{item}, {year}. From the cellar of {owner}.']] },
    car: { irony: [['Terribly impractical.', '{item}. Two seats, no cup holder, zero regrets.'], ['Uses a little petrol.', 'And a lot of admiration. {item} by {maker}.']], sarcasm: [['Your neighbour will hate this.', 'That is the point. {item}, {year}.'], ['Sure, keep the family estate car.', 'It is very sensible. {item} is not.']], wink: [['Goes fast. Parks slowly.', 'Everyone looks. {item} by {maker}.'], ['Garage not included.', 'Smile included. {item}, {year}.']] },
    watch: { irony: [['It tells the time.', 'So does your phone. Your phone is not {item}.'], ['Completely useless after midnight.', 'Unless you like to look good. {item}.']], sarcasm: [['Still checking your phone for the time?', 'Adorable. {item} by {maker}.'], ['A watch? In this economy?', 'Yes. Especially {item}.']], wink: [['Always on time. Fashionably.', '{item} · {maker} · {year}'], ['Time flies. In style.', '{item} by {maker}. Ask {owner}.']] },
    art: { irony: [['It is just paint on canvas.', 'Very expensive paint. {item} by {maker}.'], ['Nobody will notice it.', 'Said no one, ever, about {item}.']], sarcasm: [['Your walls are fine. If you like beige.', '{item}, {maker}, {year}.'], ['Another poster from the furniture store?', 'Bold. Or there is {item}.']], wink: [['Hang it upside down. We will not tell.', '{item} by {maker}.'], ['Looks great above a sofa.', 'Any sofa. {item}, {year}.']] }
  }
};

// ---------------------------------------------------------------- the tycoon's own career (career.js)
// XP per source; levels are total XP; a head's rating = ceil(level / 2). Sector XP from leading or to-dos = sectorShare × field XP.
export const CAREER = {
  levels: [0, 150, 400, 800, 1400, 2200, 3300, 4800, 6800, 9500],
  xp: { lead: 10, task: 3, order: 1, own: 2, stock: 2, tier: 50, crisis: 30 },
  sectorShare: 0.6, size: { S: 0.7, M: 1, L: 1.3 }, mentor: 1.25, mentorRating: 4,
  caps: { task: 5, order: 10, ownPerSector: 3, ownProfit: 5, stockYear: 40 },
  seedCap: 400, rustAfter: 24, rust: 0.01, specLevel: 5, respec: 0.25,
  seats: [0, 25, 70],
  titles: [{ min: 0, name: 'Entrepreneur' }, { min: 10, name: 'Director' }, { min: 25, name: 'Magnate' }, { min: 45, name: 'Tycoon' }, { min: 70, name: 'Legend' }],
  sectors: {
    service: { name: 'Service', specs: [{ id: 'host', name: 'The Host', d: 'Customer demand +8% at your hotels, restaurants and vineyards.' }, { id: 'motor', name: 'The Car Guy', d: '+0.5 M YPI × size at your auto repair shops and car dealerships.' }] },
    industry: { name: 'Industry', specs: [{ id: 'factory', name: 'Plant Boss', d: 'Output +6% at your industrial companies.' }, { id: 'buyer', name: 'Master Buyer', d: 'Supplies 6% cheaper at your industrial companies.' }] },
    tech: { name: 'Tech', specs: [{ id: 'architect', name: 'Architect', d: 'Research 25% faster at your tech companies.' }, { id: 'guard', name: 'Watchdog', d: 'Cyberattacks never hit your tech companies.' }] },
    finance: { name: 'Finance', specs: [{ id: 'banker', name: 'Banker', d: 'Your bank loans cost 1 point less interest.' }, { id: 'investor', name: 'Investor', d: 'Your stock trades move the price half as much.' }] },
    health: { name: 'Health', specs: [{ id: 'crisis', name: 'Crisis Manager', d: '+2 M YPI × size at your pharma companies during a crisis.' }, { id: 'research', name: 'Researcher', d: '+1 Influence every year.' }] },
    media: { name: 'Media', specs: [{ id: 'hit', name: 'Hitmaker', d: 'Hits and blockbusters 50% more likely at your studios.' }, { id: 'star', name: 'The Star', d: '+1 Influence every year, and ads 10% stronger at your media companies.' }] }
  },
  // perks in a department you lead yourself (level 3 always brings the role's own effect, like a specialist head)
  perks: {
    ops: [{ lv: 3, t: 'Head of Operations: output +10%' }, { lv: 6, t: 'Output +4% more' }, { lv: 9, t: 'Extra shifts hurt morale half as much' }],
    procurement: [{ lv: 3, t: 'Supplies 3% cheaper' }, { lv: 6, t: 'Supplies 5% cheaper' }, { lv: 9, t: 'Supplies 7% cheaper' }],
    sales: [{ lv: 3, t: 'Customer demand +3%' }, { lv: 6, t: 'Customer demand +6%' }, { lv: 9, t: 'Customer demand +10%' }],
    social: [{ lv: 3, t: 'Head of Marketing: campaigns and ads 50% stronger' }, { lv: 6, t: 'Ads 10% cheaper' }, { lv: 9, t: 'Going big adds +1 more reputation' }],
    hr: [{ lv: 3, t: 'Head of HR: morale +8' }, { lv: 6, t: 'Hiring workers 25% cheaper' }, { lv: 9, t: 'Morale never drops below 50' }],
    finance: [{ lv: 3, t: 'Head of Finance: running costs −5%' }, { lv: 6, t: 'Running costs −2% more' }, { lv: 9, t: 'Running costs −2% more' }],
    rnd: [{ lv: 3, t: 'Head of R&D: research 50% faster' }, { lv: 6, t: 'Research 20% faster still' }, { lv: 9, t: 'Cyberattacks are blocked' }],
    legal: [{ lv: 3, t: 'Head of Legal: full protection from regulation fines' }, { lv: 6, t: 'Reputation +0.5 a month' }, { lv: 9, t: 'Reputation +1 a month' }]
  }
};
// personal portraits: only the first player in the city with this avatar name gets it (img/<pic>.jpg)
export const PORTRAITS = { 'Thomas Teglbjærg': 'p-thomas-debenhams', 'Mikkel Teglbjærg': 'p-mikkel-debenhams', 'Thomas Debenhams': 'p-thomas-debenhams', 'Mikkel Debenhams': 'p-mikkel-debenhams' };
