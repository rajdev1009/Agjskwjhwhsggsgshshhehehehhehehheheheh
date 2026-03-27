// ==========================================
// ASTRATOONIX PRO ADS MANAGER — WITH ON/OFF CONTROL
// ==========================================
const BACKEND_URL_ADS = window.location.origin;

async function initAstraAds() {
    // 1. Check server-side ads enabled setting
    try {
        var settRes = await fetch(BACKEND_URL_ADS + '/api/settings/ads');
        var settData = await settRes.json();
        if (!settData.adsEnabled) {
            console.log('Ads are disabled by admin.');
            return; // Admin ne off kiya — koi ad nahi
        }
    } catch(e) {
        // Server check fail — default allow
    }

    const user = localStorage.getItem('astratoonix_user');
    const loginModal = document.getElementById('loginModal');

    if (loginModal && !loginModal.classList.contains('hidden')) {
        console.log("Login page is open. Ads stopped.");
        return;
    }

    if (!user) {
        injectSafeAds();
        return;
    }

    try {
        const res = await fetch(`${BACKEND_URL_ADS}/api/check-access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user, movieId: "ad_free_check*" })
        });
        const data = await res.json();
        if (!data.success) {
            injectSafeAds();
        }
    } catch (e) {
        console.log("Ads check failed, showing ads by default.");
        injectSafeAds();
    }
}

function injectSafeAds() {
    const adHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 8px;">
            <span style="color:#f1c40f; font-size:0.75rem; font-weight:bold; letter-spacing:1px;"><i class="fas fa-ad"></i> SPONSORED AD</span>
            <button onclick="this.parentElement.parentElement.style.display='none'" style="background: #e50914; color: white; border: 1px solid #ff4d4d; border-radius: 4px; padding: 4px 12px; font-size: 0.8rem; cursor: pointer; font-weight: bold; box-shadow: 0 0 5px rgba(229,9,20,0.5);">❌ Close</button>
        </div>
        <div id="container-5f7e287e46c1173d1fb356138ed28421" style="width: 100%; min-height: 50px; display: flex; justify-content: center; align-items: center;">
            <span id="adLoadingText" style="color:#666; font-size: 0.8rem; font-style: italic;">Adsterra Ads Loading...</span>
        </div>
    `;

    const boxStyle = "width: 95%; max-width: 800px; margin: 20px auto; text-align: center; background: #0a0a0a; border: 1px solid #333; padding: 12px; border-radius: 10px; box-shadow: 0 0 20px rgba(229, 9, 20, 0.4); position: relative; z-index: 50;";

    const homeSlider = document.getElementById('heroSlider');
    if (homeSlider && !document.getElementById('astraHomeAdContainer')) {
        const homeAdDiv = document.createElement('div');
        homeAdDiv.id = "astraHomeAdContainer";
        homeAdDiv.style = boxStyle;
        homeAdDiv.innerHTML = adHtml;
        homeSlider.parentNode.insertBefore(homeAdDiv, homeSlider.nextSibling);
        loadAdsterraScript(homeAdDiv);
    }

    const playerTarget = document.getElementById('adsterraTargetLocation');
    if (playerTarget && !document.getElementById('astraPlayerAdContainer')) {
        const playerAdDiv = document.createElement('div');
        playerAdDiv.id = "astraPlayerAdContainer";
        playerAdDiv.style = boxStyle;
        playerAdDiv.innerHTML = adHtml;
        playerTarget.appendChild(playerAdDiv);
        loadAdsterraScript(playerAdDiv);
    }
}

function loadAdsterraScript(container) {
    const adScript = document.createElement('script');
    adScript.type = 'text/javascript';
    adScript.async = true;
    adScript.dataset.cfasync = "false";
    adScript.src = "https://pl28818416.effectivegatecpm.com/5f7e287e46c1173d1fb356138ed28421/invoke.js";
    adScript.onload = function() {
        const loadingText = container.querySelector('#adLoadingText');
        if(loadingText) loadingText.style.display = 'none';
    };
    container.appendChild(adScript);
}

setTimeout(initAstraAds, 1000);
