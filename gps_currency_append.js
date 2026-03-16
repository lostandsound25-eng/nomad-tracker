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
