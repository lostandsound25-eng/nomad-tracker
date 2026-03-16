// App State
const state = {
    activeTab: 'log',
    spendingCurrency: localStorage.getItem('nomad_last_spending_currency') || 'USD',
    homeCurrency: localStorage.getItem('nomad_home_currency') || 'USD',
    dailyBudget: parseFloat(localStorage.getItem('nomad_daily_budget')) || 50,
    progressCurrency: localStorage.getItem('nomad_progress_currency') || 'home',
    fxRateToHome: 1,
    selectedCategory: null,
    history: [], // Fully synced from Supabase now
    trips: [],   // Loaded from Supabase
    currentTrip: null,
    calMonth: new Date().getMonth(),
    calYear: new Date().getFullYear(),
    isFirstLoad: true,
    user: null,
    rangeStart: null,
    rangeEnd: null,
    selectedDate: getLocalYYYYMMDD(),
    modalCalMonth: new Date().getMonth(),
    modalCalYear: new Date().getFullYear()
};

const EXAMPLE_TRIP = {
    id: 'example-trip-id',
    name: 'My Adventure (example trip)',
    daily_budget: 50,
    home_currency: 'USD',
    join_code: 'EXAMPLE',
    is_example: true
};

// Supabase Configuration
const SUPABASE_URL = 'https://demldrpockwyrjalejbx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_urMkuF8kM4i-eaMc9VORuA_QyiVj6vX';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sample data to make the app look alive if empty
const SAMPLE_DATA = [
    { id: 's1', date: new Date().toISOString(), category: 'accommodation', localAmount: 45, currency: 'USD', usdAmount: 45, symbol: '$' },
    { id: 's2', date: new Date().toISOString(), category: 'dinner', localAmount: 12, currency: 'USD', usdAmount: 12, symbol: '$' },
    { id: 's3', date: new Date(Date.now() - 86400000).toISOString(), category: 'transportation', localAmount: 8, currency: 'USD', usdAmount: 8, symbol: '$' }
];

if (state.history.length === 0) {
    state.history = [...SAMPLE_DATA];
}

// Utils
function getLocalYYYYMMDD(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Config
const CURRENCY_SYMBOLS = {
    USD: '$',
    IDR: 'Rp',
    THB: '฿',
    VND: '₫',
    LAK: '₭',
    KHR: '៛',
    EUR: '€',
    JPY: '¥',
    GBP: '£'
};

const ALL_CURRENCIES = {
    USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound',
    AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
    IDR: 'Indonesian Rupiah', THB: 'Thai Baht', VND: 'Vietnamese Dong',
    LAK: 'Lao Kip', KHR: 'Cambodian Riel', JPY: 'Japanese Yen',
    MXN: 'Mexican Peso', SGD: 'Singapore Dollar', CHF: 'Swiss Franc',
    INR: 'Indian Rupee', CNY: 'Chinese Yuan', ZAR: 'South African Rand',
    NZD: 'New Zealand Dollar', HKD: 'Hong Kong Dollar', MYR: 'Malaysian Ringgit',
    PHP: 'Philippine Peso', KRW: 'South Korean Won', BRL: 'Brazilian Real',
    RUB: 'Russian Ruble', TRY: 'Turkish Lira', AED: 'UAE Dirham',
    COP: 'Colombian Peso', ARS: 'Argentine Peso', CLP: 'Chilean Peso',
    PEN: 'Peruvian Sol', DKK: 'Danish Krone', SEK: 'Swedish Krona', NOK: 'Norwegian Krone'
};

// UI Elements
let els = {};
let categoryChart = null;

// --- Initialization ---


function init() {
    // Populate Elements
    els = {
        tabs: document.querySelectorAll('.tab-content'),
        btns: document.querySelectorAll('.tab-btn'),
        localInput: document.getElementById('local-amount'),
        usdOutput: document.getElementById('usd-amount'),
        spendingSelect: document.getElementById('local-currency'),
        homeSelect: document.getElementById('home-currency'),
        symbol: document.getElementById('active-symbol'),
        rateBanner: document.getElementById('fx-rate'),
        homeLabel: document.getElementById('home-symbol-label'),
        catBtns: document.querySelectorAll('.cat-btn'),
        saveBtn: document.getElementById('save-expense'),
        // Dashboard elements
        dashAvg: document.getElementById('dash-avg'),
        dashDays: document.getElementById('dash-days'),
        dashTotal: document.getElementById('dash-total'),
        projMonth: document.getElementById('proj-month'),
        projQuarter: document.getElementById('proj-quarter'),
        notesInput: document.getElementById('expense-note'),

        // New elements
        todaySpent: document.getElementById('today-spent'),
        todayRemaining: document.getElementById('today-remaining'),
        todayProgressFill: document.getElementById('today-progress-fill'),
        budgetInput: document.getElementById('daily-budget-input'),
        budgetLockBtn: document.getElementById('budget-lock-btn'),
        miniBudgetSymbol: document.getElementById('budget-symbol-mini'),
        settingsHomeSymbol: document.getElementById('budget-symbol-mini'), // Redirecting to mini symbol
        progressToggleBtn: document.getElementById('progress-toggle-btn'),

        // Auth elements
        authOverlay: document.getElementById('auth-overlay'),
        mainApp: document.getElementById('main-app'),
        authError: document.getElementById('auth-error'),
        loginForm: document.getElementById('login-form'),
        signupForm: document.getElementById('signup-form'),
        userEmailDisplay: document.getElementById('user-email-display'),

        activeTripName: document.getElementById('active-trip-name'),
        tripSelector: document.getElementById('trip-selector'),
        joinCodeBadge: document.getElementById('trip-join-code-badge'),
        copyBtn: document.querySelector('.copy-btn'),
        // Trip selector modal
        tripModal: document.getElementById('trip-modal'),
        // Date modal elements
        dateModal: document.getElementById('date-modal'),
        displayDateText: document.getElementById('display-date-text'),
        dateLabelText: document.getElementById('date-label-text'),
        splitIndicator: document.getElementById('split-indicator'),
        splitText: document.getElementById('split-text')
    };



    document.getElementById('open-date-modal').addEventListener('click', () => {
        renderModalCalendar();
        els.dateModal.classList.add('active');
    });

    document.getElementById('close-date-modal').addEventListener('click', () => {
        els.dateModal.classList.remove('active');
    });

    document.getElementById('confirm-date').addEventListener('click', () => {
        updateDisplayDate(state.selectedDate);
        els.dateModal.classList.remove('active');
    });

    document.getElementById('modal-prev-month').onclick = () => {
        state.modalCalMonth--;
        if (state.modalCalMonth < 0) { state.modalCalMonth = 11; state.modalCalYear--; }
        renderModalCalendar();
    };
    document.getElementById('modal-next-month').onclick = () => {
        state.modalCalMonth++;
        if (state.modalCalMonth > 11) { state.modalCalMonth = 0; state.modalCalYear++; }
        renderModalCalendar();
    };

    updateDisplayDate(state.selectedDate);

    els.progressToggleBtn.addEventListener('click', () => {
        state.progressCurrency = state.progressCurrency === 'home' ? 'spending' : 'home';
        localStorage.setItem('nomad_progress_currency', state.progressCurrency);
        updateDailyProgress();
    });

    // Ensure pre-selected currencies exist in dropdowns
    ensureOptionExists(els.spendingSelect, state.spendingCurrency);
    ensureOptionExists(els.homeSelect, state.homeCurrency);

    // Initial Select Setup
    els.spendingSelect.value = state.spendingCurrency;
    els.homeSelect.value = state.homeCurrency;
    els.symbol.innerText = CURRENCY_SYMBOLS[state.spendingCurrency] || state.spendingCurrency;
    els.homeLabel.innerText = state.homeCurrency;
    els.budgetInput.value = state.dailyBudget;
    els.settingsHomeSymbol.innerText = CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency;
    autoScaleInput();

    // Fetch Initial Rates
    updateFxRate();
    updateDashboard();

    // Event Listeners - Core Tracker
    els.spendingSelect.addEventListener('change', (e) => {
        if (e.target.value === 'OTHER_SPEND') {
            openCurrencyModal('spending');
            return;
        }
        state.spendingCurrency = e.target.value;
        localStorage.setItem('nomad_last_spending_currency', state.spendingCurrency);
        els.symbol.innerText = CURRENCY_SYMBOLS[state.spendingCurrency] || state.spendingCurrency;
        updateFxRate();
        calculateHomeValue();
    });

    els.homeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'OTHER_HOME') {
            openCurrencyModal('home');
            return;
        }
        state.homeCurrency = e.target.value;
        localStorage.setItem('nomad_home_currency', state.homeCurrency);
        els.homeLabel.innerText = state.homeCurrency;
        els.settingsHomeSymbol.innerText = CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency;
        updateFxRate();
        calculateHomeValue();
        updateDailyProgress();
    });

    let isBudgetLocked = true;
    const lockPath = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>';
    const unlockPath = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path>';

    els.budgetLockBtn.addEventListener('click', () => {
        isBudgetLocked = !isBudgetLocked;
        els.budgetInput.readOnly = isBudgetLocked;

        if (isBudgetLocked) {
            els.budgetInput.classList.add('budget-input-locked');
            els.budgetLockBtn.classList.remove('unlocked');
            els.budgetLockBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${lockPath}</svg>`;

            const val = parseFloat(els.budgetInput.value);
            if (!isNaN(val) && val >= 0) {
                state.dailyBudget = val;
                localStorage.setItem('nomad_daily_budget', val);
                if (state.currentTrip && !state.currentTrip.is_example) {
                    sb.from('trips').update({ daily_budget: val }).eq('id', state.currentTrip.id).then();
                }
                updateDailyProgress();
            } else {
                els.budgetInput.value = Math.round(state.dailyBudget);
            }
        } else {
            els.budgetInput.classList.remove('budget-input-locked');
            els.budgetLockBtn.classList.add('unlocked');
            els.budgetLockBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${unlockPath}</svg>`;
            els.budgetInput.focus();
        }
    });

    els.budgetInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0) {
            state.dailyBudget = val;
            updateDailyProgress();
        }
    });

    els.localInput.addEventListener('input', () => {
        autoScaleInput();
        calculateHomeValue();
        updateSplitIndicator();
    });

    els.catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.catBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedCategory = btn.dataset.category;
        });
    });

    els.saveBtn.addEventListener('click', saveExpense);

    // Auth Listeners
    document.getElementById('switch-to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        els.loginForm.classList.add('hidden');
        els.signupForm.classList.remove('hidden');
        document.getElementById('auth-subtitle').innerText = "Create your nomad account";
        els.authError.classList.add('hidden');
    });

    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        els.signupForm.classList.add('hidden');
        els.loginForm.classList.remove('hidden');
        document.getElementById('auth-subtitle').innerText = "Sign in to track your adventures";
        els.authError.classList.add('hidden');
    });

    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-signup').addEventListener('click', handleSignup);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    const handleGoogle = () => alert("Google Sign-In requires a Client ID. Please set this up in your Supabase Dashboard under Authentication -> Providers -> Google.");
    document.getElementById('btn-google').addEventListener('click', handleGoogle);
    document.getElementById('btn-google-signup').addEventListener('click', handleGoogle);

    // Trip Selector (Dashboard)
    if (els.tripSelector) {
        els.tripSelector.addEventListener('change', (e) => {
            const trip = state.trips.find(t => t.id === e.target.value);
            if (trip) setActiveTrip(trip);
        });
    }

    // Calendar & Insights Wiring
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    if (prevBtn) prevBtn.onclick = () => changeMonth(-1);
    if (nextBtn) nextBtn.onclick = () => changeMonth(1);

    const closeDetail = document.getElementById('close-detail');
    if (closeDetail) closeDetail.onclick = () => { document.getElementById('day-detail-panel').style.display = 'none'; };


    // Trip Selector Modal
    const tripModal = document.getElementById('trip-modal');
    document.getElementById('open-trip-selector').addEventListener('click', () => {
        renderTripMenu();
        tripModal.classList.add('active');
    });

    document.getElementById('close-trip-modal').addEventListener('click', () => {
        tripModal.classList.remove('active');
    });

    // New Trip Modal Listeners
    const newTripModal = document.getElementById('new-trip-modal');
    document.getElementById('open-new-trip-modal-btn').addEventListener('click', () => {
        tripModal.classList.remove('active');
        newTripModal.classList.add('active');
    });

    document.getElementById('close-new-trip-modal').addEventListener('click', () => {
        newTripModal.classList.remove('active');
    });

    document.getElementById('btn-create-trip-confirm').addEventListener('click', async () => {
        const btn = document.getElementById('btn-create-trip-confirm');
        const name = document.getElementById('new-trip-name').value.trim();
        const homeCurrency = document.getElementById('new-trip-home-currency').value;
        const dailyBudget = parseFloat(document.getElementById('new-trip-budget').value) || 50;

        if (!name) {
            alert("Please give your trip a name!");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Creating...";

        const { data, error } = await sb.from('trips').insert([
            {
                name,
                daily_budget: dailyBudget,
                home_currency: homeCurrency,
                created_by: state.user.id
            }
        ]).select();

        if (error) {
            alert("Failed to create trip: " + error.message);
            btn.disabled = false;
            btn.innerText = "Initialize Trip";
            return;
        }

        if (data && data.length > 0) {
            await sb.from('trip_members').insert([{ trip_id: data[0].id, user_id: state.user.id, role: 'owner' }]);
            await fetchUserTrips();
            const newTrip = state.trips.find(t => t.id === data[0].id);
            if (newTrip) setActiveTrip(newTrip);

            newTripModal.classList.remove('active');
            document.getElementById('new-trip-name').value = '';
        }

        btn.disabled = false;
        btn.innerText = "Initialize Trip";
    });

    // --- Join Trip Logic (Secure Account-based) ---
    document.getElementById('btn-join-trip').addEventListener('click', async () => {
        const joinInput = document.getElementById('join-code-input');
        const code = joinInput.value.trim().toUpperCase();
        const btn = document.getElementById('btn-join-trip');
        
        if (!code) {
            alert("Please enter a join code!");
            return;
        }

        btn.disabled = true;
        btn.innerText = "Searching...";

        // Use the new RPC function we just added in SQL for privacy
        const { data: tripData, error: rpcError } = await sb.rpc('get_trip_by_code', { t_code: code });

        if (rpcError || !tripData || tripData.length === 0) {
            alert("Invalid join code. Please check with the trip owner.");
            btn.disabled = false;
            btn.innerText = "Join Trip";
            return;
        }

        const foundTrip = tripData[0];

        // 2. Add user to trip_members
        const { error: joinError } = await sb.from('trip_members').insert([
            { trip_id: foundTrip.id, user_id: state.user.id, role: 'member' }
        ]);

        if (joinError && joinError.code !== '23505') {
            alert("Failed to join trip: " + joinError.message);
        } else {
            alert("Successfully joined " + foundTrip.name + "!");
            document.getElementById('join-code-input').value = '';
            document.getElementById('trip-modal').classList.remove('active');
            await fetchUserTrips(); // Refresh list to see the new trip
            
            // Set it active manually after refresh
            const tripObj = state.trips.find(t => t.id === foundTrip.id);
            if (tripObj) setActiveTrip(tripObj);
        }

        btn.disabled = false;
        btn.innerText = "Join Trip";
    });

    // Native Share / Invite
    els.joinCodeBadge.addEventListener('click', async () => {
        const code = els.joinCodeBadge.innerText.trim();
        if (code === '---' || code === 'COPIED!') return;

        const shareData = {
            title: `Join my trip: ${state.currentTrip.name}`,
            text: `Hey! Track expenses with me on our trip "${state.currentTrip.name}". Use my join code: ${code}`,
            url: window.location.href // This will eventually be a deep link
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // Fallback to clipboard if share sheet is closed or fails
                copyToClipboard(code);
            }
        } else {
            copyToClipboard(code);
        }
    });


    const viewRawBtn = document.getElementById('view-raw');
    if (viewRawBtn) viewRawBtn.onclick = openAuditModal;

    if (els.copyBtn) els.copyBtn.addEventListener('click', copyToSheets);

    // Invite Handlers
    document.getElementById('btn-invite-share')?.addEventListener('click', handleInviteShare);
    document.getElementById('btn-invite-email')?.addEventListener('click', handleInviteEmail);

    // Initial Auth Check & Persistence
    // onAuthStateChange handles the initial session check automatically
    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            updateAuthState(session?.user);
        } else if (event === 'SIGNED_OUT') {
            updateAuthState(null);
        }
    });
    // checkUser() is no longer needed as onAuthStateChange handles the initial session check automatically
}

function renderTripMenu() {
    const list = document.getElementById('trip-list-menu');
    if (!list) return;

    // Use a Set to ensure unique IDs if data somehow has duplicates
    const uniqueTrips = [];
    const seen = new Set();
    state.trips.forEach(t => {
        if (!seen.has(t.id)) {
            seen.add(t.id);
            uniqueTrips.push(t);
        }
    });

    list.innerHTML = uniqueTrips.map(t => `
        <div class="trip-menu-item ${state.currentTrip && state.currentTrip.id === t.id ? 'active' : ''}" onclick="selectTripFromMenu('${t.id}')">
            <span class="trip-name">${t.name}</span>
            ${state.currentTrip && state.currentTrip.id === t.id ? '<span>✓</span>' : ''}
        </div>
    `).join('');
}

window.selectTripFromMenu = (id) => {
    const trip = state.trips.find(t => t.id === id);
    if (trip) setActiveTrip(trip);
    document.getElementById('trip-modal').classList.remove('active');
};

/** HELPER FUNCTIONS **/

function updateSplitLabel() {
    const days = parseInt(els.multiDayCount.value) || 1;
    els.splitPerDayLabel.innerText = days;
}

async function setActiveTrip(trip) {
    if (!trip) {
        state.currentTrip = null;
        els.activeTripName.innerText = "Create a Trip";
        if (els.joinCodeBadge) els.joinCodeBadge.innerText = '---';
        if (els.tripSelector) els.tripSelector.value = '';
        state.history = [];
        renderHistory();
        updateDashboard();
        updateDailyProgress();
        return;
    }

    state.currentTrip = trip;
    state.dailyBudget = trip.daily_budget;
    state.homeCurrency = trip.home_currency;

    // Update UI
    els.activeTripName.innerText = trip.name;
    els.budgetInput.value = Math.round(trip.daily_budget);
    els.homeSelect.value = trip.home_currency;
    els.homeLabel.innerText = trip.home_currency;
    if (els.settingsHomeSymbol) els.settingsHomeSymbol.innerText = CURRENCY_SYMBOLS[trip.home_currency] || trip.home_currency;

    // Display Join Code
    if (els.joinCodeBadge) {
        els.joinCodeBadge.innerText = trip.join_code || '---';
    }

    // Sync the dashboard selector if it exists
    if (els.tripSelector) {
        els.tripSelector.value = trip.id;
    }

    localStorage.setItem('nomad_home_currency', state.homeCurrency);
    localStorage.setItem('nomad_daily_budget', state.dailyBudget);

    renderTripMenu(); // Update checkmarks in modal

    // Refresh everything
    updateFxRate();
    fetchTripExpenses();
}

async function handleInviteShare() {
    const code = state.currentTrip?.join_code;
    if (!code) return;

    const shareText = `Join my trip "${state.currentTrip.name}" on Nomad Tracker! Use code: ${code}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Join Nomad Trip',
                text: shareText,
                url: window.location.href
            });
        } catch (err) {
            console.log("Share failed or cancelled", err);
        }
    } else {
        copyToClipboard(code);
        alert("Invite code copied to clipboard!");
    }
}

function handleInviteEmail() {
    const code = state.currentTrip?.join_code;
    if (!code) return;

    const subject = encodeURIComponent(`Join my trip: ${state.currentTrip.name}`);
    const body = encodeURIComponent(`Hey! Join my trip on Nomad Tracker so we can track expenses together.\n\nTrip Name: ${state.currentTrip.name}\nInvite Code: ${code}\n\nTrack here: ${window.location.href}`);
    
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const badge = document.getElementById('trip-join-code-badge');
        if (badge) {
            const original = badge.innerText;
            badge.innerText = "COPIED!";
            setTimeout(() => badge.innerText = original, 1500);
        }
    });
}

async function fetchUserTrips() {
    if (!state.user) return;
    
    // 1. Fetch real trips from DB
    const { data: memberData, error } = await sb.from('trip_members')
        .select('trips(*)')
        .eq('user_id', state.user.id);

    if (error) { 
        console.error("Error fetching trips:", error); 
    }

    let realTrips = memberData ? memberData.map(m => m.trips).filter(Boolean) : [];
    realTrips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 2. Always include the Example Trip
    const allTrips = [EXAMPLE_TRIP, ...realTrips];
    state.trips = allTrips;

    // 3. Update Selector UI
    if (els.tripSelector) {
        els.tripSelector.innerHTML = allTrips.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
    
    renderTripMenu(); 

    // 4. Handle initial selection
    if (realTrips.length > 0) {
        // If we have real trips, select the first real one
        if (!state.currentTrip || !allTrips.find(t => t.id === state.currentTrip.id)) {
            setActiveTrip(realTrips[0]);
        } else {
            els.tripSelector.value = state.currentTrip.id;
        }
    } else {
        // New user or no real trips - don't auto-select example, just show prompt
        setActiveTrip(null);
    }
}


async function fetchTripExpenses() {
    if (!state.currentTrip) {
        state.history = [];
        renderHistory();
        updateDashboard();
        updateDailyProgress();
        return;
    }

    if (state.currentTrip.is_example) {
        generateExampleHistory();
        return;
    }

    const { data, error } = await sb.from('expenses')
        .select('*')
        .eq('trip_id', state.currentTrip.id)
        .order('spent_at', { ascending: false });

    if (error) { console.error("Failed to fetch expenses", error); return; }

    state.history = data.map(e => ({
        id: e.id,
        date: e.spent_at,
        category: e.category,
        localAmount: e.local_amount,
        currency: e.local_currency,
        usdAmount: e.home_amount,
        symbol: CURRENCY_SYMBOLS[e.local_currency] || e.local_currency,
        note: e.note
    }));

    renderHistory();
    updateDashboard();
    updateDailyProgress();
}

async function checkUser() {
    const { data: { user } } = await sb.auth.getUser();
    updateAuthState(user);
}

function updateAuthState(user) {
    state.user = user;
    if (user) {
        els.authOverlay.classList.add('hidden');
        els.mainApp.classList.remove('hidden');
        els.userEmailDisplay.innerText = user.email;
        fetchUserTrips();
    } else {
        els.authOverlay.classList.remove('hidden');
        els.mainApp.classList.add('hidden');
        els.userEmailDisplay.innerText = "Not logged in";
        state.history = [];
        state.currentTrip = null;
    }
}

async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    els.authError.classList.add('hidden');

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
        els.authError.innerText = error.message;
        els.authError.classList.remove('hidden');
    } else {
        updateAuthState(data.user);
    }
}

async function handleSignup() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    els.authError.classList.add('hidden');

    const { data, error } = await sb.auth.signUp({ email, password });

    if (error) {
        els.authError.innerText = error.message;
        els.authError.classList.remove('hidden');
    } else if (data.user) {
        updateAuthState(data.user);
    }
}

async function handleLogout() {
    await sb.auth.signOut();
    updateAuthState(null);
}

function changeMonth(delta) {
    state.calMonth += delta;
    if (state.calMonth < 0) {
        state.calMonth = 11;
        state.calYear--;
    } else if (state.calMonth > 11) {
        state.calMonth = 0;
        state.calYear++;
    }
    renderHistory();
}

// --- Sheets Data Flow ---

async function fetchHistoryFromSheets(silent = false) {
    const url = localStorage.getItem('nomad_sheets_url');
    if (!url) {
        if (!silent) alert("Please connect to Google Sheets in the Insights tab first!");
        return;
    }

    const btn = document.getElementById('fetch-sheets');
    const originalText = btn.innerText;
    btn.innerText = "Connecting...";
    btn.disabled = true;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        if (data.error) {
            alert("Spreadsheet Error: " + data.error);
            return;
        }

        processSheetsData(data);
        btn.innerText = "Updated! ✅";
    } catch (err) {
        console.error("Fetch GET failed:", err);
        alert("Connection Failed. Did you set 'Who has access' to 'Anyone' in your Deployment?");
        btn.innerText = "Error ❌";
    } finally {
        setTimeout(() => {
            btn.innerText = originalText;
            btn.disabled = false;
        }, 3000);
    }
}

function processSheetsData(grid) {
    if (!grid || grid.length < 2) return;

    const headers = grid[0].map(h => String(h).trim().toLowerCase());
    const rows = grid.slice(1);

    const idx = {
        date: headers.indexOf('date'),
        accommodation: headers.indexOf('accommodation'),
        breakfast: headers.indexOf('breakfast'),
        lunch: headers.indexOf('lunch'),
        dinner: headers.indexOf('dinner'),
        transportation: headers.indexOf('transportation'),
        miscellaneous: headers.indexOf('miscellaneous'),
        notes: headers.indexOf('notes')
    };

    const newHistory = [];
    rows.forEach(row => {
        const rawDate = row[idx.date];
        if (!rawDate) return;

        const dateObj = new Date(rawDate);
        if (isNaN(dateObj)) return;

        const rowNote = idx.notes > -1 ? String(row[idx.notes] || '').trim() : '';

        const categories = ['accommodation', 'breakfast', 'lunch', 'dinner', 'transportation', 'miscellaneous'];
        categories.forEach(cat => {
            const val = parseFloat(row[idx[cat]]) || 0;
            if (val > 0) {
                newHistory.push({
                    id: 'sheet-' + Math.random(),
                    date: dateObj.toISOString(),
                    category: cat,
                    localAmount: val,
                    currency: 'USD',
                    usdAmount: val,
                    symbol: '$',
                    note: rowNote
                });
            }
        });
    });

    state.history = newHistory;
    localStorage.setItem('nomad_history', JSON.stringify(state.history));
    renderHistory();
    updateDashboard();
}

// --- Modal Logic ---
let currentCurrencyTarget = null;
const currencyModal = document.getElementById('currency-modal');
const currencySearchInput = document.getElementById('currency-search-input');
const currencyListEl = document.getElementById('currency-list');
const closeCurrencyModalBtn = document.getElementById('close-currency-modal');

if (currencySearchInput) {
    currencySearchInput.addEventListener('input', (e) => renderCurrencyList(e.target.value));
    closeCurrencyModalBtn.addEventListener('click', closeCurrencyModal);
}

function renderCurrencyList(filterText = '') {
    if (!currencyListEl) return;
    currencyListEl.innerHTML = '';
    const term = filterText.toLowerCase();

    Object.keys(ALL_CURRENCIES).forEach(code => {
        const name = ALL_CURRENCIES[code];
        if (code.toLowerCase().includes(term) || name.toLowerCase().includes(term)) {
            const item = document.createElement('div');
            item.className = 'currency-list-item';
            item.innerHTML = `<span>${code}</span><span>${name}</span>`;
            item.onclick = () => selectCurrencyFromModal(code);
            currencyListEl.appendChild(item);
        }
    });
}

function openCurrencyModal(target) {
    currentCurrencyTarget = target;
    currencyModal.classList.add('active');
    currencySearchInput.value = '';
    renderCurrencyList('');
    setTimeout(() => currencySearchInput.focus(), 100);
}

function closeCurrencyModal() {
    currencyModal.classList.remove('active');
    // Revert select if "Other..." is still selected
    if (currentCurrencyTarget === 'spending' && els.spendingSelect.value === 'OTHER_SPEND') {
        els.spendingSelect.value = state.spendingCurrency; // revert strictly
    }
    if (currentCurrencyTarget === 'home' && els.homeSelect.value === 'OTHER_HOME') {
        els.homeSelect.value = state.homeCurrency;
    }
}

function selectCurrencyFromModal(code) {
    if (currentCurrencyTarget === 'spending') {
        ensureOptionExists(els.spendingSelect, code);
        els.spendingSelect.value = code;
        state.spendingCurrency = code;
        localStorage.setItem('nomad_last_spending_currency', state.spendingCurrency);
        els.symbol.innerText = CURRENCY_SYMBOLS[state.spendingCurrency] || code;
    } else {
        ensureOptionExists(els.homeSelect, code);
        els.homeSelect.value = code;
        state.homeCurrency = code;
        localStorage.setItem('nomad_home_currency', state.homeCurrency);
        els.homeLabel.innerText = state.homeCurrency;
        els.settingsHomeSymbol.innerText = CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency;
    }

    updateFxRate();
    calculateHomeValue();
    closeCurrencyModal();
}

function ensureOptionExists(selectEl, code) {
    if (!selectEl) return;
    if (!Array.from(selectEl.options).some(opt => opt.value === code)) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.innerText = `${code} (${CURRENCY_SYMBOLS[code] || '$'})`;
        // Insert right before the last "Other..." option
        selectEl.insertBefore(opt, selectEl.lastElementChild);
    }
}

// --- Logic ---

function autoScaleInput() {
    let rawVal = els.localInput.value.replace(/,/g, '');

    // Only allow numbers and one decimal point
    rawVal = rawVal.replace(/[^0-9.]/g, '');
    const parts = rawVal.split('.');
    if (parts.length > 2) rawVal = parts[0] + '.' + parts.slice(1).join('');

    // 1 Trillion Limit (1,000,000,000,000)
    if (parseFloat(rawVal) > 1000000000000) {
        alert("Maximum digits exceeded.");
        rawVal = "1000000000000";
    }

    // Format with commas
    let displayVal = rawVal;
    if (rawVal !== '') {
        const numPart = parts[0];
        const decimalPart = parts.length > 1 ? '.' + parts[1].substring(0, 2) : '';
        displayVal = parseInt(numPart || 0).toLocaleString('en-US') + decimalPart;

        if (rawVal.endsWith('.') && !displayVal.includes('.')) displayVal += '.';
        if (rawVal === '0' || rawVal === '0.') displayVal = rawVal;
    }

    els.localInput.value = displayVal;

    // --- Aggressive Font Scaling ---
    const len = displayVal.length || 1;
    let fontSize = 4; // Starting size

    if (len > 6) fontSize = 3.5;
    if (len > 9) fontSize = 2.8;
    if (len > 12) fontSize = 2.0;
    if (len > 15) fontSize = 1.6;
    if (len > 18) fontSize = 1.2; // The absolute floor for 1 trillion + decimals

    els.localInput.style.fontSize = fontSize + 'rem';
    els.symbol.style.fontSize = Math.max(fontSize * 0.4, 1.1) + 'rem';

    // Dynamic Width Calculation to keep it centered
    // We use a temporary span to measure exact pixel width for better centering
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.fontSize = fontSize + 'rem';
    tempSpan.style.fontWeight = '800';
    tempSpan.style.fontFamily = 'inherit';
    tempSpan.innerText = displayVal || '0';
    document.body.appendChild(tempSpan);
    const textWidth = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan);

    els.localInput.style.width = (textWidth + 5) + 'px';
}

async function updateFxRate() {
    if (state.spendingCurrency === state.homeCurrency) {
        state.fxRateToHome = 1;
        els.rateBanner.innerText = `1 ${state.spendingCurrency} = 1.00 ${state.homeCurrency}`;
        calculateHomeValue();
        updateDailyProgress();
        return;
    }

    els.rateBanner.innerText = 'Updating rates...';
    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${state.homeCurrency}`);
        const data = await response.json();

        // We want the rate relative to the Home currency
        const rateToHome = 1 / data.rates[state.spendingCurrency];
        state.fxRateToHome = rateToHome;

        // Better display logic: always show 1 of the larger currency = X of smaller currency
        if (rateToHome < 1) {
            const bigRate = 1 / rateToHome;
            els.rateBanner.innerText = `1 ${state.homeCurrency} ≈ ${bigRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${state.spendingCurrency}`;
        } else {
            els.rateBanner.innerText = `1 ${state.spendingCurrency} ≈ ${rateToHome.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${state.homeCurrency}`;
        }

        calculateHomeValue();
        updateDailyProgress();
    } catch (err) {
        console.error('FX Fetch failed', err);
        // Fallback logic could go here, but for now we show error
        els.rateBanner.innerText = `Rates unavailable (Offline)`;
        calculateHomeValue();
        updateDailyProgress();
    }
}

function updateDisplayDate(val) {
    const d = new Date(val + 'T00:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (els.displayDateText) els.displayDateText.innerText = `${months[d.getMonth()]} ${d.getDate()}`;
    state.selectedDate = val;

    if (val === getLocalYYYYMMDD()) {
        if (els.dateLabelText) els.dateLabelText.innerText = "Today";
    } else {
        if (els.dateLabelText) els.dateLabelText.innerText = "Date";
    }
    updateDailyProgress();
    updateSplitIndicator();
}

function updateSplitIndicator() {
    if (!els.splitIndicator || !els.splitText || !els.localInput) return;
    const rawVal = els.localInput.value.replace(/,/g, '');
    const amount = parseFloat(rawVal) || 0;

    if (state.rangeStart && state.rangeEnd && amount > 0) {
        const start = new Date(state.rangeStart + 'T00:00:00');
        const end = new Date(state.rangeEnd + 'T00:00:00');
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const perDay = (amount / diffDays).toFixed(2);
        els.splitIndicator.classList.remove('hidden');
        els.splitText.innerText = `${CURRENCY_SYMBOLS[state.spendingCurrency] || ''}${amount} will be spread as ${CURRENCY_SYMBOLS[state.spendingCurrency] || ''}${perDay}/day over ${diffDays} days`;
    } else {
        els.splitIndicator.classList.add('hidden');
    }
}

function calculateHomeValue() {
    const rawVal = els.localInput.value.replace(/,/g, '');
    const localVal = parseFloat(rawVal) || 0;
    const homeVal = localVal * state.fxRateToHome;
    els.usdOutput.innerText = homeVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function saveExpense() {
    console.log("Save triggered...");
    const btn = els.saveBtn;
    if (!btn) {
        console.error("Save button element (els.saveBtn) not found!");
        return;
    }

    const rawVal = els.localInput.value.replace(/,/g, '');
    const totalAmount = parseFloat(rawVal);

    if (isNaN(totalAmount) || totalAmount <= 0) {
        alert("Please enter a valid amount!");
        return;
    }
    if (!state.selectedCategory) {
        alert("Please select a category (e.g., Stay, Lunch)!");
        return;
    }
    if (!state.currentTrip) {
        alert("No active trip found. Please select or create a trip in the Dashboard.");
        return;
    }

    const newExpenses = [];

    try {
        if (state.rangeStart && state.rangeEnd) {
            const start = new Date(state.rangeStart + 'T00:00:00');
            const end = new Date(state.rangeEnd + 'T00:00:00');
            const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

            const amountPerDay = totalAmount / diffDays;
            const homeAmountPerDay = (totalAmount * state.fxRateToHome) / diffDays;

            for (let i = 0; i < diffDays; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                newExpenses.push({
                    trip_id: state.currentTrip.id,
                    user_id: state.user.id,
                    local_amount: amountPerDay,
                    local_currency: state.spendingCurrency,
                    home_amount: homeAmountPerDay,
                    fx_rate: state.fxRateToHome,
                    category: state.selectedCategory,
                    note: els.notesInput.value.trim() + ` (Split ${i + 1}/${diffDays})`,
                    spent_at: d.toISOString(),
                    paid_by: state.user.id
                });
            }
        } else {
            const d = new Date(state.selectedDate + 'T00:00:00');
            newExpenses.push({
                trip_id: state.currentTrip.id,
                user_id: state.user.id,
                local_amount: totalAmount,
                local_currency: state.spendingCurrency,
                home_amount: totalAmount * state.fxRateToHome,
                fx_rate: state.fxRateToHome,
                category: state.selectedCategory,
                note: els.notesInput.value.trim(),
                spent_at: d.toISOString(),
                paid_by: state.user.id
            });
        }

        const { error } = await sb.from('expenses').insert(newExpenses);
        if (error) throw error;

        console.log("Successfully saved to Supabase.");

        // 1. Immediate Visual Feedback
        const originalText = btn.innerText;
        btn.innerText = "Logged!";
        btn.classList.add('success-mode');

        // 2. Reset UI
        els.localInput.value = '';
        autoScaleInput();
        els.usdOutput.innerText = '0.00';
        els.notesInput.value = '';
        els.catBtns.forEach(b => b.classList.remove('selected'));
        state.selectedCategory = null;
        state.rangeStart = null;
        state.rangeEnd = null;

        updateDailyProgress();
        updateSplitIndicator();

        const hint = document.getElementById('range-selection-hint');
        if (hint) hint.innerText = "Tap dates to select range";

        fetchTripExpenses();

        // 3. Revert button text
        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('success-mode');
        }, 1500);

    } catch (err) {
        console.error("Save error:", err);
        alert("Failed to save: " + (err.message || "Unknown error"));
    }
}

// --- Audit & Modal ---

window.closeModal = function () {
    document.getElementById('raw-modal').classList.remove('active');
};

function openAuditModal() {
    const modal = document.getElementById('raw-modal');
    const content = document.getElementById('raw-log-content');
    const title = modal.querySelector('h2');
    if (title) title.innerText = `Export Trip: ${state.currentTrip ? state.currentTrip.name : 'Unknown'}`;
    modal.classList.add('active');

    if (state.history.length === 0) {
        content.innerHTML = '<tbody><tr><td colspan="4" style="text-align:center; padding: 2rem;">No data for this trip.</td></tr></tbody>';
        return;
    }

    let html = `<thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th></tr></thead><tbody>`;

    // Sort history by date for export
    const sorted = [...state.history].sort((a, b) => new Date(a.date) - new Date(b.date));

    sorted.forEach(h => {
        const localDate = new Date(h.date).toLocaleDateString();
        const displayCat = h.category.charAt(0).toUpperCase() + h.category.slice(1);
        const homeAmt = `${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${h.usdAmount.toFixed(2)}`;

        html += `<tr><td>${localDate}</td><td>${displayCat}</td><td><strong>${homeAmt}</strong></td><td class="table-note">${h.note || ''}</td></tr>`;
    });

    html += '</tbody>';
    content.innerHTML = html;
}


function renderHistory() {
    renderCalendar();
}

function renderCalendar() {
    const body = document.getElementById('calendar-body');
    const monthYearLabel = document.getElementById('calendar-month-year');
    body.innerHTML = '';

    const firstDay = new Date(state.calYear, state.calMonth, 1).getDay();
    const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(state.calYear, state.calMonth));

    monthYearLabel.innerText = `${monthName} ${state.calYear}`;

    // Group history by date
    const dayMap = {};
    state.history.forEach(item => {
        const d = new Date(item.date);
        const key = getLocalYYYYMMDD(d);
        if (!dayMap[key]) dayMap[key] = { total: 0, items: [] };
        dayMap[key].total += item.usdAmount;
        dayMap[key].items.push(item);
    });

    const todayLocal = getLocalYYYYMMDD();

    // Fill Empty days before 1st
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day empty';
        body.appendChild(div);
    }

    // Fill month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(state.calYear, state.calMonth, day);
        const key = getLocalYYYYMMDD(dateObj);
        const dayData = dayMap[key];

        const div = document.createElement('div');
        div.className = 'cal-day';
        if (key === todayLocal) div.classList.add('is-today');
        if (key === state.selectedDate) div.classList.add('selected-day');

        // Range highlighting
        if (state.rangeStart && state.rangeEnd) {
            if (key === state.rangeStart) div.classList.add('range-start');
            else if (key === state.rangeEnd) div.classList.add('range-end');
            else if (key > state.rangeStart && key < state.rangeEnd) div.classList.add('in-range');
        } else if (state.rangeStart && key === state.rangeStart) {
            div.classList.add('range-start');
        }

        div.innerHTML = `
            <span class="day-num">${day}</span>
            <div class="day-total ${!dayData ? 'zero' : ''}">
                ${CURRENCY_SYMBOLS[state.homeCurrency]}${dayData ? dayData.total.toFixed(0) : '0'}
            </div>
        `;

        div.onclick = () => handleCalendarDayClick(key, dateObj, dayData);
        body.appendChild(div);
    }
}

function handleCalendarDayClick(key, dateObj, dayData) {
    // 1. Double click or sequential click logic for Range
    if (!state.rangeStart || (state.rangeStart && state.rangeEnd)) {
        // Start a new range
        state.rangeStart = key;
        state.rangeEnd = null;
        document.getElementById('range-selection-hint').innerText = `Starting at ${key}...`;
    } else if (state.rangeStart && !state.rangeEnd) {
        if (key < state.rangeStart) {
            // Reset and start new if clicked earlier
            state.rangeStart = key;
        } else if (key === state.rangeStart) {
            // Unselect if clicking same day
            state.rangeStart = null;
            document.getElementById('range-selection-hint').innerText = "Tap dates to select range";
        } else {
            // Set end
            state.rangeEnd = key;
            const diff = Math.round((new Date(state.rangeEnd) - new Date(state.rangeStart)) / (1000 * 60 * 60 * 24)) + 1;
            document.getElementById('range-selection-hint').innerText = `Range Selected: ${diff} Days`;
        }
    }

    // 2. Select this date as the primary focus in Add tab
    const dateInput = document.getElementById('expense-date');
    if (dateInput) {
        dateInput.value = key;
        dateInput.dispatchEvent(new Event('change'));
    }

    renderHistory();
    showDayDetail(key, dateObj, dayData, null);
}

function showDayDetail(dateKey, dateObj, dayData, clickedDiv) {
    // Selection logic
    if (clickedDiv) {
        document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected-day'));
        clickedDiv.classList.add('selected-day');
    }

    const panel = document.getElementById('day-detail-panel');
    const title = document.getElementById('detail-date');
    const list = document.getElementById('detail-items');

    panel.style.display = 'block';
    title.innerText = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    list.innerHTML = '';

    const categories = ['accommodation', 'breakfast', 'lunch', 'dinner', 'transportation', 'miscellaneous'];
    const icons = {
        accommodation: '🏠', breakfast: '☕', lunch: '🥪',
        dinner: '🍲', transportation: '🛵', miscellaneous: '✨'
    };

    const catDataMap = {};
    if (dayData && dayData.items) {
        dayData.items.forEach(item => {
            if (!catDataMap[item.category]) catDataMap[item.category] = { total: 0, notes: [] };
            catDataMap[item.category].total += item.usdAmount;
            if (item.note) catDataMap[item.category].notes.push(item.note);
        });
    }

    categories.forEach(cat => {
        const itemObj = catDataMap[cat];
        const itemTotal = itemObj ? itemObj.total : 0;
        const notes = itemObj ? itemObj.notes : [];
        const displayName = cat.charAt(0).toUpperCase() + cat.slice(1);

        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        if (itemTotal === 0) itemDiv.classList.add('empty-category-row');

        let innerHTML = `
            <div class="hist-main">
                <span class="hist-cat">${icons[cat] || '💰'} ${displayName}</span>
                <span class="hist-amt">${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${itemTotal.toFixed(2)}</span>
            </div>
        `;

        notes.forEach(note => {
            innerHTML += `<div class="hist-note">"${note}"</div>`;
        });

        itemDiv.innerHTML = innerHTML;
        list.appendChild(itemDiv);
    });
}



async function syncToSheets(expense) {
    const url = localStorage.getItem('nomad_sheets_url');
    const statusEl = document.getElementById('sync-status');
    if (!url || !url.startsWith('https')) return;

    statusEl.innerText = "Syncing to Sheets...";
    statusEl.style.color = "var(--accent)";

    try {
        // We use 'no-cors' for POST because Google Apps Script redirects are tough for fetch/CORS.
        // It won't let us see the 'Success' body, but it WILL send the data.
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            redirect: 'follow', // Crucial for GAS
            headers: { 'Content-Type': 'text/plain' }, // Avoids preflight
            body: JSON.stringify(expense)
        });

        statusEl.innerText = "Sent to Cloud ✅";
        statusEl.style.color = "#4caf50";
        setTimeout(() => {
            statusEl.innerText = "Cloud Connection Active";
            statusEl.style.color = "var(--text-dim)";
        }, 3000);
    } catch (err) {
        console.error("Sync POST failed:", err);
        statusEl.innerText = "Local Error: Check URL";
        statusEl.style.color = "#ff5050";
    }
}

function updateDashboard() {
    updateDailyProgress();
    if (state.history.length === 0) {
        els.dashTotal.innerText = "$0.00";
        els.dashDays.innerText = "0";
        els.dashAvg.innerText = "$0.00";
        els.projMonth.innerText = "$0";
        els.projQuarter.innerText = "$0";
        return;
    }

    const totalUsd = state.history.reduce((sum, item) => sum + item.usdAmount, 0);

    // 1. Find the earliest expense date
    const dates = state.history.map(item => new Date(item.date).getTime());
    const minDate = new Date(Math.min(...dates));
    const today = new Date();

    // 2. Calculate days between earliest date and today (inclusive)
    // We treat every day since the first log as a 'tracked' day
    const diffTime = Math.abs(today - minDate);
    const uniqueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // 3. Math
    const avgDaily = totalUsd / uniqueDays;

    els.dashTotal.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency}${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    els.dashDays.innerText = uniqueDays;
    els.dashAvg.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency}${avgDaily.toFixed(2)}`;

    // Projections
    els.projMonth.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency}${(avgDaily * 30).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    els.projQuarter.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency}${(avgDaily * 90).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    // 4. Category Breakdown
    renderCategoryBreakdown(totalUsd);
    renderCategoryDonut(totalUsd);
}

function updateDailyProgress() {
    // Progress bar now ALWAYS shows actual today's spending
    const targetDateStr = getLocalYYYYMMDD(); 

    let spentTodayHome = 0;
    state.history.forEach(item => {
        const itemDate = getLocalYYYYMMDD(new Date(item.date));
        if (itemDate === targetDateStr) {
            spentTodayHome += item.usdAmount;
        }
    });

    const budgetHome = state.dailyBudget;

    let spentToday = spentTodayHome;
    let budget = budgetHome;
    let sym = CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency;

    // Convert to spending currency if toggled
    if (state.progressCurrency === 'spending' && state.fxRateToHome > 0) {
        spentToday = spentTodayHome / state.fxRateToHome;
        budget = budgetHome / state.fxRateToHome;
        sym = CURRENCY_SYMBOLS[state.spendingCurrency] || state.spendingCurrency;
    }

    const remaining = Math.max(0, budget - spentToday);

    const formatAmt = (amt) => {
        if (amt >= 1000) {
            return amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }
        return amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (els.todaySpent) els.todaySpent.innerText = `${sym}${formatAmt(spentToday)}`;
    if (els.todayRemaining) els.todayRemaining.innerText = `${sym}${formatAmt(remaining)}`;
    if (els.miniBudgetSymbol) els.miniBudgetSymbol.innerText = sym;
    if (els.budgetInput) els.budgetInput.value = Math.round(budget);

    let percent = budget > 0 ? (spentToday / budget) * 100 : 0;
    if (percent > 100) percent = 100;

    els.todayProgressFill.style.width = `${percent}%`;

    if (percent >= 100) {
        els.todayProgressFill.style.backgroundColor = 'var(--danger)';
    } else if (percent > 75) {
        els.todayProgressFill.style.backgroundColor = '#f59e0b'; // warning orange
    } else {
        els.todayProgressFill.style.backgroundColor = 'var(--primary)';
    }
}

function renderCategoryDonut(total) {
    const ctx = document.getElementById('category-donut');
    if (!ctx) return;

    const catTotals = state.history.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.usdAmount;
        return acc;
    }, {});

    const labels = Object.keys(catTotals).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const data = Object.values(catTotals);

    // Aesthetic travel-budget colors
    const colors = {
        accommodation: '#3b82f6', // Royal Blue
        breakfast: '#10b981',    // Mint Green
        lunch: '#059669',        // Emerald
        dinner: '#1d4ed8',       // Sea Blue
        transportation: '#60a5fa', // Sky Blue
        miscellaneous: '#f59e0b'  // Amber
    };

    const backgroundColors = Object.keys(catTotals).map(k => colors[k] || '#94a3b8');

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });

    document.getElementById('donut-total-val').innerText = `${CURRENCY_SYMBOLS[state.homeCurrency]}${total.toFixed(0)}`;
}

function renderCategoryBreakdown(total) {
    const statsEl = document.getElementById('category-stats');
    if (!statsEl) return;
    statsEl.innerHTML = '';

    if (total === 0) {
        statsEl.innerHTML = '<p class="empty-detail">No data for breakdown.</p>';
        return;
    }

    const catTotals = state.history.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.usdAmount;
        return acc;
    }, {});

    // Sort by amount
    const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

    sortedCats.forEach(([cat, amt]) => {
        const percent = (amt / total) * 100;
        const row = document.createElement('div');
        row.className = 'category-stats-row';
        row.innerHTML = `
            <div class="cat-stat-info">
                <span>${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <span>${CURRENCY_SYMBOLS[state.homeCurrency]}${amt.toFixed(2)} (${percent.toFixed(0)}%)</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${percent}%"></div>
            </div>
        `;
        statsEl.appendChild(row);
    });
}

function copyToSheets() {
    if (state.history.length === 0) return;

    // TSV Export: Date, Category, Amount (Home), Note
    let content = `Trip: ${state.currentTrip ? state.currentTrip.name : 'Unknown'}\n`;
    content += "Date\tCategory\tAmount (${state.homeCurrency})\tNote\n";

    const sorted = [...state.history].sort((a, b) => new Date(a.date) - new Date(b.date));
    content += sorted.map(h => {
        const d = new Date(h.date).toLocaleDateString();
        return `${d}\t${h.category}\t${h.usdAmount.toFixed(2)}\t${h.note || ''}`;
    }).join('\n');

    navigator.clipboard.writeText(content).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        setTimeout(() => btn.innerText = originalText, 2000);
    });
}

window.switchTab = function (tabId) {
    if (!els.tabs) return; // Might be called before init
    els.tabs.forEach(t => t.classList.remove('active'));
    els.btns.forEach(b => b.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');

    const targetBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if (targetBtn) targetBtn.classList.add('active');

    if (tabId === 'history') renderHistory();
    if (tabId === 'dash') updateDashboard();
};

/** MODAL CALENDAR **/
function renderModalCalendar() {
    const body = document.getElementById('modal-calendar-body');
    const label = document.getElementById('modal-calendar-month-year');
    if (!body || !label) return;
    body.innerHTML = '';

    const firstDay = new Date(state.modalCalYear, state.modalCalMonth, 1).getDay();
    const daysInMonth = new Date(state.modalCalYear, state.modalCalMonth + 1, 0).getDate();
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(state.modalCalYear, state.modalCalMonth));
    label.innerText = `${monthName} ${state.modalCalYear}`;

    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day empty';
        body.appendChild(div);
    }

    const todayLocal = getLocalYYYYMMDD();

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(state.modalCalYear, state.modalCalMonth, day);
        const key = getLocalYYYYMMDD(dateObj);

        const div = document.createElement('div');
        div.className = 'cal-day';
        if (key === todayLocal) div.classList.add('is-today');
        if (key === state.selectedDate) div.classList.add('selected-day');

        if (state.rangeStart && state.rangeEnd) {
            if (key === state.rangeStart) div.classList.add('range-start');
            else if (key === state.rangeEnd) div.classList.add('range-end');
            else if (key > state.rangeStart && key < state.rangeEnd) div.classList.add('in-range');
        } else if (state.rangeStart && key === state.rangeStart) {
            div.classList.add('range-start');
        }

        div.innerHTML = `<span class="day-num">${day}</span>`;
        div.onclick = () => {
            handleCalendarDayClick(key, dateObj, null);
            renderModalCalendar();
            const hint = document.getElementById('modal-range-hint');
            if (state.rangeStart && state.rangeEnd) {
                const diff = Math.round((new Date(state.rangeEnd) - new Date(state.rangeStart)) / (1000 * 60 * 60 * 24)) + 1;
                hint.innerText = `${diff} days selected`;
            } else if (state.rangeStart) {
                hint.innerText = `Starting from ${state.rangeStart}...`;
            } else {
                hint.innerText = `Selected: ${key}`;
            }
        };
        body.appendChild(div);
    }
}

function generateExampleHistory() {
    const expenses = [];
    const notes = [
        "Local market lunch", "Grab to the station", "Morning coffee",
        "Dinner with locals", "Supermarket bulk buy", "Airbnb cleaning fee",
        "Weekend moped rental", "Ferry ticket to island", "Beach club cocktails",
        "SIM card topup", "Laundry service", "Temple entry fee"
    ];

    const categories = ['accommodation', 'breakfast', 'lunch', 'dinner', 'transportation', 'miscellaneous'];

    // Seed for last 60 days
    for (let i = 0; i < 60; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);

        // Randomly skip some days to look natural
        if (Math.random() > 0.8) continue;

        // Add 1-3 random expenses per day
        const numPerDay = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numPerDay; j++) {
            const cat = categories[Math.floor(Math.random() * categories.length)];
            const localAmt = Math.floor(Math.random() * 50) + 5;
            const note = Math.random() > 0.5 ? notes[Math.floor(Math.random() * notes.length)] : "";

            expenses.push({
                id: 'ex-' + i + '-' + j,
                date: d.toISOString(),
                category: cat,
                localAmount: localAmt,
                currency: 'USD',
                usdAmount: localAmt,
                symbol: '$',
                note: note
            });
        }
    }

    state.history = expenses;
    renderHistory();
    updateDashboard();
    updateDailyProgress();
}

document.addEventListener('DOMContentLoaded', init);
