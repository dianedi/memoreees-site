"""Assemble le site d'aperçu Memoreees : chaque page de src/ reçoit l'en-tête, le pied de page et les métadonnées communs.

Une page de src/ commence par un commentaire de métadonnées :
<!-- title: Titre de la page | description: Phrase pour Google | nav: comment -->
puis le contenu de <main>. Le résultat est écrit à la racine du dossier site/ (servi tel quel par GitHub Pages).

Depuis le 17/10 (TABLEAU-MACRO.md) : le catalogue (PRODUITS), les pages d'occasion de l'onglet Offrir (OCCASIONS, bloc 8, écrites
par ce script) et les redirections des anciennes pages (REDIRECTIONS) vivent ici.

Usage : python3 site/build.py
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
BRAND = "Memoreees"

# Logo : deux versions qui alternent toutes les 3 secondes (le mot seul, puis le mot avec l'onde).
LOGO = ('<span class="brand" role="img" aria-label="Memoreees">'
        '<img class="va dark" src="assets/logo-a.png" alt="" width="929" height="105"><img class="vb dark" src="assets/logo-b.png" alt="" width="1269" height="250">'
        '<img class="va light" src="assets/logo-a-white.png" alt="" width="929" height="105"><img class="vb light" src="assets/logo-b-white.png" alt="" width="1269" height="250"></span>')
ONDE = '<span class="onde" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>'

# Bouton « Écrire / Offrir une histoire », le même que dans l'en-tête (le mot qui tourne, « Offrir » en orange)
CTA = '<a class="btn btn-ink btn-roll" href="carte-cadeau.html" aria-label="Écrire ou offrir une histoire"><span class="roll r-btn" aria-hidden="true"><span><em>Écrire</em><em class="o">Offrir</em><em>Écrire</em></span></span>une histoire</a>'
STORES = ('<div class="stores">'
          '<a class="store apple" href="application.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8C7 7.3 5.6 8.2 4.8 9.6c-1.6 2.8-.4 6.9 1.2 9.2.8 1.1 1.7 2.3 2.9 2.3 1.2-.1 1.6-.8 3-.8s1.8.8 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.6-1-2.6-3.6zM14.2 5.6c.6-.8 1.1-1.8 1-2.9-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2-.5 2.7-1.3z"/></svg><span><small>Télécharger dans</small><b>l\'App Store</b></span></a>'
          '<a class="store google" href="application.html"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#00d7fe" d="M3.6 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l9.5-9.7z"/><path fill="#ffce00" d="M16.3 15.2 13.1 12l3.2-3.2 3.8 2.2c1.1.6 1.1 1.6 0 2.2z"/><path fill="#ff3a44" d="M16.3 15.2 13.1 12l-9.5 9.7c.4.4 1 .4 1.7 0z"/><path fill="#00f076" d="M16.3 8.8 5.3 2.3c-.7-.4-1.3-.4-1.7 0l9.5 9.7z"/></svg><span><small>Disponible sur</small><b>Google Play</b></span></a>'
          '</div>')

NAV = [
    ("comment", "comment-ca-marche.html", "Comment ça marche"),
    ("app", "application.html", "L'application"),
    ("livres", "index.html#livres", "Les livres"),
    ("offrir", "carte-cadeau.html", "Offrir"),
]

# Messages du bandeau (validés le 08/10), fixes : tous visibles sur grand écran, un à la fois en fondu sur mobile. Alma : à installer sur la boutique avant la mise en ligne.
BANNER = [
    "Livraison incluse, partout en Europe",
    "Satisfait ou remboursé",
    "Paiement en 3x avec Alma",
]

# Le catalogue (TABLEAU-MACRO, blocs 1 et 5, 17/10) : six produits, une seule taille et un seul prix chacun.
# clé = clé du panier (SKU lus par le serveur), page, nom, prix, photo, une phrase, à qui on l'offre.
PRODUITS = {
    "memoire:vie": {"page": "une-vie.html", "nom": "Mémoires · Une vie", "court": "Une vie", "prix": 119, "photo": "hero-1.jpg",
                    "pitch": "Toute une vie, racontée de sa voix : l'enfance, les amours, le travail, ce qu'on transmet.",
                    "specs": "1 voix · 128 pages · 24 photos", "pour": "un parent, un grand-parent"},
    "memoire:racines": {"page": "nos-racines.html", "nom": "Mémoires · Nos racines", "court": "Nos racines", "prix": 119, "photo": "anciennes-photos.jpg",
                        "pitch": "Les parents, les grands-parents, les origines, les secrets de famille, en remontant l'arbre.",
                        "specs": "1 voix · 128 pages · 24 photos", "pour": "celui qui sait, dans la famille"},
    "carnet": {"page": "carnet-de-voyage.html", "nom": "Carnet de voyage", "court": "Carnet de voyage", "prix": 69, "photo": "hero-3.jpg",
               "pitch": "Un voyage, seul ou à plusieurs, raconté au fil des jours, étape par étape.",
               "specs": "1 voix ou plusieurs · 64 pages · 16 photos", "pour": "celui qui part"},
    "grossesse": {"page": "en-t-attendant.html", "nom": "En t'attendant", "court": "En t'attendant", "prix": 89, "photo": "grossesse-robe-rouge.jpg",
                  "pitch": "L'attente d'un enfant, racontée par ses parents, en s'adressant à lui.",
                  "specs": "1 ou 2 parents · 96 pages · 24 photos", "pour": "de futurs parents"},
    "annee:1": {"page": "tes-premieres-annees.html", "nom": "Tes premières années", "court": "Tes premières années", "prix": 89, "photo": "annee-balancoire.jpg",
                "pitch": "Une année de l'enfant, racontée par ses parents : l'année 1, puis chaque année jusqu'à 6 ans.",
                "specs": "1 ou 2 parents · 96 pages · 24 photos", "pour": "de jeunes parents"},
    "famille": {"page": "notre-annee.html", "nom": "Notre année", "court": "Notre année", "prix": 129, "photo": "famille-canape.jpg",
                "pitch": "Les douze mois d'une famille, racontés par tous, petits et grands.",
                "specs": "toute la famille · 128 pages · 24 photos", "pour": "une famille"},
    "voeux:anniversaire:petit": {"page": "voeux.html", "nom": "Vœux · Anniversaire", "court": "Vœux", "prix": 29, "photo": "anniversaire-gateau.jpg",
                                 "pitch": "Les mots de ses proches, de leur voix, une page chacun : 5 à 20 voix, ou 40, ou 60.",
                                 "specs": "5 à 20 voix · 1 page par voix", "pour": "la personne qu'on fête"},
    "voeux:mariage:moyen": {"page": "voeux.html#mariage", "nom": "Vœux · Mariage", "court": "Vœux", "prix": 49, "photo": "mariage-couple.jpg",
                            "pitch": "Les témoins, la famille, les amis laissent aux mariés un souvenir, un mot, un vœu, de leur voix.",
                            "specs": "40 voix · 1 page par voix", "pour": "les mariés"},
    "voeux:depart:moyen": {"page": "voeux.html#depart", "nom": "Vœux · Un départ", "court": "Vœux", "prix": 49, "photo": "fete-champagne.jpg",
                           "pitch": "Une retraite, un collègue qui part, une nouvelle vie : les mots de ceux qui restent.",
                           "specs": "40 voix · 1 page par voix", "pour": "celui qui part"},
    "pack": {"page": "en-t-attendant.html#pack", "nom": "Pack En t'attendant + Tes premières années", "court": "Le pack", "prix": 159, "photo": "naissance-pieds-coeur.jpg",
             "pitch": "L'attente, puis la première année : deux livres, la naissance racontée une seule fois.",
             "specs": "2 livres · 96 pages chacun", "pour": "un bébé qui arrive"},
}

# Les occasions de l'onglet Offrir (TABLEAU-MACRO, bloc 8) : les produits proposés, dans l'ordre, le premier mis en avant.
# Noël et la fête des grands-mères ont leur page écrite à la main (offrir-noel.html, fete-des-grands-meres.html) ; les autres
# sont écrites par ce script (page_occasion), avec deux présentations qui alternent.
OCCASIONS = [
    {"page": "offrir-anniversaire.html", "nav": "Un anniversaire", "titre": "Un anniversaire", "accroche": "Pour ses 30, 50, 80 ans : <em>des voix, pas des objets</em>",
     "description": "Idée de cadeau d'anniversaire : les vœux de ses proches de vive voix dans un livre, ou le livre de sa vie. Carte cadeau à imprimer tout de suite.",
     "photo": "anniversaire-gateau.jpg", "lead": "Un anniversaire, c'est le jour où l'on a envie de dire à quelqu'un ce qu'il représente. Ici, chacun le dit de sa voix, et tout tient dans un livre qu'on garde.",
     "produits": [("voeux:anniversaire:petit", "Le livre des vœux de ses proches, prêt pour le jour J."), ("memoire:vie", "Un anniversaire rond : le moment de raconter toute une vie."),
                  ("annee:1", "L'anniversaire d'un enfant de 1 à 6 ans : l'année qu'il vient de vivre, par ses parents."), ("carnet", "Le voyage qu'on lui offre, raconté au retour."),
                  ("grossesse", "Si elle attend un bébé : neuf mois à lui raconter.")]},
    {"page": "offrir-mariage.html", "nav": "Un mariage", "titre": "Un mariage", "accroche": "Les vœux des témoins, <em>de leur voix</em>",
     "description": "Cadeau de mariage : les témoins, la famille et les amis laissent aux mariés un souvenir, un mot, un vœu, de vive voix, dans un livre.",
     "photo": "mariage-haie.jpg", "lead": "Le discours des témoins s'oublie, les messages se perdent. Dans ce livre, chacun a sa page, et chaque page se réécoute.",
     "produits": [("voeux:mariage:moyen", "Quarante voix, une page chacune, le QR code pour les entendre. Les prénoms des mariés sur la couverture.")]},
    {"page": "offrir-bebe.html", "nav": "Un bébé qui arrive", "titre": "Un bébé qui arrive", "accroche": "Neuf mois à l'attendre, <em>puis sa première année</em>",
     "description": "Cadeau pour de futurs parents : le journal de l'attente, puis celui de la première année, racontés de vive voix à leur enfant.",
     "photo": "grossesse-coeur-ventre.jpg", "lead": "Les futurs parents n'ont pas le temps d'écrire. Ils ont celui de parler, le soir, à l'enfant qui arrive. Le livre, lui, restera.",
     "produits": [("grossesse", "L'attente, mois après mois, en s'adressant à l'enfant."), ("annee:1", "Puis l'année 1 : la naissance, les premières fois, trois vidéos."), ("pack", "Les deux livres ensemble, 159 € au lieu de 178.")]},
    {"page": "offrir-naissance.html", "nav": "Une naissance", "titre": "Une naissance", "accroche": "Sa première année, <em>racontée par ses parents</em>",
     "description": "Cadeau de naissance : les parents racontent la première année de leur enfant de vive voix, mois après mois, avec la naissance en ouverture.",
     "photo": "naissance-pieds-coeur.jpg", "lead": "Le livre s'ouvre sur le jour de sa naissance et le monde ce jour-là. Puis douze mois, un chapitre chacun, avec les premières fois.",
     "produits": [("annee:1", "L'année 1 : la naissance, puis chaque mois, par ses parents, avec trois vidéos.")]},
    {"page": "offrir-depart.html", "nav": "Un départ", "titre": "Un départ", "accroche": "Une retraite, un collègue qui part : <em>les mots de ceux qui restent</em>",
     "description": "Cadeau de départ à la retraite ou pot de départ : les vœux des collègues et des proches de vive voix, dans un livre. Ou le grand voyage, ou le moment de raconter sa vie.",
     "photo": "fete-champagne.jpg", "lead": "Un départ, c'est des gens qui ont quelque chose à dire et pas le temps de le dire. Ici, chacun prend trois minutes, de sa voix.",
     "produits": [("voeux:depart:moyen", "Les vœux des collègues et des proches, une page chacun."), ("carnet", "Le grand voyage qui commence, raconté étape par étape."), ("memoire:vie", "Le moment de raconter toute une vie.")]},
    {"page": "offrir-voyage.html", "nav": "Un voyage", "titre": "Un voyage", "accroche": "Le carnet qu'on n'a jamais <em>le temps d'écrire</em>",
     "description": "Cadeau pour un voyage : le carnet de voyage raconté de vive voix, étape par étape, seul ou à plusieurs, avec les photos et la voix à réécouter.",
     "photo": "hero-3.jpg", "lead": "Au troisième jour, le carnet reste au fond du sac. Parler, c'est plus facile : deux minutes le soir, et rien ne se perd.",
     "produits": [("carnet", "Un voyage, seul ou à plusieurs, au fil des jours : 64 pages, 16 photos, une par étape.")]},
    {"page": "fete-des-meres.html", "nav": "Fête des mères", "titre": "La fête des mères", "accroche": "Cette année, <em>demandez-lui de raconter</em>",
     "description": "Cadeau de fête des mères : le livre de sa vie, raconté de sa voix, ou les mots de toute la famille dans un livre de vœux.",
     "photo": "famille-allee.jpg", "lead": "On connaît ses recettes et ses expressions. Sait-on comment elle a rencontré notre père, ce qu'elle rêvait de faire à vingt ans ?",
     "produits": [("memoire:vie", "Toute sa vie, une question à la fois, de sa voix."), ("voeux:anniversaire:petit", "Les mots de la famille, une page chacun."),
                  ("memoire:racines", "Les origines de la famille, qu'elle est souvent seule à connaître."), ("annee:1", "Pour une jeune maman : l'année de son enfant."), ("grossesse", "Pour une future maman : l'attente, racontée à l'enfant.")]},
    {"page": "fete-des-peres.html", "nav": "Fête des pères", "titre": "La fête des pères", "accroche": "Ce qu'il n'a jamais <em>pensé à raconter</em>",
     "description": "Cadeau de fête des pères : le livre de sa vie, raconté de sa voix, ou les mots de toute la famille dans un livre de vœux.",
     "photo": "commerce-ancien.jpg", "lead": "Sa jeunesse avant nous, ses choix, ses doutes. Tout ce qu'il n'a jamais raconté, parce que personne ne l'avait demandé.",
     "produits": [("memoire:vie", "Toute sa vie, une question à la fois, de sa voix."), ("voeux:anniversaire:petit", "Les mots de la famille, une page chacun."),
                  ("memoire:racines", "Les origines de la famille, branche par branche."), ("annee:1", "Pour un jeune papa : l'année de son enfant."), ("grossesse", "Pour un futur papa : l'attente, racontée à l'enfant.")]},
    {"page": "nouvelle-annee.html", "nav": "Une nouvelle année", "titre": "Une nouvelle année", "accroche": "L'année qui commence, <em>racontée par tous</em>",
     "description": "Pour la nouvelle année : les douze mois de la famille racontés par chacun, ou le livre de la vie d'un parent, ou le carnet du voyage qui s'annonce.",
     "photo": "diner-jardin.jpg", "lead": "Les grandes années, on s'en souvient. Ce qui s'efface, ce sont les petites choses. Ce livre les garde, mois après mois.",
     "produits": [("famille", "Les douze mois qui viennent, racontés par toute la famille."), ("memoire:vie", "Une bonne résolution : la vie d'un parent, enfin racontée."), ("carnet", "Le voyage de l'année, raconté au fil des jours.")]},
    {"page": "evjf.html", "nav": "EVJF, EVG", "titre": "Un EVJF, un EVG", "accroche": "Le week-end par toute la bande, <em>ou le livre des témoins</em>",
     "description": "Cadeau d'EVJF ou d'EVG : le week-end raconté par toute la bande dans un carnet de voyage, ou les vœux des témoins aux mariés de vive voix.",
     "photo": "hero-2.jpg", "lead": "Deux cadeaux possibles : le week-end raconté par toute la bande, souvenirs inavouables compris, ou le livre des témoins pour le jour du mariage.",
     "produits": [("carnet", "Le week-end, raconté à plusieurs voix, étape par étape."), ("voeux:mariage:moyen", "Les vœux des témoins et des amis aux mariés, pour le jour J.")]},
]

# Anciennes pages (produits et noms d'avant le 17/10) : une page de redirection vers la nouvelle.
REDIRECTIONS = {
    "ma-vie.html": "une-vie.html", "mes-ancetres.html": "nos-racines.html", "un-temps-fort.html": "une-vie.html", "memoire.html": "une-vie.html",
    "recit.html": "carnet-de-voyage.html", "voyage-solo.html": "carnet-de-voyage.html", "chronique.html": "notre-annee.html",
    "grossesse.html": "en-t-attendant.html", "annee-enfant.html": "tes-premieres-annees.html", "anniversaire.html": "voeux.html",
    "engagement.html": "index.html",
}

# Pages existantes : les liens du pied de page vers une page pas encore écrite restent du texte simple.
FOOTER = [
    ("Les livres", [("Mémoires · Une vie", "une-vie.html"), ("Mémoires · Nos racines", "nos-racines.html"), ("Carnet de voyage", "carnet-de-voyage.html"),
                    ("En t'attendant", "en-t-attendant.html"), ("Tes premières années", "tes-premieres-annees.html"), ("Notre année", "notre-annee.html"),
                    ("Vœux : anniversaire, mariage, un départ", "voeux.html")]),
    ("Offrir", [("La carte cadeau", "carte-cadeau.html"), ("Pour Noël", "offrir-noel.html")] + [(o["nav"], o["page"]) for o in OCCASIONS[:6]]),
    ("Les fêtes", [("Fête des mères", "fete-des-meres.html"), ("Fête des pères", "fete-des-peres.html"), ("Fête des grands-mères", "fete-des-grands-meres.html"),
                   ("Une nouvelle année", "nouvelle-annee.html"), ("EVJF, EVG", "evjf.html")]),
    (BRAND, [("L'application", "application.html"), ("Comment ça marche", "comment-ca-marche.html"), ("Tarifs", "index.html#prix"),
             ("Aide et questions", "aide.html"), ("Mon compte", "compte.html"), ("Devenir ambassadeur", "devenir-ambassadeur.html"), ("Notre histoire", None)]),
]

LEGAL = [("Mentions légales", "mentions-legales.html"), ("CGV", "cgv.html"), ("Cookies", "cookies.html")]
# Les données personnelles (RGPD) ont leur propre encart dans le pied de page, plutôt que trois liens perdus parmi les autres.
PRIVACY = """<div class="fprivacy">
      <span class="fp-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg></span>
      <div><b>Vos données, protégées</b><p>Vos voix, vos photos et vos récits sont hébergés en France, strictement confidentiels, et supprimés sur simple demande.</p></div>
      <nav aria-label="Vos données"><a href="donnees.html">Comment on les protège</a><a href="confidentialite.html">Politique de confidentialité</a><a href="donnees.html#supprimer">Supprimer mes données</a></nav>
    </div>"""


# Bandeau cookies (brouillon du 08/10) : ne bloque pas la page, « Tout refuser » aussi visible que « Tout accepter ».
# Le choix est gardé dans le navigateur (clé mm-consent). Aucun traceur n'est chargé aujourd'hui : quand la boutique,
# la mesure d'audience ou les pixels arriveront, ils devront lire ce choix avant de se charger.
COOKIE_BANNER = """<div class="cookie-bar" id="cookie-bar" role="region" aria-label="Cookies" hidden>
  <p>Ce site n'enregistre que ce qui lui est indispensable, comme votre panier. Avec votre accord, nous pourrons aussi mesurer l'audience et l'efficacité de nos publicités. <a href="cookies.html">En savoir plus</a></p>
  <div class="cookie-btns">
    <button type="button" class="btn btn-line" data-consent="refuse">Tout refuser</button>
    <a class="btn btn-line" href="cookies.html">Personnaliser</a>
    <button type="button" class="btn btn-line" data-consent="accept">Tout accepter</button>
  </div>
</div>
<style>
.cookie-bar{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;width:min(560px,calc(100% - 32px));background:#fff;color:var(--ink);border:1px solid var(--rule);border-radius:18px;box-shadow:0 0 0 100vmax rgba(28,19,32,.45),0 18px 50px rgba(28,19,32,.14);padding:22px 22px;display:grid;gap:14px;font-size:14px;line-height:1.5}
.cookie-bar[hidden]{display:none}
.cookie-bar p{margin:0;color:var(--grey)}
.cookie-bar a:not(.btn){color:var(--ink)}
.cookie-btns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.cookie-btns .btn{padding:12px 10px;font-size:13px;white-space:normal;text-align:center}
@media (max-width:480px){.cookie-bar{padding:16px}.cookie-btns{grid-template-columns:1fr 1fr}.cookie-btns a.btn{grid-column:1 / -1;order:3}}
</style>
<script>
(function(){
  var KEY='mm-consent', bar=document.getElementById('cookie-bar');
  var read=function(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(e){return null;}};
  var save=function(v){try{localStorage.setItem(KEY,JSON.stringify({choice:v,date:new Date().toISOString()}));}catch(e){}};
  var c=read();
  if(!c||!c.choice){bar.hidden=false;}
  bar.addEventListener('click',function(e){var b=e.target.closest('[data-consent]');if(!b)return;save(b.getAttribute('data-consent'));bar.hidden=true;});
  document.addEventListener('click',function(e){if(e.target.closest('[data-cookie-reset]')){try{localStorage.removeItem(KEY);}catch(x){}bar.hidden=false;}});
})();
</script>"""

# Cookiebot (choisi le 08/10) : dès que l'identifiant du compte est dans ../.env.acces (COOKIEBOT_ID=…),
# le site charge Cookiebot (fenêtre au centre, réglée dans son tableau de bord) à la place de notre bandeau maison.
def cookiebot_id() -> str:
    import os
    cb = os.environ.get("COOKIEBOT_ID", "")
    env = Path(__file__).resolve().parent.parent / ".env.acces"
    if not cb and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("COOKIEBOT_ID="):
                cb = line.split("=", 1)[1].strip()
    return cb


def aide_config() -> str:
    """Adresse et clé publique (« publishable », faite pour être publiée) de la fonction d'assistance, lues dans app/.env."""
    env = ROOT.parent / "app" / ".env"
    vals = {}
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                vals[k.strip()] = v.strip().strip('"')
    url, key = vals.get("EXPO_PUBLIC_SUPABASE_URL", ""), vals.get("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    if not (url and key.startswith("sb_publishable_")):
        return ""
    return f' data-endpoint="{url.rstrip("/")}/functions/v1/aide" data-key="{key}"'


# Inscriptions aux questions par email (question du dimanche et sujets des livres, 12/10).
# Vide = aperçu : les formulaires n'envoient rien. Au lancement, mettre ici l'adresse de la fonction serveur
# (ex. https://<projet>.supabase.co/functions/v1/inscription) qui reçoit { email, sujet, page } et inscrit chez Brevo.
# Aucune clé dans le site : la clé Brevo reste dans la fonction serveur. Détail : emails/series-par-sujet.md.
INSCRIPTION_URL = ""
INSCRIPTION_ATTRS = f' data-endpoint="{INSCRIPTION_URL}"' if INSCRIPTION_URL else ""

AIDE_ATTRS = aide_config()
COOKIEBOT_ID = cookiebot_id()
COOKIEBOT_HEAD = (f'<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="{COOKIEBOT_ID}" '
                  f'data-blockingmode="auto" data-culture="fr"></script>\n') if COOKIEBOT_ID else ""
COOKIEBOT_RESET = """<script>document.addEventListener('click',function(e){if(e.target.closest('[data-cookie-reset]')&&window.Cookiebot){Cookiebot.renew();}});</script>"""

LAUREL = '<svg class="laurel" viewBox="0 0 24 48" aria-hidden="true"><path d="M20 46C8 40 4 28 6 4"/><path d="M6 12c-3-1-4-4-3-6 3 0 4 3 3 6zM5.5 20c-3-.5-4.5-3.5-4-6 3 .5 4.5 3.5 4 6zM6.5 28c-3 0-5-2.5-5-5 3 0 5 2.5 5 5zM9 35.5c-3 .5-5.5-1.5-6-4 3-.5 5.5 1.5 6 4zM13 41.5c-2.5 1-5.5-.5-6.5-3 2.5-1 5.5.5 6.5 3z"/></svg>'

# Réassurance discrète, en bas de page. La note Trustpilot et la presse sont des emplacements : rien n'est affiché en ligne tant qu'ils ne sont pas réels.
REASSURE = f"""<div class="trust">
      <ul class="trust-list">
        <li>Satisfait ou remboursé 30 jours</li>
        <li>Livraison incluse en Europe</li>
        <li>Leur voix, pour toujours</li>
      </ul>
      <div class="trust-proof">
        <div class="award">{LAUREL}<div><span class="stars" aria-hidden="true">★★★★★</span><small>Trustpilot <span class="todo">[note réelle à venir]</span></small></div>{LAUREL.replace('class="laurel"', 'class="laurel r"')}</div>
        <div class="award">{LAUREL}<div><b class="press">LE FIGARO</b><small>Vu dans la presse <span class="todo">[exemple, en attente d'un vrai article]</span></small></div>{LAUREL.replace('class="laurel"', 'class="laurel r"')}</div>
      </div>
    </div>"""

# Accueil : les lauréats seuls en bas du hero (les garanties sont sous les boutons, dans la page)
PROOF = REASSURE.split('<div class="trust-proof">')[1].rsplit('</div>', 2)[0]
PROOF = f'<div class="trust trust-only"><div class="trust-proof">{PROOF}</div></div>'

ICON_HELP = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7"/><path d="M12 17.2h.01"/></svg>'
ICON_USER = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>'
ICON_BAG = '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.4 11H6.4z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>'


def banner() -> str:
    items = "".join(('<li class="on">' if i == 0 else "<li>") + m + "</li>" for i, m in enumerate(BANNER))
    return f"""<div class="annonce" role="region" aria-label="Offres en cours"><ul>{items}</ul></div>"""


def lang_switch(cls: str = "") -> str:
    return f'<div class="lang {cls}" aria-label="Langue"><a href="index.html" aria-current="true" lang="fr">FR</a><a href="es/index.html" lang="es" hreflang="es">ES</a></div>'


def header(active: str) -> str:
    current = ' aria-current="page"'
    links = "".join(f'<li><a href="{href}"{current if key == active else ""}>{label}</a></li>' for key, href, label in NAV)
    mobile = "".join(f'<a href="{href}">{label}</a>' for _, href, label in NAV)
    return f"""{banner()}
<header class="site">
  <div class="bar">
    <a class="logo" href="index.html" aria-label="{BRAND}, accueil">{LOGO}</a>
    <nav class="main" aria-label="Navigation principale"><ul>{links}</ul></nav>
    <div class="hdr-right">
      <a class="icon-btn hide-sm" href="aide.html" aria-label="Aide et questions"{current if active == "aide" else ""}>{ICON_HELP}</a>
      <a class="icon-btn hide-sm" href="compte.html" aria-label="Mon compte">{ICON_USER}</a>
      <button class="icon-btn cart-btn" type="button" aria-label="Ouvrir le panier" data-open-cart>{ICON_BAG}<span class="cart-count" hidden>0</span></button>
      <a class="btn btn-cta hdr-cta" href="carte-cadeau.html" aria-label="Écrire ou offrir une histoire"><span class="roll r-btn" aria-hidden="true"><span><em>Écrire</em><em class="o">Offrir</em><em>Écrire</em></span></span>une histoire</a>
      <button class="icon-btn menu-btn" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
  <div class="mnav-wrap"><nav class="mobile-nav" id="mnav" aria-label="Navigation mobile">{mobile}<a href="aide.html">Aide et questions</a><a href="compte.html">Mon compte</a><a href="index.html#prix">Commencer une histoire</a></nav></div>
</header>
<div class="drawer-veil" data-close-cart hidden></div>
<aside class="drawer" id="cart" aria-label="Panier" aria-hidden="true" tabindex="-1">
  <div class="drawer-head"><h2>Votre panier</h2><button class="icon-btn" type="button" data-close-cart aria-label="Fermer le panier"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <div class="drawer-body" id="cart-body"></div>
  <div class="drawer-foot" id="cart-foot"></div>
</aside>"""


def footer() -> str:
    cols = []
    for title, items in FOOTER:
        lis = []
        for item in items:
            label, href = item[0], item[1]
            tag = f' <span class="tag">{item[2]}</span>' if len(item) > 2 else ""
            lis.append(f'<li><a href="{href}">{label}</a>{tag}</li>' if href else f'<li style="color:var(--grey)">{label}{tag}</li>')
        cols.append(f'<div><h4>{title}</h4><ul>{"".join(lis)}</ul></div>')
    legal = "".join(f'<a href="{h}">{l}</a>' if h else f'<span>{l}</span>' for l, h in LEGAL)
    return f"""<footer class="site">
  <div class="wrap">
    <div class="fcols">
      <div>
        <a class="logo" href="index.html" aria-label="{BRAND}, accueil">{LOGO}</a>
        <p class="story">Vos histoires, de vive voix.</p>
        <div class="social" aria-label="Réseaux sociaux">
          <a href="https://www.instagram.com/memoreees_fr/" target="_blank" rel="noopener" aria-label="Memoreees sur Instagram"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" class="dot"/></svg></a>
          <a href="https://www.facebook.com/profile.php?id=61594907264943" target="_blank" rel="noopener" aria-label="Memoreees sur Facebook"><svg viewBox="0 0 24 24"><path d="M14.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H9v3h2.5V21"/></svg></a>
        </div>
      </div>
      {"".join(cols)}
    </div>
    {PRIVACY}
    <div class="fbottom"><span>© 2026 {BRAND}. Tous droits réservés.</span>{lang_switch()}<nav class="legal" aria-label="Informations légales">{legal}</nav></div>
  </div>
</footer>"""


def version(name: str) -> str:
    """Empreinte du fichier : le navigateur recharge la feuille de style dès qu'elle change."""
    return hashlib.md5((ROOT / "assets" / name).read_bytes()).hexdigest()[:8]


def page(meta: dict, body: str) -> str:
    body_class = ' class="has-hero"' if meta.get("hero") else ""
    title = meta.get("title", BRAND)
    full_title = title if BRAND in title else f"{title} · {BRAND}"
    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
{COOKIEBOT_HEAD}<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>{full_title}</title>
<meta name="description" content="{meta.get('description', '')}">
<link rel="icon" href="assets/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="assets/favicon-64.png" type="image/png" sizes="64x64">
<link rel="icon" href="assets/favicon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="assets/site.css?v={version('site.css')}">
</head>
<body{body_class}>
{header(meta.get('nav', ''))}
<main id="top">
{body.strip()}
</main>
{footer()}
{COOKIEBOT_RESET if COOKIEBOT_ID else COOKIE_BANNER}
<script src="assets/site.js?v={version('site.js')}" defer></script>
</body>
</html>
"""


def euro(n) -> str:
    return f"{n} €"


def carte_produit(cle: str, pourquoi: str, vedette: bool = False) -> str:
    """Une carte de produit d'une page d'occasion : photo, nom, une phrase, prix, le bouton vers la fiche."""
    p = PRODUITS[cle]
    return (f'<article class="oc-prod{" vedette" if vedette else ""}"><a class="oc-photo" href="{p["page"]}"><img src="assets/photos/{p["photo"]}" alt="" loading="lazy"></a>'
            f'<div><p class="fmt">{p["nom"]}</p><h3>{p["pitch"]}</h3><p class="oc-why">{pourquoi}</p><p class="specs">{p["specs"]}</p>'
            f'<div class="row"><span class="price">{euro(p["prix"])}</span><a class="btn {"btn-ink" if vedette else "btn-line"}" href="{p["page"]}">Découvrir</a>'
            f'<button class="btn btn-peach" type="button" onclick="ltAddToCart(\'{cle}\')">Offrir</button></div></div></article>')


def page_occasion(o: dict, variante: int) -> tuple:
    """Le corps d'une page d'occasion (bloc 8) : l'accroche, les produits dans l'ordre, le premier mis en avant, les trois étapes,
    une question fréquente. Deux présentations alternent : grande photo en tête (0) ou photo à côté du texte (1)."""
    premier, suite = o["produits"][0], o["produits"][1:]
    cartes = carte_produit(premier[0], premier[1], True) + "".join(carte_produit(c, w) for c, w in suite)
    if variante == 0:
        tete = (f'<div class="hero-top product-hero"><div class="hero-bg" aria-hidden="true"><img src="assets/photos/{o["photo"]}" alt="" fetchpriority="high"></div>'
                f'<div class="wrap"><div class="hero-grid"><div><p class="kicker">Offrir · {o["titre"]}</p><h1>{o["accroche"]}</h1><p class="lead">{o["lead"]}</p>'
                f'<div class="ctas"><a class="btn btn-light" href="#choisir">Choisir le livre</a><a class="btn btn-ghost-light" href="carte-cadeau.html">La carte cadeau</a></div></div></div>{{{{REASSURE}}}}</div></div>')
    else:
        tete = (f'<div class="wrap page-hero split nb-hero"><div><p class="kicker">Offrir · {o["titre"]}</p><h1>{o["accroche"]}</h1><p class="lead">{o["lead"]}</p>'
                f'<div class="ctas"><a class="btn btn-ink" href="#choisir">Choisir le livre</a><a class="btn btn-line" href="carte-cadeau.html">La carte cadeau</a></div></div>'
                f'<div class="nb-visual has-img"><img src="assets/photos/{o["photo"]}" alt="" fetchpriority="high"></div></div>')
    n = len(o["produits"])
    corps = f"""{tete}
<section id="choisir">
  <div class="wrap">
    <p class="kicker">{"Le livre qu'on offre" if n == 1 else "Les livres qu'on offre"}</p>
    <h2>{"Un seul livre, <em>fait pour ça</em>" if n == 1 else "Dans l'ordre : <em>celui qu'on conseille d'abord</em>"}</h2>
    <div class="oc-list">{cartes}</div>
    <p class="note">Livraison incluse partout en Europe. Un seul prix par livre, tout compris : l'app, le livre relié, les voix à réécouter, la carte cadeau.</p>
  </div>
</section>
<section>
  <div class="wrap">
    <p class="kicker">Comment ça se passe</p>
    <h2>Une carte le jour J, <em>le livre ensuite</em></h2>
    <ol class="journey">
      <li><small>Le jour J</small><b>Vous offrez la carte</b><p>Juste après l'achat, vous préparez la carte cadeau sur la page de confirmation : elle s'imprime ou s'envoie par message, avec son code. <a href="carte-cadeau.html">Voir la carte</a></p></li>
      <li><small>Ensuite</small><b>On raconte</b><p>Avec le code, le livre s'ouvre dans l'app. Une question à la fois, à voix haute, à son rythme : aucune durée imposée.</p></li>
      <li><small>Quand tout est dit</small><b>On relit, on valide</b><p>Le livre mis en page se relit en ligne, autant de fois qu'on veut. Rien ne part à l'impression sans validation.</p></li>
      <li><small>Trois semaines plus tard</small><b>Le livre arrive</b><p>Relié, 21 × 21 cm, avec les QR codes pour réécouter les voix. Livraison incluse en Europe.</p></li>
    </ol>
  </div>
</section>
<section>
  <div class="wrap final">
    {{{{ONDE}}}}
    <h2>{o["accroche"]}</h2>
    <a class="btn btn-ink" href="#choisir">Choisir le livre</a>
  </div>
</section>"""
    meta = {"title": f"{o['titre']} · idée de cadeau qui se raconte de vive voix", "description": o["description"], "nav": "offrir"}
    if variante == 0:
        meta["hero"] = "1"
    return meta, corps


def page_redirection(vers: str) -> str:
    return (f'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url={vers}">'
            f'<link rel="canonical" href="{vers}"><meta name="robots" content="noindex"><title>Memoreees</title></head>'
            f'<body><p>Cette page a changé d\'adresse : <a href="{vers}">{vers}</a></p></body></html>\n')


def main():
    for ancienne, vers in REDIRECTIONS.items():
        (ROOT / ancienne).write_text(page_redirection(vers), encoding="utf-8")
        print("→", ancienne, "vers", vers)
    for i, o in enumerate(OCCASIONS):
        meta, corps = page_occasion(o, i % 2)
        corps = corps.replace("{{ONDE}}", ONDE).replace("{{REASSURE}}", REASSURE)
        (ROOT / o["page"]).write_text(page(meta, corps), encoding="utf-8")
        print("✓", o["page"], "(occasion)")
    for src in sorted(SRC.glob("*.html")):
        text = src.read_text(encoding="utf-8")
        m = re.match(r"\s*<!--(.*?)-->", text, re.S)
        meta = {}
        if m:
            for part in m.group(1).split("|"):
                if ":" in part:
                    k, v = part.split(":", 1)
                    meta[k.strip()] = v.strip()
            text = text[m.end():]
        text = text.replace("{{AIDE}}", AIDE_ATTRS).replace("{{INSCRIPTION}}", INSCRIPTION_ATTRS).replace("{{CTA}}", CTA).replace("{{PROOF}}", PROOF).replace("{{ONDE}}", ONDE).replace("{{STORES}}", STORES).replace("{{BRAND}}", BRAND).replace("{{REASSURE}}", REASSURE)
        (ROOT / src.name).write_text(page(meta, text), encoding="utf-8")
        print("✓", src.name)


if __name__ == "__main__":
    main()
