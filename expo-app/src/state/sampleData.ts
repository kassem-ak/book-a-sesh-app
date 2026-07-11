import {
  AdDef,
  Chat,
  Community,
  CommunityMember,
  EventItem,
  Expense,
  HistoryEntry,
  Message,
  Person,
  Review,
  Shop,
  SubGroup,
} from './models';

// Static source data ported verbatim from the prototype's renderVals.

export const coaches: Person[] = [
  { id: 'c1', name: 'Marcus Reyes', sport: 'Strength & Conditioning', rating: 4.9, reviews: 213, price: 45, boosted: true, distance: 1.2, level: 'Elite coach', sessions: '640+', reply: '~1h', bio: 'Ex-national powerlifter. I build durable strength with a focus on flawless technique and progressive overload. Beginners to competitors welcome.', tags: ['Powerlifting', 'Hypertrophy', 'Mobility', 'Beginner-friendly'], isCoach: true },
  { id: 'c2', name: 'Aïcha Bennani', sport: 'Boxing', rating: 4.9, reviews: 178, price: 50, boosted: true, distance: 2.4, level: 'Pro boxing', sessions: '520+', reply: '~30m', bio: 'Former amateur champion. Footwork, defense and conditioning for all levels — whether you want to spar or just hit pads and get fit.', tags: ['Footwork', 'Pad work', 'Sparring', 'Conditioning'], isCoach: true },
  { id: 'c3', name: 'Diego Santos', sport: 'Calisthenics', rating: 4.8, reviews: 142, price: 38, boosted: false, distance: 0.8, level: 'Movement', sessions: '410+', reply: '~2h', bio: 'Bodyweight specialist. From your first pull-up to muscle-ups and handstands — we train control, not just reps.', tags: ['Pull-ups', 'Handstands', 'Core', 'Skill work'], isCoach: true },
  { id: 'c4', name: 'Lena Hoffmann', sport: 'Yoga & Mobility', rating: 4.8, reviews: 96, price: 35, boosted: false, distance: 3.1, level: 'Vinyasa', sessions: '300+', reply: '~1h', bio: 'Vinyasa and mobility coach. Build flexibility, breath control and recovery into your training week.', tags: ['Vinyasa', 'Mobility', 'Breathwork', 'Recovery'], isCoach: true },
  { id: 'c5', name: 'Tariq Aziz', sport: 'Running & Endurance', rating: 4.7, reviews: 64, price: 30, boosted: false, distance: 1.9, level: 'Endurance', sessions: '180+', reply: '~3h', bio: 'Marathon coach and pacer. Structured plans, form work and race strategy from 5k to full marathon.', tags: ['5k–Marathon', 'Pacing', 'Form', 'Race prep'], isCoach: true },
  { id: 'c6', name: 'Sofia Marino', sport: 'Climbing', rating: 4.6, reviews: 51, price: 42, boosted: false, distance: 4.0, level: 'Bouldering', sessions: '150+', reply: '~2h', bio: 'Bouldering and lead coach. Technique, route reading and finger strength — indoors and out.', tags: ['Bouldering', 'Lead', 'Technique', 'Grip'], isCoach: true },
  { id: 'c7', name: 'Karim Haddad', sport: 'Music & Guitar', rating: 4.9, reviews: 88, price: 25, boosted: false, distance: 1.4, level: 'Musician', sessions: '270+', reply: '~1h', bio: 'Session guitarist and teacher for 12 years. Acoustic, electric and oud crossover — from your first chords to performing live.', tags: ['Acoustic', 'Electric', 'Oud crossover', 'Beginners'], isCoach: true },
  { id: 'c8', name: 'Nour Fakhoury', sport: 'Chess', rating: 4.8, reviews: 57, price: 20, boosted: false, distance: 2.2, level: 'FIDE 2100', sessions: '190+', reply: '~2h', bio: 'FIDE-rated player. Openings, endgames and practical middlegame plans — lessons over the board at Achrafieh Chess Café.', tags: ['Openings', 'Endgames', 'Analysis', 'Kids welcome'], isCoach: true },
];

export const partners: Person[] = [
  { id: 'p1', name: 'Jordan K.', sport: 'Running', rating: 4.9, reviews: 38, boosted: false, distance: 0.4, level: 'Intermediate', sessions: '48', reply: '~20m', bio: 'Training for a sub-22 5k. Looking for someone to do tempo runs and long Sunday runs with — pace 4:45–5:15/km.', tags: ['Tempo runs', 'Long runs', 'Track', 'Mornings'], goal: '5k under 22min', isCoach: false },
  { id: 'p2', name: 'Mei Lin', sport: 'Climbing', rating: 4.8, reviews: 29, boosted: false, distance: 1.1, level: 'Advanced', sessions: '63', reply: '~1h', bio: 'Boulderer projecting 6b/V4. Need a regular belay + spotting partner for evenings at the south wall.', tags: ['Bouldering', 'Belay partner', 'Evenings', 'Projecting'], goal: 'Project a 6b', isCoach: false },
  { id: 'p3', name: 'Sam Okoro', sport: 'Calisthenics', rating: 4.7, reviews: 21, boosted: false, distance: 0.9, level: 'Beginner', sessions: '31', reply: '~2h', bio: 'Just started bodyweight training. Want a supportive partner to keep me accountable at the local park bars.', tags: ['Park workouts', 'Accountability', 'Weekends'], goal: 'First muscle-up', isCoach: false },
  { id: 'p4', name: 'Elena V.', sport: 'Boxing', rating: 4.7, reviews: 25, boosted: false, distance: 2.0, level: 'Intermediate', sessions: '40', reply: '~45m', bio: 'Two years boxing. Looking for a controlled sparring partner around the same level, once a week.', tags: ['Sparring', 'Pad work', 'Controlled'], goal: 'Spar weekly', isCoach: false },
  { id: 'p5', name: 'Yuki T.', sport: 'Strength', rating: 4.6, reviews: 18, boosted: false, distance: 1.6, level: 'Advanced', sessions: '55', reply: '~1h', bio: 'Powerbuilding. Need a reliable spotter for heavy compound days — bench, squat, deadlift.', tags: ['Spotter', 'Powerbuilding', 'Heavy days'], goal: '200kg deadlift', isCoach: false },
  { id: 'p6', name: 'Rami S.', sport: 'Chess', rating: 4.8, reviews: 14, boosted: false, distance: 0.7, level: '~1500 ELO', sessions: '26', reply: '~30m', bio: 'Café blitz addict around 1500. Looking for a regular over-the-board sparring partner, evenings in Achrafieh.', tags: ['Blitz', 'Over the board', 'Evenings'], goal: 'Blitz sparring', isCoach: false },
  { id: 'p7', name: 'Lara M.', sport: 'Music & Vocals', rating: 4.7, reviews: 11, boosted: false, distance: 1.8, level: 'Intermediate', sessions: '19', reply: '~1h', bio: 'Singer looking for a guitarist or pianist to jam with weekly and maybe hit an open mic in Mar Mikhael.', tags: ['Vocals', 'Open mics', 'Weekly jams'], goal: 'Weekly jam sessions', isCoach: false },
];

export const everyone = () => [...coaches, ...partners];
export const personById = (id: string) => everyone().find((p) => p.id === id) ?? coaches[0];

export const sportNames = ['All', 'Strength', 'Boxing', 'Running', 'Climbing', 'Yoga', 'Calisthenics', 'Music', 'Chess'];

export const personReviews: Review[] = [
  { name: 'Chris P.', whenLabel: '2 weeks ago', initials: 'CP', stars: 5, text: 'Pushed me harder than I push myself. Form cues were spot-on and I felt it the next day.' },
  { name: 'Nadia R.', whenLabel: '1 month ago', initials: 'NR', stars: 5, text: 'Booking was effortless and the session flew by. Already rebooked for next week.' },
  { name: 'Tom B.', whenLabel: '1 month ago', initials: 'TB', stars: 4, text: 'Great energy and clearly knows the craft. Highly recommend for anyone starting out.' },
];

export const shops: Shop[] = [
  { id: 's1', name: 'PaceLine Runners', initials: 'PL', tint: '#2A3A2E', category: 'Running gear', dist: 0.6, rating: 4.8, reviews: 95, deal: '10% off in-app', pinTop: 42, pinLeft: 58, products: [{ name: 'Tempo Racer 2', price: 129, ph: 'shoe shot' }, { name: 'Featherlight run cap', price: 18, ph: 'cap shot' }, { name: 'Energy gels · 12 pack', price: 22, ph: 'gels shot' }, { name: 'Reflective shell jacket', price: 74, ph: 'jacket shot' }] },
  { id: 's2', name: 'IronWorks Supply', initials: 'IW', tint: '#3A2E2A', category: 'Strength & gym', dist: 1.1, rating: 4.7, reviews: 61, deal: 'Free delivery', pinTop: 28, pinLeft: 36, products: [{ name: 'Cast dumbbell pair · 10 kg', price: 58, ph: 'dumbbell shot' }, { name: 'Leather lifting belt', price: 42, ph: 'belt shot' }, { name: 'Chalk blocks · 8 pack', price: 14, ph: 'chalk shot' }, { name: 'Resistance band set', price: 27, ph: 'bands shot' }] },
  { id: 's3', name: 'Corner Ring', initials: 'CR', tint: '#3A2A33', category: 'Boxing & MMA', dist: 1.8, rating: 4.9, reviews: 142, deal: '15% first order', pinTop: 62, pinLeft: 28, products: [{ name: 'Sparring gloves · 14 oz', price: 89, ph: 'gloves shot' }, { name: 'Hand wraps · 4.5 m', price: 12, ph: 'wraps shot' }, { name: 'Leather speed rope', price: 24, ph: 'rope shot' }, { name: 'Gel mouthguard', price: 16, ph: 'guard shot' }] },
  { id: 's4', name: 'FlowState Studio', initials: 'FS', tint: '#2A333A', category: 'Yoga & pilates', dist: 2.3, rating: 4.6, reviews: 58, deal: 'Bundle deals', pinTop: 20, pinLeft: 66, products: [{ name: 'Cork yoga mat', price: 46, ph: 'mat shot' }, { name: 'Alignment blocks · pair', price: 19, ph: 'blocks shot' }, { name: 'Cotton yoga strap', price: 9, ph: 'strap shot' }, { name: 'Studio bolster', price: 34, ph: 'bolster shot' }] },
  { id: 's5', name: 'Spoke & Sprocket', initials: 'SS', tint: '#333A2A', category: 'Cycling', dist: 3.4, rating: 4.8, reviews: 77, deal: '10% off in-app', pinTop: 72, pinLeft: 64, products: [{ name: 'Road helmet', price: 85, ph: 'helmet shot' }, { name: 'Clip-in pedals', price: 64, ph: 'pedals shot' }, { name: 'Bottle cage duo', price: 15, ph: 'cage shot' }, { name: 'Chain lube kit', price: 12, ph: 'lube shot' }] },
  { id: 's6', name: 'Baseline Racquets', initials: 'BR', tint: '#3A362A', category: 'Tennis & padel', dist: 4.2, rating: 4.5, reviews: 39, deal: 'Free restring', pinTop: 50, pinLeft: 82, products: [{ name: 'Graphite racquet', price: 119, ph: 'racquet shot' }, { name: 'Pressureless balls · 12', price: 21, ph: 'balls shot' }, { name: 'Overgrip · 3 pack', price: 8, ph: 'grip shot' }, { name: 'Court duffel bag', price: 54, ph: 'bag shot' }] },
];
export const shopById = (id: string) => shops.find((s) => s.id === id) ?? shops[0];
export const shopCategories = ['Running', 'Strength', 'Boxing', 'Yoga', 'Cycling', 'Tennis', 'Other'];

export const communities: Community[] = [
  { id: 'running', sport: 'Running', code: 'RN', tint: '#1F3A36', members: '3.2k', about: 'Runners of every pace — from first-5k to marathon. Group runs, pacing crews and race-day meetups.', official: true },
  { id: 'strength', sport: 'Strength', code: 'ST', tint: '#22324A', members: '2.8k', about: 'Barbell, powerlifting and hypertrophy. Spotters, PR attempts and weekly form check-ins.', official: true },
  { id: 'boxing', sport: 'Boxing', code: 'BX', tint: '#3A2330', members: '1.6k', about: 'Footwork, pad work and controlled sparring nights. All levels, all stances.', official: true },
  { id: 'climbing', sport: 'Climbing', code: 'CL', tint: '#244046', members: '1.1k', about: 'Bouldering and lead. Belay partners, projecting sessions and outdoor trips.', official: true },
  { id: 'yoga', sport: 'Yoga', code: 'YG', tint: '#3A2E4D', members: '2.1k', about: 'Vinyasa, mobility and breathwork. Recover, restore and move better together.', official: true },
  { id: 'calisthenics', sport: 'Calisthenics', code: 'CA', tint: '#3A2A22', members: '1.4k', about: 'Bodyweight skills — pull-ups to muscle-ups. Park-bar jams and skill sessions.', official: true },
  { id: 'music', sport: 'Music', code: 'MU', tint: '#4A2338', members: '900', about: 'Guitar, oud, vocals and everything in between. Jam circles, open mics and practice partners.', official: true },
  { id: 'chess', sport: 'Chess', code: 'CH', tint: '#2F3A2A', members: '640', about: 'From café blitz to rated tournaments. Sparring partners, coaches and weekly club nights.', official: false },
];
export const communityById = (id: string) => communities.find((c) => c.id === id) ?? communities[0];

export const subGroups: Record<string, SubGroup[]> = {
  running: [{ id: 'run-downtown', name: 'Corniche Runners', area: 'Ain El Mreisseh', members: '420' }, { id: 'run-riverside', name: 'Horsh Beirut Pacers', area: 'Horsh Beirut', members: '310' }, { id: 'run-northpark', name: 'Jounieh Bay Run Club', area: 'Jounieh', members: '180' }],
  strength: [{ id: 'str-iron', name: 'Hamra Lifters', area: 'Hamra', members: '260' }, { id: 'str-east', name: 'Bourj Hammoud Barbell', area: 'Bourj Hammoud', members: '190' }, { id: 'str-harbor', name: 'Sin El Fil Strength', area: 'Sin El Fil', members: '140' }],
  boxing: [{ id: 'box-southpaw', name: 'Mar Mikhael Boxing Crew', area: 'Mar Mikhael', members: '150' }, { id: 'box-eastend', name: 'Tripoli Boxing Club', area: 'Tripoli', members: '120' }],
  climbing: [{ id: 'clb-boulderco', name: 'Achrafieh Wall Climbers', area: 'Achrafieh', members: '210' }, { id: 'clb-southwall', name: 'Tannourine Rock Crew', area: 'Tannourine', members: '160' }],
  yoga: [{ id: 'yog-sunrise', name: 'Raouche Sunrise Flow', area: 'Raouche', members: '240' }, { id: 'yog-harbor', name: 'Batroun Yoga Collective', area: 'Batroun', members: '170' }],
  calisthenics: [{ id: 'cal-parkbars', name: 'Corniche Bars Crew', area: 'Ramlet El Bayda', members: '200' }, { id: 'cal-westgate', name: 'Byblos Street Workout', area: 'Byblos', members: '130' }],
  music: [{ id: 'mus-jam', name: 'Mar Mikhael Jam Circle', area: 'Mar Mikhael', members: '160' }, { id: 'mus-hamra', name: 'Hamra Acoustic Sessions', area: 'Hamra', members: '120' }],
  chess: [{ id: 'chs-cafe', name: 'Achrafieh Chess Café', area: 'Achrafieh', members: '140' }, { id: 'chs-saida', name: 'Saida Chess Club', area: 'Saida', members: '90' }],
};
export const subById = (id: string): SubGroup | undefined =>
  Object.values(subGroups).flat().find((s) => s.id === id);

export const communityPeople: CommunityMember[] = [
  { id: 'alex', name: 'Alex Morgan (you)', initials: 'AM' },
  { id: 'rima', name: 'Rima Haddad', initials: 'RH' },
  { id: 'karim', name: 'Karim Saleh', initials: 'KS' },
  { id: 'jordan', name: 'Jordan K.', initials: 'JK' },
  { id: 'mei', name: 'Mei Lin', initials: 'ML' },
];

export const events: EventItem[] = [
  { id: 'ev1', communityId: 'running', subId: 'run-downtown', type: 'Meetup', title: 'Saturday Long Run', whenLabel: 'Sat 05 · 7:00 AM', loc: 'Corniche, Ain El Mreisseh', attendees: 18, host: 'Jordan K.' },
  { id: 'ev2', communityId: 'running', subId: 'run-riverside', type: 'Event', title: 'Horsh Beirut 10k Time Trial', whenLabel: 'Sun 06 · 8:30 AM', loc: 'Horsh Beirut track', attendees: 42, host: 'Tariq Aziz' },
  { id: 'ev3', communityId: 'strength', subId: 'str-iron', type: 'Meetup', title: 'Heavy Squat Session', whenLabel: 'Wed 02 · 6:30 PM', loc: 'Iron Yard Gym, Hamra', attendees: 9, host: 'Marcus Reyes' },
  { id: 'ev4', communityId: 'climbing', subId: 'clb-boulderco', type: 'Meetup', title: 'Evening Bouldering Jam', whenLabel: 'Thu 03 · 7:30 PM', loc: 'Urban Wall, Achrafieh', attendees: 14, host: 'Mei Lin' },
  { id: 'ev5', communityId: 'boxing', subId: 'box-southpaw', type: 'Event', title: 'Open Sparring Night', whenLabel: 'Fri 04 · 6:00 PM', loc: 'Southpaw Gym, Mar Mikhael', attendees: 22, host: 'Aïcha Bennani' },
  { id: 'ev6', communityId: 'yoga', subId: 'yog-sunrise', type: 'Meetup', title: 'Sunrise Vinyasa by the Sea', whenLabel: 'Sat 05 · 6:30 AM', loc: 'Raouche seaside lawn', attendees: 27, host: 'Lena Hoffmann' },
  { id: 'ev7', communityId: 'music', subId: 'mus-jam', type: 'Meetup', title: 'Open Mic & Jam Night', whenLabel: 'Fri 04 · 8:00 PM', loc: 'Mar Mikhael backyard stage', attendees: 31, host: 'Karim Haddad' },
  { id: 'ev8', communityId: 'chess', subId: 'chs-cafe', type: 'Event', title: 'Blitz Tournament', whenLabel: 'Sun 06 · 4:00 PM', loc: 'Achrafieh Chess Café', attendees: 24, host: 'Nour Fakhoury' },
];
export const eventById = (id: string) => events.find((e) => e.id === id) ?? events[0];

export const chats: Chat[] = [
  { id: 'm1', name: 'Marcus Reyes', initials: 'MR', last: 'Great session today 💪 same time Thursday?', whenLabel: '2m', unread: 2, online: true },
  { id: 'm2', name: 'Mei Lin', initials: 'ML', last: 'Meet at the south wall around 8?', whenLabel: '1h', unread: 0, online: true },
  { id: 'm3', name: 'Jordan K.', initials: 'JK', last: 'You crushed that pace! 🔥', whenLabel: '3h', unread: 0, online: false },
  { id: 'm4', name: 'Aïcha Bennani', initials: 'AB', last: "Don't forget your wraps next time", whenLabel: 'Yest', unread: 0, online: false },
];
export const chatById = (id: string) => chats.find((c) => c.id === id) ?? chats[0];

export const messages: Message[] = [
  { text: 'Hey! Ready for the strength block this week?', me: false },
  { text: 'Born ready 💪 Same 6:30 slot works?', me: true },
  { text: "Locked in. We'll start with heavy squats, then accessories.", me: false },
  { text: 'Perfect. See you at Iron Yard.', me: true },
  { text: 'Bring your A-game. 🔥', me: false },
];

// booking calendar (July 2026)
export const monthLabel = 'July 2026';
export const firstDow = 3;
export const daysInMonth = 31;
export const todayNum = 1;
export const slotDefs = ['6:30 AM', '8:00 AM', '12:00 PM', '5:30 PM', '6:30 PM', '7:30 PM'];
export const fullDaysByCoach: Record<string, number[]> = {
  c1: [3, 10, 17, 24], c2: [6, 7, 20], c3: [4, 11, 18, 25], c4: [8, 22], c5: [13, 27], c6: [5, 19],
};

// accounting
export const revenue = 12480;
export const marginDefs: [string, string][] = [
  ['session', 'Coach session commission'],
  ['shop', 'Shop sale commission'],
  ['boost', 'Boost fee margin'],
];
export const shareDefs: [string, string][] = [
  ['alex', 'Alex Morgan (you)'],
  ['rima', 'Rima Haddad'],
  ['karim', 'Karim Saleh'],
];
export const allAdmins = ['Alex Morgan (you)', 'Rima Haddad', 'Karim Saleh'];

export const initialExpenses: Expense[] = [
  { id: 'e1', label: 'Servers & infrastructure', amt: 1240, recur: 'Monthly' },
  { id: 'e2', label: 'Payment processing', amt: 610, recur: 'Monthly' },
  { id: 'e3', label: 'Marketing & ads', amt: 980, recur: 'Monthly' },
  { id: 'e4', label: 'Support & moderation', amt: 450, recur: 'Monthly' },
];
export const initialHistory: HistoryEntry[] = [
  { whenLabel: 'Jun 28', title: 'Expense updated', detail: 'Marketing & ads: $860 → $980 (Monthly)', meta: 'By Rima Haddad' },
  { whenLabel: 'Jun 12', title: 'Margins updated', detail: 'Coach session commission: 15% → 12%', meta: 'Approved by 3 admins · affected coaches notified' },
  { whenLabel: 'May 30', title: 'Payout distributed', detail: 'May net profit $8,540 split 40 / 30 / 30', meta: 'Automatic' },
];
export const recurHints: Record<string, string> = {
  'One-time': 'Logged once in the current month only.',
  Weekly: 'Automatically re-added every week.',
  Monthly: 'Automatically re-added every month.',
  Yearly: 'Automatically re-added every year.',
};
export const recurOptions = ['One-time', 'Weekly', 'Monthly', 'Yearly'];

export const ads: Record<string, AdDef> = {
  discover: { key: 'discover', brand: 'StrideLab', logo: 'SL', tint: '#2A3A2E', headline: 'Marathon-ready running shoes, tested on Beirut roads', body: 'Free gait analysis with every first pair at our Hamra store.', cta: 'Shop now', why: 'Based on your hobbies: Running · your goal "Run a marathon"' },
  community: { key: 'community', brand: 'FuelUp Nutrition', logo: 'FN', tint: '#3A322A', headline: '20% off recovery packs for training crews', body: 'Group orders for communities — delivered across Lebanon.', cta: 'Get offer', why: 'Based on your communities: Running, Strength' },
};
