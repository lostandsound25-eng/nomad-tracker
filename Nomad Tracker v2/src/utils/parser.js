export function parseExpense(input) {
  let cleanInput = input.toLowerCase();
  
  // Convert spelled-out numbers from dictation to digits
  const wordToNum = {
      'one': '1', 'a': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20',
      'thirty': '30', 'forty': '40', 'fifty': '50'
  };

  for (const [word, num] of Object.entries(wordToNum)) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      cleanInput = cleanInput.replace(regex, num);
  }

  const tokens = cleanInput.trim().split(/\s+/);
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
