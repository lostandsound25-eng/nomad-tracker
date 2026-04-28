export function parseExpense(input, lastCategory = 'other') {
  const tokens = input.trim().split(/\s+/);
  if (tokens.length === 0) return null;

  let amountStr = tokens[0];
  let amount = null;
  let amountIndex = -1;
  
  // Clean currencies like $5 or 5,67 -> 5.67
  const parseAmount = (str) => {
      const sanitized = str.replace(/[^0-9+\-*/.,]/g, '').replace(',', '.');
      if (!sanitized) return null;
      try {
          const val = new Function('return ' + sanitized)();
          return isNaN(val) ? null : val;
      } catch (e) { return null; }
  };

  amount = parseAmount(amountStr);
  if (amount !== null) {
      amountIndex = 0;
  } else {
      for (let i = 0; i < tokens.length; i++) {
         const val = parseAmount(tokens[i]);
         if (val !== null) {
             amount = val;
             amountIndex = i;
             break;
         }
      }
  }

  if (amount === null) return null;

  // Remove amount from tokens for note parsing
  const remainingTokens = [...tokens];
  remainingTokens.splice(amountIndex, 1);
  
  const keywordMapping = {
      // food
      'breakfast': { main: 'food', sub: 'breakfast' },
      'lunch': { main: 'food', sub: 'lunch' },
      'dinner': { main: 'food', sub: 'dinner' },
      'coffee': { main: 'food', sub: 'coffee' },
      'restaurant': { main: 'food', sub: 'restaurant' },
      'food': { main: 'food', sub: 'food' },
      
      // transport
      'uber': { main: 'transport', sub: 'uber' },
      'grab': { main: 'transport', sub: 'grab' },
      'tuktuk': { main: 'transport', sub: 'tuktuk' },
      'lyft': { main: 'transport', sub: 'lyft' },
      'bolt': { main: 'transport', sub: 'bolt' },
      'taxi': { main: 'transport', sub: 'taxi' },
      'bus': { main: 'transport', sub: 'bus' },
      'train': { main: 'transport', sub: 'train' },
      'flight': { main: 'transport', sub: 'flight' },
      'moped': { main: 'transport', sub: 'moped' },
      
      // lodging
      'hotel': { main: 'lodging', sub: 'hotel' },
      'airbnb': { main: 'lodging', sub: 'airbnb' },
      'hostel': { main: 'lodging', sub: 'hostel' },
      
      // consumables
      'water': { main: 'consumables', sub: 'water' },
      'beer': { main: 'consumables', sub: 'beer' },
      'groceries': { main: 'consumables', sub: 'groceries' },
      'deodorant': { main: 'consumables', sub: 'deodorant' },
      'sunscreen': { main: 'consumables', sub: 'sunscreen' },
      'toothpaste': { main: 'consumables', sub: 'toothpaste' },
      
      // activities
      'museum': { main: 'activities', sub: 'museum' },
      'tour': { main: 'activities', sub: 'tour' },
      'movies': { main: 'activities', sub: 'movies' },
      
      // shopping
      'shopping': { main: 'shopping', sub: 'shopping' },
      'clothes': { main: 'shopping', sub: 'clothes' },
      'souvenir': { main: 'shopping', sub: 'souvenir' }
  };

  let mainCategory = null;
  let subcategories = [];
  let noteWords = [];
  
  for (const token of remainingTokens) {
      const cleanToken = token.toLowerCase().replace(/[^a-z]/g, '');
      if (keywordMapping[cleanToken]) {
          if (!mainCategory) {
              mainCategory = keywordMapping[cleanToken].main;
          }
          subcategories.push(keywordMapping[cleanToken].sub);
      } else {
          // Keep unknown words strictly for the note
          noteWords.push(token);
      }
  }

  // If no category matched, use memory
  if (!mainCategory) {
      mainCategory = lastCategory;
  }

  subcategories = [...new Set(subcategories)];

  return {
      amount: parseFloat(amount.toFixed(2)),
      category: mainCategory,
      subcategories: subcategories,
      note: noteWords.join(' ').trim(),
      raw_input: input
  };
}

export function getCategoryEmoji(category) {
    const emojis = {
        food: '🍔',
        transport: '🚕',
        lodging: '🏨',
        shopping: '🛍️',
        consumables: '🥤',
        activities: '🎟️',
        other: '📦'
    };
    return emojis[category] || '📦';
}
