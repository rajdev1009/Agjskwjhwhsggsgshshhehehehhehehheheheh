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
        autoLogin(savedEmail, savedPass);
    } else {
        document.getElementById('loginModal').classList.remove('hidden');
        cpGenerate();
    }
    // 🚀 NAYA: Page load hote hi Premium Timer check karega
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
        } else {
            localStorage.removeItem('saved_email');
            localStorage.removeItem('saved_password');
            document.getElementById('loginModal').classList.remove('hidden');
            cpGenerate();
        }
    } catch(e) { 
        console.log("Auto-login error"); 
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
            location.reload();
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

// ---------------- ADMIN CONSOLE LOGIC ----------------

// Password server pe verify hota hai — frontend pe koi comparison nahi
async function handleAdminClick() {
    let pass = await showMyPrompt("Enter Admin Password:", true);
    if (!pass) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: pass })
        });
        const data = await res.json();
        if (data.success) {
            window._adminSessionPass = pass;
            document.getElementById('adminModal').classList.remove('hidden');
        } else {
            showMyAlert("Wrong Password! Access Denied.", "error");
        }
    } catch(e) {
        showMyAlert("Server Error! Try again.", "error");
    }
}

// 1. Give Premium Access
async function addPremiumAccess() {
    const email = document.getElementById('adminUserEmail').value.trim().toLowerCase();
    const days = document.getElementById('adminAccessDays').value;
    const actionPass = await showMyPrompt("Enter Action Password:", true);
    if (!email || !days || !actionPass) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/add-premium`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: actionPass, userEmail: email, days })
        });
        const data = await res.json(); 
        showMyAlert(data.message);
        document.getElementById('adminUserEmail').value = '';
        document.getElementById('adminAccessDays').value = '';
    } catch (e) { 
        showMyAlert("Error adding premium.", "error"); 
    }
}

// 🚀 Manual Premium Approval
async function togglePremiumApproval(isApprove) {
    const email = document.getElementById('approveUserEmail').value.trim().toLowerCase();
    if (!email) { showMyAlert("Pehle Gmail dalo!", "error"); return; }
    const actionPass = await showMyPrompt("Enter Action Password:", true);
    if (!actionPass) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/approve-user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: actionPass, userEmail: email, approveStatus: isApprove })
        });
        const data = await res.json(); 
        showMyAlert(data.message);
        document.getElementById('approveUserEmail').value = '';
    } catch (e) { 
        showMyAlert("Error in Approval!", "error"); 
    }
}

// 2. Block / Unblock User
async function toggleBlockUser(isBlock) {
    const email = document.getElementById('blockUserEmail').value.trim().toLowerCase();
    if (!email) { showMyAlert("Pehle Gmail dalo!", "error"); return; }
    const actionPass = await showMyPrompt("Enter Action Password:", true);
    if (!actionPass) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/toggle-block`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: actionPass, userEmail: email, blockStatus: isBlock })
        });
        const data = await res.json(); 
        showMyAlert(data.message);
        document.getElementById('blockUserEmail').value = '';
    } catch (e) { 
        showMyAlert("Error in Block/Unblock!", "error"); 
    }
}

// 3. Delete User from Database
async function resetUserAccount() {
    const email = document.getElementById('resetUserEmail').value.trim().toLowerCase();
    if (!email) { showMyAlert("Pehle Gmail dalo!", "error"); return; }
    const actionPass = await showMyPrompt("Enter Action Password to Delete:", true);
    if (!actionPass) return;
    
    const isSure = await showMyConfirm(`Kya sach me ${email} ko Database se udana hai?`);
    if(!isSure) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/reset-user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: actionPass, userEmail: email })
        });
        const data = await res.json(); 
        showMyAlert(data.message);
        document.getElementById('resetUserEmail').value = '';
    } catch (e) { 
        showMyAlert("Delete Error!", "error"); 
    }
}
// 4. Fetch Live Users List
async function fetchAllUsers() {
    const actionPass = await showMyPrompt("Enter Action Password:", true);
    if (!actionPass) return;
    
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = '<div style="padding:10px; color:#fff;">Fetching Data...</div>';

    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/all-users`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: actionPass })
        });
        const data = await res.json();
        if (data.success) {
            tableBody.innerHTML = '';
            data.users.forEach(user => {
                const now = new Date(); 
                let status = ""; 
                let color = "";
                
                if (user.isBlocked) { 
                    status = "BLOCKED 🚫"; 
                    color = "#e50914"; 
                } 
                else if (user.isForever || user.isPremiumApproved) { 
                    status = "Lifetime VIP 👑"; 
                    color = "#f1c40f"; 
                }
                else if (user.planExpiry && new Date(user.planExpiry) > now) {
                    let daysLeft = Math.ceil((new Date(user.planExpiry) - now) / (1000 * 60 * 60 * 24));
                    status = `${daysLeft} days left`; 
                    color = "#2ecc71";
                } else {
                    const trial = new Date(new Date(user.trialStartDate).getTime() + 3*24*60*60*1000);
                    if (trial > now) { 
                        let hoursLeft = Math.ceil((trial - now) / (1000 * 60 * 60));
                        status = `Trial: ${hoursLeft}h left`; 
                        color = "#3498db"; 
                    } else { 
                        status = "Expired"; 
                        color = "#888"; 
                    }
                }
                
                tableBody.innerHTML += `
                <div style="border-bottom:1px solid #333; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:bold; color:#fff;">${user.email}</div>
                        <small style="color:#aaa;">${user.uid}</small>
                    </div>
                    <div>
                        <span style="color:${color}; font-weight:bold;">${status}</span>
                    </div>
                </div>`;
            });
        } else {
            tableBody.innerHTML = '<div style="color:red; padding:10px;">Failed to fetch users.</div>';
        }
    } catch (e) { 
        showMyAlert("Fetch failed!", "error"); 
        tableBody.innerHTML = '';
    }
}

// 5. Fetch Search History Logic 🔍
async function fetchSearchHistory() {
    const actionPass = await showMyPrompt("Enter Action Password to view Search History:", true);
    if (!actionPass) return;
    
    const listDiv = document.getElementById('searchHistoryList');
    listDiv.innerHTML = '<div style="padding:10px; color:#fff;">Fetching searches...</div>';

    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/search-analytics`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: actionPass })
        });
        const data = await res.json();
        if (data.success) {
            listDiv.innerHTML = '';
            if(data.history.length === 0) {
                listDiv.innerHTML = '<div style="padding:10px; color:#aaa;">No search history found.</div>';
            }
            data.history.forEach(item => {
                const date = new Date(item.timestamp).toLocaleString();
                listDiv.innerHTML += `
                <div style="border-bottom:1px solid #222; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#fff; font-weight:bold;">${item.query}</span>
                    <small style="color:#666;">${date}</small>
                </div>`;
            });
        } else { 
            showMyAlert("Access Denied! Ghalat Password.", "error"); 
            listDiv.innerHTML = '';
        }
    } catch (e) { 
        showMyAlert("Fetch error!", "error"); 
        listDiv.innerHTML = '';
    }
                    }
                        // 6. Saman.js Generator Logic (Advanced AstraToonix Version)
let adminPartCount = 0;

function addAdminPartInput() {
    adminPartCount++;
    const container = document.getElementById('adminPartsContainer');
    const div = document.createElement('div');
    div.id = `partContainer_${adminPartCount}`;
    div.className = "admin-part-card";
    div.style = "margin-bottom:15px; padding:12px; background:#111; border:1px solid #333; border-radius:10px; border-left: 4px solid #f1c40f;";
    
    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="color:#f1c40f; font-weight:bold; font-size:0.9rem;">PART #${adminPartCount}</span>
            <div style="display:flex; align-items:center; gap:12px;">
                <label style="color:#39ff14; font-size:0.8rem; cursor:pointer; font-weight:bold;">
                    <input type="checkbox" id="qualVip_${adminPartCount}"> Quality VIP 💎
                </label>
                <label style="color:#e50914; font-size:0.8rem; cursor:pointer; font-weight:bold;">
                    <input type="checkbox" id="partStar_${adminPartCount}"> Full VIP ⭐
                </label>
                <i class="fas fa-trash-alt" onclick="removePartBox(${adminPartCount})" style="color:#ff4d4d; cursor:pointer; font-size:1.1rem;" title="Delete Part"></i>
            </div>
        </div>
        <input type="text" id="partTitle_${adminPartCount}" class="admin-input" placeholder="Part Title (e.g. Episode 1)">
        <input type="text" id="partImg_${adminPartCount}" class="admin-input" placeholder="Part Image URL">
        <div style="background:#222; padding:10px; border-radius:8px; border:1px dashed #555; margin-top:8px;">
            <input type="text" id="partLink480_${adminPartCount}" class="admin-input" placeholder="480p Link (Free)" style="margin-bottom:8px;">
            <input type="text" id="partLink720_${adminPartCount}" class="admin-input" placeholder="720p Link (VIP Optional)" style="margin-bottom:8px;">
            <input type="text" id="partLink1080_${adminPartCount}" class="admin-input" placeholder="1080p Link (VIP Optional)" style="margin-bottom:8px;">
            <input type="text" id="partLink4K_${adminPartCount}" class="admin-input" placeholder="4K Link (VIP Optional)" style="margin-bottom:0;">
        </div>
    `;
    container.appendChild(div);
}
function removePartBox(id) {
    const el = document.getElementById(`partContainer_${id}`);
    if(el) el.remove();
}

function resetGenerator() {
    if(confirm("Kya aap pura form saaf karna chahte hain?")) {
        document.getElementById('genId').value = '';
        document.getElementById('genMainTitle').value = '';
        document.getElementById('genMainImg').value = '';
        
        // 🚀 Resetting all main quality inputs safely
        const link480El = document.getElementById('genLink480');
        const link720El = document.getElementById('genLink720');
        const link1080El = document.getElementById('genLink1080');
        const link4kEl = document.getElementById('genLink4K');
        
        if(link480El) link480El.value = '';
        if(link720El) link720El.value = '';
        if(link1080El) link1080El.value = '';
        if(link4kEl) link4kEl.value = '';

        document.getElementById('adminPartsContainer').innerHTML = '';
        document.getElementById('codePreviewBox').classList.add('hidden');
        document.getElementById('finalCodeArea').value = '';
        adminPartCount = 0;
        showMyAlert("Generator saaf ho gaya! Ab naya data dalo.");
    }
}

function generateMovieCode() {
    const id = document.getElementById('genId').value;
    const title = document.getElementById('genMainTitle').value;
    const img = document.getElementById('genMainImg').value;
    
    // 🚀 FIX: Main Movie ke charo Quality links ab properly catch honge
    const link480El = document.getElementById('genLink480');
    const link720El = document.getElementById('genLink720');
    const link1080El = document.getElementById('genLink1080');
    const link4kEl = document.getElementById('genLink4K');
    
    const p480 = (link480El && link480El.value) ? link480El.value : "";
    const p720 = (link720El && link720El.value) ? link720El.value : p480;
    const p1080 = (link1080El && link1080El.value) ? link1080El.value : p480;
    const p4k = (link4kEl && link4kEl.value) ? link4kEl.value : p480;

    if(!id || !title) { showMyAlert("ID aur Title dalo!", "error"); return; }

    let partsArr = [];
    const allParts = document.querySelectorAll('[id^="partContainer_"]');
    
    allParts.forEach((part) => {
        const pId = part.id.split('_')[1];
        const pTitleInput = document.getElementById(`partTitle_${pId}`);
        const pImg = document.getElementById(`partImg_${pId}`).value;
        
        // Parts ke charo Quality links
        const pL480 = document.getElementById(`partLink480_${pId}`).value;
        const pL720 = document.getElementById(`partLink720_${pId}`).value || pL480;
        const pL1080 = document.getElementById(`partLink1080_${pId}`).value || pL480;
        const pL4k = document.getElementById(`partLink4K_${pId}`).value || pL480;

        const isFullVip = document.getElementById(`partStar_${pId}`).checked;
        
        let pTitle = pTitleInput.value;
        
        // Agar Full VIP tick hai to title me '*' lagao
        if(isFullVip && !pTitle.includes('*')) {
            pTitle += '*';
        }

        if(pTitle && pL480) {
            partsArr.push(`\n        { 
            title: "${pTitle}", 
            img: "${pImg}", 
            link: "${pL480}", 
            links: { p480: "${pL480}", p720: "${pL720}", p1080: "${pL1080}", p4k: "${pL4k}" } 
        }`);
        }
    });

    const finalCode = `moviesData.push({
    id: "${id}",
    name: "${title}",
    img: "${img}",
    link: "${p480}",
    links: { p480: "${p480}", p720: "${p720}", p1080: "${p1080}", p4k: "${p4k}" },
    parts: [${partsArr.join(',')}\n    ]
});`;

    document.getElementById('finalCodeArea').value = finalCode;
    document.getElementById('codePreviewBox').classList.remove('hidden');
    document.getElementById('codePreviewBox').scrollIntoView({ behavior: 'smooth' });
}

function copyGeneratedCode() {
    const copyText = document.getElementById("finalCodeArea");
    copyText.select();
    document.execCommand("copy");
    showMyAlert("✅ Saman.js Code Copied! Ise apni saman.js file me paste kar do.");
}
// Master Reset Function (2-Step Verify)
async function masterDatabaseReset() {
    const p1 = await showMyPrompt("Enter First Action Password (75788...):", true);
    if (!p1) return;

    const p2 = await showMyPrompt("Enter Second Action Password (93957...):", true);
    if (!p2) return;
const confirmText = await showMyPrompt("Type 'DELETE ALL' to confirm (Capital letters):", false);
    if (confirmText !== "DELETE ALL") {
        showMyAlert("Reset cancel kar diya gaya.", "error");
        return;
    }

    const isSure = await showMyConfirm("⚠️ LAST WARNING: Kya aap sach me sab kuch mita dena chahte hain?");
    if(!isSure) return;

    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/danger-master-reset`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pass1: p1, pass2: p2, confirmText: confirmText })
        });
        const data = await res.json();
        showMyAlert(data.message);
        if(data.success) location.reload();
    } catch (e) { 
        showMyAlert("Error connecting to server!", "error"); 
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
