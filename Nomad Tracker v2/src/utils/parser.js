export function parseExpense(input, lastCategory = 'other') {
  let needsConfirmation = false;
  let textToParse = input.trim();
  
  // Bug fix: iOS Dictation turns "five fifty" into "5:50"
  if (/\b(\d+):(\d{2})\b/.test(textToParse)) {
      textToParse = textToParse.replace(/\b(\d+):(\d{2})\b/g, '$1.$2');
      needsConfirmation = true;
  }

  const tokens = textToParse.split(/\s+/);
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
      
      // transportation
      'uber': { main: 'transportation', sub: 'uber' },
      'grab': { main: 'transportation', sub: 'grab' },
      'tuktuk': { main: 'transportation', sub: 'tuktuk' },
      'lyft': { main: 'transportation', sub: 'lyft' },
      'bolt': { main: 'transportation', sub: 'bolt' },
      'taxi': { main: 'transportation', sub: 'taxi' },
      'bus': { main: 'transportation', sub: 'bus' },
      'train': { main: 'transportation', sub: 'train' },
      'flight': { main: 'transportation', sub: 'flight' },
      'flights': { main: 'transportation', sub: 'flights' },
      'moped': { main: 'transportation', sub: 'moped' },
      
      // lodging
      'hotel': { main: 'lodging', sub: 'hotel' },
      'airbnb': { main: 'lodging', sub: 'airbnb' },
      'hostel': { main: 'lodging', sub: 'hostel' },
      
      // other (everything else maps here)
      'water': { main: 'other', sub: 'water' },
      'beer': { main: 'other', sub: 'beer' },
      'groceries': { main: 'other', sub: 'groceries' },
      'deodorant': { main: 'other', sub: 'deodorant' },
      'sunscreen': { main: 'other', sub: 'sunscreen' },
      'toothpaste': { main: 'other', sub: 'toothpaste' },
      'museum': { main: 'other', sub: 'museum' },
      'tour': { main: 'other', sub: 'tour' },
      'movies': { main: 'other', sub: 'movies' },
      'shopping': { main: 'other', sub: 'shopping' },
      'clothes': { main: 'other', sub: 'clothes' },
      'souvenir': { main: 'other', sub: 'souvenir' }
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
          noteWords.push(token);
      }
  }

  if (!mainCategory) {
      mainCategory = lastCategory;
  }

  subcategories = [...new Set(subcategories)];

  return {
      amount: parseFloat(amount.toFixed(2)),
      category: mainCategory,
      subcategories: subcategories,
      note: noteWords.join(' ').trim(),
      raw_input: input,
      needsConfirmation
  };
}

export function getCategoryEmoji(category) {
    const emojis = {
        lodging: '🏨',
        transportation: '🚕',
        food: '🍔',
        other: '📦'
    };
    return emojis[category] || '📦';
}
