/*
 * Phishing.exe · todo ocurre en el navegador: el email no se envía a ningún sitio.
 * Dos capas que se complementan:
 *  1. IA (TF-IDF + regresión logística entrenada en Python, exportada a modelo.json).
 *  2. Señales de alerta: reglas sencillas en español e inglés (enlaces raros, urgencia, contraseñas…).
 * Parámetros de URL: ?lang=es|en  ?embed (dentro del portfolio)
 */
(() => {
  'use strict';

  const REPO = 'https://github.com/Zulema1904/phishing-detector';
  const params = new URLSearchParams(location.search);
  let lang = params.get('lang') === 'en' || (!params.get('lang') && !(navigator.language || 'es').startsWith('es')) ? 'en' : 'es';
  if (params.has('embed')) document.body.classList.add('embed');

  const T = {
    es: {
      subtitle: 'Detector de emails de phishing con IA explicable',
      inputTitle: '📧 Analiza un email', orTry: '…o prueba con un ejemplo:', analyze: 'Analizar 🔍', clear: 'Borrar',
      privacy: '🔒 El análisis se hace en tu navegador: el texto no sale de tu ordenador.',
      placeholder: 'Pega aquí el email: asunto, remitente y mensaje.\n\nTambién puedes arrastrar un archivo .eml o .txt sobre este recuadro.',
      steps: ['Abre el email sospechoso en tu correo.', 'Selecciónalo todo (Ctrl+A) y cópialo (Ctrl+C).', 'Pégalo abajo (Ctrl+V): se analiza solo.'],
      pasteBtn: '📋 Pegar y analizar', fileBtn: '📎 Abrir archivo…', dropHint: 'Suelta aquí tu archivo .eml o .txt',
      pasteError: 'Tu navegador no me deja leer el portapapeles. Pega el texto con Ctrl+V.',
      aiNote: 'La IA aprendió con emails en inglés; con otros idiomas se guía por las señales de alerta.',
      verdictTitle: '🧐 Veredicto', aiScore: 'IA: parecido a phishing o spam', signalScore: 'Señales de alerta',
      signalsTitle: '🚩 Señales de alerta', wordsTitle: '🔤 Palabras que ha tenido en cuenta la IA',
      wordsNote: 'Rosa: empujan hacia phishing. Verde: hacia email normal. El número es su peso en la decisión.',
      wordsSkipped: 'La IA no ha opinado sobre este email (reconoce muy pocas palabras), así que aquí no hay nada que destacar.',
      noSignals: 'Ninguna señal de alerta clara.', aiUnknown: 'sin opinión',
      verdicts: {
        high: ['🚨', 'Phishing probable', 'La IA y las señales de alerta coinciden. No pulses enlaces ni respondas con datos.'],
        highRules: ['🚨', 'Phishing probable', 'Las señales de alerta son muy claras. No pulses enlaces ni respondas con datos.'],
        suspect: ['⚠️', 'Sospechoso', 'Hay indicios. Comprueba el remitente y entra en la web escribiendo tú la dirección.'],
        spam: ['📢', 'Parece spam o publicidad', 'Se parece a correo masivo, pero no pide datos ni tiene enlaces raros.'],
        rulesOk: ['✅', 'Sin señales de alerta', 'Las reglas no ven nada raro, pero la IA no entiende este idioma: revisa también quién lo envía y si esperabas el correo.'],
        unknown: ['🤔', 'Muy poco texto', 'Pega el email completo (asunto y cuerpo): con tan poco no puedo decirte nada.'],
        ok: ['✅', 'Parece seguro', 'Ni la IA ni las reglas ven nada raro. Aun así, desconfía si no esperabas este email.'],
      },
      modelTitle: '🧠 Cómo funciona el modelo',
      stats: ['Exactitud', 'Precisión', 'Sensibilidad', 'F1'],
      matrix: ['', 'Dice phishing', 'Dice seguro', 'Era phishing', 'Era seguro'],
      modelText: (m) => [
        `Entrenado con <b>${m.entrenamiento.toLocaleString('es-ES')}</b> emails reales y evaluado con otros <b>${m.prueba.toLocaleString('es-ES')}</b> que nunca vio.`,
        '<b>TF-IDF + regresión logística</b>: cada palabra tiene un peso, así que se puede explicar cada decisión (nada de caja negra).',
        'Quité del vocabulario palabras que delataban <b>de qué colección venía cada email</b> (nombres como “enron”): subían la nota pero no enseñaban a detectar phishing.',
        '<b>Límites</b>: aprendió con emails en inglés y el dataset mezcla phishing con spam. Por eso lo acompaño de señales de alerta en español e inglés.',
        `Código, tests y entrenamiento: <a href="${REPO}" target="_blank" rel="noopener">${REPO.replace('https://', '')}</a>`,
      ],
      footer: 'Dataset: “Phishing Email Detection” (LGPL-3.0) · Hecho por Zulema Gutiérrez',
    },
    en: {
      subtitle: 'Phishing email detector with explainable AI',
      inputTitle: '📧 Analyse an email', orTry: '…or try an example:', analyze: 'Analyse 🔍', clear: 'Clear',
      privacy: '🔒 Analysis runs in your browser: the text never leaves your computer.',
      placeholder: 'Paste the email here: subject, sender and message.\n\nYou can also drop an .eml or .txt file onto this box.',
      steps: ['Open the suspicious email in your mail app.', 'Select it all (Ctrl+A) and copy it (Ctrl+C).', 'Paste it below (Ctrl+V): it analyses itself.'],
      pasteBtn: '📋 Paste and analyse', fileBtn: '📎 Open file…', dropHint: 'Drop your .eml or .txt file here',
      pasteError: 'Your browser will not let me read the clipboard. Paste the text with Ctrl+V.',
      aiNote: 'The AI learned from English emails; in other languages it relies on the warning signs.',
      verdictTitle: '🧐 Verdict', aiScore: 'AI: looks like phishing or spam', signalScore: 'Warning signs',
      signalsTitle: '🚩 Warning signs', wordsTitle: '🔤 Words the AI took into account',
      wordsNote: 'Pink: push towards phishing. Green: towards a normal email. The number is its weight in the decision.',
      wordsSkipped: 'The AI gave no opinion on this email (it recognises very few words), so there is nothing to highlight here.',
      noSignals: 'No clear warning signs.', aiUnknown: 'no opinion',
      verdicts: {
        high: ['🚨', 'Likely phishing', 'The AI and the warning signs agree. Don’t click links or reply with personal data.'],
        highRules: ['🚨', 'Likely phishing', 'The warning signs are very clear. Don’t click links or reply with personal data.'],
        suspect: ['⚠️', 'Suspicious', 'There are red flags. Check the sender and type the website address yourself.'],
        spam: ['📢', 'Looks like spam or advertising', 'It resembles bulk mail, but it asks for no data and has no odd links.'],
        rulesOk: ['✅', 'No warning signs', 'The rules see nothing odd, but the AI does not understand this language: also check who sent it and whether you expected it.'],
        unknown: ['🤔', 'Too little text', 'Paste the whole email (subject and body): there is not enough here to tell you anything.'],
        ok: ['✅', 'Looks safe', 'Neither the AI nor the rules see anything odd. Still, be wary if you weren’t expecting it.'],
      },
      modelTitle: '🧠 How the model works',
      stats: ['Accuracy', 'Precision', 'Recall', 'F1'],
      matrix: ['', 'Says phishing', 'Says safe', 'Was phishing', 'Was safe'],
      modelText: (m) => [
        `Trained on <b>${m.entrenamiento.toLocaleString('en-GB')}</b> real emails and tested on another <b>${m.prueba.toLocaleString('en-GB')}</b> it had never seen.`,
        '<b>TF-IDF + logistic regression</b>: every word has a weight, so each decision can be explained (no black box).',
        'I removed words that gave away <b>which collection each email came from</b> (names like “enron”): they inflated the score without teaching anything about phishing.',
        '<b>Limits</b>: it learned from English emails and the dataset mixes phishing with spam. That’s why it comes with warning-sign rules in Spanish and English.',
        `Code, tests and training: <a href="${REPO}" target="_blank" rel="noopener">${REPO.replace('https://', '')}</a>`,
      ],
      footer: 'Dataset: “Phishing Email Detection” (LGPL-3.0) · Made by Zulema Gutiérrez',
    },
  };

  // Señales de alerta: [peso, patrón, texto ES, texto EN]. El peso suma hasta un máximo de 1.
  const SIGNALS = [
    [0.35, /https?:\/\/\d{1,3}(\.\d{1,3}){3}/i, 'Enlace a una dirección IP en lugar de a una web con nombre', 'Link to a raw IP address instead of a named website'],
    [0.25, /\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|ow\.ly)\//i, 'Enlace acortado que oculta el destino real', 'Shortened link hiding the real destination'],
    [0.1, /http:\/\/(?!localhost)/i, 'Enlace sin cifrar (http en lugar de https)', 'Unencrypted link (http instead of https)'],
    [0.35, /\b(password|passcode|pin|contrase[ñn]a|clave de acceso|credit card|card number|cvv|n[uú]mero de (la )?tarjeta|bank details|datos bancarios|social security|dni)\b/i, 'Pide contraseñas, tarjetas u otros datos sensibles', 'Asks for passwords, cards or other sensitive data'],
    [0.25, /\b(urgent|immediately|within 24 hours|expires? today|suspended|locked|will be closed|act now|urgente|inmediatamente|en (las pr[oó]ximas )?24 horas|caduca|suspendid[ao]|bloquead[ao]|ser[aá] cancelad[ao])\b/i, 'Mete prisa o amenaza con bloquear algo', 'Creates urgency or threatens to lock something'],
    [0.25, /\b(verify your (account|identity)|confirm your (account|details)|update your (account|payment)|verifi(que|ca) su|confirm[ea] (su|tus?) (cuenta|datos|identidad)|actualice sus datos)\b/i, 'Te pide “verificar” o “actualizar” tu cuenta', 'Asks you to “verify” or “update” your account'],
    [0.2, /\b(you('ve| have) won|winner|lottery|prize|gift card|claim your|inheritance|ha(s)? ganado|ganador|premio|sorteo|tarjeta regalo|herencia)\b/i, 'Promete premios, regalos o dinero fácil', 'Promises prizes, gifts or easy money'],
    [0.15, /\b(dear (customer|user|client|account holder|sir\/madam)|estimad[oa] (cliente|usuari[oa])|querid[oa] (cliente|usuari[oa]))\b/i, 'Saludo genérico: no usa tu nombre', 'Generic greeting: it doesn’t use your name'],
    [0.3, /\.(exe|scr|js|vbs|bat|docm|xlsm|iso)\b/i, 'Menciona un adjunto potencialmente peligroso', 'Mentions a potentially dangerous attachment'],
    [0.1, /!{3,}|\b[A-ZÁÉÍÓÚÑ]{6,}\b.*\b[A-ZÁÉÍÓÚÑ]{6,}\b/, 'Muchas mayúsculas o exclamaciones', 'Lots of capitals or exclamation marks'],
  ];

  // Los ejemplos van en el idioma de la interfaz; el último, a propósito, en el otro idioma,
  // para enseñar que la IA solo entiende inglés y que las señales de alerta funcionan igual.
  const EXAMPLES = {
    es: [
      ['🎣 Banco', 'Asunto: Actividad inusual en su cuenta\n\nEstimado cliente:\n\nHemos detectado un acceso inusual y su cuenta ha sido BLOQUEADA. Para evitar su cancelación definitiva, verifique su identidad en las próximas 24 horas introduciendo su usuario, contraseña y número de tarjeta aquí:\n\nhttp://192.168.45.10/verificacion-cliente\n\nDepartamento de Seguridad'],
      ['🎁 Premio', 'Asunto: ¡¡¡ENHORABUENA!!! Ha resultado premiado\n\nHa sido seleccionado para recibir una tarjeta regalo de 1.000 €. Reclame su premio ahora, la oferta caduca hoy. Responda con su nombre completo, dirección y número de tarjeta para cubrir los gastos de envío.'],
      ['💼 Trabajo', 'Asunto: Notas de la reunión de ayer\n\nHola Ana:\n\nGracias por las notas de la reunión de ayer. Te adjunto las diapositivas actualizadas; dime si el calendario le encaja al equipo.\n\nUn saludo,\nMarta'],
      ['📢 Publicidad', 'Asunto: Empiezan las rebajas de verano\n\nHasta un 50 % de descuento en la nueva colección. Envío gratis en todos los pedidos esta semana. Visita nuestra tienda online para ver las mejores ofertas. Si no quieres recibir más correos, pulsa aquí para darte de baja.'],
      ['🇬🇧 En inglés', 'Subject: Unusual sign-in activity\n\nDear customer,\n\nWe detected unusual activity and your account has been suspended. To avoid permanent closure, verify your identity within 24 hours by entering your username, password and card number here:\n\nhttp://192.168.45.10/secure-login\n\nSecurity Department'],
    ],
    en: [
      ['🎣 Bank', 'Subject: Unusual sign-in activity\n\nDear customer,\n\nWe detected unusual activity and your account has been suspended. To avoid permanent closure, verify your identity within 24 hours by entering your username, password and card number here:\n\nhttp://192.168.45.10/secure-login\n\nSecurity Department'],
      ['🎁 Prize', 'Subject: CONGRATULATIONS!!! You have won\n\nYou have been selected to receive a $1000 gift card. Claim your prize now, the offer expires today! Reply with your full name, address and credit card number to cover shipping.'],
      ['💼 Work', 'Subject: Notes from yesterday\n\nHi Ana,\n\nThanks for the notes from yesterday\'s meeting. I\'ve attached the updated slides; let me know if the timeline works for the team.\n\nBest,\nMarta'],
      ['📢 Advert', 'Subject: Summer sale starts now\n\nSave up to 50% on our new collection. Free shipping on all orders this week. Visit our online store to see the best offers. To stop receiving these emails, click remove.'],
      ['🇪🇸 In Spanish', 'Asunto: Aviso importante\n\nEstimado cliente:\n\nSu cuenta ha sido BLOQUEADA por motivos de seguridad. Verifique su identidad en las próximas 24 horas introduciendo su contraseña y el número de tarjeta en este enlace: http://bit.ly/verificacion-segura\n\nAtentamente,\nDepartamento de Seguridad'],
    ],
  };

  const $ = (id) => document.getElementById(id);
  const t = () => T[lang];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const pct = (x) => `${Math.round(x * 100)} %`;
  let M = null;
  let index = null;

  /* ---------- 1 · La IA: la misma cuenta que scikit-learn, en JavaScript ---------- */
  function classify(text) {
    const re = new RegExp(M.patron, 'g');
    const counts = new Map();
    for (const w of text.toLowerCase().match(re) || []) {
      const i = index.get(w);
      if (i !== undefined) counts.set(i, (counts.get(i) || 0) + 1);
    }
    // TF-IDF sublineal (1 + log n) × idf, normalizado a longitud 1
    const vals = [...counts].map(([i, c]) => [i, (1 + Math.log(c)) * M.idf[i]]);
    const norm = Math.hypot(...vals.map(([, v]) => v)) || 1;
    const contrib = vals.map(([i, v]) => [M.palabras[i], (v / norm) * M.pesos[i]]);
    const z = M.sesgo + contrib.reduce((s, [, c]) => s + c, 0);
    // Proporción de palabras que el modelo reconoce: en inglés ronda el 90 %, en otros idiomas
    // baja del 40 %. Si es baja, la IA no opina y mandan las señales de alerta.
    const total = (text.toLowerCase().match(re) || []).length;
    const conocidas = [...counts.values()].reduce((a, b) => a + b, 0);
    return { p: 1 / (1 + Math.exp(-z)), known: counts.size, ratio: total ? conocidas / total : 0, tokens: total, contrib };
  }

  /* ---------- 2 · Señales de alerta ---------- */
  function signals(text) {
    const hits = SIGNALS.map(([w, re, es, en]) => {
      const m = text.match(re);
      return m && { w, label: lang === 'es' ? es : en, match: m[0] };
    }).filter(Boolean);
    return { hits, score: Math.min(1, hits.reduce((s, h) => s + h.w, 0)) };
  }

  const opina = (ai) => ai.known >= 6 && ai.ratio >= 0.6;

  function verdict(ai, sig) {
    const p = opina(ai) ? ai.p : null;   // si no reconoce el idioma, la IA no opina
    if (p != null && p >= 0.5 && sig >= 0.4) return ['high', 'high'];
    if (sig >= 0.7) return [p == null ? 'highRules' : 'high', 'high'];
    if (p != null && p >= 0.5) return sig > 0 ? ['suspect', 'mid'] : ['spam', 'mid'];
    if (sig >= 0.3) return ['suspect', 'mid'];
    if (p == null) return ai.tokens < 20 ? ['unknown', 'mid'] : ['rulesOk', 'ok'];
    return ['ok', 'ok'];
  }

  function analyze() {
    const text = $('email').value.trim();
    if (!text || !M) return;
    const ai = classify(text);
    const sig = signals(text);
    const [key, cls] = verdict(ai, sig.score);
    const [emoji, title, desc] = t().verdicts[key];
    $('verdict').className = `verdict ${cls}`;
    $('verdict').querySelector('.v-emoji').textContent = emoji;
    $('verdict').querySelector('.v-title').textContent = title;
    $('verdict').querySelector('.v-text').textContent = desc;

    const lvl = (x) => (x >= 0.7 ? 'c-high' : x >= 0.4 ? 'c-mid' : 'c-ok');
    const aiKnown = opina(ai);
    $('ai-bar').style.width = aiKnown ? pct(ai.p) : '0%';
    $('ai-bar').className = aiKnown ? lvl(ai.p) : '';
    $('ai-val').textContent = aiKnown ? pct(ai.p) : t().aiUnknown;
    $('ai-val').className = `score ${aiKnown ? lvl(ai.p) : ''}`;
    $('ai-note').textContent = aiKnown ? '' : t().aiNote;
    $('sig-bar').style.width = pct(sig.score);
    $('sig-bar').className = lvl(sig.score);
    $('sig-val').textContent = pct(sig.score);
    $('sig-val').className = `score ${lvl(sig.score)}`;

    $('signals').innerHTML = sig.hits.length
      ? sig.hits.map((h) => `<li>${esc(h.label)}<small>“${esc(h.match)}”</small></li>`).join('')
      : `<li class="none">${esc(t().noSignals)}</li>`;

    // Si la IA no opina (otro idioma), sus palabras no significan nada: se explica en su lugar
    $('words').hidden = !aiKnown;
    $('marked').hidden = !aiKnown;
    $('wordsNote').textContent = aiKnown ? t().wordsNote : t().wordsSkipped;
    if (!aiKnown) { $('result').hidden = false; return; }

    const sorted = [...ai.contrib].sort((a, b) => b[1] - a[1]);
    const top = sorted.filter(([, c]) => c > 0.01).slice(0, 8).concat(sorted.filter(([, c]) => c < -0.01).slice(-8).reverse());
    $('words').innerHTML = top.map(([w, c]) => `<span class="chip ${c > 0 ? 'p' : 's'}">${esc(w)} ${c > 0 ? '+' : ''}${c.toFixed(2)}</span>`).join('');
    const weight = new Map(ai.contrib);
    const max = Math.max(0.05, ...ai.contrib.map(([, c]) => Math.abs(c)));
    // Resalta en el texto cada palabra conocida, más intensa cuanto más pesa
    $('marked').innerHTML = esc(text).replace(new RegExp(M.patron.replace('[a-z]', '[A-Za-z]').replace('[a-z0-9]', '[A-Za-z0-9]'), 'g'), (w) => {
      const c = weight.get(w.toLowerCase());
      if (!c || Math.abs(c) < 0.005) return w;
      const a = Math.min(0.85, 0.15 + Math.abs(c) / max);
      return `<mark style="background:rgba(${c > 0 ? '255,92,138' : '62,207,142'},${a.toFixed(2)})">${w}</mark>`;
    });
    $('result').hidden = false;
  }

  /* ---------- Textos y panel del modelo ---------- */
  function renderModel() {
    const m = M.metricas;
    const s = t().stats;
    const mx = t().matrix;
    $('model').innerHTML = `<div class="stats">${[m.exactitud, m.precision, m.sensibilidad, m.f1]
      .map((v, i) => `<div class="stat"><b>${i === 3 ? v.toFixed(3) : `${(v * 100).toFixed(1)}%`}</b><span>${s[i]}</span></div>`).join('')}</div>
      <table class="matrix"><tr><th>${mx[0]}</th><th>${mx[1]}</th><th>${mx[2]}</th></tr>
      <tr><th>${mx[3]}</th><td>✅ ${m.matriz.vp}</td><td>❌ ${m.matriz.fn}</td></tr>
      <tr><th>${mx[4]}</th><td>❌ ${m.matriz.fp}</td><td>✅ ${m.matriz.vn}</td></tr></table>
      <ul class="model-text">${t().modelText(m).map((x) => `<li>${x}</li>`).join('')}</ul>`;
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach((el) => { const v = t()[el.dataset.t]; if (typeof v === 'string') el.textContent = v; });
    $('lang').textContent = lang === 'es' ? 'EN' : 'ES';
    $('email').placeholder = t().placeholder;
    $('steps').innerHTML = t().steps.map((x) => `<li>${esc(x)}</li>`).join('');
    $('examples').innerHTML = EXAMPLES[lang].map(([label], i) => `<button class="btn small" type="button" data-ex="${i}">${label}</button>`).join('');
    if (M) renderModel();
    if (!$('result').hidden) analyze();
  }

  $('analyze').addEventListener('click', analyze);
  $('email').addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyze(); });
  $('clear').addEventListener('click', () => { $('email').value = ''; $('result').hidden = true; $('email').focus(); });
  $('examples').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ex]');
    if (b) cargar(EXAMPLES[lang][b.dataset.ex][1]);
  });

  function cargar(texto) {
    $('email').value = texto;
    analyze();
    $('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Pegar desde el portapapeles (algunos navegadores piden permiso)
  $('paste').addEventListener('click', async () => {
    try {
      const texto = await navigator.clipboard.readText();
      if (texto.trim()) return cargar(texto);
      $('email').focus();
    } catch {
      $('email').focus();
      alert(t().pasteError);
    }
  });

  // Abrir un archivo .eml o .txt guardado del correo
  // (File.text() no existe en navegadores antiguos: ahí se usa FileReader)
  const leer = (f) => (f.text ? f.text() : new Promise((ok, err) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => err(r.error);
    r.readAsText(f);
  }));

  $('file').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) leer(f).then(cargar);
    e.target.value = '';
  });

  // Arrastrar y soltar el archivo encima
  const zona = $('drop');
  ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, () => zona.classList.remove('over')));
  zona.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) leer(f).then(cargar);
  });

  // Al pegar con Ctrl+V se analiza solo
  $('email').addEventListener('paste', () => setTimeout(analyze, 0));
  $('lang').addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; applyLang(); });

  applyLang();
  fetch('modelo.json').then((r) => r.json()).then((m) => {
    M = m;
    index = new Map(m.palabras.map((w, i) => [w, i]));
    renderModel();
  });
})();
