process.removeAllListeners('warning');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"],
    exposedHeaders: ["Content-Range", "Accept-Ranges"]
}));
app.use(express.json());
app.use(express.static(__dirname));

// Login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Home page — sirf login ke baad aata hai (client side check)
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

// ── MongoDB ───────────────────────────────────────────────
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://user:pass@cluster.mongodb.net/AstraToonix";
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4
})
.then(() => console.log("✅ DB Connected"))
.catch(err => console.log("❌ DB Failed:", err.message));

// ── Schemas ───────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: { type: String },
    uid: { type: String, unique: true },
    trialStartDate: { type: Date, default: Date.now },
    planExpiry: { type: Date, default: null },
    isForever: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    isPremiumApproved: { type: Boolean, default: false }
});
const User = mongoose.model('User', UserSchema);

const MovieSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: { type: String, required: true },
    type: { type: String, default: 'movie' },
    img: { type: String, default: '' },
    link: { type: String, default: '#' },
    links: {
        p480: { type: String, default: '' },
        p720: { type: String, default: '' },
        p1080: { type: String, default: '' },
        p4k: { type: String, default: '' }
    },
    isPremium: { type: Boolean, default: false },
    isSeries: { type: Boolean, default: false },
    parts: [{
        title: String, img: String, link: String,
        isPremium: { type: Boolean, default: false },
        links: { p480: String, p720: String, p1080: String, p4k: String }
    }],
    addedAt: { type: Date, default: Date.now },
    views: { type: Number, default: 0 }
});
const Movie = mongoose.model('Movie', MovieSchema);

const SearchSchema = new mongoose.Schema({
    query: String,
    timestamp: { type: Date, default: Date.now }
});
const Search = mongoose.model('Search', SearchSchema);

const SettingsSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: { type: mongoose.Schema.Types.Mixed }
});
const Settings = mongoose.model('Settings', SettingsSchema);

let globalLiveCounts = {};

// ── APIs ──────────────────────────────────────────────────

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ email, password, uid: "AT" + Math.floor(1000 + Math.random() * 9000) });
            await user.save();
            return res.json({ success: true, user });
        }
        if (user.password !== password) {
            return res.json({ success: false, message: "Ghalat Password!" });
        }
        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
});

app.post('/api/check-access', async (req, res) => {
    const { email, movieId } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: "User not found" });
        if (user.isBlocked) return res.json({ success: false, message: "Blocked" });

        const isPremium = movieId && String(movieId).includes('*');
        if (isPremium) {
            const now = new Date();
            const trialEnd = new Date(user.trialStartDate.getTime() + 1 * 60 * 1000);
            if (user.isForever || (user.planExpiry && user.planExpiry > now) || trialEnd > now || user.isPremiumApproved) {
                return res.json({ success: true });
            }
            return res.json({ success: false, message: "Premium Required" });
        }
        return res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "Server error" }); }
});

app.post('/api/save-search', async (req, res) => {
    const { query } = req.body;
    if (!query || query.length < 2) return res.json({ success: false });
    try {
        await new Search({ query }).save();
        const count = await Search.countDocuments();
        if (count > 20) {
            const old = await Search.find().sort({ timestamp: 1 }).limit(count - 20);
            await Search.deleteMany({ _id: { $in: old.map(s => s._id) } });
        }
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.get('/api/movies', async (req, res) => {
    try {
        const movies = await Movie.find().sort({ addedAt: -1 });
        res.json({ success: true, movies });
    } catch (e) { res.json({ success: false, message: "Movies fetch error" }); }
});

app.post('/api/movie/view', async (req, res) => {
    const { movieId } = req.body;
    try {
        await Movie.findOneAndUpdate({ id: movieId }, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.get('/api/settings/ads', async (req, res) => {
    try {
        const s = await Settings.findOne({ key: 'adsEnabled' });
        res.json({ success: true, adsEnabled: s ? s.value : true });
    } catch(e) { res.json({ success: true, adsEnabled: true }); }
});

app.get('/api/cp-secret', (req, res) => {
    res.json({ s: process.env.CP_SECRET || '*@f' });
});

app.post('/api/game-link', async (req, res) => {
    const { email, gameId } = req.body;
    try {
        if (!email || !gameId) return res.json({ success: false });
        const game = await Movie.findOne({ id: gameId });
        if (!game) return res.json({ success: false });
        res.json({ success: true, link: game.link });
    } catch(e) { res.json({ success: false }); }
});

// ── Socket ────────────────────────────────────────────────
io.on('connection', (socket) => {
    io.emit('totalLiveUpdate', io.engine.clientsCount);

    socket.on('joinMovie', (movieId) => {
        socket.join(movieId);
        globalLiveCounts[movieId] = (globalLiveCounts[movieId] || 0) + 1;
        io.emit('globalCounts', globalLiveCounts);
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(room => {
            if (globalLiveCounts[room]) {
                globalLiveCounts[room]--;
                if (globalLiveCounts[room] < 0) globalLiveCounts[room] = 0;
            }
        });
        io.emit('globalCounts', globalLiveCounts);
    });

    socket.on('disconnect', () => {
        io.emit('totalLiveUpdate', io.engine.clientsCount);
    });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
