[20.11, 6/4/2026] Azka /@johenbangun: const api = await axios.get(https://savetube.me/api/fb?url=${encodeURIComponent(url)});
SyntaxError: missing ) after argument list
    at wrapSafe (node:internal/modules/cjs/loader:1637:18)
    at Module._compile (node:internal/modules/cjs/loader:1679:20)
    at Module.load (node:internal/modules/cjs/loader:1441:32)
    at Function._load (node:internal/modules/cjs/loader:1263:12)
    at TracingChannel.traceSync (node:diagnostics_channel:328:14)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:171:5)
[20.13, 6/4/2026] Azka /@johenbangun: const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const axios = require('axios');
const ytdl = require('ytdl-core');
const { tiktokdl } = require('tiktok-dl-core');
const instagramGetUrl = require('instagram-url-direct');
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

const kasarWords = ['bangsat', 'memek', 'kontol', 'anjing', 'goblok', 'tolol', 'idiot', 'ngentot', 'pepek'];
const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getAIResponse(question) {
    try {
        const result = await aiModel.generateContent(question);
        return result.response.text();
    } catch (e) { return '❌ AI error: ' + e.message; }
}

async function downloadTikTok(sock, to, url) {
    try {
        const result = await tiktokdl(url);
        const buffer = await axios.get(result.video, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buffer, caption: '✅ TikTok by XSO' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ TikTok gagal: ' + e.message }); }
}

async function downloadInstagram(sock, to, url) {
    try {
        const data = await instagramGetUrl(url);
        const mediaUrl = data.url_list[0];
        const buffer = await axios.get(mediaUrl, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buffer, caption: '✅ Instagram by XSO' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ IG gagal: ' + e.message }); }
}

async function downloadYouTube(sock, to, url, isAudio = false) {
    try {
        const stream = ytdl(url, { quality: isAudio ? 'highestaudio' : 'lowest', filter: isAudio ? 'audioonly' : 'audioandvideo' });
        const buffer = await new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', d => chunks.push(d));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
        if (isAudio) await sock.sendMessage(to, { audio: buffer, mimetype: 'audio/mpeg', fileName: 'audio.mp3' });
        else await sock.sendMessage(to, { video: buffer, caption: '✅ YouTube by XSO' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ YT gagal: ' + e.message }); }
}

async function downloadFacebook(sock, to, url) {
    try {
        const api = await axios.get(https://savetube.me/api/fb?url=${encodeURIComponent(url)});
        const videoUrl = api.data.video;
        const buffer = await axios.get(videoUrl, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buffer, caption: '✅ Facebook by XSO' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ FB gagal: ' + e.message }); }
}

async function downloadTwitter(sock, to, url) {
    try {
        const api = await axios.get(https://twitsave.com/api?url=${encodeURIComponent(url)});
        const videoUrl = api.data.video;
        const buffer = await axios.get(videoUrl, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buffer, caption: '✅ Twitter by XSO' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ Twitter gagal: ' + e.message }); }
}

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

async function wikiSearch(sock, to, query) {
    try {
        const res = await axios.get(https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)});
        if (res.data.extract) await sock.sendMessage(to, { text: 📖 *${res.data.title}*\n\n${res.data.extract.substring(0, 1500)} });
        else await sock.sendMessage(to, { text: '❌ Tidak ditemukan.' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ Wiki error' }); }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['XSO Bot', 'Chrome', '110.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('📱 Scan QR code dengan WhatsApp nomor 087777136295');
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('🔄 Reconnecting...');
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ XSO Bot online!');
            try {
                await sock.updateProfileName(BOT_NAME);
                console.log(✅ Nama profil diubah menjadi ${BOT_NAME});
            } catch (err) {}
        }
    });

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        if (action === 'add') {
            for (let user of participants) {
                await sock.sendMessage(id, { text: 👋 Selamat datang @${user.split('@')[0]}! Semoga betah., mentions: [user] });
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Filter kata kasar di grup
        if (sender.endsWith('@g.us') && text && !text.startsWith('.') && !text.startsWith('/')) {
            const lower = text.toLowerCase();
            if (kasarWords.some(k => lower.includes(k))) {
                try { await sock.sendMessage(sender, { delete: msg.key }); } catch(e) {}
                const offender = msg.key.participant || sender;
                await sock.sendMessage(sender, { text: ⚠️ @${offender.split('@')[0]} Tolong bahasa yang lebih sopan!, mentions: [offender] });
                return;
            }
        }

        // Parsing perintah
        const prefixes = ['.', '/'];
        let cmd = null;
        let args = [];
        for (let p of prefixes) {
            if (text.startsWith(p)) {
                const withoutPrefix = text.slice(p.length).trim();
                const parts = withoutPrefix.split(/\s+/);
                cmd = parts[0].toLowerCase();
                args = parts.slice(1);
                break;
            }
        }
        if (!cmd && !msg.message?.imageMessage) return;

        // Eksekusi perintah
        if (cmd === 'menu' || cmd === 'help') {
            const menu = `╔════════════════════════╗
║      XSO BOT MENU      ║
╠════════════════════════╣
║ .download [url]        ║
║ .mp3 [yt_url]          ║
║ .fb [url]              ║
║ .twt [url]             ║
║ .tanya [pertanyaan]    ║
║ .stiker (kirim foto)   ║
║ .wiki [query]          ║
║ .kick @user (admin)    ║
║ .tagall (admin)        ║
║ .bug [pesan]           ║
╚════════════════════════╝
Prefix juga bisa pakai /`;
            await sock.sendMessage(sender, { text: menu });
        }
        else if (cmd === 'download' && args[0]) {
            const url = args[0];
            if (url.includes('tiktok')) await downloadTikTok(sock, sender, url);
            else if (url.includes('instagram')) await downloadInstagram(sock, sender, url);
            else if (url.includes('youtube')) await downloadYouTube(sock, sender, url);
            else if (url.includes('facebook') || url.includes('fb.com')) await downloadFacebook(sock, sender, url);
            else if (url.includes('twitter') || url.includes('x.com')) await downloadTwitter(sock, sender, url);
            else await sock.sendMessage(sender, { text: '❌ URL tidak didukung. Support: TikTok, IG, YouTube, FB, Twitter' });
        }
        else if (cmd === 'mp3' && args[0] && (args[0].includes('youtube') || args[0].includes('youtu.be'))) {
            await downloadYouTube(sock, sender, args[0], true);
        }
        else if (cmd === 'fb' && args[0]) await downloadFacebook(sock, sender, args[0]);
        else if (cmd === 'twt' && args[0]) await downloadTwitter(sock, sender, args[0]);
        else if (cmd === 'tanya' && args.length) {
            const question = args.join(' ');
            await sock.sendMessage(sender, { text: 🤔 *Pertanyaan:* ${question}\n⏳ Sedang memproses... });
            const answer = await getAIResponse(question);
            await sock.sendMessage(sender, { text: 🤖 *Jawaban:*\n${answer} });
        }
        else if (cmd === 'stiker' && msg.message?.imageMessage) {
            const buffer = await downloadMediaMessage(msg, 'buffer', {});
            if (buffer) await createSticker(sock, sender, buffer);
            else await sock.sendMessage(sender, { text: '❌ Gagal mengambil foto' });
        }
        else if (cmd === 'wiki' && args.length) {
            await wikiSearch(sock, sender, args.join(' '));
        }
        else if (cmd === 'kick' && sender.endsWith('@g.us')) {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (mentioned && mentioned.length) {
                await sock.groupParticipantsUpdate(sender, [mentioned[0]], 'remove');
                await sock.sendMessage(sender, { text: ✅ @${mentioned[0].split('@')[0]} telah dikeluarkan, mentions: mentioned });
            } else {
                await sock.sendMessage(sender, { text: 'Mention user yang ingin dikick' });
            }
        }
        else if (cmd === 'tagall' && sender.endsWith('@g.us')) {
            const meta = await sock.groupMetadata(sender);
            const mentions = meta.participants.map(p => p.id);
            await sock.sendMessage(sender, { text: '📢 PEMBERITAHUAN 📢\n\n' + mentions.map(m => @${m.split('@')[0]}).join(' '), mentions });
        }
        else if (cmd === 'bug' && args.length) {
            const bugReport = args.join(' ');
            const reporter = sender.split('@')[0];
            await sock.sendMessage(OWNER_NUMBER, { text: 🐞 *LAPORAN BUG*\n📱 Dari: ${reporter}\n📝 Pesan: ${bugReport} });
            await sock.sendMessage(sender, { text: '✅ Laporan bug terkirim. Terima kasih!' });
        }
        else {
            // Perintah tidak dikenal: diam saja
        }
    });
}

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('XSO Bot OK'));
app.get('/health', (req, res) => res.send('OK'));
app.listen(PORT, () => console.log(HTTP server running on port ${PORT}));

startBot().catch(console.error);
