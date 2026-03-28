const BACKEND_URL = window.location.origin;
// ⚠️ ADMIN_PASS yahan nahi hoga — sirf server.js mein env variable se aata hai
let currentUser = localStorage.getItem('astratoonix_user');

// 🚀 Custom Alert System
function showMyAlert(msg, icon = "lock") {
    const alertBox = document.getElementById('customAlert');
    const msgBox = document.getElementById('alertMessage');
    const iconBox = document.querySelector('#customAlert i');
    
    if (alertBox && msgBox) {
        msgBox.innerText = msg;
        if(iconBox) {
            iconBox.className = (icon === "error") ? "fas fa-exclamation-triangle" : "fas fa-lock";
            iconBox.style.color = (icon === "error") ? "#ff4d4d" : "#f1c40f";
        }
        
        const innerDiv = alertBox.querySelector('div');
        if(innerDiv) {
            innerDiv.style.border = "2px solid #e50914";
            innerDiv.style.boxShadow = "0 0 25px rgba(229, 9, 20, 0.7)";
        }
        
        alertBox.classList.remove('hidden');
    } else {
        alert(msg); 
    }
}

function closeCustomAlert() {
    const alertBox = document.getElementById('customAlert');
    if (alertBox) alertBox.classList.add('hidden');
}

// 🚀 NAYA: Custom Prompt (Admin Password dalne ke liye bina browser popup ke)
function showMyPrompt(msg, isPassword = true) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '10005';
        overlay.innerHTML = `
            <div style="background:#111; padding:25px; border-radius:15px; text-align:center; width:80%; max-width:320px; border:2px solid #e50914; box-shadow: 0 0 25px rgba(229, 9, 20, 0.7); margin: auto;">
                <div style="font-size: 2.5rem; color: #f1c40f; margin-bottom: 15px;"><i class="fas fa-key"></i></div>
                <h3 style="color:#e50914; margin-top:0; letter-spacing: 1px;">INPUT REQUIRED</h3>
                <p style="color:#eee; font-size:0.95rem; line-height:1.5; margin-bottom: 15px;">${msg}</p>
                <input type="${isPassword ? 'password' : 'text'}" id="tempPromptInput" class="admin-input" style="width:100%; margin-bottom:20px; text-align:center; background:#000; border:1px solid #333; color:#fff; padding:12px; border-radius:8px; outline:none;" placeholder="Type here...">
                <div style="display:flex; gap:10px;">
                    <button id="promptCancelBtn" style="background:#333; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; width: 50%;">CANCEL</button>
                    <button id="promptOkBtn" style="background:#e50914; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; width: 50%;">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = document.getElementById('tempPromptInput');
        input.focus();

        document.getElementById('promptOkBtn').onclick = () => {
            const val = input.value;
            document.body.removeChild(overlay);
            resolve(val);
        };
        document.getElementById('promptCancelBtn').onclick = () => {
            document.body.removeChild(overlay);
            resolve(null);
        };
    });
}

// 🚀 NAYA: Custom Confirm (Sign Out Yes/No ke liye)
function showMyConfirm(msg) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '10005';
        overlay.innerHTML = `
            <div style="background:#111; padding:25px; border-radius:15px; text-align:center; width:80%; max-width:320px; border:2px solid #e50914; box-shadow: 0 0 25px rgba(229, 9, 20, 0.7); margin: auto;">
                <div style="font-size: 2.5rem; color: #ff9800; margin-bottom: 15px;"><i class="fas fa-question-circle"></i></div>
                <h3 style="color:#e50914; margin-top:0; letter-spacing: 1px;">CONFIRMATION</h3>
                <p style="color:#eee; font-size:0.95rem; line-height:1.5; margin-bottom: 20px;">${msg}</p>
                <div style="display:flex; gap:10px;">
                    <button id="confirmNoBtn" style="background:#333; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; width: 50%;">NO</button>
                    <button id="confirmYesBtn" style="background:#e50914; color:#fff; border:none; padding:12px; border-radius:8px; font-weight:bold; cursor:pointer; width: 50%;">YES</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('confirmYesBtn').onclick = () => {
            document.body.removeChild(overlay);
            resolve(true);
        };
        document.getElementById('confirmNoBtn').onclick = () => {
            document.body.removeChild(overlay);
            resolve(false);
        };
    });
}

// Auto Login Logic
window.onload = () => {
    const savedEmail = localStorage.getItem('saved_email');
    const savedPass = localStorage.getItem('saved_password');
    if(savedEmail && savedPass) {
        // Saved login hai — verify karo server se
        autoLogin(savedEmail, savedPass);
    } else {
        // Koi login nahi — login page dikhao (already visible by default)
        cpGenerate();
    }
    checkMyPremiumTimer();
};

async function autoLogin(email, password) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(data.success) {
            currentUser = data.user.email;
            localStorage.setItem('astratoonix_user', currentUser);
            document.getElementById('loginModal').classList.add('hidden');
            const mainApp = document.getElementById('main-app');
            if (mainApp) mainApp.style.display = 'block';
            if (typeof initApp === 'function') initApp();
        } else {
            localStorage.removeItem('saved_email');
            localStorage.removeItem('saved_password');
            document.getElementById('loginModal').classList.remove('hidden');
            cpGenerate();
        }
    } catch(e) { 
        console.log("Auto-login error");
        // Server error — login page dikhao
        document.getElementById('loginModal').classList.remove('hidden');
        cpGenerate();
    }
}
// Manual Login Logic
async function loginUser() {
    const email = document.getElementById('emailInput').value.trim().toLowerCase().replace(/\s+/g, '');
    const password = document.getElementById('passInput').value.trim();
    if(!email.includes("@")) { showMyAlert("Sahi Gmail dalo!", "error"); return; }
    if(!password) { showMyAlert("Password dalo!", "error"); return; }

    // Bot check
    if (!window._cpPassed) {
        showMyAlert("❌ Bot check galat hai! Sahi answer daalo.", "error");
        cpGenerate();
        return;
    }

    const btn = document.querySelector('#loginModal button');
    btn.innerText = "Connecting..."; btn.disabled = true;

    try {
        const res = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if(data.success) {
            localStorage.setItem('astratoonix_user', data.user.email);
            localStorage.setItem('saved_email', email);
            localStorage.setItem('saved_password', password);
            document.getElementById('loginModal').classList.add('hidden');
            const mainApp = document.getElementById('main-app');
            if (mainApp) mainApp.style.display = 'block';
            if (typeof initApp === 'function') initApp();
        } else { 
            showMyAlert(data.message || "Ghalat Details!", "error"); 
        }
    } catch(e) { 
        showMyAlert("Server Error!", "error"); 
    } finally { 
        btn.innerText = "Start Watching"; btn.disabled = false; 
    }
}

// 🚀 NAYA: Premium Timer Check Logic (Jo frontend par VIP time dikhayega)
async function checkMyPremiumTimer() {
    const email = localStorage.getItem('saved_email');
    const pass = localStorage.getItem('saved_password');
    if (!email || !pass) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass })
        });
        const data = await res.json();
        
        if (data.success && data.user) {
            const user = data.user;
            const timerBox = document.getElementById('vipTimerBox');
            const timerText = document.getElementById('countdownTimer');
            
            // Agar Lifetime VIP hai
            if (user.isForever || user.isPremiumApproved) {
                if(timerBox) timerBox.style.display = 'block';
                if(timerText) timerText.innerHTML = "Lifetime VIP 👑";
            } 
            // Agar din (days) wala VIP hai
            else if (user.planExpiry) {
                const expiry = new Date(user.planExpiry).getTime();
                const now = new Date().getTime();
                
                if (expiry > now) {
                    if(timerBox) timerBox.style.display = 'block';
                    
                    setInterval(() => {
                        const currentTime = new Date().getTime();
                        const distance = expiry - currentTime;
                        
                        if (distance < 0) {
                            if(timerText) {
                                timerText.innerHTML = "Expired! Renew Now";
                                timerText.style.color = "#ff0000";
                            }
                        } else {
                            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                            if(timerText) timerText.innerHTML = `${days}d ${hours}h ${minutes}m Left`;
                        }
                    }, 1000);
                }
            }
        }
    } catch (e) {
        console.log("Timer error", e);
    }
}

// ---------------- PROFILE & LOGOUT LOGIC ----------------

function openProfilePage() {
    if(currentUser) document.getElementById('userDisplayInfo').innerText = `Logged in as: ${currentUser}`;
    document.getElementById('devModal').classList.remove('hidden');
}

// 🚀 UPDATE: ab ye custom confirm box use karega
async function signOutUser() {
    const isSure = await showMyConfirm("Kya aap sach me Sign Out karna chahte hain?");
    if(isSure) {
        localStorage.removeItem('astratoonix_user');
        localStorage.removeItem('saved_email');
        localStorage.removeItem('saved_password');
        location.reload();
    }
}

// ---------------- 🚀 NAYA: TOTAL LIVE USERS LOGIC (Home Page Ke Liye) ----------------
if (typeof io !== 'undefined') {
    const globalSocket = io(BACKEND_URL);
    
    globalSocket.on('totalLiveUpdate', (count) => {
        // Agar tumhare home page pe id="totalLiveCount" wala element hai to waha update ho jayega
        const totalDisplay = document.getElementById('totalLiveCount');
        if (totalDisplay) {
            totalDisplay.innerText = count;
        }
    });
}


// ================================================================
// 🔐 BOT CHECK — Math + Secret Suffix
// ================================================================
var _cpA = 0, _cpB = 0, _cpOp = '+';
window._cpPassed = false;
var CP_SECRET = '';

function cpInit() {
    // Secret server se fetch karo
    fetch(BACKEND_URL + '/api/cp-secret')
        .then(function(r){ return r.json(); })
        .then(function(d){ CP_SECRET = d.s || '*@f'; cpDoGenerate(); })
        .catch(function(){ CP_SECRET = '*@f'; cpDoGenerate(); });
}

function cpGenerate() {
    if (!CP_SECRET) { cpInit(); return; }
    cpDoGenerate();
}

function cpDoGenerate() {
    _cpA = Math.floor(Math.random() * 8) + 2;
    _cpB = Math.floor(Math.random() * 8) + 2;
    _cpOp = Math.random() > 0.5 ? '+' : '-';
    if (_cpOp === '-' && _cpA <= _cpB) { var t = _cpA; _cpA = _cpB; _cpB = t; }
    window._cpPassed = false;
    var qEl = document.getElementById('cpQ');
    var iEl = document.getElementById('cpAns');
    var sEl = document.getElementById('cpSt');
    if (qEl) qEl.textContent = _cpA + ' ' + _cpOp + ' ' + _cpB + ' = ?';
    if (iEl) { iEl.value = ''; iEl.style.borderColor = '#444'; }
    if (sEl) sEl.textContent = '❓';
}

function cpCheck(val) {
    if (!val) return;
    var result  = (_cpOp === '+') ? (_cpA + _cpB) : (_cpA - _cpB);
    var correct = result + CP_SECRET;
    var iEl = document.getElementById('cpAns');
    var sEl = document.getElementById('cpSt');
    if (val.trim() === correct) {
        window._cpPassed = true;
        if (sEl) sEl.textContent = '✅';
        if (iEl) iEl.style.borderColor = '#2ecc71';
    } else {
        window._cpPassed = false;
        if (sEl) sEl.textContent = val.length >= correct.length ? '❌' : '❓';
        if (iEl) iEl.style.borderColor = val.length >= correct.length ? '#e50914' : '#444';
    }
}
