/* ═══════════════════════════════════════════════
   NOMAD TRACKER — script.js
   Rebuilt for simplicity: Day ledger + Log + Settings
═══════════════════════════════════════════════ */

// ── Supabase ──────────────────────────────────────────────────────
const SUPABASE_URL = 'https://demldrpockwyrjalejbx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_urMkuF8kM4i-eaMc9VORuA_QyiVj6vX';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage }
});

// ── Currency Data ─────────────────────────────────────────────────
const CURRENCIES = {
    USD: { name: 'US Dollar',         symbol: '$',   flag: '🇺🇸', keywords: 'united states america usa' },
    EUR: { name: 'Euro',              symbol: '€',   flag: '🇪🇺', keywords: 'europe france germany' },
    GBP: { name: 'British Pound',     symbol: '£',   flag: '🇬🇧', keywords: 'united kingdom england uk' },
    AUD: { name: 'Australian Dollar', symbol: '$',   flag: '🇦🇺', keywords: 'australia' },
    CAD: { name: 'Canadian Dollar',   symbol: '$',   flag: '🇨🇦', keywords: 'canada' },
    IDR: { name: 'Indonesian Rupiah', symbol: 'Rp',  flag: '🇮🇩', keywords: 'indonesia bali jakarta' },
    THB: { name: 'Thai Baht',         symbol: '฿',   flag: '🇹🇭', keywords: 'thailand bangkok' },
    VND: { name: 'Vietnamese Dong',   symbol: '₫',   flag: '🇻🇳', keywords: 'vietnam hanoi ho chi minh' },
    LAK: { name: 'Lao Kip',           symbol: '₭',   flag: '🇱🇦', keywords: 'laos vientiane' },
    KHR: { name: 'Cambodian Riel',    symbol: '៛',   flag: '🇰🇭', keywords: 'cambodia angkor phnom penh' },
    PHP: { name: 'Philippine Peso',   symbol: '₱',   flag: '🇵🇭', keywords: 'philippines manila cebu' },
    SGD: { name: 'Singapore Dollar',  symbol: '$',   flag: '🇸🇬', keywords: 'singapore' },
    MYR: { name: 'Malaysian Ringgit', symbol: 'RM',  flag: '🇲🇾', keywords: 'malaysia kuala lumpur' },
    NZD: { name: 'New Zealand Dollar',symbol: '$',   flag: '🇳🇿', keywords: 'new zealand' },
    JPY: { name: 'Japanese Yen',      symbol: '¥',   flag: '🇯🇵', keywords: 'japan tokyo' },
    KRW: { name: 'South Korean Won',  symbol: '₩',   flag: '🇰🇷', keywords: 'korea seoul' },
    INR: { name: 'Indian Rupee',      symbol: '₹',   flag: '🇮🇳', keywords: 'india delhi' },
    MXN: { name: 'Mexican Peso',      symbol: '$',   flag: '🇲🇽', keywords: 'mexico cancun' },
    BRL: { name: 'Brazilian Real',    symbol: 'R$',  flag: '🇧🇷', keywords: 'brazil rio' },
    COP: { name: 'Colombian Peso',    symbol: '$',   flag: '🇨🇴', keywords: 'colombia bogota' },
    CNY: { name: 'Chinese Yuan',      symbol: '¥',   flag: '🇨🇳', keywords: 'china beijing' },
    CHF: { name: 'Swiss Franc',       symbol: 'CHF', flag: '🇨🇭', keywords: 'switzerland' },
    PEN: { name: 'Peruvian Sol',      symbol: 'S/',  flag: '🇵🇪', keywords: 'peru lima' },
    MMK: { name: 'Myanmar Kyat',      symbol: 'K',   flag: '🇲🇲', keywords: 'myanmar burma' },
};

const CATEGORIES = [
    { id: 'breakfast',      label: 'Breakfast', icon: '☕' },
    { id: 'lunch',          label: 'Lunch',     icon: '🥪' },
    { id: 'dinner',         label: 'Dinner',    icon: '🍲' },
    { id: 'transportation', label: 'Transport', icon: '🛵' },
    { id: 'accommodation',  label: 'Stay',      icon: '🏠' },
    { id: 'miscellaneous',  label: 'Other',     icon: '✨' },
];

// ── App State ─────────────────────────────────────────────────────
const state = {
    user:         null,
    currentTrip:  null,
    trips:        [],
    expenses:     [],
    activeTab:    'day',
    viewDate:     getLocalDate(),
    entryCategory:null,
    spendingCurrency: localStorage.getItem('nt_currency')      || 'USD',
    homeCurrency:     localStorage.getItem('nt_home_currency') || 'USD',
    dailyBudget:  parseFloat(localStorage.getItem('nt_budget')) || 100,
    tripStartDate:localStorage.getItem('nt_trip_start')        || null,
    fxRates:      JSON.parse(localStorage.getItem('nt_fx_cache') || '{}'),
    fxRateToHome: 1,
    offlineQueue: JSON.parse(localStorage.getItem('nt_offline_queue') || '[]'),
};

// ── Utilities ─────────────────────────────────────────────────────
function getLocalDate(d) {
    d = d || new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function parseLocalDate(str) {
    var parts = str.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
}

function formatDisplayDate(str) {
    var d = parseLocalDate(str);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDayName(str) {
    var d = parseLocalDate(str);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function isToday(str) { return str === getLocalDate(); }
function isFutureDate(str) { return str > getLocalDate(); }

function sym(code) {
    return (CURRENCIES[code] && CURRENCIES[code].symbol) || code;
}

// Math expression evaluator — supports 10+5.50+3
function evalExpr(str) {
    var clean = String(str || '').replace(/,/g, '').trim();
    if (!clean) return 0;
    if (/^[\d\s+\-.]+$/.test(clean)) {
        try {
            var result = clean.split('+').reduce(function(acc, part) {
                return acc + (parseFloat(part.trim()) || 0);
            }, 0);
            return isFinite(result) ? result : 0;
        } catch(e) { return parseFloat(clean) || 0; }
    }
    return parseFloat(clean) || 0;
}

function hasExpression(str) { return String(str).includes('+'); }

function formatAmt(amt, compact) {
    if (!amt || isNaN(amt)) return '0';
    if (compact) {
        if (amt >= 1000000) return (amt / 1000000).toFixed(1) + 'M';
        if (amt >= 100000)  return Math.round(amt / 1000) + 'k';
        if (amt >= 1000)    return amt.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    if (amt >= 1000) return amt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return amt.toFixed(2);
}

function showToast(msg, duration) {
    duration = duration || 2200;
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.classList.add('hidden'); }, duration);
}

function el(id) { return document.getElementById(id); }

// ── Day Meta (location + planning notes in localStorage) ──────────
function dayMetaKey(date) {
    var tid = state.currentTrip ? state.currentTrip.id : 'notrip';
    return 'nt_meta_' + tid + '_' + date;
}

function getDayMeta(date) {
    var raw = localStorage.getItem(dayMetaKey(date));
    if (!raw) return { location: '', planNote: '' };
    try { return JSON.parse(raw); } catch(e) { return { location: '', planNote: '' }; }
}

function saveDayMeta(date, location, planNote) {
    localStorage.setItem(dayMetaKey(date), JSON.stringify({ location: location, planNote: planNote }));
}

// ── Auth ──────────────────────────────────────────────────────────
async function initAuth() {
    try {
        var res = await sb.auth.getUser();
        if (res.data && res.data.user) {
            onAuth(res.data.user);
            return;
        }
        var sessRes = await sb.auth.getSession();
        onAuth((sessRes.data && sessRes.data.session) ? sessRes.data.session.user : null);
    } catch(e) {
        console.error('initAuth error:', e);
        onAuth(null);
    }

    sb.auth.onAuthStateChange(function(event, session) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            onAuth(session ? session.user : null);
        } else if (event === 'SIGNED_OUT') {
            onAuth(null);
        }
    });
}

function onAuth(user) {
    state.user = user;
    var authOverlay = el('auth-overlay');
    var mainApp     = el('main-app');
    if (!authOverlay || !mainApp) return;

    if (user) {
        authOverlay.classList.add('hidden');
        mainApp.classList.remove('hidden');
        var emailEl = el('user-email-display');
        if (emailEl) emailEl.textContent = user.email;
        fetchTripData();
        updateNetworkStatus();
    } else {
        authOverlay.classList.remove('hidden');
        mainApp.classList.add('hidden');
    }
}

// ── Trip Data ─────────────────────────────────────────────────────
async function fetchTripData() {
    if (!state.user) return;
    try {
        var res = await sb.from('trip_members')
            .select('trips(*)')
            .eq('user_id', state.user.id);

        var memberData = res.data || [];
        var trips = memberData.map(function(m) { return m.trips; }).filter(Boolean);
        trips.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        state.trips = trips;

        var savedId = localStorage.getItem('nt_trip_id');
        var found   = savedId ? trips.find(function(t) { return t.id === savedId; }) : null;
        var trip    = found || trips[0] || null;

        if (trip) {
            await setActiveTrip(trip);
        } else {
            el('header-trip-name').textContent = 'Set up trip in Settings';
            renderDayView();
            renderLogView();
        }
    } catch(e) {
        console.error('fetchTripData:', e);
    }
}

async function setActiveTrip(trip) {
    state.currentTrip  = trip;
    localStorage.setItem('nt_trip_id', trip.id);

    state.homeCurrency  = trip.home_currency  || state.homeCurrency;
    state.dailyBudget   = trip.daily_budget   || state.dailyBudget;
    state.tripStartDate = trip.start_date     || state.tripStartDate;

    localStorage.setItem('nt_home_currency', state.homeCurrency);
    localStorage.setItem('nt_budget',        state.dailyBudget);
    if (state.tripStartDate) localStorage.setItem('nt_trip_start', state.tripStartDate);

    el('header-trip-name').textContent = trip.name || 'Nomad Tracker';

    // Populate settings
    var nameInput = el('trip-name-input');
    if (nameInput) nameInput.value = trip.name || '';
    var budgetInput = el('daily-budget');
    if (budgetInput) budgetInput.value = Math.round(state.dailyBudget);
    var startInput = el('trip-start-date');
    if (startInput && state.tripStartDate) startInput.value = state.tripStartDate;
    var homeSelect = el('home-currency');
    if (homeSelect) homeSelect.value = state.homeCurrency;
    var budgetSym = el('budget-symbol');
    if (budgetSym) budgetSym.textContent = sym(state.homeCurrency);

    await fetchExpenses();
    updateFxRate();
}

// ── Expense Fetch ─────────────────────────────────────────────────
async function fetchExpenses() {
    if (!state.currentTrip || !state.user) return;
    try {
        var res = await sb.from('expenses')
            .select('*')
            .eq('trip_id', state.currentTrip.id)
            .order('spent_at', { ascending: false });

        if (res.error) throw res.error;
        state.expenses = (res.data || []).map(normalizeExpense);

        renderDayView();
        renderLogView();
        updateBudgetBar();
    } catch(e) {
        console.error('fetchExpenses:', e);
    }
}

function normalizeExpense(e) {
    var dateStr = e.spent_at ? getLocalDate(new Date(e.spent_at)) : getLocalDate();
    return {
        id:          e.id,
        date:        dateStr,
        category:    e.category,
        localAmount: e.local_amount,
        currency:    e.local_currency || state.spendingCurrency,
        homeAmount:  e.home_amount,
        note:        e.note || '',
    };
}

// ── FX ────────────────────────────────────────────────────────────
async function updateFxRate() {
    if (state.spendingCurrency === state.homeCurrency) {
        state.fxRateToHome = 1;
        return;
    }
    try {
        var r = await fetch('https://open.er-api.com/v6/latest/' + state.homeCurrency);
        var d = await r.json();
        if (d && d.rates) {
            state.fxRates = d.rates;
            localStorage.setItem('nt_fx_cache', JSON.stringify(d.rates));
        }
    } catch(e) { /* use cached */ }

    var rates = state.fxRates;
    state.fxRateToHome = (rates && rates[state.spendingCurrency])
        ? 1 / rates[state.spendingCurrency]
        : 1;
}

function homeAmount(localAmt, currency) {
    if (!currency || currency === state.homeCurrency) return localAmt;
    var rates = state.fxRates;
    if (!rates || !rates[currency]) return localAmt;
    return localAmt / rates[currency];
}

// ── Tab Switching ─────────────────────────────────────────────────
window.switchTab = function(tab) {
    state.activeTab = tab;
    document.querySelectorAll('.tab-section').forEach(function(s) { s.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    el('tab-' + tab).classList.add('active');
    el('tab-btn-' + tab).classList.add('active');
    if (tab === 'log') renderLogView();
    if (tab === 'day') renderDayView();
};

// ── Date Navigation ───────────────────────────────────────────────
function setViewDate(dateStr) {
    state.viewDate = dateStr;
    renderDayView();
}

// ── Day View Render ───────────────────────────────────────────────
function renderDayView() {
    var date = state.viewDate;

    // Date header
    el('date-dayname').textContent  = isToday(date) ? 'Today' : formatDayName(date);
    el('date-fulldate').textContent = formatDisplayDate(date);

    // Load meta
    var meta = getDayMeta(date);
    var locationInput = el('location-input');
    if (locationInput) locationInput.value = meta.location || '';
    var notesInput = el('day-notes-input');
    if (notesInput) notesInput.value = meta.planNote || '';

    // Expenses for this day
    var dayExpenses = state.expenses.filter(function(e) { return e.date === date; });
    var homeSym     = sym(state.homeCurrency);
    var dayTotal    = 0;

    CATEGORIES.forEach(function(cat) {
        var catExpenses = dayExpenses.filter(function(e) { return e.category === cat.id; });
        var amtEl = el('amt-' + cat.id);
        if (!amtEl) return;

        if (catExpenses.length === 0) {
            amtEl.textContent = '—';
            amtEl.className   = 'ledger-amount empty';
            return;
        }

        var homeTotal = catExpenses.reduce(function(sum, e) {
            return sum + homeAmount(e.localAmount, e.currency);
        }, 0);
        dayTotal += homeTotal;

        amtEl.textContent = homeSym + formatAmt(homeTotal, true);
        amtEl.className   = 'ledger-amount has-value';
    });

    var totalEl = el('day-total-value');
    if (totalEl) {
        totalEl.textContent = dayTotal > 0
            ? homeSym + formatAmt(dayTotal)
            : homeSym + '0.00';
    }
}

// ── Location & Notes ──────────────────────────────────────────────
function bindLocationAndNotes() {
    var locationInput = el('location-input');
    var notesInput    = el('day-notes-input');
    var saveNoteBtn   = el('notes-save-btn');

    if (locationInput) {
        locationInput.addEventListener('input', function() {
            saveDayMeta(state.viewDate, locationInput.value, notesInput ? notesInput.value : '');
        });
    }

    if (notesInput) {
        notesInput.addEventListener('blur', function() {
            saveDayMeta(state.viewDate, locationInput ? locationInput.value : '', notesInput.value);
        });
    }

    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', function() {
            saveDayMeta(
                state.viewDate,
                locationInput ? locationInput.value : '',
                notesInput    ? notesInput.value    : ''
            );
            showToast('✓ Note saved');
            if (state.activeTab === 'log') renderLogView();
        });
    }
}

// ── Entry Sheet ───────────────────────────────────────────────────
window.closeEntrySheet = function() { closeSheet('entry'); };

function openEntrySheet(category) {
    state.entryCategory = category;
    var cat = CATEGORIES.find(function(c) { return c.id === category; });
    if (!cat) return;

    el('sheet-category-badge').textContent = cat.icon + ' ' + cat.label;

    var amtInp = el('entry-amount');
    amtInp.value = '';
    amtInp.style.fontSize = '3rem';
    el('entry-note').value = '';
    el('sheet-expr-hint').textContent = '';

    // Multi-night toggle — only for accommodation
    var mnWrap = el('sheet-multinight');
    mnWrap.style.display = category === 'accommodation' ? 'block' : 'none';
    var mnToggle = el('multinight-toggle');
    mnToggle.checked = false;
    el('multinight-fields').classList.add('hidden');
    el('mn-preview').textContent = '';

    updateSheetCurrency();
    openSheet('entry');
    setTimeout(function() { amtInp.focus(); }, 250);
}

function updateSheetCurrency() {
    var code = state.spendingCurrency;
    var cur  = CURRENCIES[code] || { symbol: code, flag: '🌏' };
    el('sheet-currency-code').textContent = code;
    el('sheet-currency-flag').textContent = cur.flag || '🌏';
    el('sheet-symbol').textContent        = cur.symbol || code;
    updateConversion();
}

function updateConversion() {
    var raw   = el('entry-amount').value;
    var amt   = evalExpr(raw);
    var home  = amt * state.fxRateToHome;
    var dispEl = el('sheet-conversion');
    if (!dispEl) return;

    if (state.spendingCurrency === state.homeCurrency) {
        dispEl.textContent = '';
        return;
    }
    dispEl.textContent = amt > 0
        ? '≈ ' + sym(state.homeCurrency) + formatAmt(home) + ' ' + state.homeCurrency
        : '≈ ' + sym(state.homeCurrency) + '0.00 ' + state.homeCurrency;
}

function scaleAmountInput(inp) {
    var len = inp.value.length || 1;
    var fs  = 3;
    if (len > 6)  fs = 2.4;
    if (len > 9)  fs = 1.9;
    if (len > 12) fs = 1.5;
    inp.style.fontSize = fs + 'rem';
    var symEl = el('sheet-symbol');
    if (symEl) symEl.style.fontSize = Math.max(fs * 0.55, 1.1) + 'rem';
}

function updateExprHint(raw) {
    var hintEl = el('sheet-expr-hint');
    if (!hintEl) return;
    if (hasExpression(raw)) {
        var result = evalExpr(raw);
        hintEl.textContent = '= ' + sym(state.spendingCurrency) + formatAmt(result);
    } else {
        hintEl.textContent = '';
    }
}

function updateMultinightPreview() {
    var toggle = el('multinight-toggle');
    if (!toggle || !toggle.checked) return;
    var startStr = el('mn-start').value;
    var endStr   = el('mn-end').value;
    var amt      = evalExpr(el('entry-amount').value);
    var prev     = el('mn-preview');
    if (!prev) return;
    if (!startStr || !endStr || startStr > endStr) { prev.textContent = ''; return; }
    var nights = Math.round((parseLocalDate(endStr) - parseLocalDate(startStr)) / 86400000) + 1;
    var perNight = nights > 0 ? amt / nights : 0;
    prev.textContent = nights + ' night' + (nights !== 1 ? 's' : '') + ' · ' + sym(state.homeCurrency) + formatAmt(perNight) + ' per night';
}

// ── Save Expense ──────────────────────────────────────────────────
async function saveExpense() {
    var rawVal   = el('entry-amount').value;
    var totalAmt = evalExpr(rawVal);
    var note     = el('entry-note').value.trim();
    var isMultinight = el('multinight-toggle').checked && state.entryCategory === 'accommodation';

    if (!totalAmt || totalAmt <= 0) { showToast('Enter an amount first'); return; }
    if (!state.currentTrip)         { showToast('No active trip — check Settings'); return; }
    if (!state.user)                 { showToast('Not logged in'); return; }

    var saveBtn = el('entry-save-btn');
    saveBtn.textContent = 'Saving…';
    saveBtn.disabled = true;

    try {
        var expensesToSave = [];

        if (isMultinight) {
            var startStr  = el('mn-start').value;
            var endStr    = el('mn-end').value;
            var placeName = el('mn-place').value.trim();
            if (!startStr || !endStr || startStr > endStr) { showToast('Check your dates'); return; }

            var startD  = parseLocalDate(startStr);
            var nights  = Math.round((parseLocalDate(endStr) - startD) / 86400000) + 1;
            var perNight = totalAmt / nights;
            var homePN   = perNight * state.fxRateToHome;

            for (var i = 0; i < nights; i++) {
                var d = new Date(startD);
                d.setDate(d.getDate() + i);
                var dateStr = getLocalDate(d);
                expensesToSave.push({
                    trip_id:       state.currentTrip.id,
                    user_id:       state.user.id,
                    local_amount:  perNight,
                    local_currency:state.spendingCurrency,
                    home_amount:   homePN,
                    fx_rate:       state.fxRateToHome,
                    category:      'accommodation',
                    note:          placeName ? placeName + ' (night ' + (i+1) + '/' + nights + ')' : note,
                    spent_at:      dateStr + 'T12:00:00',
                    paid_by:       state.user.id,
                });
                if (placeName) {
                    var existingMeta = getDayMeta(dateStr);
                    if (!existingMeta.location) {
                        saveDayMeta(dateStr, placeName, existingMeta.planNote);
                    }
                }
            }
        } else {
            var expDate = state.viewDate;
            var expD    = isToday(expDate) ? new Date() : parseLocalDate(expDate);
            expensesToSave.push({
                trip_id:       state.currentTrip.id,
                user_id:       state.user.id,
                local_amount:  totalAmt,
                local_currency:state.spendingCurrency,
                home_amount:   totalAmt * state.fxRateToHome,
                fx_rate:       state.fxRateToHome,
                category:      state.entryCategory,
                note:          note,
                spent_at:      expD.toISOString(),
                paid_by:       state.user.id,
            });
        }

        // Optimistic local add
        expensesToSave.forEach(function(e) {
            state.expenses.unshift({
                id:          'temp-' + Date.now() + Math.random(),
                date:        e.spent_at.substring(0, 10),
                category:    e.category,
                localAmount: e.local_amount,
                currency:    e.local_currency,
                homeAmount:  e.home_amount,
                note:        e.note,
            });
        });

        if (!navigator.onLine) {
            state.offlineQueue.push.apply(state.offlineQueue, expensesToSave);
            localStorage.setItem('nt_offline_queue', JSON.stringify(state.offlineQueue));
            showToast('Saved offline — will sync later');
        } else {
            var saveRes = await sb.from('expenses').insert(expensesToSave);
            if (saveRes.error) throw saveRes.error;
            showSyncedBadge();
        }

        if (navigator.vibrate) navigator.vibrate(15);

        saveBtn.textContent = '✓ Saved!';
        saveBtn.classList.add('success');
        setTimeout(function() {
            saveBtn.textContent = 'Save';
            saveBtn.classList.remove('success');
            saveBtn.disabled = false;
        }, 1200);

        closeSheet('entry');
        renderDayView();
        updateBudgetBar();
        if (state.activeTab === 'log') renderLogView();
        setTimeout(fetchExpenses, 2500);

    } catch(err) {
        console.error('saveExpense:', err);
        showToast('Error: ' + (err.message || 'Unknown error'));
        saveBtn.textContent = 'Save';
        saveBtn.disabled = false;
    }
}

// ── Currency Picker ───────────────────────────────────────────────
window.closeCurrencyPicker = function() { closeSheet('currency'); };

function renderCurrencyList(search) {
    search = search || '';
    var list = el('currency-list');
    if (!list) return;
    var term = search.toLowerCase();
    list.innerHTML = '';

    Object.entries(CURRENCIES).forEach(function(entry) {
        var code = entry[0], data = entry[1];
        var match = !term ||
            code.toLowerCase().includes(term) ||
            data.name.toLowerCase().includes(term) ||
            data.keywords.includes(term);
        if (!match) return;

        var item = document.createElement('div');
        item.className = 'currency-list-item';
        item.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:1.1rem">' + (data.flag || '🌏') + '</span>' +
            '<span class="currency-item-code">' + code + '</span></div>' +
            '<span class="currency-item-name">' + data.name + '</span>';
        item.addEventListener('click', function() { selectCurrency(code); });
        list.appendChild(item);
    });
}

async function selectCurrency(code) {
    state.spendingCurrency = code;
    localStorage.setItem('nt_currency', code);
    await updateFxRate();
    updateSheetCurrency();
    closeSheet('currency');
}

// ── Log View ──────────────────────────────────────────────────────
function renderLogView() {
    var list = el('log-list');
    if (!list) return;

    var dateSet = new Set();
    state.expenses.forEach(function(e) { dateSet.add(e.date); });

    // Include today always, and next 90 days if they have meta
    var today = getLocalDate();
    dateSet.add(today);
    for (var i = 1; i <= 90; i++) {
        var d = new Date();
        d.setDate(d.getDate() + i);
        var ds = getLocalDate(d);
        var meta = getDayMeta(ds);
        if (meta.location || meta.planNote) dateSet.add(ds);
    }

    var allDates = Array.from(dateSet).sort(function(a, b) { return b.localeCompare(a); });

    if (allDates.length === 0) {
        list.innerHTML = '<div class="log-empty"><div class="log-empty-icon">📋</div><p>No expenses yet.</p></div>';
        return;
    }

    list.innerHTML = '';
    allDates.forEach(function(date) {
        var expenses = state.expenses.filter(function(e) { return e.date === date; });
        var meta     = getDayMeta(date);
        var isFuture = isFutureDate(date);
        var isT      = isToday(date);
        var dayTotal = expenses.reduce(function(sum, e) { return sum + homeAmount(e.localAmount, e.currency); }, 0);
        var homeSym  = sym(state.homeCurrency);

        var locationText = meta.location
            ? '<span class="log-day-location">' + meta.location + '</span>'
            : '<span class="log-day-location empty">' + (isFuture ? 'No location planned' : 'No location') + '</span>';

        var badge = isFuture
            ? '<span class="future-badge">Planned</span>'
            : (isT ? '<span class="future-badge" style="background:#f0fdf4;color:var(--primary);">Today</span>' : '');

        var totalStr = (isFuture && expenses.length === 0)
            ? ''
            : '<span class="log-day-total">' + homeSym + formatAmt(dayTotal) + '</span>';

        var card = document.createElement('div');
        card.className = 'log-day-card' + (isFuture ? ' future' : '');
        card.dataset.date = date;
        card.innerHTML =
            '<div class="log-day-header" onclick="toggleLogDay(this)">' +
                '<div class="log-day-left">' +
                    '<span class="log-day-date">' + formatDisplayDate(date) + ' ' + badge + '</span>' +
                    locationText +
                '</div>' +
                '<div class="log-day-right">' +
                    totalStr +
                    '<svg class="log-day-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
                '</div>' +
            '</div>' +
            '<div class="log-day-body">' + renderLogDayBody(expenses, meta, isFuture) + '</div>';

        list.appendChild(card);
    });
}

function renderLogDayBody(expenses, meta, isFuture) {
    var html    = '';
    var homeSym = sym(state.homeCurrency);
    var hasAny  = false;

    CATEGORIES.forEach(function(cat) {
        var items = expenses.filter(function(e) { return e.category === cat.id; });
        if (!items.length) return;
        hasAny = true;

        var notes = items.map(function(e) { return e.note; }).filter(Boolean);
        var uniqueNotes = notes.filter(function(v, i, a) { return a.indexOf(v) === i; });
        var total = items.reduce(function(s, e) { return s + homeAmount(e.localAmount, e.currency); }, 0);

        var currencies = items.map(function(e) { return e.currency; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
        var localStr = '';
        if (currencies.length === 1 && currencies[0] !== state.homeCurrency) {
            var localTotal = items.reduce(function(s, e) { return s + e.localAmount; }, 0);
            localStr = ' <span style="font-size:0.72rem;color:var(--text-3)">(' + sym(currencies[0]) + formatAmt(localTotal, true) + ')</span>';
        }

        html += '<div class="log-cat-row">' +
            '<span class="log-cat-icon">' + cat.icon + '</span>' +
            '<div class="log-cat-info">' +
                '<div class="log-cat-name">' + cat.label + '</div>' +
                (uniqueNotes.length ? '<div class="log-cat-note has-note">' + uniqueNotes.join(' · ') + '</div>' : '') +
            '</div>' +
            '<div class="log-cat-amount">' + homeSym + formatAmt(total) + localStr + '</div>' +
            '</div>';
    });

    if (!hasAny && !meta.planNote) {
        html = '<p class="log-day-planning-note">' + (isFuture ? 'No plans yet.' : 'No expenses recorded.') + '</p>';
    }

    if (meta.planNote) {
        html += '<p class="log-day-planning-note">📝 ' + meta.planNote + '</p>';
    }

    return html;
}

window.toggleLogDay = function(headerEl) {
    var card       = headerEl.closest('.log-day-card');
    var wasExpanded = card.classList.contains('expanded');
    document.querySelectorAll('.log-day-card.expanded').forEach(function(c) { c.classList.remove('expanded'); });
    if (!wasExpanded) card.classList.add('expanded');
};

// ── Budget Bar ────────────────────────────────────────────────────
function updateBudgetBar() {
    var homeSym = sym(state.homeCurrency);
    el('budget-goal-display').innerHTML = homeSym + Math.round(state.dailyBudget) + '<span class="budget-goal-unit">/day</span>';

    if (!state.tripStartDate || state.expenses.length === 0) {
        el('trip-avg').textContent       = homeSym + '—';
        el('trip-day-count').textContent = '—';
        el('budget-fill').style.width    = '0%';
        el('budget-track-label').textContent = '0%';
        return;
    }

    var today  = getLocalDate();
    var startD = parseLocalDate(state.tripStartDate);
    var todayD = parseLocalDate(today);
    var daysElapsed = Math.max(1, Math.round((todayD - startD) / 86400000) + 1);

    var pastExp    = state.expenses.filter(function(e) { return e.date <= today; });
    var totalSpent = pastExp.reduce(function(sum, e) { return sum + homeAmount(e.localAmount, e.currency); }, 0);
    var avgPerDay  = totalSpent / daysElapsed;
    var percent    = Math.round((avgPerDay / state.dailyBudget) * 100);

    el('trip-avg').textContent           = homeSym + formatAmt(avgPerDay);
    el('trip-day-count').textContent     = String(daysElapsed);
    el('budget-fill').style.width        = Math.min(percent, 100) + '%';
    el('budget-track-label').textContent = percent + '%';

    var fillEl = el('budget-fill');
    var avgEl  = el('trip-avg');
    fillEl.classList.remove('over', 'close');
    avgEl.classList.remove('under', 'over', 'close');

    if (percent >= 100)      { fillEl.classList.add('over');  avgEl.classList.add('over'); }
    else if (percent >= 85)  { fillEl.classList.add('close'); avgEl.classList.add('close'); }
    else                     { avgEl.classList.add('under'); }
}

// ── Export ────────────────────────────────────────────────────────
function buildExportData() {
    var headers = ['Date', 'Location', 'Breakfast', 'Lunch', 'Dinner', 'Transportation', 'Stay', 'Other', 'Notes'];
    var allDates = Array.from(new Set(state.expenses.map(function(e) { return e.date; }))).sort();
    var rows = [headers.join('\t')];

    allDates.forEach(function(date) {
        var meta = getDayMeta(date);
        var exps = state.expenses.filter(function(e) { return e.date === date; });

        var catTotal = function(catId) {
            var items = exps.filter(function(e) { return e.category === catId; });
            if (!items.length) return '';
            return formatAmt(items.reduce(function(s, e) { return s + homeAmount(e.localAmount, e.currency); }, 0));
        };

        var noteParts = CATEGORIES.map(function(cat) {
            var items = exps.filter(function(e) { return e.category === cat.id; });
            var notes = items.map(function(e) { return e.note; }).filter(Boolean);
            return notes.length ? cat.label + ': ' + notes.join(', ') : null;
        }).filter(Boolean);
        if (meta.planNote) noteParts.push('Plan: ' + meta.planNote);

        rows.push([
            date, meta.location || '',
            catTotal('breakfast'), catTotal('lunch'), catTotal('dinner'),
            catTotal('transportation'), catTotal('accommodation'), catTotal('miscellaneous'),
            noteParts.join(' | ')
        ].join('\t'));
    });

    return rows.join('\n');
}

window.closeExportModal = function() { closeSheet('export'); };

// ── Sheet Helpers ─────────────────────────────────────────────────
function openSheet(name) {
    el(name + '-overlay').classList.remove('hidden');
    el(name + '-sheet').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeSheet(name) {
    var overlay = el(name + '-overlay');
    var sheet   = el(name + '-sheet');
    if (overlay) overlay.classList.add('hidden');
    if (sheet)   sheet.classList.add('hidden');
    document.body.style.overflow = '';
}

window.closeDatePicker = function() { closeSheet('datepicker'); };

// ── Network & Sync ────────────────────────────────────────────────
function updateNetworkStatus() {
    var badge   = el('sync-badge');
    var labelEl = el('sync-label');
    if (!badge || !labelEl) return;

    if (!navigator.onLine) {
        badge.classList.remove('hidden', 'syncing');
        badge.classList.add('offline');
        labelEl.textContent = 'Offline';
    } else {
        if (state.offlineQueue.length > 0) {
            syncOfflineQueue();
        } else {
            showSyncedBadge();
        }
    }
}

function showSyncedBadge() {
    var badge   = el('sync-badge');
    var labelEl = el('sync-label');
    if (!badge || !labelEl) return;
    badge.classList.remove('hidden', 'offline', 'syncing');
    labelEl.textContent = '✓ Synced';
    setTimeout(function() { badge.classList.add('hidden'); }, 3000);
}

async function syncOfflineQueue() {
    if (!state.offlineQueue.length || !navigator.onLine || !state.user) return;
    var badge   = el('sync-badge');
    var labelEl = el('sync-label');
    badge.classList.remove('hidden', 'offline');
    badge.classList.add('syncing');
    labelEl.textContent = 'Syncing…';

    var valid = state.offlineQueue.filter(function(item) {
        return item.user_id === state.user.id && item.trip_id && item.category && item.local_amount;
    });

    try {
        if (valid.length > 0) {
            var res = await sb.from('expenses').insert(valid);
            if (res.error) throw res.error;
        }
        state.offlineQueue = [];
        localStorage.setItem('nt_offline_queue', '[]');
        showSyncedBadge();
        fetchExpenses();
    } catch(err) {
        console.error('syncOfflineQueue:', err);
        badge.classList.remove('syncing');
        badge.classList.add('offline');
        labelEl.textContent = 'Sync failed';
    }
}

// ── INIT — everything wired here after DOM ready ──────────────────
document.addEventListener('DOMContentLoaded', function() {

    // ── Auth form buttons ──
    el('btn-login').addEventListener('click', async function() {
        var email  = el('auth-email').value.trim();
        var pass   = el('auth-password').value;
        var errEl  = el('auth-error');
        errEl.classList.add('hidden');
        try {
            var res = await sb.auth.signInWithPassword({ email: email, password: pass });
            if (res.error) {
                errEl.textContent = res.error.message;
                errEl.classList.remove('hidden');
            } else {
                onAuth(res.data.user);
            }
        } catch(e) {
            errEl.textContent = e.message || 'Login failed';
            errEl.classList.remove('hidden');
        }
    });

    el('btn-signup').addEventListener('click', async function() {
        var email  = el('signup-email').value.trim();
        var pass   = el('signup-password').value;
        var errEl  = el('auth-error');
        errEl.classList.add('hidden');
        try {
            var res = await sb.auth.signUp({ email: email, password: pass });
            if (res.error) {
                errEl.textContent = res.error.message;
                errEl.classList.remove('hidden');
            } else if (res.data && res.data.user) {
                onAuth(res.data.user);
            }
        } catch(e) {
            errEl.textContent = e.message || 'Sign up failed';
            errEl.classList.remove('hidden');
        }
    });

    el('btn-logout').addEventListener('click', async function() {
        await sb.auth.signOut();
        onAuth(null);
    });

    el('switch-to-signup').addEventListener('click', function(e) {
        e.preventDefault();
        el('login-form').classList.add('hidden');
        el('signup-form').classList.remove('hidden');
    });

    el('switch-to-login').addEventListener('click', function(e) {
        e.preventDefault();
        el('signup-form').classList.add('hidden');
        el('login-form').classList.remove('hidden');
    });

    // ── Date navigation ──
    el('prev-day-btn').addEventListener('click', function() {
        var d = parseLocalDate(state.viewDate);
        d.setDate(d.getDate() - 1);
        setViewDate(getLocalDate(d));
    });

    el('next-day-btn').addEventListener('click', function() {
        var d = parseLocalDate(state.viewDate);
        d.setDate(d.getDate() + 1);
        setViewDate(getLocalDate(d));
    });

    el('date-display-btn').addEventListener('click', function() {
        el('datepicker-input').value = state.viewDate;
        openSheet('datepicker');
    });

    el('datepicker-confirm-btn').addEventListener('click', function() {
        var val = el('datepicker-input').value;
        if (val) setViewDate(val);
        closeSheet('datepicker');
    });

    // ── Location and notes ──
    bindLocationAndNotes();

    // ── Ledger rows: tap row or + button ──
    document.querySelectorAll('.ledger-add-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openEntrySheet(btn.dataset.category);
        });
    });

    document.querySelectorAll('.ledger-row').forEach(function(row) {
        row.addEventListener('click', function(e) {
            if (e.target.classList.contains('ledger-add-btn')) return;
            openEntrySheet(row.dataset.category);
        });
    });

    // ── Entry sheet: amount input ──
    el('entry-amount').addEventListener('input', function(e) {
        scaleAmountInput(e.target);
        updateConversion();
        updateExprHint(e.target.value);
        updateMultinightPreview();
    });

    // ── Multi-night toggle ──
    el('multinight-toggle').addEventListener('change', function(e) {
        var fields = el('multinight-fields');
        if (e.target.checked) {
            fields.classList.remove('hidden');
            el('mn-start').value = state.viewDate;
            var endD = parseLocalDate(state.viewDate);
            endD.setDate(endD.getDate() + 6);
            el('mn-end').value = getLocalDate(endD);
            updateMultinightPreview();
        } else {
            fields.classList.add('hidden');
            el('mn-preview').textContent = '';
        }
    });

    ['mn-start', 'mn-end', 'mn-place'].forEach(function(id) {
        var elem = el(id);
        if (elem) elem.addEventListener('input', updateMultinightPreview);
    });

    // ── Save expense ──
    el('entry-save-btn').addEventListener('click', saveExpense);

    // ── Currency picker ──
    el('sheet-currency-btn').addEventListener('click', function() {
        renderCurrencyList('');
        openSheet('currency');
    });

    el('currency-search').addEventListener('input', function(e) {
        renderCurrencyList(e.target.value);
    });

    document.querySelectorAll('.quick-cur').forEach(function(btn) {
        btn.addEventListener('click', function() { selectCurrency(btn.dataset.code); });
    });

    // ── Export ──
    el('export-btn').addEventListener('click', function() {
        var tsv = buildExportData();
        el('export-preview').textContent = tsv;

        el('export-copy-btn').onclick = function() {
            navigator.clipboard.writeText(tsv).then(function() {
                showToast('Copied! Paste into Google Sheets ✓');
            });
        };

        el('export-csv-btn').onclick = function() {
            var rows = tsv.split('\n');
            var csv  = rows.map(function(r) {
                return r.split('\t').map(function(c) { return '"' + c + '"'; }).join(',');
            }).join('\n');
            var blob = new Blob([csv], { type: 'text/csv' });
            var url  = URL.createObjectURL(blob);
            var a    = document.createElement('a');
            a.href = url; a.download = 'nomad-tracker.csv'; a.click();
            URL.revokeObjectURL(url);
            showToast('CSV downloaded');
        };

        openSheet('export');
    });

    // ── Settings save ──
    el('home-currency').addEventListener('change', function(e) {
        var symEl = el('budget-symbol');
        var cur   = CURRENCIES[e.target.value];
        if (symEl && cur) symEl.textContent = cur.symbol || '$';
    });

    el('save-settings-btn').addEventListener('click', async function() {
        var homeCur   = el('home-currency').value;
        var budget    = parseFloat(el('daily-budget').value) || 100;
        var startDate = el('trip-start-date').value;
        var tripName  = el('trip-name-input').value.trim();

        state.homeCurrency  = homeCur;
        state.dailyBudget   = budget;
        state.tripStartDate = startDate || null;

        localStorage.setItem('nt_home_currency', homeCur);
        localStorage.setItem('nt_budget', String(budget));
        if (startDate) localStorage.setItem('nt_trip_start', startDate);

        if (state.currentTrip) {
            var updates = { home_currency: homeCur, daily_budget: budget };
            if (startDate) updates.start_date = startDate;
            if (tripName)  updates.name = tripName;

            var res = await sb.from('trips').update(updates).eq('id', state.currentTrip.id);
            if (!res.error && tripName) {
                state.currentTrip.name = tripName;
                el('header-trip-name').textContent = tripName;
            }
        }

        await updateFxRate();
        updateBudgetBar();
        renderDayView();
        showToast('✓ Settings saved');
    });

    // ── Open settings from header gear icon ──
    el('open-settings-btn').addEventListener('click', function() { switchTab('settings'); });

    // ── Network ──
    window.addEventListener('online',  updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // ── Initial render ──
    state.viewDate = getLocalDate();
    renderCurrencyList('');

    // Start auth
    initAuth();
});
