#!/usr/bin/env node

/**
 * TorqueScout Auto Git Sync Watcher
 * 
 * Ekip arkadaşınız (Efe) GitHub'a commit pushladığında otomatik algılar,
 * yerel ortamınıza 'git pull' yapar ve Expo'nun telefondaki uygulamayı
 * anında canlı güncellemesini (Fast Refresh) sağlar.
 */

const { exec } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const POLL_INTERVAL_MS = 15000; // Her 15 saniyede bir kontrol et

function runCmd(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: ROOT_DIR, env: { ...process.env, DEVELOPER_DIR: '/Library/Developer/CommandLineTools' } }, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

function notifyMac(title, message) {
  const cleanTitle = title.replace(/"/g, '\\"');
  const cleanMsg = message.replace(/"/g, '\\"');
  exec(`osascript -e 'display notification "${cleanMsg}" with title "${cleanTitle}"'`);
}

let isSyncing = false;

async function checkAndSync() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    // 1. Fetch remote main silently
    await runCmd('git fetch origin main --quiet');

    // 2. Compare local HEAD with origin/main
    const { stdout: localHead } = await runCmd('git rev-parse HEAD');
    const { stdout: remoteHead } = await runCmd('git rev-parse origin/main');

    if (localHead !== remoteHead) {
      console.log(`\n🔔 [${new Date().toLocaleTimeString('tr-TR')}] GitHub'da yeni değişiklikler tespit edildi!`);
      console.log('⏳ Yerel koda çekiliyor (git pull)...');

      const { stdout: pullOut } = await runCmd('git pull --ff-only origin main');
      const { stdout: commitInfo } = await runCmd('git log -1 --pretty=format:"%s (%an)"');

      console.log(`✅ [GÜNCELLENDİ] ${commitInfo}`);
      console.log('📱 Expo Go uygulamanız telefonunuzda otomatik güncellendi!\n');

      notifyMac('TorqueScout Kod Güncellendi 🚀', commitInfo);
    }
  } catch (err) {
    // Sadece önemli hataları göster (conflict vb.)
    if (err && err.stderr && !err.stderr.includes('Could not resolve host')) {
      console.warn('⚠️  Auto-sync uyarısı:', err.stderr || err.err?.message);
    }
  } finally {
    isSyncing = false;
  }
}

console.log('====================================================================');
console.log('   🔄 TORQUESCOUT GİTHUB AUTO-SYNC WATCHER (CANLI SENKRONİZASYON)');
console.log('====================================================================');
console.log('💡 Arka planda GitHub main branch kontrol ediliyor (her 15 saniyede bir).');
console.log('💡 Ekip arkadaşınız yeni commit attığında otomatik çekilir ve');
console.log('   Expo Go telefonunuzda anında yenilenir.');
console.log('   Durdurmak için: CTRL + C\n');

// İlk kontrolü hemen yap
checkAndSync();

// Periyodik kontrol
setInterval(checkAndSync, POLL_INTERVAL_MS);
