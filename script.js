// App State
const state = {
    activeTab: 'log',
    spendingCurrency: localStorage.getItem('nomad_last_spending_currency') || 'USD',
    homeCurrency: localStorage.getItem('nomad_home_currency') || 'USD',
    fxRateToHome: 1,
    selectedCategory: null,
    history: JSON.parse(localStorage.getItem('nomad_history') || '[]'),
    calMonth: new Date().getMonth(),
    calYear: new Date().getFullYear(),
    isFirstLoad: true
};

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
        notesInput: document.getElementById('expense-note')
    };

    // Set Date Input to Today
    const dateInput = document.getElementById('expense-date');
    const todayLocal = getLocalYYYYMMDD();
    dateInput.value = todayLocal;

    const todayLabel = document.querySelector('.today-label');
    dateInput.addEventListener('change', () => {
        if (dateInput.value === todayLocal) {
            todayLabel.innerText = "Today:";
        } else {
            todayLabel.innerText = "Date:";
        }
    });

    // Ensure pre-selected currencies exist in dropdowns
    ensureOptionExists(els.spendingSelect, state.spendingCurrency);
    ensureOptionExists(els.homeSelect, state.homeCurrency);

    // Initial Select Setup
    els.spendingSelect.value = state.spendingCurrency;
    els.homeSelect.value = state.homeCurrency;
    els.symbol.innerText = CURRENCY_SYMBOLS[state.spendingCurrency] || state.spendingCurrency;
    els.homeLabel.innerText = state.homeCurrency;
    autoScaleInput();

    // Fetch Initial Rates
    updateFxRate();
    updateDashboard();

    let preSelectSpend = state.spendingCurrency;
    let preSelectHome = state.homeCurrency;

    // Event Listeners
    els.spendingSelect.addEventListener('change', (e) => {
        if (e.target.value === 'OTHER_SPEND') {
            openCurrencyModal('spending');
            return;
        }
        preSelectSpend = e.target.value;
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
        preSelectHome = e.target.value;
        state.homeCurrency = e.target.value;
        localStorage.setItem('nomad_home_currency', state.homeCurrency);
        els.homeLabel.innerText = state.homeCurrency;
        updateFxRate();
        calculateHomeValue();
    });

    els.localInput.addEventListener('input', () => {
        autoScaleInput();
        calculateHomeValue();
    });

    els.catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.catBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedCategory = btn.dataset.category;
        });
    });

    els.saveBtn.addEventListener('click', saveExpense);

    // Sync Wiring
    const fetchBtn = document.getElementById('fetch-sheets');
    const clearBtn = document.getElementById('clear-data');
    const viewRawBtn = document.getElementById('view-raw');
    const sheetsUrlInput = document.getElementById('sheets-url');
    const saveSyncBtn = document.getElementById('save-sync-url');

    if (saveSyncBtn) {
        const storedUrl = localStorage.getItem('nomad_sheets_url');
        if (storedUrl) {
            sheetsUrlInput.value = storedUrl;
            saveSyncBtn.innerText = "Synced ✅";
        }
        sheetsUrlInput.addEventListener('input', () => {
            saveSyncBtn.innerText = "Save Connection";
        });
        saveSyncBtn.addEventListener('click', () => {
            const url = sheetsUrlInput.value.trim();
            if (url.startsWith('https://script.google.com')) {
                localStorage.setItem('nomad_sheets_url', url);
                saveSyncBtn.innerText = "Synced ✅";
                const statusEl = document.getElementById('sync-status');
                if (statusEl) {
                    statusEl.innerText = "Cloud Connection Active";
                    statusEl.style.color = "#4caf50";
                    setTimeout(() => {
                        statusEl.innerText = "Ready to connect";
                        statusEl.style.color = "var(--text-dim)";
                    }, 3000);
                }
            } else {
                alert("Please paste a valid Google Apps Script URL (starts with https://script.google.com)");
            }
        });
    }

    if (fetchBtn) fetchBtn.addEventListener('click', fetchHistoryFromSheets);

    if (clearBtn) {
        let clearClicks = 0;
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            clearClicks++;
            if (clearClicks === 1) {
                clearBtn.innerText = "SURE? TAP AGAIN";
                setTimeout(() => {
                    clearClicks = 0;
                    clearBtn.innerText = "CLEAR ALL DATA";
                }, 2000);
            } else {
                state.history = [];
                localStorage.removeItem('nomad_history');
                renderHistory();
                updateDashboard();
                clearBtn.innerText = "DATA CLEARED";
                setTimeout(() => clearBtn.innerText = "CLEAR ALL DATA", 2000);
                clearClicks = 0;
            }
        });
    }

    if (viewRawBtn) {
        viewRawBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openAuditModal();
        });
    }

    // Calendar Navigation
    const prevBtn = document.getElementById('prev-month');
    const nextBtn = document.getElementById('next-month');
    if (prevBtn) prevBtn.onclick = () => changeMonth(-1);
    if (nextBtn) nextBtn.onclick = () => changeMonth(1);

    const closeDetail = document.getElementById('close-detail');
    if (closeDetail) {
        closeDetail.onclick = () => {
            document.getElementById('day-detail-panel').style.display = 'none';
        };
    }

    renderHistory();
    updateDashboard();

    // Auto-fetch if we have a URL saved
    if (localStorage.getItem('nomad_sheets_url')) {
        fetchHistoryFromSheets(true); // pass true for 'silent' loading
    }
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
        return;
    }

    els.rateBanner.innerText = 'Updating rates...';
    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${state.homeCurrency}`);
        const data = await response.json();

        // We want the rate relative to the Home currency
        const rateToHome = 1 / data.rates[state.spendingCurrency];
        state.fxRateToHome = rateToHome;

        els.rateBanner.innerText = `1 ${state.spendingCurrency} ≈ ${rateToHome.toFixed(4)} ${state.homeCurrency}`;
        calculateHomeValue();
    } catch (err) {
        console.error('FX Fetch failed', err);
        // Fallback logic could go here, but for now we show error
        els.rateBanner.innerText = `Rates unavailable (Offline)`;
        calculateHomeValue();
    }
}

function calculateHomeValue() {
    const rawVal = els.localInput.value.replace(/,/g, '');
    const localVal = parseFloat(rawVal) || 0;
    const homeVal = localVal * state.fxRateToHome;
    els.usdOutput.innerText = homeVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function saveExpense() {
    const rawVal = els.localInput.value.replace(/,/g, '');
    const amount = parseFloat(rawVal);
    const customDate = document.getElementById('expense-date').value;

    if (!amount || !state.selectedCategory || !customDate) {
        alert("Please enter an amount and select a category!");
        return;
    }

    const expense = {
        id: Date.now(),
        date: new Date(customDate + 'T00:00:00').toISOString(), // Store as Local Midnight ISO
        category: state.selectedCategory,
        localAmount: amount,
        currency: state.spendingCurrency,
        usdAmount: amount * state.fxRateToHome,
        symbol: CURRENCY_SYMBOLS[state.spendingCurrency] || state.spendingCurrency,
        note: els.notesInput.value.trim()
    };

    state.history.unshift(expense);
    localStorage.setItem('nomad_history', JSON.stringify(state.history));

    // Sync to Sheets if URL exists
    syncToSheets(expense);

    // Reset UI
    els.localInput.value = '';
    els.localInput.style.width = '1ch'; // Reset scaler
    els.localInput.style.fontSize = '4rem'; // Reset font size
    els.symbol.style.fontSize = '1.5rem'; // Reset symbol size
    els.usdOutput.innerText = '0.00';
    els.notesInput.value = '';
    els.catBtns.forEach(b => b.classList.remove('selected'));
    state.selectedCategory = null;

    renderHistory();
    updateDashboard();

    if (navigator.vibrate) navigator.vibrate(50);
}

// --- Audit & Modal ---

window.closeModal = function () {
    document.getElementById('raw-modal').classList.remove('active');
};

function openAuditModal() {
    const modal = document.getElementById('raw-modal');
    const content = document.getElementById('raw-log-content');
    modal.classList.add('active');

    if (state.history.length === 0) {
        content.innerHTML = '<tbody><tr><td colspan="4" style="text-align:center; padding: 2rem;">No data to analyze.</td></tr></tbody>';
        return;
    }

    let html = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Note</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    state.history.forEach(h => {
        // Extract local YYYY-MM-DD from the stored ISO
        const localDate = new Date(h.date).toLocaleDateString();
        const displayCat = h.category.charAt(0).toUpperCase() + h.category.slice(1);
        const homeAmt = `${CURRENCY_SYMBOLS[state.homeCurrency] || '$'}${h.usdAmount.toFixed(2)}`;
        
        html += `<tr>
            <td>${localDate}</td>
            <td>${displayCat}</td>
            <td><strong>${homeAmt}</strong></td>
            <td class="table-note">${h.note || ''}</td>
        </tr>`;
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

        div.innerHTML = `
            <span class="day-num">${day}</span>
            <div class="day-total ${!dayData ? 'zero' : ''}">
                ${CURRENCY_SYMBOLS[state.homeCurrency]}${dayData ? dayData.total.toFixed(0) : '0'}
            </div>
        `;

        div.addEventListener('click', () => showDayDetail(key, dateObj, dayData, div));
        body.appendChild(div);
    }
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

    els.dashTotal.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency]}${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    els.dashDays.innerText = uniqueDays;
    els.dashAvg.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency]}${avgDaily.toFixed(2)}`;

    // Projections
    els.projMonth.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency]}${(avgDaily * 30).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    els.projQuarter.innerText = `${CURRENCY_SYMBOLS[state.homeCurrency]}${(avgDaily * 90).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    // 4. Category Breakdown
    renderCategoryBreakdown(totalUsd);
    renderCategoryDonut(totalUsd);
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

    // Export format: Date, Category, Local Amount, Currency, USD Amount
    const csvContent = state.history.map(h => {
        return `${new Date(h.date).toLocaleDateString()}\t${h.category}\t${h.localAmount}\t${h.currency}\t${h.usdAmount.toFixed(2)}`;
    }).join('\n');

    navigator.clipboard.writeText(csvContent).then(() => {
        const originalText = els.copyBtn.innerText;
        els.copyBtn.innerText = 'Copied!';
        setTimeout(() => els.copyBtn.innerText = originalText, 2000);
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

document.addEventListener('DOMContentLoaded', init);
