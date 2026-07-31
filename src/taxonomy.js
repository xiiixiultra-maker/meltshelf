/**
 * ============================================================================
 * TAXONOMY — the vocabulary a jar gets logged in.
 * ============================================================================
 *
 * Written for people who already talk like this. A generic "fruity / earthy /
 * sweet" picker is useless to someone who can tell a Mimosa from a Papaya
 * blindfolded, and the whole premise of the shelf is that the person logging
 * knows more than the app does.
 *
 * Three rules held throughout:
 *
 *   1. EVERYTHING IS OPTIONAL. A jar with a photo and a strain is a valid jar.
 *      Nothing here gates getting on the shelf.
 *   2. FREE TEXT ALWAYS WINS. Every group takes a custom entry. A closed list
 *      is a list that is already out of date.
 *   3. NO SCORING PRETENDING TO BE SCIENCE. These are descriptors, not
 *      measurements. Melt and the numeric scores are separate and stay so.
 *
 * The flavour model is deliberately structural rather than a second aroma
 * list. Anyone can name flavours; what separates a real note is describing how
 * it MOVES: what lands first, what the middle does, what is left afterwards,
 * and how it feels in the mouth while it happens.
 */

/* ==========================================================================
   AROMA
   Grouped the way people actually sort smells at the jar, not botanically.
   ========================================================================== */
export const AROMA = [
  { group: 'Gas', hint: 'the loud ones', tags: [
    'diesel', 'petrol', 'kerosene', 'jet fuel', 'burnt rubber', 'new tyre',
    'tar', 'asphalt', 'solvent', 'gassy funk',
  ]},
  { group: 'Funk', hint: 'the ones that clear a room', tags: [
    'skunk', 'sour cream', 'blue cheese', 'parmesan', 'gym sock', 'body odour',
    'garlic', 'onion', 'sulphur', 'roadkill', 'dumpster', 'ammonia',
  ]},
  { group: 'Citrus', tags: [
    'lemon peel', 'lemon pledge', 'lime zest', 'grapefruit pith', 'orange oil',
    'tangerine', 'bergamot', 'yuzu', 'kaffir lime leaf', 'citronella',
  ]},
  { group: 'Tropical', tags: [
    'mango', 'guava', 'pink guava', 'pineapple', 'passionfruit', 'lychee',
    'banana', 'papaya', 'jackfruit', 'coconut water', 'starfruit',
  ]},
  { group: 'Berry', tags: [
    'strawberry jam', 'raspberry', 'blueberry', 'blackberry', 'mulberry',
    'cranberry', 'red currant', 'berry candy', 'fruit roll-up',
  ]},
  { group: 'Stone fruit', tags: [
    'peach', 'white peach', 'apricot', 'nectarine', 'plum', 'cherry',
    'black cherry', 'cherry cough syrup',
  ]},
  { group: 'Orchard', tags: [
    'green apple', 'red apple', 'pear', 'quince', 'grape', 'concord grape',
    'melon', 'honeydew', 'cantaloupe', 'watermelon rind',
  ]},
  { group: 'Floral', tags: [
    'lavender', 'rose', 'violet', 'jasmine', 'orange blossom', 'honeysuckle',
    'geranium', 'chamomile', 'elderflower', 'potpourri', 'perfume counter',
  ]},
  { group: 'Herbal', tags: [
    'sage', 'thyme', 'rosemary', 'basil', 'mint', 'spearmint', 'eucalyptus',
    'green tea', 'black tea', 'hay', 'fresh cut grass', 'tobacco leaf', 'hops',
  ]},
  { group: 'Earth', hint: 'terroir shows up here', tags: [
    'petrichor', 'forest floor', 'wet leaves', 'mushroom', 'truffle',
    'damp soil', 'moss', 'cave', 'root cellar', 'compost', 'beetroot',
  ]},
  { group: 'Wood and resin', tags: [
    'cedar', 'sandalwood', 'pine', 'pine sap', 'hinoki', 'oak', 'frankincense',
    'palo santo', 'church incense', 'amber resin', 'pencil shavings',
  ]},
  { group: 'Spice', tags: [
    'black pepper', 'pink peppercorn', 'clove', 'cinnamon', 'cardamom',
    'star anise', 'nutmeg', 'coriander seed', 'chai', 'curry leaf', 'ginger',
  ]},
  { group: 'Cream and dairy', tags: [
    'butter', 'browned butter', 'condensed milk', 'vanilla cream', 'custard',
    'cheesecake', 'whipped cream', 'milk chocolate', 'yoghurt',
  ]},
  { group: 'Sweet', tags: [
    'honey', 'caramel', 'burnt sugar', 'maple', 'brown sugar', 'molasses',
    'marshmallow', 'toffee', 'butterscotch',
  ]},
  { group: 'Confection', tags: [
    'bubblegum', 'cotton candy', 'sherbet', 'gummy bear', 'jolly rancher',
    'tootsie roll', 'circus peanut', 'creaming soda', 'orange soda', 'runts',
  ]},
  { group: 'Bakery', tags: [
    'dough', 'biscuit', 'graham cracker', 'shortbread', 'toasted bread',
    'pastry', 'birthday cake', 'pancake batter',
  ]},
  { group: 'Chem and cool', tags: [
    'menthol', 'camphor', 'eucalyptol', 'nail polish', 'acetone', 'sharpie',
    'pine cleaner', 'chlorine', 'medicine cabinet', 'vicks',
  ]},
  { group: 'Mineral', tags: [
    'wet stone', 'flint', 'chalk', 'saline', 'sea spray', 'iron', 'graphite',
  ]},
  { group: 'Savoury', tags: [
    'olive brine', 'pickle', 'soy', 'miso', 'sesame', 'peanut', 'cashew',
    'almond skin', 'cured meat', 'smoked paprika',
  ]},
];

/* ==========================================================================
   FLAVOUR
   Structure, not a second aroma list. Where it lands, what it does, what it
   leaves, and how it feels while it happens.
   ========================================================================== */
export const FLAVOUR = {
  /** Three moments on the palate. Same vocabulary, different timing. */
  phases: [
    { key: 'attack', label: 'Attack', hint: 'the first second, before you exhale' },
    { key: 'mid',    label: 'Mid palate', hint: 'what it turns into' },
    { key: 'finish', label: 'Finish', hint: 'what is still there a minute later' },
  ],

  mouthfeel: [
    'oily', 'buttery', 'creamy', 'silky', 'coating', 'glossy',
    'dry', 'chalky', 'astringent', 'tannic', 'grippy',
    'thin', 'watery', 'sharp', 'prickly', 'effervescent',
    'viscous', 'syrupy', 'waxy', 'greasy',
  ],

  length: [
    { key: 'short',    label: 'Short',    hint: 'gone before the exhale finishes' },
    { key: 'medium',   label: 'Medium',   hint: 'a minute or two' },
    { key: 'long',     label: 'Long',     hint: 'still there through the next one' },
    { key: 'lingering',label: 'Lingering',hint: 'you can taste it after coffee' },
  ],

  /** How the whole thing is put together. */
  structure: [
    'balanced', 'top heavy', 'bottom heavy', 'one note', 'layered',
    'evolving', 'flat', 'bright', 'rounded', 'angular', 'muddled',
  ],

  /** The bit people argue about most, so it gets its own axis. */
  retrohale: [
    'clean', 'floral lift', 'gassy', 'peppery', 'menthol', 'sour',
    'harsh', 'throat coat', 'sinus clearing', 'nothing much',
  ],

  /** Not a quality score. Purely how loud it is. */
  intensity: [
    { v: 1, label: 'Faint' }, { v: 2, label: 'Soft' }, { v: 3, label: 'Present' },
    { v: 4, label: 'Loud' }, { v: 5, label: 'Overwhelming' },
  ],
};

/* ==========================================================================
   TERROIR
   Where and how it was grown. Optional, and mostly unknowable unless the
   washer told you, which is exactly why it is worth recording when it IS
   known: it is the field that separates a hearsay jar from a sourced one.
   ========================================================================== */
export const TERROIR = {
  medium: [
    { key: 'living_soil',  label: 'Living soil',   hint: 'no-till, biology doing the work' },
    { key: 'super_soil',   label: 'Super soil',    hint: 'amended and cooked before planting' },
    { key: 'knf',          label: 'KNF',           hint: 'Korean natural farming' },
    { key: 'jadam',        label: 'JADAM' },
    { key: 'organic_pot',  label: 'Organic potting mix' },
    { key: 'coco',         label: 'Coco coir' },
    { key: 'coco_perlite', label: 'Coco and perlite' },
    { key: 'rockwool',     label: 'Rockwool' },
    { key: 'peat',         label: 'Peat' },
    { key: 'dwc',          label: 'DWC',           hint: 'deep water culture' },
    { key: 'rdwc',         label: 'RDWC' },
    { key: 'nft',          label: 'NFT' },
    { key: 'aero',         label: 'Aeroponic' },
    { key: 'aqua',         label: 'Aquaponic' },
    { key: 'native',       label: 'Native ground', hint: 'planted straight in the earth' },
  ],

  light: [
    { key: 'full_sun',   label: 'Full sun' },
    { key: 'light_dep',  label: 'Light deprivation' },
    { key: 'greenhouse', label: 'Greenhouse' },
    { key: 'mixed',      label: 'Mixed light' },
    { key: 'indoor_led', label: 'Indoor, LED' },
    { key: 'indoor_hps', label: 'Indoor, HPS' },
    { key: 'indoor_cmh', label: 'Indoor, CMH' },
  ],

  feed: [
    { key: 'organic',   label: 'Organic' },
    { key: 'veganic',   label: 'Veganic' },
    { key: 'salt',      label: 'Salt based' },
    { key: 'hybrid',    label: 'Organic and salt' },
    { key: 'water_only',label: 'Water only' },
  ],

  water: ['RO', 'well', 'spring', 'rain', 'tap', 'dechlorinated tap'],

  /** Post-harvest, which changes the hash as much as the grow does. */
  handling: [
    'fresh frozen', 'flash frozen', 'dry trimmed', 'wet trimmed',
    'hand trimmed', 'machine trimmed', 'hang dried whole plant',
    'slow cure', 'cold room stored',
  ],
};

/* ==========================================================================
   EXPERIENCE
   The part nobody else records, and the part people actually read on someone
   else's shelf. Free text is the point; the chips are just a way in.
   ========================================================================== */
export const EXPERIENCE = {
  onset: [
    { key: 'instant', label: 'Instant' }, { key: 'creeper', label: 'Creeper' },
    { key: 'gradual', label: 'Gradual' }, { key: 'wave', label: 'Comes in waves' },
  ],
  effect: [
    'clear', 'heady', 'euphoric', 'giggly', 'talkative', 'motivated',
    'focused', 'creative', 'floaty', 'body heavy', 'couch lock',
    'numbing', 'warming', 'sleepy', 'appetite', 'anxious', 'racy',
    'dissociative', 'introspective', 'social',
  ],
  duration: ['under an hour', '1 to 2 hours', '2 to 3 hours', '3 hours plus'],
  bestFor: [
    'morning', 'afternoon', 'evening', 'before bed', 'working',
    'walking', 'music', 'cooking', 'company', 'alone',
  ],
  /** Prompts, shown one at a time, to get past "it was fire". */
  prompts: [
    'What did the room smell like when you opened it?',
    'What did it taste like on the exhale, not the inhale?',
    'What would you compare it to that is not cannabis?',
    'Would you buy it again at the same price?',
    'What did it do to the next hour?',
  ],
};

/** Everything accepts a custom value. A closed list is already out of date. */
export const ALLOWS_CUSTOM = true;

/** Flattened lookup, for search and for validating an imported entry. */
export const ALL_AROMA = AROMA.flatMap((g) => g.tags);
