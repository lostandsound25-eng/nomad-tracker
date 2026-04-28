export function parseExpense(input) {
  const tokens = input.trim().split(/\s+/);
  if (tokens.length === 0) return null;

  let amountStr = tokens[0];
  let amount = null;
  
  try {
      const sanitized = amountStr.replace(/[^0-9+\-*/.]/g, '');
      if (sanitized) {
          amount = new Function('return ' + sanitized)();
      }
  } catch (e) {
      // not a valid math expression at start
  }

  let startIndex = 1;
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

  const remainingText = tokens.slice(startIndex).join(' ').toLowerCase();
  
  const categories = {
      food: ['breakfast', 'lunch', 'dinner', 'coffee', 'food', 'restaurant', 'snack', 'cafe', 'grocery', 'meal'],
      transportation: ['uber', 'lyft', 'taxi', 'bus', 'train', 'flight', 'airport', 'metro', 'gas', 'transit'],
      lodging: ['hotel', 'airbnb', 'hostel', 'rent', 'accommodation'],
      shopping: ['clothes', 'mall', 'shopping', 'store', 'gift'],
      consumables: ['market', 'pharmacy', 'water', 'supplies'],
      activities: ['museum', 'tour', 'ticket', 'movie', 'event', 'party']
  };

  let mainCategory = 'other';
  let subcategories = [];
  
  for (const [cat, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
          if (remainingText.includes(keyword)) {
              mainCategory = cat;
              subcategories.push(keyword);
          }
      }
  }

  subcategories = [...new Set(subcategories)];

  return {
      amount: parseFloat(amount.toFixed(2)),
      category: mainCategory,
      subcategories: subcategories,
      note: remainingText,
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
