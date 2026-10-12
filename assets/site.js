// Memoreees — comportements du site d'aperçu : menu mobile, fil animé de l'accueil, formulaires factices, fiche produit.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var menuBtn = document.querySelector('.menu-btn');
  var mnav = document.getElementById('mnav');
  if (menuBtn && mnav) {
    menuBtn.addEventListener('click', function () {
      var open = mnav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Le fil se déroule au défilement et devient l'onde de « Comment ça marche ».
  var p = document.getElementById('tp');
  var hero = document.getElementById('hero');
  var how = document.getElementById('comment');
  var thread = document.querySelector('.thread');
  if (p && hero && how && thread) {
    var len = p.getTotalLength();
    p.style.strokeDasharray = len;
    var size = function () { thread.style.height = (how.querySelector('.onde').offsetTop + 28) / 0.95 + 'px'; };
    var update = function () {
      var r = hero.getBoundingClientRect(), vh = window.innerHeight || 800;
      var prog = reduce ? 1 : Math.min(1, Math.max(0.18, (-r.top + vh * 0.6) / (how.offsetTop + 60)));
      p.style.strokeDashoffset = len * (1 - prog);
      how.classList.toggle('on', prog >= 0.98);
    };
    size(); update();
    window.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', function () { size(); update(); });
  }

  // Inscriptions aux questions par email (question du dimanche, sujets des livres) : <form data-abo="sujet">.
  // Tant que data-endpoint est vide (aperçu), rien n'est envoyé. Au lancement, build.py (INSCRIPTION_URL) y met l'adresse
  // de la fonction serveur, qui reçoit { email, sujet, page } et inscrit l'adresse chez Brevo (double opt-in).
  document.querySelectorAll('form[data-abo]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = f.parentNode.querySelector('.ok');
      var say = function (msg) { if (!ok) return; if (msg) ok.textContent = msg; ok.hidden = false; };
      var url = f.getAttribute('data-endpoint');
      if (!url) { say(); return; }
      var btn = f.querySelector('button');
      if (btn) btn.disabled = true;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: f.querySelector('input[type=email]').value.trim(), sujet: f.getAttribute('data-abo'), page: location.pathname })
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        say('C’est noté : confirmez votre inscription dans l’email que nous venons de vous envoyer.');
        f.reset();
      }).catch(function () {
        say('L’inscription n’a pas abouti. Réessayez dans un instant, ou écrivez-nous à hello@memoreees.com.');
      }).then(function () { if (btn) btn.disabled = false; });
    });
  });

  // Autres formulaires de l'aperçu (compte, ambassadeur) : rien n'est envoyé.
  document.querySelectorAll('form[data-preview]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = f.parentNode.querySelector('.ok');
      if (ok) ok.hidden = false;
    });
  });

  // En-tête : transparent sur la photo d'accueil, barre blanche dès qu'on fait défiler.
  var hdr = document.querySelector('header.site');
  if (hdr && document.body.classList.contains('has-hero')) {
    var onScroll = function () { hdr.classList.toggle('scrolled', window.scrollY > 30 || (mnav && mnav.classList.contains('open'))); };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (menuBtn) menuBtn.addEventListener('click', onScroll);
    onScroll();
  }

  // Le logo alterne entre ses deux versions toutes les 3 secondes.
  if (!reduce) setInterval(function () { document.querySelectorAll('.brand').forEach(function (b) { b.classList.toggle('alt'); }); }, 3000);

  // « 3 étapes » : chaque panneau recule légèrement quand le suivant vient se poser dessus.
  var cards = [].slice.call(document.querySelectorAll('.stack-card'));
  if (cards.length && !reduce) {
    var stackUpdate = function () {
      cards.forEach(function (c, i) {
        var next = cards[i + 1];
        if (!next) return;
        var a = c.getBoundingClientRect(), b = next.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, 1 - (b.top - a.top) / a.height));
        c.style.transform = 'scale(' + (1 - p * 0.06) + ')';
        c.style.filter = 'brightness(' + (1 - p * 0.08) + ')';
      });
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(stackUpdate); }, { passive: true });
    stackUpdate();
  }

  // Étape 2 : la démonstration se joue une fois, quand le panneau arrive à l'écran.
  var demo = document.getElementById('swipe-demo');
  if (demo) {
    // Extrait réel du chapitre test, reproduit avec l'accord de sa conteuse.
    var words = "Mon tout premier souvenir, je vais peut-être me tromper. Je me souviens des soirs qui ont précédé la naissance de Betty. On dormait toutes les nuits sur la paillote, dehors…".split(' ');
    var out = demo.querySelector('.transcript'), clock = demo.querySelector('.rec-time');
    var play = function () {
      if (reduce) { demo.className = 'swipe-demo p2 p4'; out.textContent = words.join(' '); return; }
      demo.classList.add('p1');
      setTimeout(function () { demo.classList.add('p2'); }, 1300);
      setTimeout(function () { demo.classList.add('p3'); }, 2600);
      setTimeout(function () {
        demo.classList.add('p4');
        var i = 0, sec = 12;
        var timer = setInterval(function () {
          out.textContent = words.slice(0, ++i).join(' ');
          if (i % 3 === 0) clock.textContent = "En train d'écouter · 00:" + String(++sec).padStart(2, '0');
          if (i >= words.length) clearInterval(timer);
        }, 170);
      }, 3700);
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); setTimeout(play, 400); }
      }, { threshold: 0.75 });
      io.observe(demo);
    } else play();
  }

  // Bandeau : sur mobile, un message à la fois, en fondu (pas de défilement).
  var ann = document.querySelectorAll('.annonce li');
  if (ann.length > 1) {
    var ai = 0;
    setInterval(function () {
      if (window.innerWidth > 1180) return;
      var prev = ann[ai];
      prev.classList.remove('on'); prev.classList.add('out');
      setTimeout(function () { prev.classList.add('reset'); prev.classList.remove('out'); requestAnimationFrame(function () { prev.classList.remove('reset'); }); }, 600);
      ai = (ai + 1) % ann.length; ann[ai].classList.add('on');
    }, 3500);
  }

  // FAQ : onglets par thème (data-t sur chaque question) et ouverture au survol sur ordinateur.
  var FAQ_T = { app: 'L\'app', offrir: 'Avant d\'offrir', raconter: 'Raconter', livre: 'Le livre', voix: 'Les voix et les données', fetes: 'Les dates' };
  document.querySelectorAll('.faq').forEach(function (faq) {
    var items = [].slice.call(faq.querySelectorAll('details'));
    var themes = [];
    items.forEach(function (d) { var t = d.dataset.t; if (t && FAQ_T[t] && themes.indexOf(t) < 0) themes.push(t); });
    if (themes.length > 1) {
      var bar = document.createElement('div'); bar.className = 'faq-tabs'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Thèmes');
      ['all'].concat(themes).forEach(function (t) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = t === 'all' ? 'Toutes' : FAQ_T[t]; b.setAttribute('aria-pressed', t === 'all');
        b.addEventListener('click', function () {
          [].forEach.call(bar.children, function (x) { x.setAttribute('aria-pressed', x === b); });
          items.forEach(function (d) { d.hidden = t !== 'all' && d.dataset.t !== t; });
        });
        bar.appendChild(b);
      });
      items[0].parentNode.insertBefore(bar, items[0]);
    }
  });
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.faq details, .faq-group details').forEach(function (d) {
      var t;
      d.addEventListener('mouseenter', function () { t = setTimeout(function () { d.open = true; }, 160); });
      d.addEventListener('mouseleave', function () { clearTimeout(t); if (!d.dataset.pinned) d.open = false; });
      d.querySelector('summary').addEventListener('click', function (e) { e.preventDefault(); d.dataset.pinned = d.dataset.pinned ? '' : '1'; d.open = !!d.dataset.pinned || !d.open; });
    });
  }

  // Tarifs sur mobile : la ligne défile, on la centre sur Mémoire au chargement.
  var tiers = document.querySelector('.tiers'), feat = tiers && tiers.querySelector('.featured');
  if (tiers && feat && tiers.scrollWidth > tiers.clientWidth) tiers.scrollLeft = feat.offsetLeft - (tiers.clientWidth - feat.offsetWidth) / 2;

  // Page de l'app : le téléphone reste en place, l'écran change avec le texte qu'on lit.
  var plxSteps = [].slice.call(document.querySelectorAll('.plx-step'));
  if (plxSteps.length) {
    var plxCur = '0';
    var plxUpdate = function () {
      var mid = window.innerHeight / 2, best = plxSteps[0], d = Infinity;
      plxSteps.forEach(function (s) { var r = s.getBoundingClientRect(), c = Math.abs(r.top + r.height / 2 - mid); if (c < d) { d = c; best = s; } });
      if (best.dataset.i === plxCur) return;
      plxCur = best.dataset.i;
      document.querySelectorAll('.plx-step,.plx-screen').forEach(function (el) { el.classList.toggle('on', el.dataset.i === plxCur); });
    };
    window.addEventListener('scroll', plxUpdate, { passive: true });
    document.body.addEventListener('scroll', plxUpdate, { passive: true });
    window.addEventListener('resize', plxUpdate);
    plxUpdate();
  }

  // ---- Panier latéral (aperçu : rien n'est vendu, le panier reste dans ce navigateur) ----
  // 5 formats ; le thème (Mémoire) ou l'occasion (Vœux, Récit) se choisit à l'achat et fait partie du produit.
  // Clés : mavie | ancetres | tempsfort | voeux:<occasion> | recit:<occasion> | chronique | voyageSolo
  // | grossesse:<simple|video> | annee:<simple|video> | pack:<simple|video> (12/10 : l'option vidéo est une variante du livre ;
  // l'année racontée, 1 à 6, se choisit dans l'app ; le tarif fidélité des années suivantes n'est pas encore vendu sur le site).
  // Compléments rattachés à une histoire : carte_<clé>, copie_<clé>, voix10_<clé> (Vœux). Lignes de vie se vend seul.
  // Pour un livre déjà en cours (liens de l'app, propriété Shopify « Projet ») : ajoutvoix:<CODE> (Vœux, 10 voix, 15 €)
  // et ajoutvideo:<CODE> (13/10 : option vidéo ajoutée plus tard, SKU video-grossesse 20 € ou video-annee 30 € ;
  // le livre concerné, grossesse ou annee, est retenu à part dans localStorage « lt-ajoutvideo »).
  var PH = 'assets/photos/';
  var BASE = {
    mavie: { name: 'Mémoire · Ma vie', note: 'Une voix, 12 mois pour raconter', price: 119, img: 'hero-1.jpg', copy: 39, pitch: 'Toute une vie racontée de sa voix.' },
    ancetres: { name: 'Mémoire · Mes ancêtres', note: 'Une voix, 12 mois pour raconter', price: 119, img: 'anciennes-photos.jpg', copy: 39, pitch: 'Les origines de la famille, avant qu\'elles se perdent.' },
    tempsfort: { name: 'Mémoire · Un temps fort', note: 'Une voix, 12 mois pour raconter', price: 119, img: 'commerce-ancien.jpg', copy: 39, pitch: 'Une époque vécue de l\'intérieur.' },
    voeux: { name: 'Vœux', note: 'Jusqu\'à 30 voix, une page par voix', price: 59, img: 'anniversaire-gateau.jpg', copy: 29, pitch: 'Les mots de 30 proches, de vive voix, dans un livre.' },
    recit: { name: 'Récit', note: 'Jusqu\'à 10 voix, jusqu\'à 80 pages', price: 69, img: 'plage-feu.jpg', copy: 29, pitch: 'Le voyage ou l\'EVJF, raconté par tous.' },
    chronique: { name: 'Chronique · 2027', note: 'Jusqu\'à 6 voix, jusqu\'à 100 pages', price: 149, img: 'famille-allee.jpg', copy: 39, pitch: 'Une année en famille, racontée par chacun.' },
    voyageSolo: { name: 'Carnet de bord · Voyage en solitaire', note: 'Une voix, jusqu\'à 80 pages', price: 49, img: 'hero-3.jpg', copy: 29, pitch: 'Le carnet de bord de celui qui part seul.' },
    // Grossesse et petite enfance (12/10) : pas encore de photo, une vignette aux couleurs de l'onde.
    grossesse: { name: 'Grossesse', note: 'Les deux parents, jusqu\'à 80 pages', price: 69, prices: { simple: 69, video: 89 }, img: null, copy: 29, pitch: 'Le journal de l\'attente, à deux voix.' },
    annee: { name: 'L\'année de votre enfant', note: 'Les deux parents, jusqu\'à 100 pages', price: 139, prices: { simple: 139, video: 169 }, img: null, copy: 39, pitch: 'Une année de sa vie, de 0 à 6 ans.' },
    pack: { name: 'Pack Grossesse + Année 1', note: 'Deux livres, jusqu\'à 80 et 100 pages', price: 189, prices: { simple: 189, video: 229 }, img: null, copy: null, pitch: 'L\'attente, puis sa première année.' }
  };
  var OCC = {
    voeux: { anniversaire: 'Anniversaire', mariage: 'Mariage', retraite: 'Départ à la retraite', naissance: 'Naissance', depart: 'Pot de départ' },
    recit: { voyage: 'Voyage entre amis', evjf: 'EVJF', evg: 'EVG' },
    grossesse: { simple: 'Sans vidéo', video: 'Avec vidéos' },
    annee: { simple: 'Sans vidéo', video: 'Année 1 avec vidéos' },
    pack: { simple: 'Sans vidéo', video: 'Avec vidéos' }
  };
  var OCC_IMG = { 'voeux:mariage': 'mariage-couple.jpg', 'voeux:retraite': 'diner-jardin.jpg', 'voeux:depart': 'fete-champagne.jpg', 'voeux:naissance': 'famille-canape.jpg', 'recit:evjf': 'hero-2.jpg', 'recit:evg': 'montagne-amis.jpg' };
  var VIDEO = {
    grossesse: { name: 'Option vidéo · Grossesse', note: '4 vidéos d\'une minute', price: 20, sku: 'video-grossesse' },
    annee: { name: 'Option vidéo · L\'année 1', note: '12 vidéos d\'une minute', price: 30, sku: 'video-annee' }
  };
  var videoFor = {};
  try { videoFor = JSON.parse(localStorage.getItem('lt-ajoutvideo') || '{}') || {}; } catch (e) { videoFor = {}; }
  var baseOf = function (k) { return String(k).split(':')[0]; };
  var isStory = function (k) { var b = baseOf(k), o = k.split(':')[1]; return !!BASE[b] && (!OCC[b] || !!OCC[b][o]); };
  var prod = function (k) {
    if (k === 'lignes') return { name: 'Lignes de vie', note: 'Le livre-journal à remplir à la main · livré en 72 h', price: 39, alone: true };
    // Voix ajoutées à un livre Vœux déjà en cours (lien de l'app ou des emails) : la ligne Shopify portera la propriété « Projet ».
    var pj = /^ajoutvoix:([A-Z0-9]{4}-[A-Z0-9]{4})$/.exec(k);
    if (pj) return { name: '10 voix de plus', note: 'Pour votre livre Vœux en cours · projet ' + pj[1], price: 15, max: 12, kind: 'voix', alone: true, props: { Projet: pj[1] } };
    var pv = /^ajoutvideo:([A-Z0-9]{4}-[A-Z0-9]{4})$/.exec(k), vv = pv && VIDEO[videoFor[pv[1]]];
    if (pv) return !vv ? null : { name: vv.name, note: vv.note + ' · pour votre livre en cours · projet ' + pv[1], price: vv.price, max: 1, kind: 'video', alone: true, sku: vv.sku, props: { Projet: pv[1] } };
    var m = /^(carte|copie|voix10)_(.+)$/.exec(k);
    if (m) {
      var p = isStory(m[2]) && prod(m[2]);
      if (!p) return null;
      if (m[1] === 'carte') return { name: 'La carte cadeau', note: 'À personnaliser juste après le paiement, à imprimer ou à envoyer', price: 0, parent: m[2], max: 1, kind: 'card' };
      if (m[1] === 'copie') return !p.copy ? null : { name: 'Exemplaire en plus', note: 'Imprimé en même temps, livré ensemble', price: p.copy, parent: m[2], kind: 'copy' };
      if (baseOf(m[2]) !== 'voeux') return null;
      return { name: '10 voix de plus', note: 'Jusqu\'à 150 voix au total', price: 15, parent: m[2], max: 12, kind: 'voix' };
    }
    if (!isStory(k)) return null;
    var b = BASE[baseOf(k)], o = k.split(':')[1], r = {};
    for (var f in b) r[f] = b[f];
    if (o) { r.name = b.name + ' · ' + OCC[baseOf(k)][o]; r.img = OCC_IMG[k] || b.img; }
    if (b.prices && o) r.price = b.prices[o];
    return r;
  };
  // Sélecteur à pastilles (tarifs, pages produits) : on choisit le thème ou l'occasion, puis on ajoute directement.
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('.pick [data-v]');
    if (chip) {
      chip.parentNode.querySelectorAll('[data-v]').forEach(function (c) { c.setAttribute('aria-pressed', c === chip); });
      // Option qui change le prix (vidéo) : le prix affiché suit la pastille choisie.
      if (chip.dataset.price) {
        var box = chip.closest('.tier') || chip.closest('.pick');
        var amt = box.querySelector('.amount'), add = chip.closest('.pick').querySelector('[data-pick-add]');
        if (amt) amt.textContent = chip.dataset.price + ' €';
        if (add && / · \d+ €$/.test(add.textContent)) add.textContent = add.textContent.replace(/ · \d+ €$/, ' · ' + chip.dataset.price + ' €');
      }
      return;
    }
    var go = e.target.closest('.pick [data-pick-add]');
    if (!go) return;
    var pick = go.closest('.pick'), base = pick.dataset.base, on = pick.querySelector('[data-v][aria-pressed="true"]');
    var v = on ? on.dataset.v : '';
    window.ltAddToCart(base === 'memoire' ? v : base + (v ? ':' + v : ''));
  });
  var DEFAULTS = ['mavie', 'ancetres', 'tempsfort', 'voeux:anniversaire', 'recit:voyage', 'chronique', 'voyageSolo', 'grossesse:simple', 'annee:simple'];
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem('lt-cart') || '{}') || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach(function (k) { if (!prod(k) || !(cart[k] > 0)) delete cart[k]; else if (isStory(k)) cart[k] = 1; });
  var save = function () { try { localStorage.setItem('lt-cart', JSON.stringify(cart)); } catch (e) {} };
  var drawer = document.getElementById('cart');
  var veil = document.querySelector('.drawer-veil');
  var euro = function (n) { return (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0 }) + ' €'; };
  var count = function () { return Object.keys(cart).reduce(function (a, k) { return a + cart[k]; }, 0); };
  var lastFocus = null;
  var recoTimer = null;
  // Une image propre à chaque complément : la carte, le livre en deux exemplaires, la bulle « +10 », le carnet à lignes.
  var ACC = {
    card: '<svg viewBox="0 0 40 48"><rect x="6" y="4" width="28" height="40" rx="3" fill="#fde7f1"/><rect x="6" y="26" width="28" height="18" rx="3" fill="#ffe0cc"/><g fill="#fa8216"><rect x="13" y="22" width="2.4" height="5" rx="1.2"/><rect x="16.6" y="19" width="2.4" height="11" rx="1.2"/><rect x="20.2" y="17.5" width="2.4" height="14" rx="1.2"/><rect x="23.8" y="21" width="2.4" height="7" rx="1.2"/><rect x="27.4" y="19.5" width="2.4" height="10" rx="1.2"/></g></svg>',
    copy: '<svg viewBox="0 0 40 48"><rect x="12" y="8" width="24" height="24" rx="2" fill="#e8ddd2"/><rect x="5" y="15" width="24" height="24" rx="2" fill="#f4ede6" stroke="#d6cabe"/><rect x="5" y="15" width="3" height="24" fill="#d6cabe"/><text x="17" y="31" font-size="9" font-family="Manrope,sans-serif" font-weight="800" fill="#5a2471" text-anchor="middle">×2</text></svg>',
    voix: '<svg viewBox="0 0 40 48"><path d="M6 12h28a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H17l-7 6v-6H6a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z" fill="#fde7f1"/><text x="20" y="27" font-size="11" font-family="Manrope,sans-serif" font-weight="800" fill="#5a2471" text-anchor="middle">+10</text></svg>',
    video: '<svg viewBox="0 0 40 48"><rect x="4" y="13" width="32" height="22" rx="3" fill="#fde7f1"/><path d="M17 19v10l9-5z" fill="#5a2471"/></svg>',
    lignes: '<svg viewBox="0 0 40 48"><rect x="8" y="5" width="26" height="38" rx="2" fill="#fff" stroke="#d6cabe"/><path d="M13 14h16M13 19h16M13 24h16M13 29h16M13 34h11" stroke="#e2d6dd" stroke-width="1.4"/><path d="M8 5v38" stroke="#ff2e7e" stroke-width="2"/></svg>'
  };
  var thumb = function (k, small) {
    var p = prod(k), kind = k === 'lignes' ? 'lignes' : p.kind;
    if (kind) return '<div class="thumb small acc-ico">' + ACC[kind] + '</div>';
    if (!p.img) return '<div class="thumb art' + (small ? ' small' : '') + '"><span class="onde" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><img class="logo" src="assets/favicon-192.png" alt=""></div>';
    return '<div class="thumb' + (small ? ' small' : '') + '"><img class="bg" src="' + PH + p.img + '" alt=""><img class="logo" src="assets/favicon-192.png" alt=""></div>';
  };
  var qty = function (k) { return '<div class="mini-qty"><button type="button" data-dec="' + k + '" aria-label="Un de moins">−</button><span>' + cart[k] + '</span><button type="button" data-inc="' + k + '" aria-label="Un de plus">+</button></div>'; };

  function renderCart() {
    var body = document.getElementById('cart-body'), foot = document.getElementById('cart-foot');
    if (!body) return;
    // Un complément sans son histoire n'a pas de sens : il part avec elle.
    Object.keys(cart).forEach(function (k) { var p = prod(k); if (!p || (p.parent && !cart[p.parent])) delete cart[k]; });
    var badge = document.querySelector('.cart-count');
    if (badge) { badge.hidden = count() === 0; badge.textContent = count(); }
    var stories = Object.keys(cart).filter(isStory);
    var topups = Object.keys(cart).filter(function (k) { return k.indexOf('ajoutvoix:') === 0 || k.indexOf('ajoutvideo:') === 0; });
    if (!stories.length && !cart.lignes && !topups.length) {
      body.innerHTML = '<p class="empty">Votre panier est vide.</p>';
      foot.innerHTML = '<a class="btn btn-ink" href="index.html#prix">Choisir un livre</a>';
      return;
    }
    var html = '', sub = 0;
    stories.forEach(function (k) {
      var p = prod(k); sub += p.price;
      html += '<div class="group"><div class="line">' + thumb(k) + '<div><b>' + p.name + '</b><small>' + p.note + '</small><button type="button" class="remove" data-dec="' + k + '">Retirer</button></div><span class="price">' + euro(p.price) + '</span></div>';
      var kids = ['carte_' + k, 'copie_' + k].concat(baseOf(k) === 'voeux' ? ['voix10_' + k] : []);
      kids.forEach(function (c) {
        if (!cart[c]) return;
        var q = prod(c); sub += q.price * cart[c];
        var ctl = q.max === 1 ? '<button type="button" class="remove" data-dec="' + c + '">Retirer</button>' : qty(c);
        html += '<div class="line sub">' + thumb(c, true) + '<div><b>' + q.name + '</b><small>' + q.note + '</small>' + ctl + '</div><span class="price' + (q.price ? '' : ' free') + '">' + (q.price ? euro(q.price * cart[c]) : 'Offerte') + '</span></div>';
      });
      // Les options pas encore choisies : une ligne claire, avec un vrai bouton « Ajouter ».
      var opt = function (c, title, sub2, price) {
        return '<div class="opt">' + thumb(c, true) + '<div><b>' + title + '</b><small>' + sub2 + '</small></div><button type="button" class="opt-add" data-inc="' + c + '"><span>' + price + '</span>Ajouter</button></div>';
      };
      var offers = [];
      if (!cart['carte_' + k]) offers.push(opt('carte_' + k, 'La carte cadeau', 'À imprimer ou à envoyer le jour même. Ajoutez-la pour la recevoir.', 'Offerte'));
      if (!cart['copie_' + k] && p.copy) offers.push(opt('copie_' + k, 'Un exemplaire en plus', 'Le même livre, pour un autre membre de la famille.', euro(p.copy)));
      if (baseOf(k) === 'voeux' && (cart['voix10_' + k] || 0) < 12) offers.push(opt('voix10_' + k, '10 voix de plus', 'Par tranche de 10, jusqu\'à 150 proches.', '15 €'));
      if (offers.length) html += '<div class="opts"><p class="opts-k">À ajouter si vous le souhaitez</p>' + offers.join('') + '</div>';
      html += '</div>';
    });
    // Lignes de vie : un livre papier, vendu seul.
    if (cart.lignes) {
      sub += 39 * cart.lignes;
      html += '<div class="group"><div class="line">' + thumb('lignes') + '<div><b>Lignes de vie</b><small>' + prod('lignes').note + '</small>' + qty('lignes') + '</div><span class="price">' + euro(39 * cart.lignes) + '</span></div></div>';
    }
    // Voix ou option vidéo pour un livre déjà en cours : seules (150 voix au plus en tout, vérifié par le serveur ; vidéo : une fois).
    topups.forEach(function (k) {
      var p = prod(k); sub += p.price * cart[k];
      var ctl = p.max === 1 ? '<button type="button" class="remove" data-dec="' + k + '">Retirer</button>' : qty(k);
      html += '<div class="group"><div class="line">' + thumb(k) + '<div><b>' + p.name + '</b><small>' + p.note + '</small>' + ctl + '</div><span class="price">' + euro(p.price * cart[k]) + '</span></div></div>';
    });
    body.innerHTML = html;
    var inBase = stories.map(baseOf).concat(stories);
    var reco = DEFAULTS.filter(function (k) { return inBase.indexOf(k) < 0 && inBase.indexOf(baseOf(k)) < 0; });
    var recoHtml = reco.length ? '<div class="cart-reco" aria-label="À offrir aussi"><p class="reco-k">Et pour quelqu\'un d\'autre ?</p><div class="reco-track">' + reco.map(function (k, i) {
      var p = prod(k);
      return '<div class="reco' + (i ? '' : ' on') + '">' + (p.img ? '<img src="' + PH + p.img + '" alt="">' : '<span class="reco-art" aria-hidden="true"></span>') + '<div><b>' + p.name.replace('Mémoire · ', '').replace(' · Anniversaire', '').replace(' · Voyage entre amis', '').replace(' · Sans vidéo', '') + '</b><small>' + p.pitch + '</small></div><button type="button" data-inc="' + k + '">' + euro(p.price) + ' · Ajouter</button></div>';
    }).join('') + '</div></div>' : '';
    foot.innerHTML = recoHtml + '<details class="promo-toggle"><summary>Vous avez un code ?</summary><form class="promo" onsubmit="event.preventDefault();this.querySelector(\'button\').textContent=\'Aperçu\'"><label for="promo" style="position:absolute;left:-9999px">Code</label><input id="promo" placeholder="Votre code" autocomplete="off"><button type="submit">Appliquer</button></form></details>' +
      '<div class="sum"><span>Livraison</span><span>Offerte en Europe</span></div>' +
      '<div class="sum total"><span>Total</span><span>' + euro(sub) + '</span></div>' +
      '<a class="btn btn-ink" href="merci.html">Finaliser la commande</a><p class="note" style="margin:0;text-align:center">Aperçu : le paiement Shopify viendra ici. Le bouton montre la page qui suit le paiement.</p>';
    clearInterval(recoTimer);
    var slides = foot.querySelectorAll('.reco');
    if (slides.length > 1 && !reduce) {
      var ri = 0;
      recoTimer = setInterval(function () { slides[ri].classList.remove('on'); ri = (ri + 1) % slides.length; slides[ri].classList.add('on'); }, 4000);
    }
  }
  function openCart() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    renderCart(); veil.hidden = false; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); drawer.focus();
  }
  function closeCart() {
    if (!drawer) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); veil.hidden = true;
    if (lastFocus) lastFocus.focus();
  }
  var addItem = function (k, n) {
    var p = prod(k);
    if (!p) return;
    var max = isStory(k) ? 1 : p.max || 99;
    cart[k] = Math.min(max, isStory(k) ? 1 : (cart[k] || 0) + (n || 1));
  };
  window.ltAddToCart = function (k, n) { addItem(k, n); save(); openCart(); };
  window.ltAddVideo = function (code, book) { videoFor[code] = book; window.ltAddToCart('ajoutvideo:' + code); };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open-cart],[data-close-cart],[data-inc],[data-dec]');
    if (!t) return;
    if (t.hasAttribute('data-open-cart')) openCart();
    else if (t.hasAttribute('data-close-cart')) closeCart();
    else if (t.dataset.inc) { addItem(t.dataset.inc); save(); renderCart(); }
    else if (t.dataset.dec) { var k = t.dataset.dec; cart[k] = Math.max(0, (cart[k] || 0) - 1); if (!cart[k]) delete cart[k]; save(); renderCart(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) closeCart(); });
  renderCart();
  if (location.hash === '#panier') openCart();

  // ---- Assistant de la page Aide (aperçu : réponses tirées de la FAQ, rien n'est envoyé) ----
  var chat = document.getElementById('assistant');
  if (chat) {
    var log = chat.querySelector('.log'), input = chat.querySelector('input');
    var faq = [].map.call(document.querySelectorAll('.faq-group details'), function (d) {
      return { q: d.querySelector('summary').textContent, a: d.querySelector('p').innerHTML };
    });
    var norm = function (t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' '); };
    var STOP = 'le la les un une des de du et a au aux en est il elle je tu vous on que qui quoi pour par sur ce ces mon ma mes son sa ses pas ne se plus comment est-ce'.split(' ');
    var words = function (t) { return norm(t).split(/\s+/).filter(function (w) { return w.length > 2 && STOP.indexOf(w) < 0; }); };
    var say = function (html, who) { var m = document.createElement('div'); m.className = 'msg ' + who; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; };
    var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var api = chat.dataset.endpoint, key = chat.dataset.key, email = '';
    var post = function (body) {
      return fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key }, body: JSON.stringify(body) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    };
    // « Transmettre à l'équipe » : on demande l'email une fois, puis on envoie la question et la réponse donnée.
    var handoff = function (box, q, ans, id) {
      var send = function () {
        box.innerHTML = '<span class="chat-wait">Envoi…</span>';
        post({ action: 'team', id: id, question: q, answer: ans, email: email, source: 'site' })
          .then(function () { box.innerHTML = 'Transmis : l\'équipe vous répond par email.'; })
          .catch(function () { box.innerHTML = 'L\'envoi n\'a pas abouti. Écrivez-nous à <a href="mailto:hello@memoreees.com">hello@memoreees.com</a>.'; });
      };
      if (email) return send();
      box.innerHTML = '<form class="chat-mail"><label for="cm' + id + '" style="position:absolute;left:-9999px">Votre email</label><input id="cm' + id + '" type="email" required placeholder="Votre email, pour la réponse" autocomplete="email"><button type="submit">Transmettre</button></form>';
      var f = box.querySelector('form');
      f.querySelector('input').focus();
      f.addEventListener('submit', function (e) { e.preventDefault(); email = f.querySelector('input').value.trim(); if (email) send(); });
    };
    var askLive = function (text) {
      var wait = document.createElement('div'); wait.className = 'msg bot chat-dots'; wait.setAttribute('aria-label', 'Réponse en cours'); wait.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(wait); log.scrollTop = log.scrollHeight;
      post({ question: text, source: 'site' }).then(function (r) {
        wait.remove();
        var m = document.createElement('div'); m.className = 'msg bot';
        m.innerHTML = '<div class="chat-answer"></div><button type="button" class="chat-team">' + (r.needs_team ? 'Transmettre à l\'équipe' : 'Pas la réponse attendue ? Transmettre à l\'équipe') + '</button>';
        m.querySelector('.chat-answer').textContent = r.answer || '';
        log.appendChild(m); log.scrollTop = log.scrollHeight;
        var btn = m.querySelector('.chat-team');
        btn.addEventListener('click', function () { var box = document.createElement('div'); box.className = 'chat-handoff'; btn.replaceWith(box); handoff(box, text, r.answer || '', r.id); });
      }).catch(function () {
        wait.remove();
        say('La réponse n\'a pas pu arriver. Réessayez dans un instant, ou écrivez-nous à <a href="mailto:hello@memoreees.com">hello@memoreees.com</a>.', 'bot');
      });
    };
    var ask = function (text) {
      if (!text.trim()) return;
      say(esc(text), 'me');
      if (api && key && window.fetch) return askLive(text);
      var w = words(text), best = null, score = 0;
      faq.forEach(function (f) {
        var fw = words(f.q + ' ' + f.a.replace(/<[^>]+>/g, ' '));
        var s = w.filter(function (x) { return fw.some(function (y) { return y.indexOf(x) === 0 || x.indexOf(y) === 0; }); }).length;
        if (s > score) { score = s; best = f; }
      });
      setTimeout(function () {
        if (best && score >= 1) say('<b>' + best.q + '</b><br>' + best.a + '<br><small style="color:var(--grey)">Cela répond-il à votre question ? Sinon, je transmets votre message à l\'équipe.</small>', 'bot');
        else say('Je n\'ai pas encore la réponse à cette question. Laissez votre email : je transmets votre message à l\'équipe, qui vous répond par email. <small style="color:var(--grey)">(Aperçu : rien n\'est envoyé.)</small>', 'bot');
      }, 350);
    };
    chat.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); input.value = ''; });
    chat.querySelectorAll('.suggest button').forEach(function (b) { b.addEventListener('click', function () { ask(b.textContent); }); });
  }
})();

// Hero d'accueil : la photo remonte exactement jusqu'au bandeau promo, quelle que soit la hauteur de l'en-tête.
(function () {
  var hero = document.querySelector('.has-hero .hero-top'), ann = document.querySelector('.annonce');
  if (!hero || !ann) return;
  var fit = function () {
    var m = parseFloat(getComputedStyle(hero).marginTop) || 0;
    var delta = hero.getBoundingClientRect().top - ann.getBoundingClientRect().bottom;
    if (Math.abs(delta) < 0.5) return;
    hero.style.marginTop = (m - delta) + 'px'; hero.style.paddingTop = (-(m - delta)) + 'px';
  };
  fit(); addEventListener('resize', fit); addEventListener('load', fit);
})();

// Page Vœux ouverte depuis l'app ou un email (?ajout=voix&projet=CODE) : on propose tout de suite d'ajouter des voix à ce projet.
(function () {
  var q = new URLSearchParams(location.search), code = String(q.get('projet') || '').trim().toUpperCase();
  if (q.get('ajout') !== 'voix' || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) || !window.ltAddToCart) return;
  var box = document.createElement('section');
  box.className = 'addvoices';
  box.innerHTML = '<div class="wrap"><div class="addvoices-card"><div><p class="kicker">Votre livre Vœux · projet ' + code + '</p>' +
    '<h2>Plus de proches veulent <em>laisser leur voix</em></h2>' +
    '<p>Ajoutez 10 voix à votre livre, autant de fois que nécessaire, jusqu\'à 150 voix en tout. Les invités en attente reçoivent aussitôt leur lien.</p></div>' +
    '<div class="addvoices-act"><b>15 €</b><span>les 10 voix</span><button class="btn btn-ink" type="button">Ajouter 10 voix</button></div></div></div>';
  box.querySelector('button').addEventListener('click', function () { window.ltAddToCart('ajoutvoix:' + code); });
  var main = document.querySelector('main') || document.body, hero = main.querySelector('.hero-top, .page-hero');
  if (hero && hero.parentNode) hero.parentNode.insertBefore(box, hero.nextSibling); else main.insertBefore(box, main.firstChild);
  setTimeout(function () { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
})();


// Grossesse ou L'année de votre enfant ouverte depuis l'app (?ajout=video&projet=CODE) : on propose d'ajouter l'option vidéo à ce livre.
(function () {
  var q = new URLSearchParams(location.search), code = String(q.get('projet') || '').trim().toUpperCase();
  var page = /annee-enfant/.test(location.pathname) ? 'annee' : /grossesse/.test(location.pathname) ? 'grossesse' : '';
  if (q.get('ajout') !== 'video' || !page || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) || !window.ltAddToCart) return;
  var T = page === 'annee'
    ? { k: 'Votre livre L\'année de votre enfant · projet ', h: 'Ajouter les vidéos <em>à votre livre</em>', p: 'L\'option vidéo de l\'année 1 : 12 vidéos d\'une minute, une par mois, chacune imprimée en QR code dans le livre. La fonction s\'ouvre dans l\'app dès la commande. Les années 2 à 6 n\'ont pas de vidéo.', price: 30 }
    : { k: 'Votre journal Grossesse · projet ', h: 'Ajouter les vidéos <em>à votre livre</em>', p: '4 vidéos d\'une minute, chacune imprimée en QR code dans le livre. La fonction s\'ouvre dans l\'app dès la commande.', price: 20 };
  var box = document.createElement('section');
  box.className = 'addvoices';
  box.innerHTML = '<div class="wrap"><div class="addvoices-card"><div><p class="kicker">' + T.k + code + '</p>' +
    '<h2>' + T.h + '</h2><p>' + T.p + '</p></div>' +
    '<div class="addvoices-act"><b>' + T.price + ' €</b><span>l\'option vidéo</span><button class="btn btn-ink" type="button">Ajouter les vidéos</button></div></div></div>';
  box.querySelector('button').addEventListener('click', function () {
    var m = {};
    try { m = JSON.parse(localStorage.getItem('lt-ajoutvideo') || '{}') || {}; } catch (e) { m = {}; }
    m[code] = page;
    try { localStorage.setItem('lt-ajoutvideo', JSON.stringify(m)); } catch (e) {}
    window.ltAddVideo(code, page);
  });
  var main = document.querySelector('main') || document.body, hero = main.querySelector('.hero-top, .page-hero');
  if (hero && hero.parentNode) hero.parentNode.insertBefore(box, hero.nextSibling); else main.insertBefore(box, main.firstChild);
  setTimeout(function () { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
})();
