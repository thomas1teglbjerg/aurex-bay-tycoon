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
    perks: [{ t: 'Hit Single', d: '+3 M & +1 Influence on a hit (2 in 6 per year) when Social Media runs or a PR & Media Officer leads it' }, { t: 'Studio Buzz', d: '+1 Influence per year' }], neg: [{ t: 'Fickle Charts', d: '−0.4 M YPI during a recession' }] },
  film: { name: 'Film Production', sector: 'Media & Entertainment', price: 38, trade: 2.5, ypi: 3.5, group: 'media', tags: ['Media', 'Influence'],
    perks: [{ t: 'Influence Boost', d: '+1 Influence per year' }, { t: 'Blockbuster Success', d: '+8 M & +1 Influence on a blockbuster (2 in 6 per year)' }], neg: [{ t: 'Influencer Staff Requirement', d: 'Blockbusters need a PR & Media Officer at HQ' }] },
  vineyard: { name: 'Vineyard', sector: 'Food & Drink · Wine Estate', price: 12, trade: 1.2, ypi: 1.6, group: 'service', tags: ['Wine', 'Collectibles'],
    perks: [{ t: 'Vintage Year', d: 'Every harvest: 50% chance to bottle a collectible wine. Sell it to the dealer, at auction or to other players' }, { t: 'Estate Specialists', d: 'Each specialist leading a department raises the odds and the rarity' }, { t: 'House Wine', d: '+YPI to a Restaurant in the portfolio' }],
    neg: [{ t: 'Small Harvests', d: 'Small estates rarely bottle anything above Rare and never a Legendary' }, { t: 'Crisis Hangover', d: '−0.4 M YPI during a crisis' }] }
};

// Portfolio synergies: owning (or contracting with) the first type boosts the second
export const SYNERGY = [['car', 'dealer'], ['autorepair', 'dealer'], ['car', 'autorepair'], ['metal', 'car'], ['metal', 'chip'], ['chip', 'data'], ['chip', 'pharma'], ['film', 'fashion'], ['hotel', 'fashion'], ['finance', 'data'], ['vineyard', 'restaurant']];

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

// 32 unique listings: [type, district, size, x, y within the district view, title, own picture in img/]
export const LISTINGS = [
  ['clothing', 'ironport', 'S', 0.24, 0.31, 'Eastbridge Supply Co.'], ['fashion', 'aurex', 'L', 0.6, 0.72], ['fashion', 'marina', 'S', 0.54, 0.5],
  ['hotel', 'marina', 'L', 0.2, 0.3], ['hotel', 'marina', 'M', 0.42, 0.4], ['hotel', 'sunset', 'S', 0.45, 0.4, null, 'c-hotel-sunset'],
  ['metal', 'harbor', 'L', 0.4, 0.53], ['metal', 'ironport', 'S', 0.08, 0.1], ['metal', 'harbor', 'M', 0.44, 0.66],
  ['car', 'harbor', 'L', 0.53, 0.46], ['dealer', 'ironport', 'M', 0.42, 0.83, 'Kazen Motors'], ['car', 'aurex', 'S', 0.3, 0.84],
  ['finance', 'aurex', 'L', 0.5, 0.34], ['finance', 'aurex', 'M', 0.76, 0.36], ['bank', 'ironport', 'S', 0.48, 0.44, 'Aurex Bank'],
  ['chip', 'nevus', 'L', 0.44, 0.25], ['chip', 'greenfield', 'M', 0.28, 0.17], ['chip', 'harbor', 'S', 0.47, 0.36],
  ['data', 'aurex', 'L', 0.24, 0.26], ['data', 'aurex', 'M', 0.9, 0.58], ['data', 'nevus', 'S', 0.62, 0.42],
  ['pharma', 'nevus', 'L', 0.78, 0.63], ['pharma', 'greenfield', 'M', 0.43, 0.3], ['pharma', 'crown', 'S', 0.86, 0.38],
  ['film', 'crown', 'L', 0.11, 0.17], ['music', 'ironport', 'M', 0.75, 0.88, 'Watertower Sound'], ['film', 'harbor', 'S', 0.58, 0.3],
  ['autorepair', 'ironport', 'S', 0.3, 0.6, 'Kingside Auto Works'],
  ['restaurant', 'ironport', 'S', 0.62, 0.6, 'Ground Café'],
  ['vineyard', 'greenfield', 'S', 0.66, 0.2, 'Greenfield Hill Vines'], ['vineyard', 'crown', 'M', 0.815, 0.6, 'Aurex Bay Vineyard'], ['vineyard', 'nevus', 'L', 0.33, 0.42, 'Nevus Cliff Estate']
].map(([type, d, size, px, py, title, img], i) => ({ id: 'L' + (i + 1), type, d, p: [px, py], district: DISTRICT[d].name, size, ...(title ? { title } : {}), ...(img ? { img } : {}), ...placeOn(d, [px, py]) }));

export const STAFF = [
  { id: 'michael', role: 'Junior Financial Analyst', name: 'Michael Turner', cost: 1.5, upkeep: 0.5, passive: ['Loan Bonus', 'Gain +0.5 M when taking a loan. Your interest drops 1 M a year.'], hq: 'Head of Finance: running costs −5% in that company.', tags: 'Finance · Risk' },
  { id: 'anika', role: 'IT Systems Engineer', name: 'Anika Rao', cost: 1.5, upkeep: 0.5, passive: ['System Stability', 'The tech company she works in earns +1 M YPI'], hq: 'Head of R&D: research 50% faster and cyberattacks on that company are blocked.', tags: 'Tech · Stability · Infrastructure' },
  { id: 'sofia', role: 'PR & Media Officer', name: 'Sofia Lindström', cost: 2, upkeep: 0.5, passive: ['Public Relations', 'Gain +2 Influence every year. Her media or fashion company +1 M YPI.'], hq: 'Head of Social Media: campaigns 50% stronger.', tags: 'Communication · Marketing' },
  { id: 'robert', role: 'Compliance Assistant', name: 'Robert Hayes', cost: 2, upkeep: 0.5, passive: ['Regulation Shield', 'Auditors never fine the company he works in.'], hq: 'Head of Legal & Compliance: full protection from regulation fines.', tags: 'Regulation · Defense' },
  { id: 'emily', role: 'HR Recruitment Officer', name: 'Emily Carter', cost: 2, upkeep: 0.5, passive: ['Talent Network', 'Specialists cost −0.5 M to recruit.'], hq: 'Head of HR: hiring costs −50% and morale +8 in that company.', tags: 'HR · Growth · Infrastructure' },
  { id: 'carlos', role: 'Logistics Planner', name: 'Carlos Mendoza', cost: 4, upkeep: 1, passive: ['Supply Chain', 'Runs your warehouses: auto-import, auto-supply and warehouse sourcing. +1 Influence a year, and his industrial company +1 M YPI.'], hq: 'Head of Procurement: supplies 5% cheaper for that company.', tags: 'Transport · Mobility' },
  { id: 'marco', role: 'Workshop Chief', name: 'Marco Vitale', cost: 1, upkeep: 0.3, passive: ['Quick Turnaround', 'The auto repair, dealership or car company he works in earns +1 M YPI.'], hq: 'Head of Operations: output +10% in that company.', tags: 'Operations · Automotive' },
  { id: 'jason', role: 'Market Research Associate', name: 'Jason Miller', cost: 4, upkeep: 0.5, passive: ['Market Insight', 'You and your whole network see the next World Card.'], hq: 'Head of Sales: +50% sales automation in that company.', tags: 'Strategy · Information' }
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
  { id: 'complaint', title: 'An angry post went viral', text: 'A customer of {co} is complaining online.', kind: 'bad', fx: { rep: -3, cust: -0.02 }, guard: 'social', saved: 'Your social media team answered quickly and turned it around.' },
  { id: 'inspection', title: 'Surprise inspection', text: 'City inspectors went through {co}.', kind: 'bad', fx: { cash: -0.1 }, guard: 'legal', saved: 'Every permit was in order. No fine.' },
  { id: 'theft', title: 'Supplies went missing', text: 'Part of a delivery at {co} is gone.', kind: 'bad', fx: { stock: 0.08 }, guard: 'procurement', saved: 'Procurement had counted everything. The missing crates turned up.' },
  { id: 'sick', title: 'Flu at the workplace', text: 'Half the team at {co} called in sick.', kind: 'bad', fx: { morale: -5 }, guard: 'hr', saved: 'HR had cover ready. Nobody noticed.' },
  { id: 'heatwave', title: 'A busy day', text: 'Sunny weather brought a rush of customers to {co}.', kind: 'good', fx: { cust: 0.02, rep: 1 } }
];

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
  energy: { name: 'Energy', base: 0.002, unit: 'MWh', producer: null },
  textiles: { name: 'Textiles', base: 0.003, unit: 'bales', producer: null },
  chemicals: { name: 'Chemicals', base: 0.007, unit: 'drums', producer: null },
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
  clothing: { cap: 40, unit: 'garment drops', in: { textiles: 1, energy: 0.2 }, out: {} },
  fashion: { cap: 20, unit: 'collections', in: { textiles: 3, media: 0.3 }, out: {} },
  // guests: no finished stock and no deliveries. Bookings come in, guests check in when a room and supplies are free, and use the supplies during their stay.
  hotel: { cap: 25, unit: 'guest stays', in: { food: 2, textiles: 0.5, energy: 1, media: 0.3 }, out: {}, guests: { client: 'Booking channel' } },
  finance: { cap: 20, unit: 'client accounts', in: { software: 0.5, energy: 0.5 }, out: {} },
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
  { id: 'social', name: 'Social Media', head: 'sofia', need: 1, cost: 0.4, desc: 'Grows your customer base and reputation.',
    settings: [{ k: 'intensity', label: 'Campaigns', opts: [['off', 'Off'], ['normal', 'Steady'], ['viral', 'Go big']] }],
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
export const DEPT_DEFAULTS = { ops: { shifts: 1 }, procurement: { policy: 'cheapest', stock: 1, carrier: 'ridge' }, sales: { price: 'standard', b2b: 'market' }, social: { intensity: 'normal' }, hr: { wages: 'market', training: 'off' }, finance: { costs: 'normal' }, rnd: { budget: 'low' }, legal: { level: 'basic' } };
export const WORKER = { salary: 0.08, hireFee: 0.02 };

// ---------------------------------------------------------------- clients and orders
// B2B companies have a few large corporate clients who negotiate hard but stay loyal.
// B2C companies sell through many retail channels with smaller, faster, more impatient orders.
export const MARKET_KIND = { bank: 'b2c', dealer: 'b2c', restaurant: 'b2c', autorepair: 'b2c', metal: 'b2b', chip: 'b2b', data: 'b2b', finance: 'b2b', pharma: 'b2b', car: 'b2c', clothing: 'b2c', fashion: 'b2c', hotel: 'b2c', music: 'b2c', film: 'b2c', vineyard: 'b2c' };
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
  chip: ['Kestrel Robotics', 'Aurex Devices', 'Nevus Instruments', 'Midtown Telecom', 'Greenfield Sensors', 'Harbor Drones', 'Solace Computing', 'Vantage Auto Systems'],
  data: ['Aurex Transit', 'Midtown Holdings', 'Harbor Logistics', 'Sunset Resorts Group', 'Crown Insurance', 'Greenfield Labs', 'City of Aurex Bay', 'Northlagoon Energy'],
  finance: ['Harbor Logistics', 'Ironport Shipyards', 'Aurex Real Estate', 'Crown Hills Family Office', 'Southgate Assembly', 'Midtown Retail Group', 'Lagoon Marine', 'Greenfield Farms'],
  pharma: ['Nevus Medical Group', 'Aurex General Hospital', 'Crown Hills Clinics', 'PharmaPlus Chain', 'Harbor Health', 'Greenfield Care Homes', 'Midtown Pharmacy Co', 'Sunset Wellness'],
  car: ['Midtown Auto Mall', 'Harbor Row Motors', 'Crown Hills Car Gallery', 'Sunset Strand Rentals', 'Greenfield Fleet Leasing', 'Old Grid Garage', 'Aurex Taxi Co', 'Ironport Truck Center', 'Nevus Isle EV Hub'],
  clothing: ['Walk-in shoppers', 'Ironport skaters', 'Old Grid students', 'Harbor Row dock workers', 'Online drops', 'Sunset Surf & Style', 'Night market stall', 'Local sports clubs', 'Vintage collectors'],
  fashion: ['Boutique Lumen', 'Old Grid Department Store', 'Aurex Mall', 'Sunset Surf & Style', 'Crown Hills Atelier', 'Harbor Outlet', 'Midtown Sneaker Lab', 'Lagoon Resort Shops', 'Nevus Concept Store'],
  hotel: ['Northwind Travel', 'Cruise Terminal Desk', 'Aurex Business Travel', 'Wedding Planners Co', 'Conference Bureau', 'Sunset Tour Operators', 'Harbor Row Events', 'Crown Hills Golf Club', 'Airport Shuttle Partners'],
  music: ['StreamBay', 'Aurex FM', 'Old Grid Jazz Club', 'Ironport warehouse nights', 'Indie artists', 'Midtown ad agencies', 'Sunset Open Air', 'Crown Hills Film Festival', 'Podcast networks'],
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
      settings: { intensity: { label: 'Campaigns' } },
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
  { id: 'w7', cat: 'wine', name: 'Château Vaillon 2010', maker: 'Château Vaillon', year: 2010, rarity: 'Rare', v: 0.05, ed: 12, set: 'verlaine', peak: 9, medium: 'Case of 6 · red' },
  { id: 'w6', cat: 'wine', name: 'Château Vaillon 1990', maker: 'Château Vaillon', year: 1990, rarity: 'Legendary', v: 0.24, ed: 3, set: 'verlaine', peak: 2, medium: 'Case of 6 · red' },
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
  styles: { Common: [['Table Red', 'red'], ['Rosé', 'rosé'], ['Coastal White', 'white']], Rare: [['Reserve', 'red'], ['Pinot Noir', 'red'], ['Brut', 'sparkling']], Epic: [['Grand Reserve', 'red'], ['Single Vineyard', 'red'], ['Blanc de Blancs', 'sparkling']], Legendary: [['Grand Cru', 'red'], ['Cuvée Héritage', 'red']] }
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
  { id: 'sofia', kind: 'sofia', name: 'Sofia Lindström', rating: 3, img: true }, { id: 't-jamal', kind: 'sofia', name: 'Jamal Reed', rating: 4 }, { id: 't-clara', kind: 'sofia', name: 'Clara Novak', rating: 2 },
  { id: 'robert', kind: 'robert', name: 'Robert Hayes', rating: 3, img: true }, { id: 't-ingrid', kind: 'robert', name: 'Ingrid Falk', rating: 4 }, { id: 't-tomas', kind: 'robert', name: 'Tomás Silva', rating: 2 },
  { id: 'emily', kind: 'emily', name: 'Emily Carter', rating: 3, img: true }, { id: 't-yara', kind: 'emily', name: 'Yara Haddad', rating: 4 }, { id: 't-noah', kind: 'emily', name: 'Noah Brooks', rating: 2 },
  { id: 'carlos', kind: 'carlos', name: 'Carlos Mendoza', rating: 4, img: true }, { id: 'mack', kind: 'carlos', name: 'Mack Brennan', rating: 1, img: true, starter: true, role: 'Logistics Operator', pay: 0.6 }, { id: 't-olga', kind: 'carlos', name: 'Olga Petrova', rating: 3 }, { id: 't-sam', kind: 'carlos', name: 'Sam Okoye', rating: 2 },
  { id: 'marco', kind: 'marco', name: 'Marco Vitale', rating: 2, img: true, starter: true }, { id: 't-dana', kind: 'marco', name: 'Dana Kowalski', rating: 3 }, { id: 't-viktor', kind: 'marco', name: 'Viktor Hale', rating: 4 },
  { id: 'rohan', kind: 'jason', name: 'Rohan Mehta', rating: 3, img: true, role: 'Sales Executive', pay: 1.1,
    bio: 'Top seller at Kazen Motors three years running. Remembers every customer’s name, their kids’ names and what they drove in 2009. Has never met a deal he could not close.',
    passive: ['Can Sell Anything', 'Customer demand +15% in the company where he heads Sales, and +1 M YPI at a car dealership.'] },
  { id: 'dario', kind: 'marco', name: 'Dario Russo', rating: 4, img: true, role: 'General Manager', pay: 2,
    bio: 'Turned around two failing dealerships in the last downturn. Calm, demanding and allergic to excuses. When the market drops, his numbers do not.',
    passive: ['Steady Hand', 'Recessions and crises never cut customer demand in the company where he heads Operations.'] },
  { id: 'jason', kind: 'jason', name: 'Jason Miller', rating: 3, img: true }, { id: 't-elena', kind: 'jason', name: 'Elena Rossi', rating: 5 }, { id: 't-kofi', kind: 'jason', name: 'Kofi Mensah', rating: 2 }
];
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
