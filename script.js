// ================================================================
// 🚀 ASTRATOONIX - script.js
// ================================================================

// moviesData — ab saman.js nahi, sirf DB se load hoga
var moviesData = [];

const socket = io(BACKEND_URL);

socket.on('globalCounts', (counts) => {
    let total = 0;
    for (let id in counts) { total += counts[id]; }
    const el = document.getElementById('totalLiveCount');
    if (el) el.innerText = total > 0 ? total : 1;
});

let heroIndex = 0;
let heroInterval;
let searchTimeout;
let cachedPremiumStatus = false;
let currentFilter = 'all'; // 'all' | 'movies' | 'series' | 'games'

// ── Custom Alert ──────────────────────────────────────────
function showMyAlert(msg) {
    const alertBox = document.getElementById('customAlert');
    const msgBox   = document.getElementById('alertMessage');
    if (alertBox && msgBox) { msgBox.innerText = msg; alertBox.classList.remove('hidden'); }
    else alert(msg);
}
function closeCustomAlert() {
    const alertBox = document.getElementById('customAlert');
    if (alertBox) alertBox.classList.add('hidden');
}

// ── Premium check ─────────────────────────────────────────
function checkPremiumInBackground() {
    if (!currentUser) return;
    fetch(BACKEND_URL + '/api/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser, movieId: 'test*' })
    })
    .then(function(r){ return r.json(); })
    .then(function(data){
        if (data.success) {
            cachedPremiumStatus = true;
            renderAll();
        }
    })
    .catch(function(){ console.log('Premium check failed'); });
}

// ================================================================
// 🚀 INIT — DB load
// ================================================================
function initApp() {
    fetch(BACKEND_URL + '/api/movies')
        .then(function(r){ return r.json(); })
        .then(function(data){
            if (data.success && data.movies && data.movies.length > 0) {
                var dbMovies = data.movies.slice().reverse();
                moviesData.length = 0;
                dbMovies.forEach(function(m){ moviesData.push(m); });
                console.log('✅ ' + data.movies.length + ' items loaded from DB');
            } else {
                console.log('⚠️ DB empty hai — Admin se movies add karwao');
                moviesData.length = 0;
            }
        })
        .catch(function(){ 
            console.log('⚠️ DB fetch failed — internet ya server check karo');
            moviesData.length = 0;
        })
        .finally(function(){
            renderAll();
            checkPremiumInBackground();
        });
}

// ── Render All — based on currentFilter ──────────────────
function renderAll() {
    // Hero only shows movies/series (not games)
    var heroItems = moviesData.filter(function(m){ return (m.type || 'movie') !== 'game'; });
    if (heroItems.length > 0) {
        if (heroIndex >= heroItems.length) heroIndex = 0;
        updateHero(heroItems);
        if (!heroInterval) startHeroAutoPlay(heroItems);
    }
    renderTrending();
    renderSections();
}

// ── Hero Slider ───────────────────────────────────────────
function updateHero(heroItems) {
    heroItems = heroItems || moviesData.filter(function(m){ return (m.type || 'movie') !== 'game'; });
    if (!heroItems.length) return;
    var hero  = document.getElementById('heroSlider');
    var title = document.getElementById('heroTitle');
    var movie = heroItems[heroIndex];
    if (!movie || !movie.img) return;
    if (hero) {
        hero.style.opacity = '0';
        setTimeout(function(){
            hero.style.backgroundImage = 'url(' + movie.img + ')';
            hero.style.opacity = '1';
        }, 300);
    }
    if (title) {
        title.style.opacity = '0';
        setTimeout(function(){
            title.innerText = movie.name || '';
            title.style.opacity = '1';
        }, 300);
    }
    window.heroClick = function() {
        if (movie.parts && movie.parts.length > 0) showPartsModal(moviesData.indexOf(movie));
        else startRedirect(movie.name, movie.link, movie.id, movie.links);
    };
}

function startHeroAutoPlay(heroItems) {
    if (heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(function(){
        heroItems = moviesData.filter(function(m){ return (m.type || 'movie') !== 'game'; });
        if (heroItems.length > 0) {
            heroIndex = (heroIndex + 1) % heroItems.length;
            updateHero(heroItems);
        }
    }, 4000);
}

// ── Trending ─────────────────────────────────────────────
function renderTrending() {
    var grid = document.getElementById('trendingGrid');
    if (!grid) return;
    grid.innerHTML = '';
    // Trending = only movies + series (no games)
    var list = moviesData.filter(function(m){ return (m.type || 'movie') !== 'game'; }).slice(0, 10);
    list.forEach(function(m, index){
        var div = document.createElement('div');
        div.className = 'trending-card';
        div.style.backgroundColor = '#111';
        div.onclick = function(){
            if (m.parts && m.parts.length > 0) showPartsModal(moviesData.indexOf(m));
            else startRedirect(m.name, m.link, m.id, m.links);
        };
        var isPremium = String(m.id).includes('*') || m.isPremium;
        var lockHtml = (isPremium && !cachedPremiumStatus)
            ? '<div class="tag-overlay" style="background:rgba(255,165,0,0.9);left:auto;right:5px;"><i class="fas fa-lock"></i> VIP</div>'
            : '';
        div.innerHTML =
            '<div style="position:relative;line-height:0;">' +
                lockHtml +
                '<img src="' + m.img + '" loading="lazy" style="border-bottom:2px solid #e50914;">' +
                '<div style="position:absolute;bottom:0px;left:5px;font-size:3rem;font-weight:900;color:transparent;-webkit-text-stroke:1px #fff;line-height:1;">' + (index+1) + '</div>' +
            '</div>' +
            '<div style="padding:8px 4px;font-size:0.85rem;font-weight:bold;text-align:center;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + m.name + '</div>';
        grid.appendChild(div);
    });
}

// ── Filter Tab Switch ─────────────────────────────────────
function switchFilter(filter) {
    currentFilter = filter;
    var tabs = ['all','movies','series','games'];
    tabs.forEach(function(t){
        var btn = document.getElementById('filter-' + t);
        if (btn) {
            btn.style.background  = (t === filter) ? '#e50914' : '#1a1a1a';
            btn.style.color       = (t === filter) ? '#fff'    : '#888';
            btn.style.borderColor = (t === filter) ? '#e50914' : '#333';
        }
    });
    renderSections();
}

// ── Render Sections based on filter ──────────────────────
function renderSections() {
    var allSec    = document.getElementById('section-all');
    var movieSec  = document.getElementById('section-movies');
    var seriesSec = document.getElementById('section-series');
    var gameSec   = document.getElementById('section-games');

    // Hide all first
    [allSec, movieSec, seriesSec, gameSec].forEach(function(s){ if(s) s.style.display = 'none'; });

    if (currentFilter === 'all') {
        if (allSec) { allSec.style.display = 'block'; renderAllSection(); }
    } else if (currentFilter === 'movies') {
        if (movieSec) { movieSec.style.display = 'block'; renderMoviesSection(); }
    } else if (currentFilter === 'series') {
        if (seriesSec) { seriesSec.style.display = 'block'; renderSeriesSection(); }
    } else if (currentFilter === 'games') {
        if (gameSec) { gameSec.style.display = 'block'; renderGamesSection(); }
    }
}

function renderAllSection() {
    var grid = document.getElementById('allGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var items = moviesData.filter(function(m){ return (m.type || 'movie') !== 'game'; });
    items.forEach(function(m){ grid.appendChild(makeMovieCard(m)); });
    if (!items.length) grid.innerHTML = '<div style="color:#aaa;text-align:center;grid-column:1/-1;padding:30px;">Koi content nahi hai</div>';
}

function renderMoviesSection() {
    var grid = document.getElementById('moviesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var items = moviesData.filter(function(m){ return (m.type || 'movie') === 'movie' && !(m.parts && m.parts.length); });
    items.forEach(function(m){ grid.appendChild(makeMovieCard(m)); });
    if (!items.length) grid.innerHTML = '<div style="color:#aaa;text-align:center;grid-column:1/-1;padding:30px;">Koi movie nahi hai</div>';
}

function renderSeriesSection() {
    var grid = document.getElementById('seriesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var items = moviesData.filter(function(m){ return (m.type === 'series') || (m.parts && m.parts.length > 0); });
    items.forEach(function(m){ grid.appendChild(makeMovieCard(m)); });
    if (!items.length) grid.innerHTML = '<div style="color:#aaa;text-align:center;grid-column:1/-1;padding:30px;">Koi series nahi hai</div>';
}

function renderGamesSection() {
    var grid = document.getElementById('gamesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var items = moviesData.filter(function(m){ return m.type === 'game'; });
    items.forEach(function(m){ grid.appendChild(makeGameCard(m)); });
    if (!items.length) grid.innerHTML = '<div style="color:#aaa;text-align:center;grid-column:1/-1;padding:30px 10px;font-size:0.9rem;">Koi game nahi hai — Admin se request karo!</div>';
}

// ── Movie Card ────────────────────────────────────────────
function makeMovieCard(m) {
    var div = document.createElement('div');
    div.className = 'movie-card';
    div.style.backgroundColor = '#111';
    div.onclick = function(){
        if (m.parts && m.parts.length > 0) showPartsModal(moviesData.indexOf(m));
        else startRedirect(m.name, m.link, m.id, m.links);
    };
    var tag = (m.parts && m.parts.length > 0) ? 'SERIES' : 'MOVIE';
    var isPremium = String(m.id).includes('*') || m.isPremium;
    var lockHtml = (isPremium && !cachedPremiumStatus)
        ? '<div class="tag-overlay" style="background:rgba(255,165,0,0.9);left:auto;right:5px;"><i class="fas fa-lock"></i> VIP</div>'
        : '<div style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.8);color:#f1c40f;padding:2px 6px;font-size:0.7rem;border-radius:4px;font-weight:bold;border:1px solid #f1c40f;z-index:2;">#' + String(m.id).replace('*','') + '</div>';
    div.innerHTML =
        '<div style="position:relative;line-height:0;">' +
            '<div class="tag-overlay">' + tag + '</div>' +
            lockHtml +
            '<img src="' + m.img + '" loading="lazy" style="border-bottom:2px solid #e50914;">' +
        '</div>' +
        '<div style="padding:8px 4px;font-size:0.85rem;font-weight:bold;text-align:center;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + m.name + '</div>';
    return div;
}

// ── Game Card ─────────────────────────────────────────────
function makeGameCard(m) {
    var div = document.createElement('div');
    div.className = 'movie-card';
    div.style.backgroundColor = '#0d0d1a';
    div.style.border = '1px solid #3d3d7a';
    var isPremium = String(m.id).includes('*') || m.isPremium;
    div.onclick = function(){
        if (!currentUser) { document.getElementById('loginModal').classList.remove('hidden'); return; }
        if (isPremium && !cachedPremiumStatus) {
            showMyAlert('🔒 Yeh Premium Game hai! Premium plan lo.');
            openUpgradeModal(); return;
        }
        // Iframe mein kholo — link hide rahega
        window.location.href = 'game.html?id=' + encodeURIComponent(m.id) + '&title=' + encodeURIComponent(m.name || '');
    };
    var lockHtml = (isPremium && !cachedPremiumStatus)
        ? '<div class="tag-overlay" style="background:rgba(255,165,0,0.9);left:auto;right:5px;"><i class="fas fa-lock"></i> VIP</div>'
        : '';
    div.innerHTML =
        '<div style="position:relative;line-height:0;">' +
            '<div class="tag-overlay" style="background:rgba(61,61,122,0.95);">🎮 GAME</div>' +
            lockHtml +
            '<img src="' + m.img + '" loading="lazy" style="border-bottom:2px solid #3d3d7a;">' +
        '</div>' +
        '<div style="padding:8px 4px;font-size:0.85rem;font-weight:bold;text-align:center;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + m.name + '</div>';
    return div;
}

// ── Search ────────────────────────────────────────────────
function toggleSearch() {
    var sb = document.getElementById('searchBar');
    sb.classList.toggle('hidden');
    if (!sb.classList.contains('hidden')) {
        document.getElementById('searchInput').focus();
    } else {
        document.getElementById('searchInput').value = '';
        renderSections();
        var hero = document.getElementById('heroSlider');
        var tg   = document.getElementById('trendingGrid');
        if (hero) hero.style.display = 'block';
        if (tg && tg.parentElement) tg.parentElement.style.display = 'block';
        document.getElementById('filterTabs').style.display = 'flex';
    }
}

var searchInputEl = document.getElementById('searchInput');
if (searchInputEl) {
    searchInputEl.addEventListener('input', function(e){
        var query = e.target.value.trim().toLowerCase();
        var hero  = document.getElementById('heroSlider');
        var tg    = document.getElementById('trendingGrid');
        var ft    = document.getElementById('filterTabs');
        if (query.length > 0) {
            if (hero) hero.style.display = 'none';
            if (tg && tg.parentElement) tg.parentElement.style.display = 'none';
            if (ft) ft.style.display = 'none';
            // Search across all sections
            var allSec    = document.getElementById('section-all');
            var movieSec  = document.getElementById('section-movies');
            var seriesSec = document.getElementById('section-series');
            var gameSec   = document.getElementById('section-games');
            [allSec, movieSec, seriesSec, gameSec].forEach(function(s){ if(s) s.style.display='none'; });
            // Show search results in a special grid
            var searchSec = document.getElementById('section-search');
            if (!searchSec) {
                searchSec = document.createElement('div');
                searchSec.id = 'section-search';
                searchSec.style.cssText = 'padding:0 15px 30px;';
                searchSec.innerHTML = '<h3 style="border-left:3px solid #e50914;padding-left:10px;margin-bottom:15px;font-size:1.1rem;text-transform:uppercase;">Search Results</h3><div id="searchGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;"></div>';
                document.getElementById('main-app').appendChild(searchSec);
            }
            searchSec.style.display = 'block';
            var grid = document.getElementById('searchGrid');
            grid.innerHTML = '';
            var results = moviesData.filter(function(m){
                var n = (m.name || '').toLowerCase();
                var pMatch = m.parts && m.parts.some(function(p){ return (p.title||'').toLowerCase().includes(query); });
                return n.includes(query) || pMatch;
            });
            if (!results.length) {
                grid.innerHTML = '<div style="color:#aaa;text-align:center;grid-column:1/-1;padding:30px;">Koi result nahi mila 😢</div>';
            } else {
                results.forEach(function(m){
                    grid.appendChild(m.type === 'game' ? makeGameCard(m) : makeMovieCard(m));
                });
            }
            clearTimeout(searchTimeout);
            if (query.length > 2) {
                searchTimeout = setTimeout(function(){
                    fetch(BACKEND_URL + '/api/save-search', {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({ query: query })
                    }).catch(function(){});
                }, 2000);
            }
        } else {
            if (hero) hero.style.display = 'block';
            if (tg && tg.parentElement) tg.parentElement.style.display = 'block';
            if (ft) ft.style.display = 'flex';
            var searchSec = document.getElementById('section-search');
            if (searchSec) searchSec.style.display = 'none';
            renderSections();
        }
    });
}

// ── Parts Modal ───────────────────────────────────────────
function showPartsModal(movieIndex) {
    var movie = moviesData[movieIndex];
    document.getElementById('partsTitle').innerText = movie.name;
    var grid = document.getElementById('partsGrid');
    grid.innerHTML = '';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(3,1fr)';
    grid.style.gap = '10px';
    grid.style.flexDirection = 'unset';

    movie.parts.forEach(function(p, i){
        var div = document.createElement('div');
        div.className = 'movie-card';
        div.style.cssText = 'background-color:#111;cursor:pointer;border-radius:8px;overflow:hidden;';
        div.onclick = function(){
            document.getElementById('partsModal').classList.add('hidden');
            startRedirect(p.title, p.link, movie.id + '_part' + i, p.links);
        };
        div.innerHTML =
            '<div style="position:relative;line-height:0;">' +
                '<img src="' + (p.img || movie.img) + '" loading="lazy" style="width:100%;height:160px;object-fit:cover;border-bottom:2px solid #e50914;">' +
                '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);border-radius:50%;padding:5px;">' +
                    '<i class="fas fa-play-circle" style="color:#e50914;font-size:2rem;"></i>' +
                '</div>' +
            '</div>' +
            '<div style="padding:8px 4px;font-size:0.85rem;font-weight:bold;text-align:center;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + p.title.replace('*','') + '</div>';
        grid.appendChild(div);
    });
    document.getElementById('partsModal').classList.remove('hidden');
}

// ── Redirect ──────────────────────────────────────────────
async function startRedirect(name, link, id, linksObj) {
    linksObj = linksObj || null;
    if (!currentUser) {
        document.getElementById('loginModal').classList.remove('hidden');
        return;
    }
    document.getElementById('main-app').classList.add('hidden');
    var loadScreen = document.getElementById('loadingScreen');
    loadScreen.classList.remove('hidden');

    try {
        var res  = await fetch(BACKEND_URL + '/api/check-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentUser, movieId: id })
        });
        var data = await res.json();
        if (!data.success) {
            loadScreen.classList.add('hidden');
            document.getElementById('main-app').classList.remove('hidden');
            if (data.message === 'Blocked by Admin') {
                showMyAlert('🚫 Sorry Bhai! Aapko Admin ne AstraToonix se Block kar diya hai.');
            } else {
                showMyAlert('🔒 Yeh Premium Content hai! Isko dekhne ke liye Premium Plan chahiye.');
                openUpgradeModal();
            }
            return;
        }
    } catch(e) {
        showMyAlert('Verification failed! Server error.');
        loadScreen.classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        return;
    }

    try {
        fetch(BACKEND_URL + '/api/movie/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movieId: String(id).replace('*','').split('_')[0] })
        });
    } catch(e) {}

    var w = 0;
    var bar = document.getElementById('progressBar');
    var interval = setInterval(function(){
        w += 5;
        if (bar) bar.style.width = w + '%';
        if (w >= 100) {
            clearInterval(interval);
            var playerUrl = 'player.html?title=' + encodeURIComponent(name) + '&id=' + encodeURIComponent(id);
            if (link && link !== '#') playerUrl += '&link=' + encodeURIComponent(link);
            if (linksObj) {
                if (linksObj.p480)  playerUrl += '&link480='  + encodeURIComponent(linksObj.p480);
                if (linksObj.p720)  playerUrl += '&link720='  + encodeURIComponent(linksObj.p720);
                if (linksObj.p1080) playerUrl += '&link1080=' + encodeURIComponent(linksObj.p1080);
                if (linksObj.p4k)   playerUrl += '&link4k='   + encodeURIComponent(linksObj.p4k);
            }
            window.location.href = playerUrl;
        }
    }, 50);
}

// ── Upgrade Modal ─────────────────────────────────────────
function openUpgradeModal() {
    document.getElementById('upgradeModal').classList.remove('hidden');
}
function selectPlan(days, price, element) {
    document.querySelectorAll('.plan-card').forEach(function(c){
        c.style.borderColor = '#e50914';
        c.style.background  = '#1a1a1a';
    });
    element.style.borderColor = '#2ecc71';
    element.style.background  = '#222';
    window.selectedPlanMsg = 'Bhai mujhe ' + days + ' ka Premium chahiye. Main ₹' + price + ' pay kar raha hu. Mera Gmail hai: ' + currentUser;
}
function sendWhatsAppRequest() {
    if (!window.selectedPlanMsg) { showMyAlert('Pehle koi Plan select karo bhai!'); return; }
    window.open('https://wa.me/919395744401?text=' + encodeURIComponent(window.selectedPlanMsg), '_blank');
}
function toggleChatbot() {
    window.open('https://wa.me/919395744401?text=' + encodeURIComponent('Bhai mujhe AstraToonix ke bare me help chahiye!'), '_blank');
}

// ── Boot ──────────────────────────────────────────────────
setTimeout(function(){
    if (typeof moviesData !== 'undefined') initApp();
}, 500);
