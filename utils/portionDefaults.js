// Portion defaults lookup table (gram weights)
const PORTION_DEFAULTS = [
  { keywords: ['grape', 'grapes'], grams: 150 },
  { keywords: ['apple'], grams: 182 },
  { keywords: ['banana'], grams: 118 },
  { keywords: ['orange'], grams: 131 },
  { keywords: ['chicken breast', 'chicken'], grams: 174 },
  { keywords: ['egg', 'eggs'], grams: 50 },
  { keywords: ['rice'], grams: 195 },
  { keywords: ['bread'], grams: 28 },
  { keywords: ['cheese'], grams: 30 },
  { keywords: ['milk'], grams: 244 },
  { keywords: ['yogurt'], grams: 245 },
  { keywords: ['beef', 'steak'], grams: 200 },
  { keywords: ['salmon', 'fish'], grams: 170 },
  { keywords: ['broccoli'], grams: 91 },
  { keywords: ['potato'], grams: 150 },
  { keywords: ['pasta'], grams: 140 },
  { keywords: ['oats'], grams: 81 },
];

const DEFAULT_GRAMS = 100;

/**
 * Returns the default gram weight for a given food name.
 * Uses case-insensitive partial matching against the lookup table.
 * @param {string} foodName
 * @returns {number} gram weight
 */
export function getPortionDefault(foodName) {
  if (!foodName || typeof foodName !== 'string') return DEFAULT_GRAMS;
  const lower = foodName.toLowerCase();
  for (const entry of PORTION_DEFAULTS) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return entry.grams;
    }
  }
  return DEFAULT_GRAMS;
}
