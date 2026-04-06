const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const express = require('express');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyCqvV_RSCsXXRd8zzmNJlHR6fFfeMjn6Nw');
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
ffmpeg.setFfmpegPath(ffmpegPath);

const BOT_NAME = '@johenbangun';
const OWNER_NUMBER = '6287777136295@s.whatsapp.net';
let groupSettings = {};
if (fs.existsSync('group_settings.json')) groupSettings = JSON.parse(fs.readFileSync('group_settings.json'));

const kasarWords = ['bangsat', 'memek', 'kontol', 'anjing', 'goblok', 'tolol', 'idiot'];

async function getAIResponse(q) {
    try { const r = await aiModel.generateContent(q); return r.response.text(); } catch(e) { return '❌ AI error'; }
}

// ========== FITUR BARU PENGGANTI DOWNLOADER ==========
async function randomQuote(sock, to) {
    try {
        const res = await axios.get('https://api.quotable.io/random');
        await sock.sendMessage(to, { text: 📝 *Kata Mutiara*\n\n"${res.data.content}"\n— ${res.data.author} });
    } catch(e) { await sock.sendMessage(to, { text: '❌ Gagal ambil quote' }); }
}

async function randomFact(sock, to) {
    try {
        const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
        await sock.sendMessage(to, { text: 🔍 *Fakta Unik*\n\n${res.data.text} });
    } catch(e) { await sock.sendMessage(to, { text: '❌ Gagal ambil fakta' }); }
}

async function randomPantun(sock, to) {
    const pantuns = [
        "Pergi ke pasar membeli talas\nPulangnya mampir ke warung kopi\nKalau kamu suka baca pantun ini\nBalaslah dengan senyum manis di hati",
        "Buah mangga buah kedondong\nEnak dimakan saat siang hari\nJangan suka berbicara panjang lebar\nKalau tidak ingin dicap yang menyebalkan",
        "Jalan-jalan ke kota Blitar\nJangan lupa beli oleh-oleh\nKalau kamu ingin jadi pintar\nBelajarlah tanpa pernah lelah"
    ];
    const random = pantuns[Math.floor(Math.random() * pantuns.length)];
    await sock.sendMessage(to, { text: 🎭 *Pantun*\n\n${random} });
}

async function randomMeme(sock, to) {
    try {
        const res = await axios.get('https://meme-api.com/gimme');
        const meme = res.data;
        const caption = 🖼️ *${meme.title}*\n👍 ${meme.ups} | 💬 ${meme.comments || 0};
        const buffer = await axios.get(meme.url, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { image: buffer, caption });
    } catch(e) { await sock.sendMessage(to, { text: '❌ Gagal ambil meme' }); }
}

async function simiChat(sock, to, msg) {
    try {
        const res = await axios.get(https://api.simsimi.vn/v1/simtalk?text=${encodeURIComponent(msg)}&lc=id);
        if (res.data.message) await sock.sendMessage(to, { text: 🤖 *Simi:* ${res.data.message} });
        else await sock.sendMessage(to, { text: '🤖 Simi: Maaf, saya tidak mengerti' });
    } catch(e) { await sock.sendMessage(to, { text: '❌ Simi error' }); }
}

// ========== STIKER (tetap ada) ==========
async function createSticker(sock, to, buffer) {
    const input = './temp.jpg';
    const output = './sticker.webp';
    fs.writeFileSync(input, buffer);
    await new Promise((resolve, reject) => {
        ffmpeg(input)
            .outputOptions(['-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512', '-vcodec', 'libwebp', '-lossless', '1'])
            .save(output)
            .on('end', resolve)
            .on('error', reject);
    });
    await sock.sendMessage(to, { sticker: fs.readFileSync(output) });
    fs.unlinkSync(input); fs.unlinkSync(output);
}

// ========== WIKI (tetap ada) ==========
async function wikiSearch(sock, to, query) {
    try {
        const res = await axios.get(https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)});
        if (res.data.extract) await sock.sendMessage(to, { text: 📖 *${res.data.title}*\n\n${res.data.extract.substring(0, 1500)} });
        else await sock.sendMessage(to, { text: '❌ Tidak ditemukan' });
    } catch(e) { await sock.sendMessage(to, { text: '❌ Wiki error' }); }
}

// ========== MAIN BOT ==========
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({ auth: state, printQRInTerminal: true, browser: ['XSO Bot', 'Chrome', '110'] });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) { qrcode.generate(qr, { small: true }); console.log('📱 Scan QR dengan nomor 087777136295'); }
        if (connection === 'open') {
            console.log('✅ Bot online');
            try { await sock.updateProfileName(BOT_NAME); } catch(e) {}
        } else if (connection === 'close') startBot();
    });

    sock.ev.on('group-participants.update', async (update) => {
        if (update.action === 'add') {
            for (let user of update.participants) {
                await sock.sendMessage(update.id, { text: 👋 Selamat datang @${user.split('@')[0]}! Semoga betah., mentions: [user] });
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Filter kasar di grup
        if (sender.endsWith('@g.us') && text && !text.startsWith('.') && !text.startsWith('/')) {
            const lower = text.toLowerCase();
            if (kasarWords.some(k => lower.includes(k))) {
                try { await sock.sendMessage(sender, { delete: msg.key }); } catch(e) {}
                const offender = msg.key.participant || sender;
                await sock.sendMessage(sender, { text: ⚠️ @${offender.split('@')[0]} Tolong lebih sopan!, mentions: [offender] });
                return;
            }
        }

        let cmd = null, args = [];
        for (let p of ['.', '/']) {
            if (text.startsWith(p)) {
                const parts = text.slice(p.length).trim().split(/\s+/);
                cmd = parts[0].toLowerCase();
                args = parts.slice(1);
                break;
            }
        }
        if (!cmd && !msg.message?.imageMessage) return;

        // MENU
        if (cmd === 'menu' || cmd === 'help') {
            const menu = `╔════════════════════════╗
║      XSO BOT MENU      ║
╠════════════════════════╣
║ .quote - Kata mutiara  ║
║ .fakta - Fakta unik    ║
║ .pantun - Pantun acak  ║
║ .meme - Meme random    ║
║ .simi [teks] - Chat AI ║
║ .tanya [q] - Gemini AI ║
║ .stiker (kirim foto)   ║
║ .wiki [query]          ║
║ .kick @user (admin)    ║
║ .tagall (admin)        ║
║ .bug [pesan]           ║
╚════════════════════════╝
Prefix juga bisa pakai /`;
            await sock.sendMessage(sender, { text: menu });
        }
        // FITUR BARU
        else if (cmd === 'quote') await randomQuote(sock, sender);
        else if (cmd === 'fakta') await randomFact(sock, sender);
        else if (cmd === 'pantun') await randomPantun(sock, sender);
        else if (cmd === 'meme') await randomMeme(sock, sender);
        else if (cmd === 'simi' && args.length) await simiChat(sock, sender, args.join(' '));
        // AI TANYA
        else if (cmd === 'tanya' && args.length) {
            const question = args.join(' ');
            await sock.sendMessage(sender, { text: 🤔 *${question}*\n⏳ Memproses... });
            const answer = await getAIResponse(question);
            await sock.sendMessage(sender, { text: 🤖 *Jawaban:*\n${answer} });
        }
        // STIKER
        else if (cmd === 'stiker' && msg.message?.imageMessage) {
            const buf = await downloadMediaMessage(msg, 'buffer', {});
            if (buf) await createSticker(sock, sender, buf);
            else await sock.sendMessage(sender, { text: '❌ Gagal mengambil foto' });
        }
        // WIKI
        else if (cmd === 'wiki' && args.length) await wikiSearch(sock, sender, args.join(' '));
        // ADMIN GRUP
        else if (cmd === 'kick' && sender.endsWith('@g.us')) {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (mentioned && mentioned.length) {
                await sock.groupParticipantsUpdate(sender, [mentioned[0]], 'remove');
                await sock.sendMessage(sender, { text: ✅ @${mentioned[0].split('@')[0]} dikeluarkan, mentions: mentioned });
            } else await sock.sendMessage(sender, { text: 'Mention user yang ingin dikick' });
        }
        else if (cmd === 'tagall' && sender.endsWith('@g.us')) {
            const meta = await sock.groupMetadata(sender);
            const mentions = meta.participants.map(p => p.id);
            await sock.sendMessage(sender, { text: '📢 PEMBERITAHUAN 📢\n\n' + mentions.map(m => @${m.split('@')[0]}).join(' '), mentions });
        }
        // LAPOR BUG
        else if (cmd === 'bug' && args.length) {
            await sock.sendMessage(OWNER_NUMBER, { text: 🐞 Laporan dari ${sender.split('@')[0]}: ${args.join(' ')} });
            await sock.sendMessage(sender, { text: '✅ Laporan terkirim' });
        }
        // PERINTAH TIDAK DIKENAL (DIAM)
    });
}

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('OK'));
app.listen(PORT, () => console.log(HTTP server on ${PORT}));

startBot().catch(console.error);
