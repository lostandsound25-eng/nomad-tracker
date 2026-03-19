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
    modalCalYear: new Date().getFullYear(),
    offlineQueue: JSON.parse(localStorage.getItem('nomad_offline_queue') || '[]'),
    fxRates: JSON.parse(localStorage.getItem('nomad_fx_cache') || '{}'),

    // Calendar Tab State
    calEvents: JSON.parse(localStorage.getItem('nomad_cal_events') || '[]'),
    // shape: { id, title, color, emoji, startDate:'YYYY-MM-DD', endDate:'YYYY-MM-DD', notes:{} }
    committedExpenses: JSON.parse(localStorage.getItem('nomad_committed') || '[]'),
    // shape: { id, title, category, amount, currency, startDate, endDate, promoted:false }
    dayNotes: JSON.parse(localStorage.getItem('nomad_day_notes') || '{}'),
    // shape: { 'YYYY-MM-DD': string }
    calView: 'month',      // 'month' | 'week' | 'event'
    calWeekStart: null,    // 'YYYY-MM-DD' of the Sunday that starts the viewed week
    activeCalEvent: null   // the calEvents item currently zoomed into
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
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
    }
});

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
function formatAmt(amt) {
    if (amt >= 1000) {
        return amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
    USD: { name: 'US Dollar', symbol: '$', keywords: 'united states america usa' },
    EUR: { name: 'Euro', symbol: '€', keywords: 'europe france germany italy spain' },
    GBP: { name: 'British Pound', symbol: '£', keywords: 'united kingdom england london uk' },
    AUD: { name: 'Australian Dollar', symbol: '$', keywords: 'australia sydney' },
    CAD: { name: 'Canadian Dollar', symbol: '$', keywords: 'canada toronto' },
    IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', keywords: 'indonesia bali jakarta' },
    THB: { name: 'Thai Baht', symbol: '฿', keywords: 'thailand bangkok' },
    VND: { name: 'Vietnamese Dong', symbol: '₫', keywords: 'vietnam hanoi' },
    LAK: { name: 'Lao Kip', symbol: '₭', keywords: 'laos' },
    KHR: { name: 'Cambodian Riel', symbol: '៛', keywords: 'cambodia angkor phnom riel kriel' },
    JPY: { name: 'Japanese Yen', symbol: '¥', keywords: 'japan tokyo' },
    MXN: { name: 'Mexican Peso', symbol: '$', keywords: 'mexico cancun' },
    SGD: { name: 'Singapore Dollar', symbol: '$', keywords: 'singapore' },
    MYR: { name: 'Malaysian Ringgit', symbol: 'RM', keywords: 'malaysia kuala lumpur' },
    PHP: { name: 'Philippine Peso', symbol: '₱', keywords: 'philippines manila' },
    KRW: { name: 'South Korean Won', symbol: '₩', keywords: 'korea seoul' },
    INR: { name: 'Indian Rupee', symbol: '₹', keywords: 'india delhi mumbai' },
    NZD: { name: 'New Zealand Dollar', symbol: '$', keywords: 'new zealand kiwi' },
    CHF: { name: 'Swiss Franc', symbol: 'CHF', keywords: 'switzerland swiss' },
    BRL: { name: 'Brazilian Real', symbol: 'R$', keywords: 'brazil rio' },
    TRY: { name: 'Turkish Lira', symbol: '₺', keywords: 'turkey istanbul' },
    COP: { name: 'Colombian Peso', symbol: '$', keywords: 'colombia bogota medellin' },
    CNY: { name: 'Chinese Yuan', symbol: '¥', keywords: 'china beijing shanghai' },
    BZD: { name: 'Belize Dollar', symbol: 'BZ$', keywords: 'belize' },
    PEN: { name: 'Peruvian Sol', symbol: 'S/', keywords: 'peru lima' },
    ARS: { name: 'Argentine Peso', symbol: '$', keywords: 'argentina' }
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
        splitText: document.getElementById('split-text'),

        // Offline UI
        offlineBadge: document.getElementById('offline-status-badge'),
        sysStatus: document.getElementById('offline-status-text'),
        offlineBadgeBtn: document.getElementById('offline-status-badge'), // reuse same el


        // Added for dynamic toggle UI
        toggleHomeCode: document.getElementById('toggle-home-code'),
        toggleSpendingCode: document.getElementById('toggle-spending-code'),
        budgetStatusLabel: document.getElementById('budget-status-label'),
        dailyProgressCard: document.querySelector('.daily-progress-card'),
        progressPercentLabel: document.getElementById('progress-percent-label'),

        // Custom Spending Currency Modal
        spendingCurrencyModal: document.getElementById('spending-currency-modal'),
        spendingCurrencyList: document.getElementById('spending-currency-list'),
        displaySpendingCurrency: document.getElementById('display-spending-currency'),
        offlineNotice: document.getElementById('offline-notification')
    };


    // Network Event Listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus(); // Initial check

    if (els.offlineBadge) {
        els.offlineBadge.addEventListener('click', () => {
            if (navigator.onLine) syncOfflineData();
        });
    }



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

    document.getElementById('open-spending-currency-modal').addEventListener('click', () => {
        renderSpendingCurrencyModal();
        els.spendingCurrencyModal.classList.add('active');
    });

    document.getElementById('close-spending-currency-modal').addEventListener('click', () => {
        els.spendingCurrencyModal.classList.remove('active');
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

    // Sync Display label
    if (els.displaySpendingCurrency) {
        els.displaySpendingCurrency.innerText = `${state.spendingCurrency} (${CURRENCY_SYMBOLS[state.spendingCurrency] || ''})`;
    }

    autoScaleInput();

    // Currency Modal Listeners
    const searchInput = document.getElementById('spending-currency-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderSpendingCurrencyModal(e.target.value);
        });
    }

    document.querySelectorAll('.quick-cur-btn').forEach(btn => {
        btn.onclick = () => {
            const code = btn.getAttribute('data-code');
            selectSpendingCurrency(code);
        };
    });

    // Detect & inject GPS-based local currency
    detectAndInjectLocalCurrency();

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

    // --- REINFORCED AUTH INITIALIZATION ---
    let authInitialized = false;

    const processAuth = (user, source) => {
        console.log(`Auth processing from ${source}:`, user ? user.email : "Null");
        
        // Safety: If we already have a user and something (like a late INITIAL_SESSION) 
        // tries to set it to null, we ignore it unless it's a SIGNED_OUT event.
        if (authInitialized && user === null && source === 'INITIAL_SESSION' && state.user) {
            console.log("Auth: Ignoring late null INITIAL_SESSION as we already have a user.");
            return;
        }

        // Prevent redundant updates for the same user
        if (authInitialized && user && state.user?.id === user.id) return;

        authInitialized = true;
        updateAuthState(user);
    };

    const initAuth = async () => {
        try {
            const { data: { user } } = await sb.auth.getUser();
            if (user) {
                processAuth(user, 'initAuth_getUser');
            } else {
                const { data: { session } } = await sb.auth.getSession();
                processAuth(session?.user || null, 'initAuth_getSession');
            }
        } catch (err) {
            console.error("Auth initialization error:", err);
            processAuth(null, 'initAuth_Error');
        }
    };

    sb.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            processAuth(session?.user || null, event);
        } else if (event === 'SIGNED_OUT') {
            processAuth(null, 'SIGNED_OUT');
        } else if (event === 'INITIAL_SESSION') {
            processAuth(session?.user || null, 'INITIAL_SESSION');
        }
    });

    initAuth();
    
    setupCalendarListeners();
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
        localStorage.removeItem('nomad_current_trip_id');
        return;
    }

    state.currentTrip = trip;
    localStorage.setItem('nomad_current_trip_id', trip.id);
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
    const savedTripId = localStorage.getItem('nomad_current_trip_id');
    if (savedTripId) {
        const found = allTrips.find(t => t.id === savedTripId);
        if (found) {
            setActiveTrip(found);
            return;
        }
    }

    if (realTrips.length > 0) {
        // If we have real trips, select the first real one
        if (!state.currentTrip || !allTrips.find(t => t.id === state.currentTrip.id)) {
            setActiveTrip(realTrips[0]);
        } else {
            els.tripSelector.value = state.currentTrip.id;
        }
    } else {
        // New user or no real trips - auto-select example to show initial state
        setActiveTrip(EXAMPLE_TRIP);
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
    
    // Safety check: ensure DOM elements are ready
    if (!els || !els.authOverlay || !els.mainApp) {
        console.warn("updateAuthState called before UI elements were ready.");
        return;
    }

    if (user) {
        els.authOverlay.classList.add('hidden');
        els.mainApp.classList.remove('hidden');
        if (els.userEmailDisplay) els.userEmailDisplay.innerText = user.email;
        fetchUserTrips();
        updateNetworkStatus();
    } else {
        els.authOverlay.classList.remove('hidden');
        els.mainApp.classList.add('hidden');
        if (els.userEmailDisplay) els.userEmailDisplay.innerText = "Not logged in";
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

        if (data && data.rates) {
            state.fxRates = data.rates;
            localStorage.setItem('nomad_fx_cache', JSON.stringify(data.rates));

            const rateToHome = 1 / data.rates[state.spendingCurrency];
            state.fxRateToHome = rateToHome;

            if (rateToHome < 1) {
                const bigRate = 1 / rateToHome;
                els.rateBanner.innerText = `1 ${state.homeCurrency} ≈ ${bigRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${state.spendingCurrency}`;
            } else {
                els.rateBanner.innerText = `1 ${state.spendingCurrency} ≈ ${rateToHome.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${state.homeCurrency}`;
            }
        }

        calculateHomeValue();
        updateDailyProgress();
    } catch (err) {
        console.error('FX Fetch failed', err);

        // Try to use cached rate
        if (state.fxRates && state.fxRates[state.spendingCurrency]) {
            const rateToHome = 1 / state.fxRates[state.spendingCurrency];
            state.fxRateToHome = rateToHome;
            els.rateBanner.innerText = `Using cached rates (Offline)`;
        } else {
            els.rateBanner.innerText = `Rates unavailable (Offline)`;
        }

        calculateHomeValue();
        updateDailyProgress();
    }
}

/**
 * Formats ISO date string to "MMM DD, YYYY"
 */
function formatDateFull(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr + 'T12:00:00');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function updateDisplayDate(val) {
    state.selectedDate = val;

    // Kill the sub-label text to maximize the focal point: the date itself
    if (els.dateLabelText) els.dateLabelText.innerText = "";

    if (state.rangeStart && state.rangeEnd) {
        if (els.displayDateText) {
            // Premium THRU separator: two hairlines flanking the word give it air
            els.displayDateText.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 6px;">
                    <div style="font-size: 1.05rem; font-weight: 900; letter-spacing: -0.01em;">${formatDateFull(state.rangeStart)}</div>
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                        <div style="flex:1; height:1px; background:var(--primary); opacity:0.25;"></div>
                        <div style="font-size:0.48rem; font-weight:900; color:var(--primary); letter-spacing:0.3em; opacity:0.75;">THRU</div>
                        <div style="flex:1; height:1px; background:var(--primary); opacity:0.25;"></div>
                    </div>
                    <div style="font-size: 1.05rem; font-weight: 900; letter-spacing: -0.01em;">${formatDateFull(state.rangeEnd)}</div>
                </div>
            `;
            els.displayDateText.closest('.meta-trigger-clean').style.minHeight = 'auto';
        }
    } else {
        if (els.displayDateText) {
            els.displayDateText.innerText = formatDateFull(val);
            els.displayDateText.style.fontSize = '1.15rem';
            els.displayDateText.style.fontWeight = '900';
            els.displayDateText.style.letterSpacing = '-0.02em';
            els.displayDateText.closest('.meta-trigger-clean').style.minHeight = '56px';
        }
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
            // Fix for Date bug: 
            // If the user is logging for TODAY, use the current precise time.
            // If they picked a past/future date, use Noon to avoid TZ-slip issues.
            const d = (state.selectedDate === getLocalYYYYMMDD()) ? new Date() : new Date(state.selectedDate + 'T12:00:00');
            const localTimeStr = new Intl.DateTimeFormat('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).format(new Date());

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

        if (!navigator.onLine || (state.currentTrip && state.currentTrip.is_example)) {
            // Offline or Example Trip - handle locally
            if (state.currentTrip && !state.currentTrip.is_example) {
                state.offlineQueue.push(...newExpenses);
                localStorage.setItem('nomad_offline_queue', JSON.stringify(state.offlineQueue));
                console.log("Saved to offline queue");

                // Stylish Offline Notification
                if (els.offlineNotice) {
                    els.offlineNotice.innerText = "Offline expense added. We'll sync with the cloud once your connection is back!";
                    els.offlineNotice.classList.remove('hidden');
                    setTimeout(() => els.offlineNotice.classList.add('hidden'), 5000);
                }
            }
        } else {
            // Online - push to Supabase as usual
            const { error } = await sb.from('expenses').insert(newExpenses);
            if (error) {
                // If it's a network error specifically, queue it
                if (error.message === 'Failed to fetch' || error.status === 0) {
                    state.offlineQueue.push(...newExpenses);
                    localStorage.setItem('nomad_offline_queue', JSON.stringify(state.offlineQueue));

                    if (els.offlineNotice) {
                        els.offlineNotice.innerText = "Connection lost. Expense saved locally and will sync later!";
                        els.offlineNotice.classList.remove('hidden');
                        setTimeout(() => els.offlineNotice.classList.add('hidden'), 5000);
                    }
                } else {
                    throw error;
                }
            }
            console.log("Successfully saved to Supabase.");

            // Show a quick "Synced" pill if we were just syncing
            showSyncedStatus();
        }


        // Optimistic UI update — happens immediately so dashboard updates at once
        const originalText = btn.innerText;
        const uiExtras = newExpenses.map(e => ({
            id: 'temp-' + Date.now() + Math.random(),
            date: e.spent_at,
            category: e.category,
            localAmount: e.local_amount,
            currency: e.local_currency,
            usdAmount: e.home_amount,
            symbol: CURRENCY_SYMBOLS[e.local_currency] || e.local_currency,
            note: e.note
        }));
        state.history = [...uiExtras, ...state.history];
        renderHistory();
        updateDailyProgress();
        updateSplitIndicator();
        const hint = document.getElementById('range-selection-hint');
        if (hint) hint.innerText = "Tap dates to select range";
        fetchTripExpenses();

        // ── SIMPLE SAVE FEEDBACK ──────────────────────────────

        btn.innerText = '✓  Saved';
        btn.classList.add('success-mode');

        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(15);
        }

        // Form Reset
        els.localInput.value = '';
        autoScaleInput();
        els.usdOutput.innerText = '0.00';
        els.notesInput.value = '';
        els.catBtns.forEach(b => b.classList.remove('selected'));
        state.selectedCategory = null;
        state.rangeStart = null;
        state.rangeEnd = null;
        updateDisplayDate(getLocalYYYYMMDD());

        // Focus for next entry
        setTimeout(() => els.localInput.focus(), 100);

        // Reset button state
        setTimeout(() => {
            btn.innerText = originalText;
            btn.classList.remove('success-mode');
        }, 1500);

    } catch (err) {
        console.error("Save error:", err);
        alert("Failed to save: " + (err.message || "Unknown error"));
    }
}


// --- Network & Offline Sync ---

window.resetSyncQueue = function () {
    if (confirm("Clear all unsynced expenses? This cannot be undone and these items will not reach the cloud.")) {
        state.offlineQueue = [];
        localStorage.setItem('nomad_offline_queue', '[]');
        updateNetworkStatus();
        if (els.offlineNotice) els.offlineNotice.classList.add('hidden');
        alert("Queue cleared.");
    }
};

function updateNetworkStatus() {
    if (navigator.onLine) {
        if (state.offlineQueue.length > 0) {
            syncOfflineData();
        } else {
            showSyncedStatus();
        }
    } else {
        els.offlineBadge.className = 'offline-badge offline';
        els.sysStatus.innerText = "Offline";
    }
}

function showSyncedStatus() {
    els.offlineBadge.className = 'offline-badge synced';
    els.sysStatus.innerText = "Cloud Synced";
    setTimeout(() => {
        if (navigator.onLine && state.offlineQueue.length === 0) {
            els.offlineBadge.classList.add('hidden');
        }
    }, 4000);
}

async function syncOfflineData() {
    if (state.offlineQueue.length === 0 || !navigator.onLine) return;

    // Safety check: Don't try to sync if not logged in (RLS will block it)
    // If state.user is null, it means auth hasn't initialized yet.
    // We just return silently; updateAuthState will trigger this again once user is confirmed.
    if (!state.user) return;


    // 1. Validate & Clean Queue: Skip items that are missing critical Auth/Trip IDs
    const validQueue = state.offlineQueue.filter(item => {
        const hasIDs = item.user_id && item.trip_id;
        const isFromThisUser = item.user_id === state.user.id;
        const hasData = item.category && item.local_amount;
        return hasIDs && isFromThisUser && hasData;
    });

    if (validQueue.length === 0 && state.offlineQueue.length > 0) {
        console.warn("Pruning invalid/stale items from queue...");
        state.offlineQueue = [];
        localStorage.setItem('nomad_offline_queue', '[]');
        updateNetworkStatus();
        return;
    }

    if (validQueue.length === 0) return;

    console.log("Syncing offline data...", validQueue.length);
    els.offlineBadge.className = 'offline-badge syncing';
    els.sysStatus.innerText = "Syncing...";

    try {
        const { error } = await sb.from('expenses').insert(validQueue);
        if (error) throw error;

        // Success - clear queue
        state.offlineQueue = [];
        localStorage.setItem('nomad_offline_queue', '[]');
        console.log("Sync complete!");

        showSyncedStatus();
        fetchTripExpenses(); // Refresh real data
    } catch (err) {
        console.error("Sync failed:", err);
        els.offlineBadge.className = 'offline-badge error';
        els.sysStatus.innerText = "Sync Retry...";

        if (els.offlineNotice) {
            let msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            // Truncate very long error strings
            if (msg.length > 100) msg = msg.substring(0, 97) + "...";

            els.offlineNotice.innerHTML = `
                <div style="margin-bottom:4px">Sync failed: ${msg}</div>
                <button onclick="resetSyncQueue()" style="background:rgba(0,0,0,0.05); border:1px solid currentColor; border-radius:4px; padding:2px 8px; font-size:0.7rem; cursor:pointer">Clear Stuck Queue</button>
            `;
            els.offlineNotice.classList.remove('hidden');
        }
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
    renderConsole();
}

// (Old functions removed, replaced by new versions at end of file)


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

function formatCompact(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return formatAmt(num);
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
    let sym = CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency;

    // Convert to spending currency if toggled
    if (state.progressCurrency === 'spending' && state.fxRateToHome > 0) {
        spentToday = spentTodayHome / state.fxRateToHome;
        sym = CURRENCY_SYMBOLS[state.spendingCurrency] || state.spendingCurrency;
    }

    const isOver = spentTodayHome > budgetHome; // Base comparison on home values
    const diffHome = Math.abs(budgetHome - spentTodayHome);

    // Goal is ALWAYS home currency for consistency as requested
    const goalSym = CURRENCY_SYMBOLS[state.homeCurrency] || state.homeCurrency;

    if (els.todaySpent) {
        els.todaySpent.innerText = `${sym}${formatCompact(spentToday)}`;
        // No font scaling, keep it pristine
        els.todaySpent.style.fontSize = '1.15rem';
    }

    if (els.todayRemaining) {
        // Remaining is also toggled to match "Spent" for layout symmetry
        let diffDisplay = diffHome;
        if (state.progressCurrency === 'spending' && state.fxRateToHome > 0) {
            diffDisplay = diffHome / state.fxRateToHome;
        }
        els.todayRemaining.innerText = `${sym}${formatCompact(diffDisplay)}`;
        els.todayRemaining.style.fontSize = '1.15rem';

        if (els.budgetStatusLabel) {
            els.budgetStatusLabel.innerText = isOver ? "Over Budget" : "Remaining";
        }
    }

    if (els.dailyProgressCard) {
        if (isOver) els.dailyProgressCard.classList.add('over-budget');
        else els.dailyProgressCard.classList.remove('over-budget');
    }

    // Budget input stays Home Currency as requested
    if (els.miniBudgetSymbol) els.miniBudgetSymbol.innerText = goalSym;
    if (els.budgetInput) els.budgetInput.value = Math.round(budgetHome);

    // Update Toggle UI active states
    if (els.toggleHomeCode && els.toggleSpendingCode) {
        if (state.progressCurrency === 'home') {
            els.toggleHomeCode.classList.add('active');
            els.toggleSpendingCode.classList.remove('active');
        } else {
            els.toggleHomeCode.classList.remove('active');
            els.toggleSpendingCode.classList.add('active');
        }
        els.toggleHomeCode.innerText = state.homeCurrency;
        els.toggleSpendingCode.innerText = state.spendingCurrency;
    }

    let percent = budgetHome > 0 ? (spentTodayHome / budgetHome) * 100 : 0;
    const rawPercent = percent;
    if (percent > 100) percent = 100;

    els.todayProgressFill.style.width = `${percent}%`;
    if (els.progressPercentLabel) {
        els.progressPercentLabel.innerText = `${Math.round(rawPercent)}%`;
    }

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

    const donutTotal = document.getElementById('donut-total-val');
    if (donutTotal) donutTotal.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${total.toFixed(0)}`;
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
            // Always sync selectedDate to the tapped key so single-day display works
            state.selectedDate = key;
            renderModalCalendar();
            const hint = document.getElementById('modal-range-hint');
            if (state.rangeStart && state.rangeEnd) {
                const diff = Math.round((new Date(state.rangeEnd) - new Date(state.rangeStart)) / (1000 * 60 * 60 * 24)) + 1;
                hint.innerText = `Range selected: ${diff} days`;
            } else if (state.rangeStart) {
                hint.innerText = "Tap an end date to create a range";
            } else {
                hint.innerText = "Tap a date to start";
            }
            updateDisplayDate(state.selectedDate);
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

function selectSpendingCurrency(code) {
    const cur = ALL_CURRENCIES[code] || { symbol: code };
    state.spendingCurrency = code;
    localStorage.setItem('nomad_last_spending_currency', state.spendingCurrency);

    // Sync UI
    if (els.spendingSelect) els.spendingSelect.value = code;
    if (els.displaySpendingCurrency) {
        const sym = cur.symbol || code;
        els.displaySpendingCurrency.innerText = `${code} (${sym})`;
    }
    if (els.symbol) els.symbol.innerText = cur.symbol || code;

    updateFxRate();
    calculateHomeValue();
    updateDailyProgress();

    if (els.spendingCurrencyModal) els.spendingCurrencyModal.classList.remove('active');
}

function renderSpendingCurrencyModal(filterText = '') {
    const list = els.spendingCurrencyList;
    if (!list) return;
    list.innerHTML = '';

    const query = filterText.toLowerCase().trim();

    // Kill full menu unless searching for a pristine look
    if (!query) {
        list.style.display = 'none';
        return;
    }
    list.style.display = 'block';

    Object.entries(ALL_CURRENCIES).forEach(([code, data]) => {
        const matchesCode = code.toLowerCase().includes(query);
        const matchesName = data.name.toLowerCase().includes(query);
        const matchesKeywords = data.keywords && data.keywords.toLowerCase().includes(query);

        if (matchesCode || matchesName || matchesKeywords) {
            const item = document.createElement('div');
            item.className = 'audit-item';
            item.style.cursor = 'pointer';
            item.innerHTML = `
                <div class="audit-item-info">
                    <strong>${code} <span style="color: var(--primary); margin-left: 4px;">(${data.symbol})</span></strong>
                    <span class="tiny-label">${data.name}</span>
                </div>
                <div class="audit-item-meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            `;
            item.onclick = () => selectSpendingCurrency(code);
            list.appendChild(item);
        }
    });

    if (list.children.length === 0) {
        list.innerHTML = '<div class="text-center" style="padding: 2rem; color: var(--text-dim); font-size: 0.8rem;">No currencies found</div>';
    }
}
// Country code → currency code mapping (common travel countries)
const COUNTRY_CURRENCY_MAP = {
    US: 'USD', GB: 'GBP', EU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
    AU: 'AUD', CA: 'CAD', ID: 'IDR', TH: 'THB', VN: 'VND', LA: 'LAK', KH: 'KHR',
    JP: 'JPY', MX: 'MXN', SG: 'SGD', MY: 'MYR', PH: 'PHP', KR: 'KRW', IN: 'INR',
    NZ: 'NZD', CH: 'CHF', BR: 'BRL', TR: 'TRY', CO: 'COP', CN: 'CNY', BZ: 'BZD',
    PE: 'PEN', AR: 'ARS', NL: 'EUR', PT: 'EUR', AT: 'EUR', BE: 'EUR', GR: 'EUR'
};

async function detectAndInjectLocalCurrency() {
    // Check cache first — no need to ask GPS every load
    const cached = localStorage.getItem('nomad_gps_currency');
    if (cached) {
        injectLocalCurrencyButton(cached);
        return;
    }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await res.json();
            const countryCode = data.address?.country_code?.toUpperCase();
            const currency = COUNTRY_CURRENCY_MAP[countryCode];
            if (currency) {
                localStorage.setItem('nomad_gps_currency', currency);
                injectLocalCurrencyButton(currency);
            }
        } catch (e) {
            console.log('GPS currency detection failed silently:', e);
        }
    }, () => { /* Permission denied — fail silently */ }, { timeout: 8000 });
}

function injectLocalCurrencyButton(code) {
    const grid = document.querySelector('.currency-grid-mini');
    if (!grid) return;

    // Don't inject if already there or if it's already one of the static buttons
    if (grid.querySelector(`[data-code="${code}"][data-gps]`)) return;
    const staticBtn = grid.querySelector(`[data-code="${code}"]:not([data-gps])`);
    if (staticBtn) {
        // Just highlight the existing one
        staticBtn.style.borderColor = 'var(--primary)';
        staticBtn.style.color = 'var(--primary)';
        return;
    }

    const cur = ALL_CURRENCIES[code];
    if (!cur) return;

    const btn = document.createElement('button');
    btn.className = 'quick-cur-btn gps-btn';
    btn.setAttribute('data-code', code);
    btn.setAttribute('data-gps', '1');
    btn.innerHTML = `📍 ${code}`;
    btn.title = `Your current location currency: ${cur.name}`;
    btn.onclick = () => selectSpendingCurrency(code);

    // Insert at the front
    grid.insertBefore(btn, grid.firstChild);
}

// --- REFINED CALENDAR & DRILLDOWN FUNCTIONS ---

function updateMonthPills() {
    const totalPill = document.getElementById('pill-total-val');
    const avgPill = document.getElementById('pill-avg-val');
    const topPill = document.getElementById('pill-top-val');

    // Filter history for current calMonth/calYear
    const monthExpenses = state.history.filter(item => {
        const d = new Date(item.date);
        return d.getMonth() === state.calMonth && d.getFullYear() === state.calYear;
    });

    const total = monthExpenses.reduce((sum, item) => sum + item.usdAmount, 0);
    
    // Calculate days passed in month (or total days in month if past)
    const now = new Date();
    let daysCount;
    if (now.getMonth() === state.calMonth && now.getFullYear() === state.calYear) {
        daysCount = now.getDate();
    } else {
        daysCount = new Date(state.calYear, state.calMonth + 1, 0).getDate();
    }

    const avg = total / (daysCount || 1);

    // Top Category
    const cats = monthExpenses.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.usdAmount;
        return acc;
    }, {});
    const topCat = Object.entries(cats).sort((a,b) => b[1]-a[1])[0];

    if (totalPill) totalPill.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${total.toFixed(0)}`;
    if (avgPill) avgPill.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${avg.toFixed(0)}`;
    if (topPill) topPill.innerText = topCat ? (topCat[0].charAt(0).toUpperCase() + topCat[0].slice(1)) : '—';
}

// Using the logic below


function paintEventBanners() {
    // This overlays the banners on the current month grid
    // For simplicity in this vanilla JS version, we find the day cells by date data attributes 
    // or we recreate the logic. Let's add data-date to cal-day during render.
}


// --- REPLICATED CONCEPT A CALENDAR ---

function updateMonthPills() {
    const totalPill = document.getElementById('pill-total-val');
    const avgPill = document.getElementById('pill-avg-val');
    const topPill = document.getElementById('pill-top-val');

    const monthExpenses = state.history.filter(item => {
        const d = new Date(item.date);
        return d.getMonth() === state.calMonth && d.getFullYear() === state.calYear;
    });

    const total = monthExpenses.reduce((sum, item) => sum + item.usdAmount, 0);
    const now = new Date();
    let daysCount;
    if (now.getMonth() === state.calMonth && now.getFullYear() === state.calYear) {
        daysCount = now.getDate();
    } else {
        daysCount = new Date(state.calYear, state.calMonth + 1, 0).getDate();
    }
    const avg = total / (daysCount || 1);

    const cats = monthExpenses.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.usdAmount;
        return acc;
    }, {});
    const topCat = Object.entries(cats).sort((a,b) => b[1]-a[1])[0];

    if (totalPill) totalPill.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${total.toFixed(0)}`;
    if (avgPill) avgPill.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${avg.toFixed(0)}`;
    if (topPill) topPill.innerText = topCat ? (topCat[0].charAt(0).toUpperCase() + topCat[0].slice(1)) : '—';
}

function renderCalendar() {
    const body = document.getElementById('calendar-body');
    const monthYearLabel = document.getElementById('calendar-month-year');
    if (!body) return;
    body.innerHTML = '';

    const firstDay = new Date(state.calYear, state.calMonth, 1).getDay();
    const daysInMonth = new Date(state.calYear, state.calMonth + 1, 0).getDate();
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(state.calYear, state.calMonth));
    if (monthYearLabel) monthYearLabel.innerText = `${monthName} ${state.calYear}`;

    updateMonthPills();

    const dayMap = {};
    state.history.forEach(item => {
        const key = getLocalYYYYMMDD(new Date(item.date));
        if (!dayMap[key]) dayMap[key] = { total: 0, items: [] };
        dayMap[key].total += item.usdAmount;
        dayMap[key].items.push(item);
    });

    const todayLocal = getLocalYYYYMMDD();

    // Empty days
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day empty';
        body.appendChild(div);
    }

    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(state.calYear, state.calMonth, day);
        const key = getLocalYYYYMMDD(dateObj);
        const dayData = dayMap[key];

        const div = document.createElement('div');
        div.className = 'cal-day';
        div.dataset.key = key; // For positioning range plus button
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

        // --- NEW: CALENDAR EVENTS ---
        let markerHtml = '';
        state.calEvents.forEach(ev => {
            if (key >= ev.startDate && key <= ev.endDate) {
                markerHtml += `<div class="marker event" style="background: ${ev.color};" title="${ev.title}">${ev.title}</div>`;
            }
        });

        div.innerHTML = `
            <span class="day-num">${day}</span>
            <div class="cal-markers">${markerHtml}</div>
            <div class="day-total ${!dayData ? 'zero' : ''}">
                ${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${dayData ? dayData.total.toFixed(0) : '0'}
            </div>
        `;

        // Standard selection logic
        div.onclick = () => handleCalendarDayClick(key, dateObj, dayData, div);
        body.appendChild(div);
    }
    
    // Position range plus button after render if range exists
    updateRangePlusPosition();
}

function updateRangePlusPosition() {
    const btn = document.getElementById('range-plus-btn');
    if (!btn) return;
    
    if (!state.rangeStart) {
        btn.classList.add('hidden');
        return;
    }

    const startEl = document.querySelector(`.cal-day[data-key="${state.rangeStart}"]`);
    const endKey = state.rangeEnd || state.rangeStart;
    const endEl = document.querySelector(`.cal-day[data-key="${endKey}"]`);
    
    if (!startEl || !endEl) {
        btn.classList.add('hidden');
        return;
    }

    const startRect = startEl.getBoundingClientRect();
    const endRect = endEl.getBoundingClientRect();
    const containerRect = document.getElementById('calendar-body').getBoundingClientRect();

    // Center point between start and end cells
    const centerX = (startRect.left + endRect.right) / 2 - containerRect.left;
    const centerY = (startRect.top + endRect.bottom) / 2 - containerRect.top;

    btn.style.left = `${centerX}px`;
    btn.style.top = `${centerY}px`;
    btn.classList.remove('hidden');
    
    btn.onclick = (e) => {
        e.stopPropagation();
        openRangeActionMenu();
    };
}

function handleCalendarDayClick(key, dateObj, dayData) {
    if (!state.rangeStart || (state.rangeStart && state.rangeEnd)) {
        state.rangeStart = key;
        state.rangeEnd = null;
    } else if (state.rangeStart && !state.rangeEnd) {
        if (key < state.rangeStart) {
            state.rangeStart = key;
        } else if (key === state.rangeStart) {
            // Clicked same day again: keep it selected as a single day, don't reset
            state.rangeStart = key; 
            state.rangeEnd = null;
        } else {
            state.rangeEnd = key;
        }
    }

    state.selectedDate = key;
    const dateInput = document.getElementById('expense-date');
    if (dateInput) {
        dateInput.value = key;
        dateInput.dispatchEvent(new Event('change'));
    }

    renderHistory();
    renderConsole();
    updateRangePlusPosition();
}

function openRangeActionMenu() {
    const key = state.rangeEnd || state.rangeStart;
    const menu = document.getElementById('longpress-menu');
    const overlay = document.getElementById('longpress-overlay');
    const label = document.getElementById('longpress-date-label');
    if (!menu || !overlay) return;
    
    let displayLabel = formatDateFull(state.rangeStart);
    if (state.rangeEnd) displayLabel += ` – ${formatDateFull(state.rangeEnd)}`;

    if (label) label.innerText = displayLabel;
    menu.classList.remove('hidden');
    overlay.classList.remove('hidden');

    // Option 1: Add Note (Spread across range)
    document.getElementById('lp-add-note').onclick = () => { 
        closeLongpressMenu(); 
        const note = prompt("Enter note to add across selected dates:");
        if (note) saveRangeNote(note, state.rangeStart, state.rangeEnd || state.rangeStart);
    };

    // Option 2: Add Expense (Spread across range)
    document.getElementById('lp-add-expense').onclick = () => { 
        closeLongpressMenu(); 
        const amount = parseFloat(prompt("Enter total amount for current range ($):"));
        if (isNaN(amount)) return;
        const cat = prompt("Enter category (e.g., Accommodation, Food, Transport):")?.toLowerCase();
        if (cat) saveRangeExpense(amount, cat, state.rangeStart, state.rangeEnd || state.rangeStart);
    };
}

async function saveRangeNote(text, start, end) {
    // 1. Add as Itinerary/Event (for calendar view)
    const newEvent = {
        id: 'range-' + Date.now(),
        title: text,
        startDate: start,
        endDate: end,
        color: '#3ecf8e',
        emoji: '📝'
    };
    state.calEvents.push(newEvent);
    
    // 2. Add to each Day's Notes
    const startDate = new Date(start.replace(/-/g, '/'));
    const endDate = new Date(end.replace(/-/g, '/'));
    let curr = new Date(startDate);
    while (curr <= endDate) {
        const k = getLocalYYYYMMDD(curr);
        const existing = state.dayNotes[k] || '';
        state.dayNotes[k] = (existing ? existing + ' | ' : '') + text;
        curr.setDate(curr.getDate() + 1);
    }
    
    closeScratchpad();
    renderHistory();
    renderConsole();
}

async function saveRangeExpense(totalAmount, cat, start, end) {
    const startDate = new Date(start.replace(/-/g, '/'));
    const endDate = new Date(end.replace(/-/g, '/'));
    const days = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    const perDayAmt = totalAmount / (days || 1);

    let curr = new Date(startDate);
    while (curr <= endDate) {
        const k = getLocalYYYYMMDD(curr);
        const expense = {
            id: 'range-exp-' + Date.now() + '-' + Math.random(),
            date: curr.toISOString(),
            category: cat,
            localAmount: perDayAmt,
            currency: state.homeCurrency,
            usdAmount: perDayAmt,
            symbol: CURRENCY_SYMBOLS[state.homeCurrency] || '$',
            note: `Split from ${cat} range`
        };
        state.history.push(expense);
        curr.setDate(curr.getDate() + 1);
    }
    
    renderHistory();
    renderConsole();
}

function handleLongPress(dateKey) {
    state.rangeStart = dateKey;
    state.rangeEnd = null;
    openRangeActionMenu();
}

window.closeLongpressMenu = () => {
    document.getElementById('longpress-menu').classList.add('hidden');
    document.getElementById('longpress-overlay').classList.add('hidden');
};

function openAddModal(type, startKey, endKey) {
    const modal = document.getElementById('add-cal-modal');
    const title = document.getElementById('add-cal-modal-title');
    const committedFields = document.getElementById('committed-fields');
    const colorPicker = document.getElementById('event-color-picker');
    
    if (!modal) return;
    modal.classList.add('active');
    state.calEntryType = type;

    const startInput = document.getElementById('cal-event-start');
    const endInput = document.getElementById('cal-event-end');
    const start = startKey || getLocalYYYYMMDD();
    const end = endKey || start;
    
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;

    if (type === 'committed') {
        title.innerText = "Committed Expense";
        if (committedFields) committedFields.classList.remove('hidden');
        if (colorPicker) colorPicker.classList.add('hidden');
    } else {
        title.innerText = "New Event";
        if (committedFields) committedFields.classList.add('hidden');
        if (colorPicker) colorPicker.classList.remove('hidden');
    }
}

window.closeAddModal = () => document.getElementById('add-cal-modal').classList.remove('active');

window.saveCalEntry = () => {
    const title = document.getElementById('cal-event-title').value.trim();
    if (!title) return alert("Title required");
    const start = document.getElementById('cal-event-start').value;
    const end = document.getElementById('cal-event-end').value;
    const emoji = document.getElementById('cal-event-emoji').value || '📌';
    const color = document.querySelector('.color-swatch.active')?.dataset.color || '#f97316';

    const newEvent = { 
        id: Date.now(), 
        title, 
        emoji, 
        startDate: start, 
        endDate: end, 
        color, 
        notes: {} 
    };
    
    state.calEvents.push(newEvent);
    localStorage.setItem('nomad_cal_events', JSON.stringify(state.calEvents));

    // Distribute note to each day in range
    const startDate = new Date(start.replace(/-/g, '/'));
    const endDate = new Date(end.replace(/-/g, '/'));
    let curr = new Date(startDate);
    while (curr <= endDate) {
        const k = getLocalYYYYMMDD(curr);
        const existing = state.dayNotes[k] || '';
        state.dayNotes[k] = (existing ? existing + ' | ' : '') + title;
        curr.setDate(curr.getDate() + 1);
    }
    localStorage.setItem('nomad_day_notes', JSON.stringify(state.dayNotes));

    closeAddModal();
    renderHistory();
    renderConsole();
};

window.openScratchpad = (dateKey) => {
    const sheet = document.getElementById('scratchpad-sheet');
    const title = document.getElementById('scratchpad-title');
    const text = document.getElementById('scratchpad-text');
    if (!sheet) return;
    
    state.activeNoteDate = dateKey || null;
    title.innerText = dateKey ? `Note for ${dateKey}` : `Monthly Notes (${state.calMonth+1}/${state.calYear})`;
    const val = dateKey ? (state.dayNotes[dateKey] || '') : (state.dayNotes[`month_${state.calYear}_${state.calMonth}`] || '');
    text.value = val;
    sheet.classList.remove('hidden');
};

window.closeScratchpad = () => document.getElementById('scratchpad-sheet').classList.add('hidden');
window.saveScratchpad = () => {
    state.dayNotes[state.activeNoteDate || `month_${state.calYear}_${state.calMonth}`] = document.getElementById('scratchpad-text').value;
    localStorage.setItem('nomad_day_notes', JSON.stringify(state.dayNotes));
    closeScratchpad();
};

function promoteExpiredCommitted() {
    const today = getLocalYYYYMMDD();
    let changed = false;
    state.committedExpenses.forEach(ce => {
        if (!ce.promoted && ce.endDate < today) {
            ce.promoted = true;
            changed = true;
        }
    });
    if (changed) localStorage.setItem('nomad_committed', JSON.stringify(state.committedExpenses));
}

document.getElementById('scratchpad-fab').onclick = (e) => {
    e.stopPropagation();
    document.getElementById('fab-menu').classList.toggle('hidden');
};
document.addEventListener('click', () => {
    const menu = document.getElementById('fab-menu');
    if (menu) menu.classList.add('hidden');
});

promoteExpiredCommitted();


function setupCalendarListeners() {
    document.querySelectorAll('.color-swatch').forEach(sw => {
        sw.onclick = () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            sw.classList.add('active');
        };
    });
}

function formatDateFull(dateKey) {
    if (!dateKey) return "";
    return new Date(dateKey.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Global hook for renderRangeSummary toggle
let currentRangeMode = 'dollar';

function renderRangeSummary(startKey, endKey) {
    const statsGrid = document.getElementById('range-stats');
    if (!statsGrid) return;
    statsGrid.innerHTML = '';

    const rangeExpenses = state.history.filter(h => {
        const k = getLocalYYYYMMDD(new Date(h.date));
        return k >= startKey && k <= endKey;
    });

    const total = rangeExpenses.reduce((sum, e) => sum + e.usdAmount, 0);
    const start = new Date(startKey.replace(/-/g, '/'));
    const end = new Date(endKey.replace(/-/g, '/'));
    const days = Math.round((end - start) / 86400000) + 1;
    const avg = total / (days || 1);
    
    // 1. PRIMARY STATS (Total & Average)
    const primaryRow = document.createElement('div');
    primaryRow.className = 'range-summary-premium';
    
    const rangeLabel = document.createElement('div');
    rangeLabel.className = 'range-date-label';
    rangeLabel.innerText = `${formatDateFull(startKey)} – ${formatDateFull(endKey)}`;
    primaryRow.appendChild(rangeLabel);

    const statsCols = document.createElement('div');
    statsCols.className = 'range-stats-row';
    statsCols.innerHTML = `
        <div class="stat-p">
            <span class="label">Total Spent</span>
            <span class="value main">${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${total.toFixed(0)}</span>
        </div>
        <div class="stat-p">
            <span class="label">Daily Average</span>
            <span class="value">${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${avg.toFixed(0)}</span>
        </div>
    `;
    primaryRow.appendChild(statsCols);
    statsGrid.appendChild(primaryRow);

    // 2. CATEGORY BREAKDOWN (Stacked, Hidden by default)
    const catMap = {};
    rangeExpenses.forEach(e => {
        catMap[e.category] = (catMap[e.category] || 0) + e.usdAmount;
    });

    const sortedCats = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
    
    if (sortedCats.length > 0) {
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'category-breakdown-toggle';
        toggleBtn.innerHTML = `<span>View Category Breakdown</span> <i>⌄</i>`;
        
        const catList = document.createElement('div');
        catList.className = 'range-category-stack hidden';
        
        toggleBtn.onclick = () => {
            catList.classList.toggle('hidden');
            toggleBtn.querySelector('i').innerText = catList.classList.contains('hidden') ? '⌄' : '⌃';
        };

        sortedCats.forEach(([cat, val]) => {
            const row = document.createElement('div');
            row.className = 'cat-stack-row';
            const percent = ((val / (total || 1)) * 100).toFixed(0);
            const displayVal = (CURRENCY_SYMBOLS[state.homeCurrency] || '$') + val.toFixed(0);
                
            row.innerHTML = `
                <span class="cat-name">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${percent}%"></div></div>
                <span class="cat-val">${displayVal}</span>
            `;
            catList.appendChild(row);
        });
        statsGrid.appendChild(toggleBtn);
        statsGrid.appendChild(catList);
    }
}

function renderDayRows(dateKey, container, isFromRange = false, selectedCat = null) {
    const rangeSummaryEl = document.getElementById('range-at-glance');
    const calendarMainView = document.getElementById('calendar-main-view');

    if (isFromRange) {
        if (rangeSummaryEl) rangeSummaryEl.classList.add('hidden');
        if (calendarMainView) calendarMainView.classList.add('hidden');

        const backRow = document.createElement('tr');
        backRow.innerHTML = `<td colspan="3" style="cursor:pointer; color:var(--primary); font-weight:800; padding:12px; font-size:0.75rem;">← Back to Range List</td>`;
        backRow.onclick = () => {
             if (rangeSummaryEl) rangeSummaryEl.classList.remove('hidden');
             if (calendarMainView) calendarMainView.classList.remove('hidden');
             renderConsole();
        };
        container.appendChild(backRow);
    }

    const titleRow = document.createElement('tr');
    const d = new Date(dateKey.replace(/-/g, '/'));
    titleRow.innerHTML = `<td colspan="3" class="day-divider">${d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</td>`;
    container.appendChild(titleRow);

    const expenses = state.history.filter(h => getLocalYYYYMMDD(new Date(h.date)) === dateKey);
    const dayNote = state.dayNotes[dateKey] || '';
    
    // Get itinerary items for this day
    const itineraries = state.calEvents.filter(ev => dateKey >= ev.startDate && dateKey <= ev.endDate);
    
    // Group expenses by category
    const catMap = {};
    expenses.forEach(e => {
        catMap[e.category] = (catMap[e.category] || 0) + e.usdAmount;
    });

    const categories = Object.keys(catMap);
    
    // If no expenses, no itineraries, and no scratchpad, show placeholder
    if (categories.length === 0 && itineraries.length === 0 && !dayNote) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" style="text-align:center; color:var(--text-dim); padding:2rem; font-size:0.8rem;">No entries. Use + to add notes or expenses.</td>`;
        container.appendChild(tr);
        return;
    }

    // --- 1. RENDER ITINERARY ITEMS ---
    itineraries.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'itinerary-row';
        tr.innerHTML = `
            <td><span class="cat-cell itinerary-cat">${item.emoji || '📌'} Plan</span></td>
            <td>—</td>
            <td class="scratchpad-cell" onclick="openAddModal('event', '${item.startDate}', '${item.endDate}')">
                <div class="note-cell itinerary-title">${item.title}</div>
            </td>
        `;
        container.appendChild(tr);
    });

    // --- 2. RENDER EXPENSES ---
    categories.forEach(cat => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        const val = catMap[cat];
        const catExpenses = expenses.filter(e => e.category === cat && e.note);
        const specificNote = catExpenses.length > 0 ? catExpenses[0].note : '';

        tr.innerHTML = `
            <td><span class="cat-cell">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span></td>
            <td><span class="val-cell">${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${val.toFixed(2)}</span></td>
            <td class="scratchpad-cell" style="opacity: 0.8; font-size: 0.75rem;">${specificNote || 'View details'}</td>
        `;
        
        tr.onclick = () => {
            container.innerHTML = '';
            renderDayRows(dateKey, container, isFromRange, cat);
        };
        container.appendChild(tr);
    });

    // --- 3. RENDER SCRATCHPAD ---
    if (dayNote) {
        const tr = document.createElement('tr');
        tr.className = 'scratchpad-row';
        tr.innerHTML = `
            <td><span class="cat-cell" style="opacity:0.5;">Misc. Note</span></td>
            <td>—</td>
            <td class="scratchpad-cell" onclick="openScratchpad('${dateKey}')">
                <div class="note-cell"><em>${dayNote}</em></div>
            </td>
        `;
        container.appendChild(tr);
    }
}

function renderConsole() {
    const consoleBody = document.getElementById('console-table-body');
    const rangeCard = document.getElementById('range-at-glance');
    const titleEl = document.getElementById('console-date-title');
    if (!consoleBody) return;

    consoleBody.innerHTML = '';

    if (state.rangeStart && state.rangeEnd) {
        rangeCard.classList.remove('hidden');
        const start = new Date(state.rangeStart.replace(/-/g, '/'));
        const end = new Date(state.rangeEnd.replace(/-/g, '/'));
        const diff = Math.round((end - start) / 86400000) + 1;
        
        if (diff > 30) {
            state.rangeEnd = null;
            return renderConsole();
        }

        if (titleEl) titleEl.innerText = `${formatDateFull(state.rangeStart)} – ${formatDateFull(state.rangeEnd)}`;
        renderRangeSummary(state.rangeStart, state.rangeEnd);
        
        // Render ROLL-UP rows for the range
        for (let i = 0; i < diff; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const key = getLocalYYYYMMDD(d);
            
            const dayExpenses = state.history.filter(h => getLocalYYYYMMDD(new Date(h.date)) === key);
            const dayTotal = dayExpenses.reduce((sum, h) => sum + h.usdAmount, 0);
            const itineraries = state.calEvents.filter(ev => key >= ev.startDate && key <= ev.endDate);
            let summaryText = state.dayNotes[key] || '';
            if (itineraries.length > 0) {
                summaryText = `${itineraries[0].emoji || '📌'} ${itineraries[0].title}`;
            }

            const tr = document.createElement('tr');
            tr.className = 'roll-up-row';
            tr.innerHTML = `
                <td><span class="roll-up-day-label">${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</span></td>
                <td><span class="val-cell">${dayTotal > 0 ? ((CURRENCY_SYMBOLS[state.homeCurrency] || '$') + dayTotal.toFixed(0)) : '—'}</span></td>
                <td><span class="roll-up-summary" onclick="event.stopPropagation(); openScratchpad('${key}')">${summaryText ? summaryText.substring(0, 30) + (summaryText.length > 30 ? '...' : '') : 'Add a note..'}</span></td>
            `;

            // Drill down on click: focus this day without losing the range visually in the grid
            tr.onclick = () => {
                // Focus this specific day in the console while maintaining rangeStart/End in state
                // We'll temporarily use a "focusDate" or just pass it to renderDayRows
                renderDayRows(key, consoleBody, true);
            };

            consoleBody.appendChild(tr);
        }
    } else {
        rangeCard.classList.add('hidden');
        const dateKey = state.rangeStart || getLocalYYYYMMDD();
        const d = new Date(dateKey.replace(/-/g, '/'));
        if (titleEl) {
            if (dateKey === getLocalYYYYMMDD()) {
                titleEl.innerText = "Today";
            } else {
                titleEl.innerText = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
            }
        }
        renderDayRows(dateKey, consoleBody);
    }
}

// Event hooks for index.html elements
document.addEventListener('DOMContentLoaded', () => {
    const btnDollar = document.getElementById('toggle-val-dollar');
    const btnPercent = document.getElementById('toggle-val-percent');
    if (btnDollar) btnDollar.onclick = () => {
        currentRangeMode = 'dollar';
        btnDollar.classList.add('active');
        btnPercent.classList.remove('active');
        renderConsole();
    };
    if (btnPercent) btnPercent.onclick = () => {
        currentRangeMode = 'percent';
        btnPercent.classList.add('active');
        btnDollar.classList.remove('active');
        renderConsole();
    };

    const lightbulb = document.getElementById('ai-lightbulb');
    if (lightbulb) lightbulb.onclick = () => {
        alert("AI Planning Assistant:\n\nLooking at your scratchpad for " + document.getElementById('console-date-title').innerText + ", I see you're planning a boat trip. Tip: Bali boat prices have increased recently; typical range is now " + CURRENCY_SYMBOLS[state.homeCurrency] + "35-50.");
    };
});

// --- SHARE MODAL LOGIC ---
let qrCodeInstance = null;

function openShareModal() {
    const modal = document.getElementById('share-modal');
    const codeEl = document.getElementById('share-modal-code');
    const code = state.currentTrip ? (state.currentTrip.join_code || '---') : '---';
    
    if (!modal) return;
    
    if (codeEl) codeEl.innerText = code;
    modal.classList.add('active');
    
    // Generate QR Code
    const qrContainer = document.getElementById('qrcode-container');
    if (qrContainer) {
        qrContainer.innerHTML = '';
        // The QR code will just be the join code for now, or a link if we have one
        const shareUrl = window.location.href; 
        qrCodeInstance = new QRCode(qrContainer, {
            text: `NOMAD_JOIN:${code}`, // Prefix to identify it
            width: 112,
            height: 112,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // Wire up share options
    document.getElementById('share-wa').onclick = () => {
        const text = encodeURIComponent(`Hey Julie! Join my trip "${state.currentTrip.name}" so we can track together. My join code is: ${code}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    document.getElementById('share-qr-expand').onclick = () => {
        // Already shown, but we could make it bigger/fullscreen if needed
        alert("Show this QR code to Julie's camera to join instantly!");
    };

    document.getElementById('share-other').onclick = async () => {
        const shareData = {
            title: `Join my trip: ${state.currentTrip.name}`,
            text: `Hey! Track expenses with me on our trip "${state.currentTrip.name}". Use my join code: ${code}`,
            url: window.location.href
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (e) {
                copyToClipboard(code);
            }
        } else {
            copyToClipboard(code);
        }
    };
}

window.closeShareModal = () => {
    document.getElementById('share-modal').classList.remove('active');
};

// Replace handleInviteShare
function handleInviteShare() {
    openShareModal();
}

function handleInviteEmail() {
    const code = state.currentTrip ? state.currentTrip.join_code : '---';
    const subject = encodeURIComponent(`Join my trip: ${state.currentTrip.name}`);
    const body = encodeURIComponent(`Hey! Track expenses with me on our trip "${state.currentTrip.name}". Use my join code: ${code}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
