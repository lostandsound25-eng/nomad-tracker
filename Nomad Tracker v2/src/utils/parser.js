export function parseExpense(input) {
  const tokens = input.trim().split(/\s+/);
  if (tokens.length === 0) return null;

  // 1. Extract amount (look for the first valid number or math expression)
  let amountStr = tokens[0];
  let amount = null;
  let startIndex = 1;
  
  try {
      const sanitized = amountStr.replace(/[^0-9+\-*/.]/g, '');
      if (sanitized) {
          amount = new Function('return ' + sanitized)();
      }
  } catch (e) {
      // not a valid math expression at start
  }

  // If first token isn't an amount, search for it
  if (amount === null || isNaN(amount)) {
      amount = null;
      for (let i = 0; i < tokens.length; i++) {
         const sanitized = tokens[i].replace(/[^0-9+\-*/.]/g, '');
         if (sanitized) {
            try {
               const val = new Function('return ' + sanitized)();
               if (!isNaN(val)) {
                   amount = val;
                   tokens.splice(i, 1);
                   startIndex = 0;
                   break;
               }
            } catch(e){}
         }
      }
      if (amount === null) return null;
  }

  const remainingTokens = tokens.slice(startIndex);
  
  // Keyword mapping exactly as requested
  const keywordMapping = {
      'coffee': { main: 'food', sub: 'coffee' },
      'breakfast': { main: 'food', sub: 'breakfast' },
      'lunch': { main: 'food', sub: 'lunch' },
      'dinner': { main: 'food', sub: 'dinner' },
      'uber': { main: 'transportation', sub: 'uber' },
      'taxi': { main: 'transportation', sub: 'taxi' },
      'bus': { main: 'transportation', sub: 'bus' },
      'flight': { main: 'transportation', sub: 'flight' },
      'hotel': { main: 'lodging', sub: 'hotel' },
      'airbnb': { main: 'lodging', sub: 'airbnb' },
      'museum': { main: 'activities', sub: 'museum' },
      'tour': { main: 'activities', sub: 'tour' },
      'shopping': { main: 'shopping', sub: 'shopping' },
      'water': { main: 'consumables', sub: 'water' },
      'beer': { main: 'consumables', sub: 'beer' },
      'grocery': { main: 'consumables', sub: 'grocery' }
  };

  let mainCategory = 'other';
  let subcategories = [];
  
  for (const token of remainingTokens) {
      // Clean punctuation for matching
      const cleanToken = token.toLowerCase().replace(/[^a-z]/g, '');
      if (keywordMapping[cleanToken]) {
          if (mainCategory === 'other') {
              mainCategory = keywordMapping[cleanToken].main;
          }
          if (keywordMapping[cleanToken].sub) {
              subcategories.push(keywordMapping[cleanToken].sub);
          }
      }
  }

  // Deduplicate
  subcategories = [...new Set(subcategories)];

  return {
      amount: parseFloat(amount.toFixed(2)),
      category: mainCategory,
      subcategories: subcategories,
      note: remainingTokens.join(' ').trim(),
      raw_input: input
  };
}

export function getCategoryEmoji(category) {
    const emojis = {
        food: '🍔',
        transportation: '🚕',
        lodging: '🏨',
        shopping: '🛍️',
        consumables: '🛒',
        activities: '🎟️',
        other: '📝'
    };
    return emojis[category] || '📝';
}
