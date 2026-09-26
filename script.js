// Translations
const translations = {
    he: {
        leagues: 'ליגות',
        back: '← חזרה',
        welcome: 'ברוכים הבאים ל-She-Kit Store',
        tagline: 'חנות החולצות הכדורגל המובילה עם איכות וסגנון',
        shop: 'התחל קניות',
        ourLeagues: 'הליגות שלנו',
        whyUs: 'למה לבחור בנו?',
        quality: 'איכות גבוהה',
        qualityDesc: 'חולצות מקוריות עם הדפס מקצועי',
        delivery: 'משלוח מהיר',
        deliveryDesc: '14-21 ימי עסקים + 3-5 ימים לשילוח',
        pricing: 'מחירים טובים',
        pricingDesc: 'חולצה בסיסית מ-99₪ בלבד',
        homeKit: 'חולצת בית',
        awayKit: 'חולצת חוץ',
        thirdKit: 'חולצה שלישית',
        select: 'בחר',
        playerName: 'שם שחקן/אוהד',
        nameNote: 'עד 20 תווים',
        playerNumber: 'מספר',
        numberCost: '+20₪',
        patches: 'פאצ\'ים',
        addShorts: 'הוסף מכנס (+50₪)',
        version: 'גרסה',
        fanVersion: 'גרסאת אוהד',
        playerVersion: 'גרסאת שחקן (+10₪)',
        playerNote: 'בחר מידה אחת גדולה יותר',
        quantity: 'כמות',
        basePrice: 'מחיר בסיסי:',
        addons: 'תוספות:',
        total: 'סה"כ:',
        addToCart: 'הוסף לעגלה',
        cart: 'עגלת קניות',
        emptyCart: 'העגלה ריקה',
        deliveryTime: 'זמן אספקה',
        cartTotal: 'סה"כ:',
        checkout: 'תהליך קנייה',
        loading: 'טוען...',
        photos: 'תמונות',
        noImages: 'אין תמונות',
        teamsLabel: 'קבוצות'
    },
    en: {
        leagues: 'Leagues',
        back: '← Back',
        welcome: 'Welcome to She-Kit Store',
        tagline: 'The leading football jersey store with quality and style',
        shop: 'Start Shopping',
        ourLeagues: 'Our Leagues',
        whyUs: 'Why Choose Us?',
        quality: 'High Quality',
        qualityDesc: 'Original jerseys with professional printing',
        delivery: 'Fast Delivery',
        deliveryDesc: '14-21 business days + 3-5 shipping days',
        pricing: 'Great Prices',
        pricingDesc: 'Basic jersey from just 99₪',
        homeKit: 'Home Jersey',
        awayKit: 'Away Jersey',
        thirdKit: 'Third Jersey',
        select: 'Select',
        playerName: 'Player/Fan Name',
        nameNote: 'Up to 20 characters',
        playerNumber: 'Number',
        numberCost: '+20₪',
        patches: 'Patches',
        addShorts: 'Add Shorts (+50₪)',
        version: 'Version',
        fanVersion: 'Fan Version',
        playerVersion: 'Player Version (+10₪)',
        playerNote: 'Choose one size larger',
        quantity: 'Quantity',
        basePrice: 'Base Price:',
        addons: 'Add-ons:',
        total: 'Total:',
        addToCart: 'Add to Cart',
        cart: 'Shopping Cart',
        emptyCart: 'Cart is empty',
        deliveryTime: 'Delivery Time',
        cartTotal: 'Total:',
        checkout: 'Checkout',
        loading: 'Loading...',
        photos: 'photos',
        noImages: 'No images',
        teamsLabel: 'teams'
    }
};

let currentLanguage = 'he';
let currentTheme = 'dark';
let currentTeam = null;
let currentKit = null;
let cart = [];
let catalog = null;

const STRIPE_PUBLIC_KEY = 'pk_test_51UFzvgCh2ZG10r2ZmtJaCDjtopvy6h8k8ModgrKRPQxp4zOGT1BDcH2UVWaNjk4MgbXnqfBrTBCCuu6Lr29nhXl500vKZZnLZw'; 

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeLanguage();
    setupEventListeners();
    loadCart();
    loadCatalog();
    checkOrderSuccess();
});

// בדיקת חזרה מתשלום מוצלח ואיפוס עגלה
function checkOrderSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('success')) {
        cart = [];
        saveCart();
        updateCartCount();
        localStorage.removeItem('lastCustomer');
        window.history.replaceState({}, document.title, window.location.pathname);
        alert('🎉 התשלום בוצע בהצלחה!');
    }
}

async function loadCatalog() {
    try {
        const response = await fetch('kits-manifest.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        catalog = await response.json();
    } catch (error) {
        console.error('Failed to load kits-manifest.json', error);
        const list = document.getElementById('leaguesList');
        if (list) list.innerHTML = `<p class="menu-loading">${t('noImages')}</p>`;
        return;
    }

    renderLeagueMenu();
    renderLeaguesShowcase();
    renderHeroImage();
}

function t(key) {
    return (translations[currentLanguage] && translations[currentLanguage][key]) || key;
}

function assetUrl(path) {
    return encodeURI(path);
}

function setImage(img, path, altText) {
    const candidates = [path, path.normalize('NFC'), path.normalize('NFD')]
        .filter((value, index, all) => all.indexOf(value) === index);
    let attempt = 0;

    img.classList.remove('img-missing');

    img.onerror = () => {
        attempt += 1;
        if (attempt < candidates.length) {
            img.src = assetUrl(candidates[attempt]);
            return;
        }
        img.onerror = null;
        img.classList.add('img-missing');
    };

    if (altText !== undefined) img.alt = altText;
    if (!img.hasAttribute('loading')) img.loading = 'lazy';
    img.src = assetUrl(candidates[0]);
}

function allTeams() {
    if (!catalog) return [];
    return catalog.leagues.flatMap((league) => league.teams);
}

function findTeam(teamId) {
    return allTeams().find((team) => team.id === teamId) || null;
}

function renderLeagueMenu() {
    const list = document.getElementById('leaguesList');
    if (!list) return;

    list.innerHTML = '';
    for (const league of catalog.leagues) {
        const item = document.createElement('div');
        item.className = 'league-item';

        const toggle = document.createElement('button');
        toggle.className = 'league-toggle';
        toggle.type = 'button';
        toggle.textContent = `${league.flag} ${league.name}`;

        const teams = document.createElement('div');
        teams.className = 'teams-list hidden';

        for (const team of league.teams) {
            const link = document.createElement('a');
            link.href = '#';
            link.className = 'team-link';
            link.dataset.teamId = team.id;
            link.textContent = team.name;
            teams.appendChild(link);
        }

        toggle.addEventListener('click', () => teams.classList.toggle('hidden'));
        item.append(toggle, teams);
        list.appendChild(item);
    }
}

function renderLeaguesShowcase() {
    const grid = document.getElementById('leaguesGrid');
    if (!grid) return;

    grid.innerHTML = '';
    for (const league of catalog.leagues) {
        const flagship = league.teams[0];
        if (!flagship) continue;

        const card = document.createElement('button');
        card.className = 'league-card';
        card.type = 'button';

        const img = document.createElement('img');
        setImage(img, flagship.kits.home.cover, `${league.name} - ${flagship.name}`);

        const label = document.createElement('p');
        label.innerHTML = `<span class="league-flag">${league.flag}</span> ${league.name}`;

        const count = document.createElement('small');
        count.textContent = `${league.teams.length} ${t('teamsLabel')}`;

        card.append(img, label, count);
        card.addEventListener('click', () => {
            goToTeam(flagship.id);
        });
        grid.appendChild(card);
    }
}

function renderHeroImage() {
    const hero = document.getElementById('heroImage');
    if (!hero) return;

    const teams = allTeams();
    const featured = teams.find((team) => team.folder === 'Real Madrid') || teams[0];
    if (featured) setImage(hero, featured.kits.home.cover, featured.name);
}

function renderTeamPage(team) {
    document.getElementById('teamName').textContent = team.name;
    document.getElementById('teamLeague').textContent = team.league;

    const logoContainer = document.getElementById('teamLogo');
    logoContainer.innerHTML = '';
    const logoImg = document.createElement('img');
    logoImg.src = `team logo/${team.folder}.webp`;
    logoImg.alt = team.name;
    logoImg.style.width = '40px';
    logoImg.style.height = '40px';
    logoContainer.appendChild(logoImg);

    const container = document.getElementById('kitsContainer');
    container.innerHTML = '';

    for (const type of ['home', 'away', 'third']) {
        const kit = team.kits[type];
        if (!kit) continue;

        const option = document.createElement('div');
        option.className = 'kit-option';

        const heading = document.createElement('h3');
        heading.dataset.translate = `${type}Kit`;
        heading.textContent = t(`${type}Kit`);

        const frame = document.createElement('div');
        frame.className = 'kit-image';
        const img = document.createElement('img');
        setImage(img, kit.cover, `${team.name} - ${t(`${type}Kit`)}`);
        frame.appendChild(img);

        const count = document.createElement('small');
        count.className = 'kit-count';
        count.textContent = `${kit.images.length} ${t('photos')}`;

        const button = document.createElement('button');
        button.className = 'select-kit-btn';
        button.type = 'button';
        button.dataset.translate = 'select';
        button.textContent = t('select');
        button.addEventListener('click', () => selectKit(type));

        frame.addEventListener('click', () => selectKit(type));
        option.append(heading, frame, count, button);
        container.appendChild(option);
    }
}

function renderKitGallery(team, type) {
    const kit = team.kits[type];
    const main = document.getElementById('kitGalleryMain');
    const thumbs = document.getElementById('kitThumbs');
    if (!kit || !main || !thumbs) return;

    main.setAttribute('loading', 'eager');
    setImage(main, kit.cover, `${team.name} - ${t(`${type}Kit`)}`);
    thumbs.innerHTML = '';

    kit.images.forEach((path, index) => {
        const thumb = document.createElement('button');
        thumb.className = 'kit-thumb';
        thumb.type = 'button';
        if (index === 0) thumb.classList.add('active');

        const img = document.createElement('img');
        setImage(img, path, `${team.name} ${index + 1}`);
        thumb.appendChild(img);

        thumb.addEventListener('click', () => {
            setImage(main, path, `${team.name} - ${t(`${type}Kit`)}`);
            thumbs.querySelectorAll('.kit-thumb').forEach((node) => node.classList.remove('active'));
            thumb.classList.add('active');
        });

        thumbs.appendChild(thumb);
    });
}

function initializeTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    currentTheme = saved;
    applyTheme(currentTheme);
}

function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === 'light') {
        html.setAttribute('data-theme', 'light');
    } else {
        html.removeAttribute('data-theme');
    }
    updateThemeButton();
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    applyTheme(currentTheme);
}

function updateThemeButton() {
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
}

function initializeLanguage() {
    const saved = localStorage.getItem('language') || 'he';
    currentLanguage = saved;
    applyLanguage(currentLanguage);
}

function applyLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'he' || lang === 'ar' ? 'rtl' : 'ltr';
    
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[lang] && translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) langSelect.value = lang;
    
    if (catalog) {
        renderLeaguesShowcase();
        if (currentTeam) {
            renderTeamPage(currentTeam);
            if (currentKit) {
                const kitTitle = document.getElementById('kitTitle');
                if (kitTitle) kitTitle.textContent = `${currentTeam.name} - ${t(`${currentKit}Kit`)}`;
            }
        }
        const cartPage = document.getElementById('cartPage');
        if (cartPage && cartPage.classList.contains('active')) displayCartItems();
    }
}

function setupEventListeners() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            applyLanguage(e.target.value);
        });
    }
    
    const leaguesList = document.getElementById('leaguesList');
    if (leaguesList) {
        leaguesList.addEventListener('click', (e) => {
            const link = e.target.closest('.team-link');
            if (!link) return;
            e.preventDefault();
            goToTeam(link.dataset.teamId);
        });
    }
    
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) cartBtn.addEventListener('click', goToCart);
    
    const backBtn = document.querySelector('#teamPage .back-btn');
    if (backBtn) backBtn.addEventListener('click', goHome);
    
    const ctaBtn = document.querySelector('.cta-button');
    if (ctaBtn) {
        ctaBtn.addEventListener('click', () => {
            showPage('homePage');
            const showcase = document.querySelector('.leagues-showcase');
            if (showcase) showcase.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const firstLeague = document.querySelector('.league-item .league-toggle');
            if (firstLeague) firstLeague.click();
        });
    }
    
    setupPriceCalculations();
}

function goHome() {
    showPage('homePage');
}

function goToTeam(teamId) {
    const team = teamId ? findTeam(teamId) : currentTeam;
    if (!team) return;

    currentTeam = team;
    renderTeamPage(team);
    showPage('teamPage');
}

function goToKit(kitType) {
    if (!currentTeam || !currentTeam.kits[kitType]) return;

    currentKit = kitType;
    const kitTitle = document.getElementById('kitTitle');
    if (kitTitle) kitTitle.textContent = `${currentTeam.name} - ${t(`${kitType}Kit`)}`;
    renderKitGallery(currentTeam, kitType);
    resetCustomizationForm();
    showPage('kitPage');
    window.scrollTo({ top: 0 });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
}

function selectKit(kitType) {
    goToKit(kitType);
}

function setupPriceCalculations() {
    const nameInput = document.getElementById('playerName');
    const numberInput = document.getElementById('playerNumber');
    const shortsPack = document.getElementById('shortsPack');
    const quantity = document.getElementById('quantity');

    if (nameInput) nameInput.addEventListener('input', calculatePrice);
    if (numberInput) numberInput.addEventListener('input', calculatePrice);
    
    document.querySelectorAll('.addon').forEach(checkbox => {
        checkbox.addEventListener('change', calculatePrice);
    });

    document.querySelectorAll('input[name="version"]').forEach(radio => {
        radio.addEventListener('change', calculatePrice);
    });
    
    if (shortsPack) shortsPack.addEventListener('change', calculatePrice);
    if (quantity) quantity.addEventListener('change', calculatePrice);
}

function calculatePrice() {
    let price = 99;
    let addonsTotal = 0;
    
    const numberInput = document.getElementById('playerNumber');
    if (numberInput && numberInput.value) {
        addonsTotal += 20;
    }
    
    document.querySelectorAll('.addon:checked').forEach(() => {
        addonsTotal += 5;
    });
    
    const shortsPack = document.getElementById('shortsPack');
    if (shortsPack && shortsPack.checked) {
        addonsTotal += 50;
    }

    const playerVersionRadio = document.querySelector('input[name="version"][value="player"]');
    if (playerVersionRadio && playerVersionRadio.checked) {
        addonsTotal += 10;
    }
    
    const quantityInput = document.getElementById('quantity');
    const quantity = quantityInput ? (parseInt(quantityInput.value) || 1) : 1;
    const total = (price + addonsTotal) * quantity;
    
    const basePriceEl = document.getElementById('basePrice');
    const addonsPriceEl = document.getElementById('addonsPrice');
    const totalPriceEl = document.getElementById('totalPrice');

    if (basePriceEl) basePriceEl.textContent = `${price}₪`;
    if (addonsPriceEl) addonsPriceEl.textContent = `${addonsTotal}₪`;
    if (totalPriceEl) totalPriceEl.textContent = `${total}₪`;
}

function addToCart() {
    const sizeSelect = document.getElementById('kitSize');
    const nameInput = document.getElementById('playerName');
    const numberInput = document.getElementById('playerNumber');
    const shortsPack = document.getElementById('shortsPack');
    const quantityInput = document.getElementById('quantity');
    const versionInput = document.querySelector('input[name="version"]:checked');

    const size = sizeSelect ? sizeSelect.value : 'M';
    const name = nameInput ? (nameInput.value || 'ללא שם') : 'ללא שם';
    const number = numberInput ? (numberInput.value || 'ללא מספר') : 'ללא מספר';
    const addons = Array.from(document.querySelectorAll('.addon:checked')).map(c => c.value);
    const hasShorts = shortsPack ? shortsPack.checked : false;
    const version = versionInput ? versionInput.value : 'fan';
    const quantity = quantityInput ? (parseInt(quantityInput.value) || 1) : 1;
    
    let price = 99;
    if (number && number !== 'ללא מספר') price += 20;
    if (addons.length > 0) price += addons.length * 5;
    if (hasShorts) price += 50;
    if (version === 'player') price += 10;
    
    const item = {
        id: Date.now(),
        teamId: currentTeam.id,
        team: currentTeam.name,
        kit: currentKit,
        image: currentTeam.kits[currentKit].cover,
        size: size,
        name: name,
        number: number,
        addons: addons,
        shorts: hasShorts,
        version: version,
        quantity: quantity,
        price: price,
        total: price * quantity
    };
    
    cart.push(item);
    saveCart();
    updateCartCount();
    
    alert('✅ נוסף לעגלה!');
    goHome();
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    saveCart();
    updateCartCount();
    displayCartItems();
}

function displayCartItems() {
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');
    if (!cartItems || !cartFooter) return;
    
    if (cart.length === 0) {
        cartItems.innerHTML = `<p>${translations[currentLanguage].emptyCart}</p>`;
        cartFooter.style.display = 'none';
        return;
    }
    
    cartFooter.style.display = 'block';
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            ${item.image ? `<img class="cart-item-thumb" src="${assetUrl(item.image)}" alt="" loading="lazy">` : ''}
            <div class="cart-item-details">
                <h4>${item.team} - ${t(`${item.kit}Kit`)}</h4>
                <p>מידה: ${item.size}</p>
                <p>${translations[currentLanguage].playerName}: ${item.name}</p>
                <p>${translations[currentLanguage].playerNumber}: ${item.number}</p>
                <p>x${item.quantity}</p>
            </div>
            <div>
                <div class="cart-item-price">${item.total}₪</div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">הסר</button>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + item.total, 0);
    const cartTotal = document.getElementById('cartTotal');
    if (cartTotal) cartTotal.textContent = `${total}₪`;
}

function goToCart() {
    displayCartItems();
    showPage('cartPage');
}

function goToCheckoutForm() {
    if (cart.length === 0) {
        alert('העגלה ריקה');
        return;
    }
    showPage('checkoutFormPage');
}

function goToCartFromForm() {
    goToCart();
}

// פונקציית סליקה מאובטחת המעבירה גם את פרטי הלקוח וגם את פרטי העגלה לשרת
async function processSecureCheckout(event) {
    if (event) event.preventDefault();

    if (cart.length === 0) {
        alert('העגלה ריקה');
        return;
    }

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };

    const customer = {
        name: getVal('shipName'),
        lastName: getVal('shipLastName'),
        address: getVal('shipAddress'),
        city: getVal('shipCity'),
        zip: getVal('shipZip'),
        email: getVal('shipEmail'),
        phone: getVal('shipPhone'),
        notes: getVal('shipNotes')
    };

    const lineItems = cart.map(item => {
        return {
            price_data: {
                currency: 'ils',
                product_data: {
                    name: `${item.team} - ${item.kit} Kit (${item.size})`,
                },
                unit_amount: Math.round((item.total / item.quantity) * 100),
            },
            quantity: item.quantity,
        };
    });

    try {
        const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                items: lineItems, 
                customer: customer,
                cartItems: cart 
            }),
        });

        const data = await response.json();

        if (data.id) {
            const stripe = Stripe(STRIPE_PUBLIC_KEY);
            await stripe.redirectToCheckout({ sessionId: data.id });
        } else {
            alert('שגיאה ביצירת סשן תשלום: ' + (data.error || 'נסה שוב'));
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('שגיאה בתקשורת עם שרת התשלומים.');
    }
}

window.processCheckout = processSecureCheckout;

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cartCount');
    if (cartCount) cartCount.textContent = count;
}

function saveCart() {
    localStorage.setItem('sheKitCart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('sheKitCart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartCount();
    }
}

function resetCustomizationForm() {
    const sizeSelect = document.getElementById('kitSize');
    const nameInput = document.getElementById('playerName');
    const numberInput = document.getElementById('playerNumber');
    const shortsPack = document.getElementById('shortsPack');
    const quantity = document.getElementById('quantity');
    const fanVersion = document.querySelector('input[name="version"][value="fan"]');

    if (sizeSelect) sizeSelect.selectedIndex = 0;
    if (nameInput) nameInput.value = '';
    if (numberInput) numberInput.value = '';
    if (shortsPack) shortsPack.checked = false;
    document.querySelectorAll('.addon').forEach(cb => cb.checked = false);
    if (fanVersion) fanVersion.checked = true;
    if (quantity) quantity.value = 1;
    calculatePrice();
}

function submitCustomRequest() {
    const name = document.getElementById('customName')?.value.trim();
    const contact = document.getElementById('customContact')?.value.trim();
    
    nameEl = document.getElementById('customName');
    
    if (!name || !contact) {
        alert('אנא מלא שם פרטי ופרטי קשר לחזרה.');
        return;
    }
    
    alert('✅ הבקשה נשלחה בהצלחה! נחזור אליך בהקדם.');
    
    const nameEl = document.getElementById('customName');
    const contactEl = document.getElementById('customContact');
    const notesEl = document.getElementById('customNotes');
    const fileEl = document.getElementById('customFile');

    if (nameEl) nameEl.value = '';
    if (contactEl) contactEl.value = '';
    if (notesEl) notesEl.value = '';
    if (fileEl) fileEl.value = '';
}

window.addEventListener('load', () => {
    applyLanguage(currentLanguage);
});
