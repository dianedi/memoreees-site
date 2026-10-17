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

  // ---- Panier latéral (aperçu : le panier reste dans ce navigateur ; la page commande.html lit ltCartItems()) ----
  // 17/10 (TABLEAU-MACRO, blocs 1, 5 et 8) : six produits, une seule taille et un seul prix chacun. Les clés du panier sont
  // exactement les SKU lus par le serveur (supabase/functions/shopify-order/order.ts) :
  //   memoire:vie · memoire:racines (119 €) · carnet (69 €) · grossesse (89 €) · annee:1 … annee:6 (89 € l'année) · famille (129 €)
  //   voeux:<anniversaire|mariage|depart>:<petit|moyen|grand> (29 / 49 / 69 €) · pack (159 €)
  // Suppléments, rattachés au premier livre du panier ou à un livre en cours (propriété « Projet » = son code) :
  //   voix-10 (12 €, Vœux, jusqu'à 150 voix) · pages-16 (12 €, toujours avec « Projet », jusqu'à 160 pages) · exemplaire (39 € ; Vœux 15 / 29 / 39)
  // Plus de carte cadeau en ligne de panier (offerte, préparée sur la page de confirmation), plus d'option vidéo.
  var PH = 'assets/photos/';
  var VOEUX_OCC = { anniversaire: 'Anniversaire', mariage: 'Mariage', depart: 'Un départ' };
  var VOEUX_TAILLE = { petit: { nom: '5 à 20 voix, fascicule', price: 29, copy: 15, pages: '8 à 24 pages' }, moyen: { nom: '40 voix, relié', price: 49, copy: 29, pages: '44 pages' }, grand: { nom: '60 voix, relié', price: 69, copy: 39, pages: '64 pages' } };
  var VOEUX_IMG = { anniversaire: 'anniversaire-gateau.jpg', mariage: 'mariage-couple.jpg', depart: 'fete-champagne.jpg' };
  var BASE = {
    'memoire:vie': { name: 'Mémoires · Une vie', note: '1 voix · 128 pages · 24 photos', price: 119, img: 'hero-1.jpg', copy: 39, pitch: 'Toute une vie racontée de sa voix.' },
    'memoire:racines': { name: 'Mémoires · Nos racines', note: '1 voix · 128 pages · 24 photos', price: 119, img: 'anciennes-photos.jpg', copy: 39, pitch: "Les origines de la famille, avant qu'elles se perdent." },
    carnet: { name: 'Carnet de voyage', note: '1 voix ou plusieurs · 64 pages · 16 photos', price: 69, img: 'hero-3.jpg', copy: 39, pitch: 'Un voyage raconté au fil des jours.' },
    grossesse: { name: "En t'attendant", note: '1 ou 2 parents · 96 pages · 24 photos', price: 89, img: 'grossesse-robe-rouge.jpg', copy: 39, pitch: "L'attente, racontée à l'enfant." },
    annee: { name: 'Tes premières années', note: '1 ou 2 parents · 96 pages · 24 photos', price: 89, img: 'annee-balancoire.jpg', copy: 39, pitch: 'Une année de sa vie, par ses parents.' },
    famille: { name: 'Notre année', note: 'toute la famille · 128 pages · 24 photos', price: 129, img: 'famille-canape.jpg', copy: 39, pitch: 'Douze mois racontés par tous.' },
    voeux: { name: 'Vœux', note: '1 page par voix', price: 29, img: 'anniversaire-gateau.jpg', copy: 15, pitch: 'Les mots de ses proches, de leur voix.' },
    pack: { name: "Pack En t'attendant + Tes premières années", note: "Deux livres : l'attente, puis l'année 1 · au lieu de 178 €", price: 159, img: 'naissance-pieds-coeur.jpg', copy: null, pitch: "L'attente, puis sa première année." }
  };
  var ANNEES = { '1': 'Année 1', '2': 'Année 2', '3': 'Année 3', '4': 'Année 4', '5': 'Année 5', '6': 'Année 6' };
  var baseOf = function (k) { return String(k).split(':')[0]; };
  // Un livre du panier : { name, note, price, img, copy, pitch } ou null si la clé est inconnue.
  var prod = function (k) {
    var parts = String(k).split(':'), b = parts[0];
    if (b === 'voeux') {
      var occ = VOEUX_OCC[parts[1]], taille = VOEUX_TAILLE[parts[2]];
      if (!occ || !taille) return null;
      return { name: 'Vœux · ' + occ, note: taille.nom + ' · ' + taille.pages, price: taille.price, img: VOEUX_IMG[parts[1]], copy: taille.copy, pitch: BASE.voeux.pitch, voeux: true };
    }
    if (b === 'memoire') return parts[1] === 'vie' || parts[1] === 'racines' ? BASE[k] : null;
    if (b === 'annee') { if (!ANNEES[parts[1]]) return null; var r = {}; for (var f in BASE.annee) r[f] = BASE.annee[f]; r.name += ' · ' + ANNEES[parts[1]]; return r; }
    if (parts.length > 1) return null;
    return BASE[b] || null;
  };
  var isStory = function (k) { return !!prod(k); };
  var SUPP = { 'voix-10': { name: '10 voix de plus', note: 'Par tranche de 10, jusqu’à 150 voix', price: 12, voeux: true },
               'pages-16': { name: '16 pages de plus', note: 'Environ 50 minutes de voix de plus, jusqu’à 160 pages', price: 12 },
               exemplaire: { name: 'Un exemplaire en plus', note: 'Imprimé en même temps, dans le même colis', price: 39 } };
  // Sélecteur à pastilles (tarifs, pages produits) : on choisit le thème, l'occasion ou la taille, puis on ajoute directement.
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('.pick [data-v]');
    if (chip) {
      chip.parentNode.querySelectorAll('[data-v]').forEach(function (c) { c.setAttribute('aria-pressed', c === chip); });
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
    var pick = go.closest('.pick'), key = pick.dataset.key || '';
    pick.querySelectorAll('.chips-pick').forEach(function (g) { var on = g.querySelector('[data-v][aria-pressed="true"]'); key = key.replace('{' + (g.dataset.part || 'v') + '}', on ? on.dataset.v : ''); });
    window.ltAddToCart(key);
  });
  var DEFAULTS = ['memoire:vie', 'memoire:racines', 'famille', 'annee:1', 'carnet', 'grossesse', 'voeux:anniversaire:petit'];
  // Le panier : { clé: { q, props } } ; un livre ne s'ajoute qu'une fois ; les suppléments ont une quantité et des propriétés.
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem('lt-cart') || '{}') || {}; } catch (e) { cart = {}; }
  var ligne = function (k) { var l = cart[k]; if (typeof l === 'number') l = cart[k] = { q: l, props: {} }; return l; };
  Object.keys(cart).forEach(function (k) { var l = ligne(k); if (!(l && l.q > 0) || !(isStory(k) || SUPP[baseOf(k)])) delete cart[k]; else if (isStory(k)) l.q = 1; });
  var save = function () { try { localStorage.setItem('lt-cart', JSON.stringify(cart)); } catch (e) {} };
  var drawer = document.getElementById('cart');
  var veil = document.querySelector('.drawer-veil');
  var euro = function (n) { return (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0 }) + ' €'; };
  var count = function () { return Object.keys(cart).reduce(function (a, k) { return a + ligne(k).q; }, 0); };
  var stories = function () { return Object.keys(cart).filter(isStory); };
  var lastFocus = null;
  var recoTimer = null;
  var ACC = {
    exemplaire: '<svg viewBox="0 0 40 48"><rect x="12" y="8" width="24" height="24" rx="2" fill="#e8ddd2"/><rect x="5" y="15" width="24" height="24" rx="2" fill="#f4ede6" stroke="#d6cabe"/><rect x="5" y="15" width="3" height="24" fill="#d6cabe"/><text x="17" y="31" font-size="9" font-family="Manrope,sans-serif" font-weight="800" fill="#5a2471" text-anchor="middle">×2</text></svg>',
    'voix-10': '<svg viewBox="0 0 40 48"><path d="M6 12h28a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H17l-7 6v-6H6a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z" fill="#fde7f1"/><text x="20" y="27" font-size="11" font-family="Manrope,sans-serif" font-weight="800" fill="#5a2471" text-anchor="middle">+10</text></svg>',
    'pages-16': '<svg viewBox="0 0 40 48"><rect x="9" y="6" width="22" height="30" rx="2" fill="#fde7f1"/><path d="M14 14h12M14 19h12M14 24h8" stroke="#e2b9cc" stroke-width="1.4"/><circle cx="29" cy="35" r="8" fill="#5a2471"/><path d="M29 31v8M25 35h8" stroke="#fff" stroke-width="2"/></svg>'
  };
  var thumb = function (k, small) {
    var p = prod(k);
    if (!p) return '<div class="thumb small acc-ico">' + (ACC[baseOf(k)] || '') + '</div>';
    return '<div class="thumb' + (small ? ' small' : '') + '"><img class="bg" src="' + PH + p.img + '" alt=""><img class="logo" src="assets/favicon-192.png" alt=""></div>';
  };
  var qty = function (k) { return '<div class="mini-qty"><button type="button" data-dec="' + k + '" aria-label="Un de moins">−</button><span>' + ligne(k).q + '</span><button type="button" data-inc="' + k + '" aria-label="Un de plus">+</button></div>'; };
  // Le prix d'un exemplaire en plus suit le livre auquel il est rattaché (le premier du panier, ou le livre en cours « Projet »).
  var prixSupp = function (k) {
    var b = baseOf(k), s = SUPP[b], l = ligne(k), st = stories();
    if (b !== 'exemplaire') return s.price;
    if (l.props && l.props.Taille) return VOEUX_TAILLE[l.props.Taille] ? VOEUX_TAILLE[l.props.Taille].copy : 39;
    var p = st.length ? prod(st[0]) : null;
    return p && p.copy ? p.copy : 39;
  };
  function renderCart() {
    var body = document.getElementById('cart-body'), foot = document.getElementById('cart-foot');
    if (!body) return;
    var st = stories();
    // Un supplément sans livre dans le panier n'a de sens que pour un livre en cours (propriété « Projet »).
    Object.keys(cart).forEach(function (k) { var b = baseOf(k); if (SUPP[b] && !st.length && !ligne(k).props.Projet) delete cart[k]; if (b === 'voix-10' && !ligne(k).props.Projet && !st.some(function (s) { return baseOf(s) === 'voeux'; })) delete cart[k]; });
    var badge = document.querySelector('.cart-count');
    if (badge) { badge.hidden = count() === 0; badge.textContent = count(); }
    var supps = Object.keys(cart).filter(function (k) { return !!SUPP[baseOf(k)]; });
    if (!st.length && !supps.length) {
      body.innerHTML = '<p class="empty">Votre panier est vide.</p>';
      foot.innerHTML = '<a class="btn btn-ink" href="index.html#prix">Choisir un livre</a>';
      return;
    }
    var html = '', sub = 0;
    st.forEach(function (k) {
      var p = prod(k); sub += p.price;
      html += '<div class="group"><div class="line">' + thumb(k) + '<div><b>' + p.name + '</b><small>' + p.note + '</small><button type="button" class="remove" data-dec="' + k + '">Retirer</button></div><span class="price">' + euro(p.price) + '</span></div></div>';
    });
    supps.forEach(function (k) {
      var s = SUPP[baseOf(k)], l = ligne(k), prix = prixSupp(k);
      sub += prix * l.q;
      var note = s.note + (l.props.Projet ? ' · pour votre livre en cours ' + l.props.Projet : '');
      html += '<div class="group"><div class="line">' + thumb(k) + '<div><b>' + s.name + '</b><small>' + note + '</small>' + qty(k) + '</div><span class="price">' + euro(prix * l.q) + '</span></div></div>';
    });
    // Les suppléments pas encore choisis, pour les livres du panier
    var offers = [];
    var opt = function (c, title, sub2, price) { return '<div class="opt">' + thumb(c, true) + '<div><b>' + title + '</b><small>' + sub2 + '</small></div><button type="button" class="opt-add" data-inc="' + c + '"><span>' + price + '</span>Ajouter</button></div>'; };
    if (st.length) {
      if (!cart.exemplaire && prod(st[0]).copy) offers.push(opt('exemplaire', 'Un exemplaire en plus', 'Le même livre, pour un autre membre de la famille. Dans le même colis.', euro(prod(st[0]).copy)));
      var v = st.filter(function (s) { return baseOf(s) === 'voeux'; })[0];
      if (v && !cart['voix-10']) offers.push(opt('voix-10', '10 voix de plus', 'Par tranche de 10, jusqu’à 150 voix.', '12 €'));
    }
    if (offers.length) html += '<div class="opts"><p class="opts-k">À ajouter si vous le souhaitez</p>' + offers.join('') + '</div>';
    body.innerHTML = html;
    var inBase = st.map(baseOf).concat(st);
    var reco = DEFAULTS.filter(function (k) { return inBase.indexOf(k) < 0 && inBase.indexOf(baseOf(k)) < 0; });
    var recoHtml = reco.length ? '<div class="cart-reco" aria-label="À offrir aussi"><p class="reco-k">Et pour quelqu’un d’autre ?</p><div class="reco-track">' + reco.map(function (k, i) {
      var p = prod(k);
      return '<div class="reco' + (i ? '' : ' on') + '"><img src="' + PH + p.img + '" alt=""><div><b>' + p.name.replace(' · Anniversaire', '') + '</b><small>' + p.pitch + '</small></div><button type="button" data-inc="' + k + '">' + euro(p.price) + ' · Ajouter</button></div>';
    }).join('') + '</div></div>' : '';
    foot.innerHTML = recoHtml + '<details class="promo-toggle"><summary>Vous avez un code ?</summary><form class="promo" onsubmit="event.preventDefault();this.querySelector(\'button\').textContent=\'Aperçu\'"><label for="promo" style="position:absolute;left:-9999px">Code</label><input id="promo" placeholder="Votre code" autocomplete="off"><button type="submit">Appliquer</button></form></details>' +
      '<div class="sum"><span>Livraison</span><span>Incluse, partout en Europe</span></div>' +
      '<div class="sum total"><span>Total</span><span>' + euro(sub) + '</span></div>' +
      '<a class="btn btn-ink" href="commande.html">Finaliser la commande</a><p class="note" style="margin:0;text-align:center">La carte cadeau se prépare juste après, sur la page de confirmation.</p>';
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
  var addItem = function (k, n, props) {
    var b = baseOf(k);
    if (!isStory(k) && !SUPP[b]) return;
    if (isStory(k)) { cart[k] = { q: 1, props: props || {} }; return; }
    var l = cart[k] || (cart[k] = { q: 0, props: props || {} });
    if (props) for (var f in props) l.props[f] = props[f];
    var max = b === 'voix-10' ? 13 : b === 'pages-16' ? 8 : 9;
    l.q = Math.min(max, l.q + (n || 1));
  };
  window.ltAddToCart = function (k, n, props) { addItem(k, n, props); save(); openCart(); };
  // Liens de l'app pour un livre en cours (bloc 5) : des voix ou des pages en plus, un exemplaire en plus. props : { Projet, Taille }.
  window.ltAddSupplement = function (sku, code, props) { var p = props || {}; p.Projet = code; window.ltAddToCart(sku, 1, p); };
  // Pour la page de commande : les lignes du panier telles que le serveur les lit (clé = SKU, quantité, propriétés de ligne).
  window.ltCartItems = function () {
    return Object.keys(cart).map(function (k) { var l = ligne(k); var props = {}; for (var f in l.props) if (l.props[f]) props[f] = l.props[f]; return { key: k, quantity: l.q, properties: props }; });
  };
  window.ltCartClear = function () { cart = {}; save(); renderCart(); };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open-cart],[data-close-cart],[data-inc],[data-dec]');
    if (!t) return;
    if (t.hasAttribute('data-open-cart')) openCart();
    else if (t.hasAttribute('data-close-cart')) closeCart();
    else if (t.dataset.inc) { addItem(t.dataset.inc); save(); renderCart(); }
    else if (t.dataset.dec) { var k = t.dataset.dec; if (cart[k]) { ligne(k).q -= 1; if (ligne(k).q <= 0 || isStory(k)) delete cart[k]; } save(); renderCart(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) closeCart(); });
  renderCart();
  if (location.hash === '#panier') openCart();
  // Lien de l'app : ?ajout=pages-16&projet=CODE (ou voix-10, exemplaire&taille=petit) ouvre le panier avec le supplément.
  var qs = new URLSearchParams(location.search);
  if (qs.get('ajout') && SUPP[qs.get('ajout')]) window.ltAddSupplement(qs.get('ajout'), (qs.get('projet') || '').toUpperCase(), qs.get('taille') ? { Taille: qs.get('taille') } : null);

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
    '<div class="addvoices-act"><b>10 €</b><span>les 10 voix</span><button class="btn btn-ink" type="button">Ajouter 10 voix</button></div></div></div>';
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

// Page d'un livre ouverte depuis l'app (?ajout=pages&projet=CODE, 13/10) : le livre est presque plein, on propose
// d'ajouter du temps de voix et des pages (tous les livres sauf les Vœux ; deux ajouts au plus, vérifié par le serveur).
(function () {
  var q = new URLSearchParams(location.search), code = String(q.get('projet') || '').trim().toUpperCase();
  var m = /([a-z-]+)\.html$/.exec(location.pathname), page = m ? m[1] : '';
  var unit = ['memoire', 'ma-vie', 'mes-ancetres', 'un-temps-fort', 'chronique', 'annee-enfant'].indexOf(page) >= 0 ? '29'
    : ['recit', 'voyage-solo', 'grossesse'].indexOf(page) >= 0 ? '19' : '';
  if (q.get('ajout') !== 'pages' || !unit || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) || !window.ltAddPages) return;
  var T = unit === '29'
    ? { h: '+ 1 h de voix, <em>environ 20 pages</em>', price: 29 }
    : { h: '+ 30 min de voix, <em>environ 10 pages</em>', price: 19 };
  var box = document.createElement('section');
  box.className = 'addvoices';
  box.innerHTML = '<div class="wrap"><div class="addvoices-card"><div><p class="kicker">Ajouter du temps à votre livre · projet ' + code + '</p>' +
    '<h2>' + T.h + '</h2><p>Votre livre est presque plein. Ajoutez du temps pour continuer à raconter : la jauge s\'agrandit dans l\'app dès la commande, et le livre gagne des pages. Deux ajouts au plus par livre.</p></div>' +
    '<div class="addvoices-act"><b>' + T.price + ' €</b><span>par ajout</span><button class="btn btn-ink" type="button">Ajouter du temps</button></div></div></div>';
  box.querySelector('button').addEventListener('click', function () { window.ltAddPages(code, unit); });
  var main = document.querySelector('main') || document.body, hero = main.querySelector('.hero-top, .page-hero');
  if (hero && hero.parentNode) hero.parentNode.insertBefore(box, hero.nextSibling); else main.insertBefore(box, main.firstChild);
  setTimeout(function () { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
})();
