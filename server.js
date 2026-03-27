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

// 🚀 NAYA IPHONE FIX: Safari browser ke liye CORS ko open kar diya
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Range"],
    exposedHeaders: ["Content-Range", "Accept-Ranges"]
}));
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔐 Passwords — Env variable se aata hai, hardcoded nahi
const ACTION_PASS = process.env.ADMIN_PASS;
if (!ACTION_PASS) {
    console.error("❌ ADMIN_PASS environment variable set nahi hai! Server band ho raha hai.");
    process.exit(1);
}

// 📂 MongoDB Setup
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://user:pass@cluster.mongodb.net/AstraToonix";

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4
})
.then(() => console.log("✅ AstraToonix DB Connected Successfully"))
.catch(err => console.log("❌ DB Connection Failed!", err.message));

// ================================================================
// 📝 USER SCHEMA
// ================================================================
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

// ================================================================
// ⚙️ SETTINGS SCHEMA (ads on/off, etc)
// ================================================================
const SettingsSchema = new mongoose.Schema({
    key:   { type: String, unique: true },
    value: { type: mongoose.Schema.Types.Mixed }
});
const Settings = mongoose.model('Settings', SettingsSchema);

// ================================================================
// 📽️ MOVIE SCHEMA
// ================================================================
const MovieSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: { type: String, required: true },
    type: { type: String, default: 'movie' }, // 'movie' | 'series' | 'game'
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
        title: String,
        img: String,
        link: String,
        isPremium: { type: Boolean, default: false },
        links: {
            p480: String,
            p720: String,
            p1080: String,
            p4k: String
        }
    }],
    addedAt: { type: Date, default: Date.now },
    views: { type: Number, default: 0 }
});
const Movie = mongoose.model('Movie', MovieSchema);

// ================================================================
// 🔍 SEARCH HISTORY SCHEMA
// ================================================================
const SearchSchema = new mongoose.Schema({
    query: String,
    timestamp: { type: Date, default: Date.now }
});
const Search = mongoose.model('Search', SearchSchema);

let globalLiveCounts = {};

// ================================================================
// 🔐 ADMIN VERIFY API — frontend password check ke liye
// ================================================================
app.post('/api/admin/verify', (req, res) => {
    const { adminPassword } = req.body;
    if (adminPassword === ACTION_PASS) {
        return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: "Wrong Password!" });
});

// ================================================================
// 🚦 USER APIs
// ================================================================

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                email,
                password,
                uid: "AT" + Math.floor(1000 + Math.random() * 9000)
            });
            await user.save();
            return res.json({ success: true, user });
        }

        if (user.password !== password) {
            return res.json({ success: false, message: "Ghalat Password! Wahi password dalo jo pehle set kiya tha." });
        }

        res.json({ success: true, user });
    } catch (e) { res.status(500).json({ success: false, message: "Server Error" }); }
});

app.post('/api/check-access', async (req, res) => {
    const { email, movieId } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, message: "User not found" });

        if (user.isBlocked) {
            return res.json({ success: false, message: "Blocked by Admin" });
        }

        const isPremiumContent = movieId && String(movieId).includes('*');

        if (isPremiumContent) {
            const now = new Date();
            const trialEnd = new Date(user.trialStartDate.getTime() + 1 * 60 * 1000);

            if (user.isForever || (user.planExpiry && user.planExpiry > now) || trialEnd > now || user.isPremiumApproved) {
                return res.json({ success: true });
            }
            return res.json({ success: false, message: "Premium Required" });
        } else {
            return res.json({ success: true });
        }
    } catch (e) { res.json({ success: false, message: "Server error" }); }
});

app.post('/api/save-search', async (req, res) => {
    const { query } = req.body;
    if (!query || query.length < 2) return res.json({ success: false });

    try {
        const newSearch = new Search({ query });
        await newSearch.save();

        const count = await Search.countDocuments();
        if (count > 20) {
            const oldestSearches = await Search.find()
                .sort({ timestamp: 1 })
                .limit(count - 20);
            const idsToDelete = oldestSearches.map(s => s._id);
            await Search.deleteMany({ _id: { $in: idsToDelete } });
        }
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// ================================================================
// 🔐 ADMIN USER APIs
// ================================================================

app.post('/api/admin/search-analytics', async (req, res) => {
    const { adminPassword } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false });
    try {
        const history = await Search.find().sort({ timestamp: -1 }).limit(20);
        res.json({ success: true, history });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/admin/add-premium', async (req, res) => {
    const { adminPassword, userEmail, days } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false });

    const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await User.findOneAndUpdate({ email: userEmail }, { planExpiry: expiry, isBlocked: false });
    res.json({ success: true, message: "✅ Premium Added Instantly!" });
});

app.post('/api/admin/approve-user', async (req, res) => {
    const { adminPassword, userEmail, approveStatus } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false });
    try {
        await User.findOneAndUpdate({ email: userEmail }, { isPremiumApproved: approveStatus, isBlocked: false });
        res.json({ success: true, message: approveStatus ? "✅ User Premium Access ke liye Approve ho gaya!" : "❌ User ka Premium Approval hat gaya!" });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/admin/reset-user', async (req, res) => {
    const { adminPassword, userEmail } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false });
    try {
        await User.deleteOne({ email: userEmail });
        res.json({ success: true, message: "🗑️ User Deleted from Database!" });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/admin/toggle-block', async (req, res) => {
    const { adminPassword, userEmail, blockStatus } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false });
    try {
        await User.findOneAndUpdate({ email: userEmail }, { isBlocked: blockStatus });
        res.json({ success: true, message: blockStatus ? "🚫 User Blocked!" : "✅ User Unblocked!" });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/admin/all-users', async (req, res) => {
    const { adminPassword } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false });
    const users = await User.find();
    res.json({ success: true, users });
});

app.post('/api/admin/danger-master-reset', async (req, res) => {
    const { pass1, pass2, confirmText } = req.body;

    if (pass1 !== process.env.RESET_PASS1 || pass2 !== process.env.RESET_PASS2) {
        return res.status(401).json({ success: false, message: "Ghalat Passwords!" });
    }
    if (confirmText !== "DELETE ALL") {
        return res.json({ success: false, message: "Confirmation text ghalat hai!" });
    }

    try {
        await User.deleteMany({});
        res.json({ success: true, message: "💥 Pura Database saaf ho gaya hai!" });
    } catch (e) {
        res.json({ success: false, message: "Reset fail ho gaya!" });
    }
});

// ================================================================
// 📽️ MOVIE APIs
// ================================================================

app.get('/api/movies', async (req, res) => {
    try {
        const movies = await Movie.find().sort({ addedAt: -1 });
        res.json({ success: true, movies });
    } catch (e) {
        res.json({ success: false, message: "Movies fetch error" });
    }
});

app.post('/api/admin/add-movie', async (req, res) => {
    const { adminPassword, movie } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false, message: "Wrong Password!" });

    try {
        if (!movie.id) {
            const count = await Movie.countDocuments();
            movie.id = String(count + 100);
        }
        if (String(movie.id).includes('*')) {
            movie.isPremium = true;
        }
        const newMovie = new Movie(movie);
        await newMovie.save();
        res.json({ success: true, message: `✅ "${movie.name}" Database mein add ho gayi!`, movie: newMovie });
    } catch (e) {
        if (e.code === 11000) {
            res.json({ success: false, message: "❌ Yeh ID already exist karti hai! Dusri ID dalo." });
        } else {
            res.json({ success: false, message: "❌ Movie add karne mein error: " + e.message });
        }
    }
});

app.post('/api/admin/update-movie', async (req, res) => {
    const { adminPassword, movieId, updates } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false, message: "Wrong Password!" });

    try {
        if (String(updates.id || movieId).includes('*')) {
            updates.isPremium = true;
        }
        const updated = await Movie.findOneAndUpdate({ id: movieId }, updates, { new: true });
        if (!updated) return res.json({ success: false, message: "Movie nahi mili!" });
        res.json({ success: true, message: `✅ "${updated.name}" update ho gayi!`, movie: updated });
    } catch (e) {
        res.json({ success: false, message: "Update error: " + e.message });
    }
});

app.post('/api/admin/delete-movie', async (req, res) => {
    const { adminPassword, movieId } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false, message: "Wrong Password!" });

    try {
        const deleted = await Movie.findOneAndDelete({ id: movieId });
        if (!deleted) return res.json({ success: false, message: "Movie nahi mili!" });
        res.json({ success: true, message: `🗑️ "${deleted.name}" delete ho gayi!` });
    } catch (e) {
        res.json({ success: false, message: "Delete error" });
    }
});

// POST: Kisi ek part ko delete karo (index se)
app.post('/api/admin/delete-part', async (req, res) => {
    const { adminPassword, movieId, partIndex } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false, message: "Wrong Password!" });

    try {
        const movie = await Movie.findOne({ id: movieId });
        if (!movie) return res.json({ success: false, message: "Movie nahi mili!" });
        if (partIndex < 0 || partIndex >= movie.parts.length)
            return res.json({ success: false, message: "Part index galat hai!" });

        const partName = movie.parts[partIndex].title;
        movie.parts.splice(partIndex, 1);
        if (movie.parts.length === 0) movie.isSeries = false;
        await movie.save();
        res.json({ success: true, message: `🗑️ "${partName}" delete ho gaya!`, movie });
    } catch (e) {
        res.json({ success: false, message: "Delete error: " + e.message });
    }
});

app.post('/api/movie/view', async (req, res) => {
    const { movieId } = req.body;
    try {
        await Movie.findOneAndUpdate({ id: movieId }, { $inc: { views: 1 } });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/admin/import-movies', async (req, res) => {
    const { adminPassword, movies } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false, message: "Wrong Password!" });

    try {
        let added = 0, skipped = 0, errors = 0;
        for (const movie of movies) {
            if (!movie.id || !movie.name || String(movie.name).trim() === '') { skipped++; continue; }
            const movieId = String(movie.id).trim();
            const movieName = String(movie.name).trim();
            const existing = await Movie.findOne({ id: movieId });
            if (existing) { skipped++; continue; }
            const isPremium = movieId.includes('*');
            const isSeries = movie.parts && movie.parts.length > 0;
            try {
                const newMovie = new Movie({
                    id: movieId,
                    name: movieName,
                    img: movie.img || '',
                    link: movie.link || '#',
                    links: movie.links || { p480:'', p720:'', p1080:'', p4k:'' },
                    isPremium,
                    isSeries,
                    parts: movie.parts || []
                });
                await newMovie.save();
                added++;
            } catch (saveErr) {
                errors++;
                console.log('Skip movie:', movieId, saveErr.message);
            }
        }
        res.json({ success: true, message: `✅ Import complete! ${added} add hui, ${skipped} skip, ${errors} errors.` });
    } catch (e) {
        res.json({ success: false, message: "Import error: " + e.message });
    }
});

app.post('/api/admin/dashboard-stats', async (req, res) => {
    const { adminPassword } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false });

    try {
        const now = new Date();
        const totalUsers = await User.countDocuments();
        const premiumUsers = await User.countDocuments({
            $or: [
                { isForever: true },
                { isPremiumApproved: true },
                { planExpiry: { $gt: now } }
            ]
        });
        const blockedUsers = await User.countDocuments({ isBlocked: true });
        const totalMovies = await Movie.countDocuments();
        const premiumMovies = await Movie.countDocuments({ isPremium: true });
        const totalSearches = await Search.countDocuments();
        const topMovies = await Movie.find().sort({ views: -1 }).limit(5).select('name views img');
        const recentUsers = await User.find().sort({ trialStartDate: -1 }).limit(5).select('email trialStartDate');

        res.json({
            success: true,
            stats: {
                totalUsers, premiumUsers, blockedUsers,
                totalMovies, premiumMovies, totalSearches,
                topMovies, recentUsers
            }
        });
    } catch (e) {
        res.json({ success: false });
    }
});

// ================================================================
// 🌐 SOCKET LOGIC (Live Watching Count)
// ================================================================
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

// ================================================================

// ================================================================
// ⚙️ SETTINGS APIs (Ads on/off)
// ================================================================
app.get('/api/settings/ads', async (req, res) => {
    try {
        const s = await Settings.findOne({ key: 'adsEnabled' });
        res.json({ success: true, adsEnabled: s ? s.value : true });
    } catch(e) { res.json({ success: true, adsEnabled: true }); }
});

app.post('/api/admin/settings/ads', async (req, res) => {
    const { adminPassword, adsEnabled } = req.body;
    if (adminPassword !== ACTION_PASS) return res.status(401).json({ success: false, message: 'Wrong Password!' });
    try {
        await Settings.findOneAndUpdate(
            { key: 'adsEnabled' },
            { key: 'adsEnabled', value: adsEnabled },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: adsEnabled ? '✅ Ads ON kar diye!' : '🚫 Ads OFF kar diye!' });
    } catch(e) { res.json({ success: false, message: e.message }); }
});

// ================================================================
// 🎮 GAME APIs
// ================================================================
// Games bhi Movie collection mein hain — type='game' se alag hain


// 🔐 Captcha Secret
app.get('/api/cp-secret', (req, res) => {
    res.json({ s: process.env.CP_SECRET || '*@f' });
});


// 🎮 Game Link API — real link hide rehta hai frontend se
app.post('/api/game-link', async (req, res) => {
    const { email, gameId } = req.body;
    // Access check-access pe ho chuka hai — yahan sirf link return karo
    try {
        if (!email || !gameId) return res.json({ success: false, message: 'Missing data' });
        const game = await Movie.findOne({ id: gameId });
        if (!game || !game.link) return res.json({ success: false, message: 'Game nahi mila' });
        res.json({ success: true, link: game.link });
    } catch(e) {
        res.json({ success: false, message: 'Server error' });
    }
});

// 🚀 START SERVER
// ================================================================
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
