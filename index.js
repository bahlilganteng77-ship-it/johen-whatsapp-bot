const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
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

const kasarWords = ['bangsat', 'memek', 'kontol', 'anjing', 'goblok', 'tolol', 'idiot'];
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getAIResponse(q) {
    try { const r = await aiModel.generateContent(q); return r.response.text(); } catch(e) { return '❌ AI error'; }
}
async function downloadTikTok(sock, to, url) {
    try {
        const res = await tiktokdl(url);
        const buf = await axios.get(res.video, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buf, caption: '✅ TikTok' });
    } catch(e) { await sock.sendMessage(to, { text: '❌ TikTok gagal' }); }
}
async function downloadInstagram(sock, to, url) {
    try {
        const data = await instagramGetUrl(url);
        const buf = await axios.get(data.url_list[0], { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buf, caption: '✅ Instagram' });
    } catch(e) { await sock.sendMessage(to, { text: '❌ IG gagal' }); }
}
async function downloadYouTube(sock, to, url, isAudio = false) {
    try {
        const stream = ytdl(url, { quality: isAudio ? 'highestaudio' : 'lowest', filter: isAudio ? 'audioonly' : 'audioandvideo' });
        const buf = await new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', d => chunks.push(d));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
        if (isAudio) await sock.sendMessage(to, { audio: buf, mimetype: 'audio/mpeg', fileName: 'audio.mp3' });
        else await sock.sendMessage(to, { video: buf, caption: '✅ YouTube' });
    } catch(e) { await sock.sendMessage(to, { text: '❌ YT gagal' }); }
}
async function downloadFacebook(sock, to, url) {
    try {
        const api = await axios.get(https://savetube.me/api/fb?url=${encodeURIComponent(url)});
        const buf = await axios.get(api.data.video, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buf, caption: '✅ Facebook' });
    } catch(e) { await sock.sendMessage(to, { text: '❌ FB gagal' }); }
}
async function downloadTwitter(sock, to, url) {
    try {
        const api = await axios.get(https://twitsave.com/api?url=${encodeURIComponent(url)});
        const buf = await axios.get(api.data.video, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buf, caption: '✅ Twitter' });
    } catch(e) { await sock.sendMessage(to, { text: '❌ Twitter gagal' }); }
}
async function createSticker(sock, to, buffer) {
    const input = './temp.jpg';
    const output = './sticker.webp';
    fs.writeFileSync(input, buffer);
    await new Promise((resolve, reject) => {
        ffmpeg(input).outputOptions(['-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512', '-vcodec', 'libwebp', '-lossless', '1']).save(output).on('end', resolve).on('error', reject);
    });
    await sock.sendMessage(to, { sticker: fs.readFileSync(output) });
    fs.unlinkSync(input); fs.unlinkSync(output);
}
async function wikiSearch(sock, to, query) {
    try {
        const res = await axios.get(https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)});
        if (res.data.extract) await sock.sendMessage(to, { text: 📖 ${res.data.title}\n${res.data.extract.substring(0, 1500)} });
    } catch(e) { await sock.sendMessage(to, { text: '❌ Wiki error' }); }
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({ auth: state, printQRInTerminal: true, browser: ['XSO Bot', 'Chrome', '110'] });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;
        if (qr) { qrcode.generate(qr, { small: true }); console.log('Scan QR dengan nomor 087777136295'); }
        if (connection === 'open') {
            console.log('✅ Bot online');
            try { await sock.updateProfileName(BOT_NAME); } catch(e) {}
        } else if (connection === 'close') startBot();
    });
    sock.ev.on('group-participants.update', async (update) => {
        if (update.action === 'add') {
            for (let user of update.participants) await sock.sendMessage(update.id, { text: 👋 Selamat datang @${user.split('@')[0]}, mentions: [user] });
        }
    });
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (sender.endsWith('@g.us') && text && !text.startsWith('.') && !text.startsWith('/')) {
            const lower = text.toLowerCase();
            if (kasarWords.some(k => lower.includes(k))) {
                try { await sock.sendMessage(sender, { delete: msg.key }); } catch(e) {}
                const offender = msg.key.participant || sender;
                await sock.sendMessage(sender, { text: ⚠️ @${offender.split('@')[0]} Tolong lebih sopan, mentions: [offender] });
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
        if (cmd === 'menu' || cmd === 'help') {
            await sock.sendMessage(sender, { text: '╔════════════════╗\n║   XSO BOT MENU  ║\n╠════════════════╣\n║ .download url   ║\n║ .mp3 yt_url     ║\n║ .fb url         ║\n║ .twt url        ║\n║ .tanya text     ║\n║ .stiker (foto)  ║\n║ .wiki query     ║\n║ .kick @user     ║\n║ .tagall         ║\n║ .bug pesan      ║\n╚════════════════╝' });
        }
        else if (cmd === 'download' && args[0]) {
            const url = args[0];
            if (url.includes('tiktok')) await downloadTikTok(sock, sender, url);
            else if (url.includes('instagram')) await downloadInstagram(sock, sender, url);
            else if (url.includes('youtube')) await downloadYouTube(sock, sender, url);
            else if (url.includes('facebook') || url.includes('fb.com')) await downloadFacebook(sock, sender, url);
            else if (url.includes('twitter') || url.includes('x.com')) await downloadTwitter(sock, sender, url);
            else await sock.sendMessage(sender, { text: '❌ URL tidak didukung' });
        }
        else if (cmd === 'mp3' && args[0] && (args[0].includes('youtube') || args[0].includes('youtu.be'))) await downloadYouTube(sock, sender, args[0], true);
        else if (cmd === 'fb' && args[0]) await downloadFacebook(sock, sender, args[0]);
        else if (cmd === 'twt' && args[0]) await downloadTwitter(sock, sender, args[0]);
        else if (cmd === 'tanya' && args.length) {
            await sock.sendMessage(sender, { text: 🤔 ${args.join(' ')}\n⏳ Memproses... });
            const ans = await getAIResponse(args.join(' '));
            await sock.sendMessage(sender, { text: 🤖 ${ans} });
        }
        else if (cmd === 'stiker' && msg.message?.imageMessage) {
            const buf = await downloadMediaMessage(msg, 'buffer', {});
            if (buf) await createSticker(sock, sender, buf);
        }
        else if (cmd === 'wiki' && args.length) await wikiSearch(sock, sender, args.join(' '));
        else if (cmd === 'kick' && sender.endsWith('@g.us')) {
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (mentioned && mentioned.length) {
                await sock.groupParticipantsUpdate(sender, [mentioned[0]], 'remove');
                await sock.sendMessage(sender, { text: ✅ @${mentioned[0].split('@')[0]} dikeluarkan, mentions: mentioned });
            }
        }
        else if (cmd === 'tagall' && sender.endsWith('@g.us')) {
            const meta = await sock.groupMetadata(sender);
            const mentions = meta.participants.map(p => p.id);
            await sock.sendMessage(sender, { text: '📢 @all', mentions });
        }
        else if (cmd === 'bug' && args.length) {
            await sock.sendMessage(OWNER_NUMBER, { text: 🐞 Laporan dari ${sender.split('@')[0]}: ${args.join(' ')} });
            await sock.sendMessage(sender, { text: '✅ Laporan terkirim' });
        }
    });
}

const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('OK'));
app.listen(PORT, () => console.log(HTTP server on ${PORT}));
startBot().catch(console.error);
