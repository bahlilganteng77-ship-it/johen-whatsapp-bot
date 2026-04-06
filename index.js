javascript
// ======================== XSO BOT – FINAL EDITION ========================
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ytdl = require('ytdl-core');
const { tiktokdl } = require('tikdownloader');
const instagramGetUrl = require('instagram-url-direct');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const net = require('net');
const whois = require('whois');
const dns = require('dns').promises;
const express = require('express');
const qrcode = require('qrcode-terminal');

// ======================== KONFIGURASI XSO ========================
const BOT_NUMBER = '6287777136295';        // Nomor bot (087777136295)
const OWNER_NUMBER = BOT_NUMBER;           // Owner untuk laporan bug
const BOT_NAME = '@johenbangun';           // Nama profil bot
const GEMINI_API_KEY = 'AIzaSyCqvV_RSCsXXRd8zzmNJlHR6fFfeMjn6Nw';

// Inisialisasi AI Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
console.log('✅ Gemini AI siap');

ffmpeg.setFfmpegPath(ffmpegPath);

// ======================== GLOBAL SETTINGS ========================
let groupSettings = {};
if (fs.existsSync('group_settings.json')) {
    groupSettings = JSON.parse(fs.readFileSync('group_settings.json'));
}

const kasarWords = ['bangsat', 'memek', 'kontol', 'anjing', 'goblok', 'tolol', 'idiot', 'ngentot', 'pepek', 'jembut', 'pantek', 'babi', 'cok', 'asu', 'sialan', 'brengsek', 'kampret', 'kunyuk', 'setan'];
const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|bit\.ly\/[^\s]+)/gi;

// ======================== HELPER FUNCTIONS ========================
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

async function getMediaBuffer(msg) {
    if (msg.message?.imageMessage) return await downloadMediaMessage(msg, 'buffer', {});
    if (msg.message?.videoMessage) return await downloadMediaMessage(msg, 'buffer', {});
    return null;
}

async function createStickerFromBuffer(buffer, sock, to) {
    const inputPath = path.join(__dirname, 'temp_in.jpg');
    const outputPath = path.join(__dirname, 'sticker_out.webp');
    fs.writeFileSync(inputPath, buffer);
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions(['-vf', 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512', '-vcodec', 'libwebp', '-lossless', '1', '-loop', '0', '-preset', 'default', '-an', '-vsync', '0'])
            .save(outputPath)
            .on('end', async () => {
                const stickerBuffer = fs.readFileSync(outputPath);
                await sock.sendMessage(to, { sticker: stickerBuffer });
                fs.unlinkSync(inputPath); fs.unlinkSync(outputPath);
                resolve();
            }).on('error', reject);
    });
}

// ======================== AI RESPONSE ========================
async function getAIResponse(question) {
    try {
        const result = await aiModel.generateContent(question);
        return result.response.text();
    } catch (error) {
        console.error('AI Error:', error);
        return '❌ Maaf, terjadi kesalahan. Coba lagi nanti.';
    }
}

// ======================== DOWNLOADER FUNCTIONS ========================
async function downloadTikTok(sock, to, url) {
    try {
        const result = await tiktokdl(url);
        const videoUrl = result.video.no_watermark;
        const buffer = await axios.get(videoUrl, { responseType: 'arraybuffer' }).then(r => r.data);
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

async function downloadYouTubeVideo(sock, to, url) {
    try {
        const stream = ytdl(url, { quality: 'lowest', filter: 'audioandvideo' });
        const buffer = await streamToBuffer(stream);
        await sock.sendMessage(to, { video: buffer, caption: '✅ YouTube Video by XSO' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ YT Video gagal: ' + e.message }); }
}

async function downloadYouTubeAudio(sock, to, url) {
    try {
        const stream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
        const buffer = await streamToBuffer(stream);
        await sock.sendMessage(to, { audio: buffer, mimetype: 'audio/mpeg', fileName: 'audio.mp3' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ YT Audio gagal: ' + e.message }); }
}

async function downloadFacebook(sock, to, url) {
    try {
        const api = await axios.get(`https://savetube.me/api/fb?url=${encodeURIComponent(url)}`);
        const videoUrl = api.data.video;
        const buffer = await axios.get(videoUrl, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buffer, caption: '✅ Facebook by XSO' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ FB gagal: ' + e.message }); }
}

async function downloadTwitter(sock, to, url) {
    try {
        const api = await axios.get(`https://twitsave.com/api?url=${encodeURIComponent(url)}`);
        const videoUrl = api.data.video;
        const buffer = await axios.get(videoUrl, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buffer, caption: '✅ Twitter by XSO' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ Twitter gagal: ' + e.message }); }
}

async function downloadPinterest(sock, to, url) {
    try {
        const api = await axios.get(`https://pinterestdownloader.io/api?url=${encodeURIComponent(url)}`);
        const videoUrl = api.data.video;
        const buffer = await axios.get(videoUrl, { responseType: 'arraybuffer' }).then(r => r.data);
        await sock.sendMessage(to, { video: buffer, caption: '✅ Pinterest by XSO' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ Pinterest gagal: ' + e.message }); }
}

// ======================== FITUR UMUM ========================
async function wikiSearch(sock, to, query) {
    try {
        const res = await axios.get(`https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        if (res.data.extract) await sock.sendMessage(to, { text: `📖 *${res.data.title}*\n\n${res.data.extract}` });
        else await sock.sendMessage(to, { text: '❌ Tidak ditemukan.' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ Wiki error: ' + e.message }); }
}

async function weather(sock, to, city) {
    try {
        const API_KEY = process.env.OPENWEATHER_API_KEY || 'YOUR_API_KEY';
        const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric&lang=id`);
        const w = res.data;
        await sock.sendMessage(to, { text: `🌤️ Cuaca di ${w.name}\n🌡️ Suhu: ${w.main.temp}°C\n💧 Kelembapan: ${w.main.humidity}%\n🌬️ Angin: ${w.wind.speed} m/s` });
    } catch (e) { await sock.sendMessage(to, { text: '❌ Cuaca gagal. Pastikan API key valid.' }); }
}

async function lyrics(sock, to, song) {
    try {
        const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(song)}`);
        if (res.data.lyrics) await sock.sendMessage(to, { text: `🎵 *${song}*\n\n${res.data.lyrics.substring(0, 4000)}` });
        else await sock.sendMessage(to, { text: '❌ Lirik tidak ditemukan.' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ Lirik error: ' + e.message }); }
}

async function portScan(sock, to, ip) {
    const commonPorts = [21,22,23,25,53,80,110,135,139,143,443,445,993,995,1433,3306,3389,5432,5900,8080,8443];
    let open = [];
    for (let port of commonPorts) {
        await new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(1500);
            socket.once('connect', () => { open.push(port); socket.destroy(); resolve(); });
            socket.once('error', () => { socket.destroy(); resolve(); });
            socket.once('timeout', () => { socket.destroy(); resolve(); });
            socket.connect(port, ip);
        });
    }
    await sock.sendMessage(to, { text: `🔍 Port terbuka di ${ip}:\n${open.join(', ') || 'Tidak ada'}` });
}

async function whoisLookup(sock, to, domain) {
    whois.lookup(domain, (err, data) => {
        if (err) return sock.sendMessage(to, { text: '❌ Whois gagal: ' + err.message });
        const short = data.split('\n').slice(0, 20).join('\n');
        sock.sendMessage(to, { text: `📄 Whois ${domain}:\n${short}` });
    });
}

async function getIP(domain) {
    const ips = await dns.resolve(domain);
    return ips.join(', ');
}

async function spamMessage(sock, to, targetNumber, message, count) {
    const jid = targetNumber.includes('@s.whatsapp.net') ? targetNumber : targetNumber + '@s.whatsapp.net';
    for (let i = 0; i < count; i++) {
        await sock.sendMessage(jid, { text: message });
        await delay(1000);
    }
    await sock.sendMessage(to, { text: `✅ Spam terkirim ${count}x ke ${targetNumber}` });
}

async function generateQR(sock, to, data) {
    const qrBuffer = await axios.get(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`, { responseType: 'arraybuffer' });
    await sock.sendMessage(to, { image: qrBuffer.data, caption: '📱 QR Code siap' });
}

async function shortLink(sock, to, url) {
    const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
    await sock.sendMessage(to, { text: `🔗 Short link: ${res.data}` });
}

async function textToSpeech(sock, to, text) {
    try {
        const API_KEY = process.env.VOICERSS_API_KEY || 'YOUR_API_KEY';
        const response = await axios.get(`https://api.voicerss.org/?key=${API_KEY}&hl=id&src=${encodeURIComponent(text)}`, { responseType: 'arraybuffer' });
        await sock.sendMessage(to, { audio: response.data, mimetype: 'audio/mpeg' });
    } catch (e) { await sock.sendMessage(to, { text: '❌ TTS gagal.' }); }
}

// ======================== MANAJEMEN GRUP ========================
async function promoteMember(sock, groupJid, userJid) {
    await sock.groupParticipantsUpdate(groupJid, [userJid], 'promote');
}
async function demoteMember(sock, groupJid, userJid) {
    await sock.groupParticipantsUpdate(groupJid, [userJid], 'demote');
}
async function tagAll(sock, groupJid, participants) {
    let mentions = participants.map(p => p.id);
    let message = '📢 *XSO BOT* 📢\n\n' + mentions.map(m => `@${m.split('@')[0]}`).join(' ');
    await sock.sendMessage(groupJid, { text: message, mentions });
}
async function leaveGroup(sock, groupJid) {
    await sock.groupLeave(groupJid);
}
async function deleteMessage(sock, msg) {
    await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
}
function getMentionedUser(msg) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    return mentioned ? mentioned[0] : null;
}

// ======================== COMMAND PARSER ========================
function getCommandAndArgs(text, prefixes) {
    for (let p of prefixes) {
        if (text.startsWith(p)) {
            const withoutPrefix = text.slice(p.length).trim();
            const parts = withoutPrefix.split(/\s+/);
            const cmd = parts[0].toLowerCase();
            const args = parts.slice(1);
            return { cmd, args, prefix: p };
        }
    }
    return null;
}

// ======================== MAIN BOT ========================
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['XSO Bot (Multi-Device)', 'Chrome', '110.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('📱 Scan QR code di atas dengan WhatsApp nomor:', BOT_NUMBER);
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('🔄 Koneksi putus, mencoba reconnect...');
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ XSO Bot online! Nomor:', BOT_NUMBER);
            // Ubah nama profil bot menjadi @johenbangun
            try {
                await sock.updateProfileName(BOT_NAME);
                console.log(`✅ Nama profil berhasil diubah menjadi ${BOT_NAME}`);
            } catch (err) {
                console.log('❌ Gagal ubah nama profil:', err);
            }
        }
    });

    // Event anggota grup join/leave
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        const setting = groupSettings[id] || {};
        if (action === 'add') {
            const welcomeMsg = setting.welcome || `👋 Selamat datang @{user}!\nSelamat bergabung semoga betah. 🎉`;
            for (let user of participants) {
                const finalMsg = welcomeMsg.replace('{user}', `@${user.split('@')[0]}`);
                await sock.sendMessage(id, { text: finalMsg, mentions: [user] });
            }
        } else if (action === 'remove') {
            const goodbyeMsg = setting.goodbye || `👋 Selamat tinggal @{user}, semoga sukses.`;
            for (let user of participants) {
                const finalMsg = goodbyeMsg.replace('{user}', `@${user.split('@')[0]}`);
                await sock.sendMessage(id, { text: finalMsg, mentions: [user] });
            }
        } else if (action === 'promote') {
            for (let user of participants) {
                await sock.sendMessage(id, { text: `👑 @${user.split('@')[0]} sekarang admin!`, mentions: [user] });
            }
        } else if (action === 'demote') {
            for (let user of participants) {
                await sock.sendMessage(id, { text: `😞 @${user.split('@')[0]} bukan lagi admin.`, mentions: [user] });
            }
        }
    });

    // Event pesan masuk
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Filter kata kasar & link di grup
        if (sender.endsWith('@g.us') && text && !text.startsWith('.') && !text.startsWith('/')) {
            let isKasar = false;
            const lowerText = text.toLowerCase();
            for (let kata of kasarWords) {
                if (lowerText.includes(kata)) {
                    isKasar = true;
                    break;
                }
            }
            if (isKasar) {
                try { await sock.sendMessage(sender, { delete: msg.key }); } catch(e) {}
                const offender = msg.key.participant || sender;
                await sock.sendMessage(sender, { text: `⚠️ @${offender.split('@')[0]} Tolong bahasa nya lebih sopan!`, mentions: [offender] });
                return;
            }
            const setting = groupSettings[sender] || {};
            if (setting.antilink !== false && linkRegex.test(text)) {
                try { await sock.sendMessage(sender, { delete: msg.key }); } catch(e) {}
                await sock.sendMessage(sender, { text: '🚫 Link tidak diperbolehkan di grup ini!' });
                return;
            }
        }

        // Proses perintah
        const prefixes = ['.', '/'];
        const parsed = getCommandAndArgs(text, prefixes);
        if (!parsed && !msg.message?.imageMessage) return;

        if (parsed) {
            const { cmd, args } = parsed;

            // DOWNLOADER
            if (cmd === 'download' && args[0]) {
                const url = args[0];
                if (url.includes('tiktok')) await downloadTikTok(sock, sender, url);
                else if (url.includes('instagram')) await downloadInstagram(sock, sender, url);
                else if (url.includes('youtube')) await downloadYouTubeVideo(sock, sender, url);
                else if (url.includes('facebook') || url.includes('fb.com')) await downloadFacebook(sock, sender, url);
                else if (url.includes('twitter') || url.includes('x.com')) await downloadTwitter(sock, sender, url);
                else if (url.includes('pinterest')) await downloadPinterest(sock, sender, url);
                else await sock.sendMessage(sender, { text: '❌ URL tidak didukung' });
            }
            else if (cmd === 'mp3' && args[0]) await downloadYouTubeAudio(sock, sender, args[0]);
            else if (cmd === 'fb' && args[0]) await downloadFacebook(sock, sender, args[0]);
            else if (cmd === 'twt' && args[0]) await downloadTwitter(sock, sender, args[0]);
            else if (cmd === 'pin' && args[0]) await downloadPinterest(sock, sender, args[0]);
            else if (cmd === 'wiki' && args[0]) await wikiSearch(sock, sender, args.join(' '));
            else if (cmd === 'cuaca' && args[0]) await weather(sock, sender, args.join(' '));
            else if (cmd === 'lirik' && args[0]) await lyrics(sock, sender, args.join(' '));
            else if (cmd === 'portscan' && args[0]) await portScan(sock, sender, args[0]);
            else if (cmd === 'whois' && args[0]) await whoisLookup(sock, sender, args[0]);
            else if (cmd === 'ip' && args[0]) {
                const ip = await getIP(args[0]);
                await sock.sendMessage(sender, { text: `🌐 IP dari ${args[0]}: ${ip}` });
            }
            else if (cmd === 'spam' && args.length >= 3) {
                const target = args[0];
                const count = parseInt(args[args.length-1]);
                const messageText = args.slice(1, -1).join(' ');
                await spamMessage(sock, sender, target, messageText, count);
            }
            else if (cmd === 'qr' && args[0]) await generateQR(sock, sender, args[0]);
            else if (cmd === 'short' && args[0]) await shortLink(sock, sender, args[0]);
            else if (cmd === 'tts' && args[0]) await textToSpeech(sock, sender, args.join(' '));
            else if (cmd === 'stiker' && msg.message?.imageMessage) {
                const buffer = await getMediaBuffer(msg);
                if (buffer) await createStickerFromBuffer(buffer, sock, sender);
                else await sock.sendMessage(sender, { text: '❌ Kirim foto dengan caption .stiker' });
            }
            else if (cmd === 'tanya' && args.length) {
                const question = args.join(' ');
                await sock.sendMessage(sender, { text: `🤔 *Pertanyaan:* ${question}\n\n⏳ _Sedang memproses..._` });
                const answer = await getAIResponse(question);
                await sock.sendMessage(sender, { text: `🤖 *Jawaban AI:*\n\n${answer}` });
            }
            // KICK MULTI (hanya admin/owner)
            else if (cmd === 'kick' && sender.endsWith('@g.us')) {
                const groupMetadata = await sock.groupMetadata(sender);
                const senderId = msg.key.participant || sender;
                const isAdmin = groupMetadata.participants.find(p => p.id === senderId)?.admin === 'admin' || 
                                groupMetadata.participants.find(p => p.id === senderId)?.admin === 'superadmin';
                const ownerJid = OWNER_NUMBER + '@s.whatsapp.net';
                const isOwner = senderId === ownerJid;
                if (!isAdmin && !isOwner) {
                    await sock.sendMessage(sender, { text: '❌ Hanya admin grup atau owner bot yang bisa menggunakan perintah ini!' });
                    return;
                }
                let targets = [];
                const mentionedUsers = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
                if (mentionedUsers.length > 0) {
                    targets = mentionedUsers;
                } else if (args.length > 0) {
                    for (let arg of args) {
                        let number = arg.replace(/[^0-9]/g, '');
                        if (number.startsWith('0')) number = '62' + number.slice(1);
                        if (!number.endsWith('@s.whatsapp.net')) number += '@s.whatsapp.net';
                        targets.push(number);
                    }
                } else {
                    await sock.sendMessage(sender, { text: '⚠️ Gunakan: .kick @user1 @user2 atau .kick 628123456789' });
                    return;
                }
                targets = targets.filter(target => target !== senderId && target !== sock.user.id);
                if (targets.length === 0) {
                    await sock.sendMessage(sender, { text: '❌ Tidak ada target valid.' });
                    return;
                }
                let kicked = [], failed = [];
                for (let target of targets) {
                    try {
                        await sock.groupParticipantsUpdate(sender, [target], 'remove');
                        kicked.push(target);
                        await delay(1000);
                    } catch (err) { failed.push(target); }
                }
                let reply = `✅ Berhasil mengeluarkan ${kicked.length} anggota.\n`;
                if (kicked.length) reply += `🔹 Keluar: ${kicked.map(j => `@${j.split('@')[0]}`).join(', ')}\n`;
                if (failed.length) reply += `❌ Gagal: ${failed.map(j => `@${j.split('@')[0]}`).join(', ')}`;
                await sock.sendMessage(sender, { text: reply, mentions: [...kicked, ...failed] });
            }
            else if (cmd === 'promote' && sender.endsWith('@g.us')) {
                const user = getMentionedUser(msg);
                if (user) await promoteMember(sock, sender, user);
            }
            else if (cmd === 'demote' && sender.endsWith('@g.us')) {
                const user = getMentionedUser(msg);
                if (user) await demoteMember(sock, sender, user);
            }
            else if (cmd === 'tagall' && sender.endsWith('@g.us')) {
                const groupMeta = await sock.groupMetadata(sender);
                await tagAll(sock, sender, groupMeta.participants);
            }
            else if (cmd === 'leave' && sender.endsWith('@g.us')) {
                await leaveGroup(sock, sender);
            }
            else if (cmd === 'delete') {
                if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
                    await deleteMessage(sock, msg);
                }
            }
            else if (cmd === 'setwelcome' && args.length) {
                const newWelcome = args.join(' ');
                if (!groupSettings[sender]) groupSettings[sender] = {};
                groupSettings[sender].welcome = newWelcome;
                fs.writeFileSync('group_settings.json', JSON.stringify(groupSettings, null, 2));
                await sock.sendMessage(sender, { text: `✅ Pesan sambutan diupdate:\n${newWelcome}` });
            }
            else if (cmd === 'setgoodbye' && args.length) {
                const newGoodbye = args.join(' ');
                if (!groupSettings[sender]) groupSettings[sender] = {};
                groupSettings[sender].goodbye = newGoodbye;
                fs.writeFileSync('group_settings.json', JSON.stringify(groupSettings, null, 2));
                await sock.sendMessage(sender, { text: `✅ Pesan perpisahan diupdate:\n${newGoodbye}` });
            }
            else if (cmd === 'antilink') {
                const status = args[0] === 'on' ? true : (args[0] === 'off' ? false : null);
                if (status !== null) {
                    if (!groupSettings[sender]) groupSettings[sender] = {};
                    groupSettings[sender].antilink = status;
                    fs.writeFileSync('group_settings.json', JSON.stringify(groupSettings, null, 2));
                    await sock.sendMessage(sender, { text: `✅ Anti-link ${status ? 'AKTIF' : 'NONAKTIF'}` });
                } else { await sock.sendMessage(sender, { text: 'Gunakan .antilink on/off' }); }
            }
            else if (cmd === 'antikasar') {
                const status = args[0] === 'on' ? true : (args[0] === 'off' ? false : null);
                if (status !== null) {
                    if (!groupSettings[sender]) groupSettings[sender] = {};
                    groupSettings[sender].antikasar = status;
                    fs.writeFileSync('group_settings.json', JSON.stringify(groupSettings, null, 2));
                    await sock.sendMessage(sender, { text: `✅ Anti-kata kasar ${status ? 'AKTIF' : 'NONAKTIF'}` });
                } else { await sock.sendMessage(sender, { text: 'Gunakan .antikasar on/off' }); }
            }
            else if (cmd === 'adminlist' && sender.endsWith('@g.us')) {
                const groupMeta = await sock.groupMetadata(sender);
                const admins = groupMeta.participants.filter(p => p.admin).map(p => `👑 @${p.id.split('@')[0]}`);
                await sock.sendMessage(sender, { text: `📋 *Daftar Admin Grup:*\n${admins.join('\n') || 'Tidak ada'}`, mentions: groupMeta.participants.filter(p => p.admin).map(p => p.id) });
            }
            else if (cmd === 'bug' && args.length) {
                const bugReport = args.join(' ');
                const reporter = sender.split('@')[0];
                const ownerJid = OWNER_NUMBER + '@s.whatsapp.net';
                await sock.sendMessage(ownerJid, { text: `🐞 *LAPORAN BUG*\n📱 Nomor: ${reporter}\n📝 Pesan: ${bugReport}` });
                await sock.sendMessage(sender, { text: '✅ Laporan bug terkirim. Terima kasih!' });
            }
            else if (cmd === 'menu' || cmd === 'help') {
                const menu = `╔══════════════════════════════════════╗
║         🤖 XSO BOT – MENU LENGKAP       ║
╠══════════════════════════════════════╣
║ 📥 *DOWNLOADER*                        ║
║   .download [url] - TikTok/IG/YT/FB/Twitter/Pinterest
║   .mp3 [yt_url] - YouTube to MP3       ║
║   .fb | .twt | .pin [url]              ║
║                                        ║
║ 📚 *INFORMASI*                         ║
║   .wiki [query] - Wikipedia            ║
║   .cuaca [kota] - Cuaca                ║
║   .lirik [lagu] - Lirik                ║
║                                        ║
║ 🛠️ *TOOLS*                             ║
║   .portscan [ip] | .whois [domain]     ║
║   .ip [domain] | .spam [no] [msg] [n]  ║
║   .qr [data] | .short [url]            ║
║   .tts [teks] | .stiker (kirim foto)   ║
║                                        ║
║ 🤖 *AI*                                ║
║   .tanya [pertanyaan] - Tanya AI       ║
║                                        ║
║ 👥 *MANAJEMEN GRUP*                    ║
║   .kick @user1 @user2 (admin/owner)    ║
║   .promote | .demote | .tagall         ║
║   .leave | .delete (reply)             ║
║   .setwelcome / .setgoodbye [teks]     ║
║   .antilink on/off | .antikasar on/off ║
║   .adminlist                           ║
║                                        ║
║ 📢 *LAINNYA*                           ║
║   .menu - Menu ini                     ║
║   .bug [pesan] - Lapor bug             ║
║                                        ║
╠══════════════════════════════════════╣
║ 📞 *LAPOR BUG*: ${OWNER_NUMBER}
╚══════════════════════════════════════╝`;
                await sock.sendMessage(sender, { text: menu });
            }
            // Perintah tidak dikenal: DIAM (tidak mengganggu chat)
        }
    });
}

// ======================== HTTP SERVER UNTUK RAILWAY ========================
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('XSO Bot is running!'));
app.get('/health', (req, res) => res.send('OK'));
app.listen(PORT, () => console.log(`✅ HTTP server on port ${PORT}`));

startBot().catch(console.error);
