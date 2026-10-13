"""Génère les parties répétitives du thème Shopify Memoreees à partir de site/src (lecture seule).

Usage : python3 site/shopify/generer_theme.py (après python3 site/build.py). Rien n'est envoyé à Shopify.

Écrit dans shopify-theme/ : assets (copie), sections et modèles JSON des pages, snippets mm-variant et mm-data.
Les fichiers écrits à la main (layout, header, footer, etc.) ne sont pas touchés.
"""
import html
import json
import re
import shutil
from pathlib import Path

from decoupe import top_blocks

SITE = Path(__file__).resolve().parent.parent
SRC = SITE / "src"
OUT = SITE.parent / "shopify-theme"

BRAND = "Memoreees"
ONDE = '<span class="onde" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>'

# ---- Produits : page du site -> poignée (handle) Shopify, clé du panier ----
PRODUCT_PAGES = {
    # page : (handle, clé « maison » du livre, base pour les pastilles)
    "ma-vie": ("ma-vie", "mavie", "memoire"),
    "mes-ancetres": ("mes-ancetres", "ancetres", "memoire"),
    "un-temps-fort": ("un-temps-fort", "tempsfort", "memoire"),
    "anniversaire": ("voeux", "voeux:anniversaire", "voeux"),
    "recit": ("recit", "recit:voyage", "recit"),
    "chronique": ("chronique", "chronique", "chronique"),
    "voyage-solo": ("voyage-solo", "voyageSolo", "voyageSolo"),
    "lignes-de-vie": ("lignes-de-vie", "lignes", "lignes"),
    "grossesse": ("grossesse", "grossesse:simple", "grossesse"),
    "annee-enfant": ("annee-enfant", "annee:simple", "annee"),
    "memoire": ("memoire", None, None),
}

# Clé du panier -> (handle, titre exact de la variante ou None pour la première variante)
KEYS = {
    "mavie": ("ma-vie", None),
    "ancetres": ("mes-ancetres", None),
    "tempsfort": ("un-temps-fort", None),
    "voeux:anniversaire": ("voeux", "Anniversaire"),
    "voeux:mariage": ("voeux", "Mariage"),
    "voeux:retraite": ("voeux", "Départ à la retraite"),
    "voeux:naissance": ("voeux", "Naissance"),
    "voeux:depart": ("voeux", "Pot de départ"),
    "recit:voyage": ("recit", "Voyage entre amis"),
    "recit:evjf": ("recit", "EVJF"),
    "recit:evg": ("recit", "EVG"),
    "chronique": ("chronique", None),
    "voyageSolo": ("voyage-solo", None),
    "lignes": ("lignes-de-vie", None),
    # 12/10 : l'option vidéo est une variante du produit (Sans vidéo / Avec vidéos). Le pack n'a pas de page à lui.
    "grossesse:simple": ("grossesse", "Sans vidéo"),
    "grossesse:video": ("grossesse", "Avec vidéos"),
    "annee:simple": ("annee-enfant", "Sans vidéo"),
    "annee:video": ("annee-enfant", "Avec vidéos"),
    "pack:simple": ("pack-grossesse-annee-1", "Sans vidéo"),
    "pack:video": ("pack-grossesse-annee-1", "Avec vidéos"),
}
COPY_HANDLE = "exemplaire-supplementaire"
VOIX_HANDLE = "10-voix-de-plus"
# 13/10 : option vidéo ajoutée plus tard à un livre en cours (ligne ajoutvideo:<CODE>, propriété « Projet »).
VIDEO_HANDLES = {"grossesse": "video-grossesse", "annee": "video-annee"}
# 13/10 : plus de temps de voix et de pages pour un livre en cours (ligne ajoutpages:<CODE>, propriété « Projet ») :
# « + 1 h, environ 20 pages » (Mémoire, Chronique, Année) ou « + 30 min, environ 10 pages » (Récit, Carnet de bord, Grossesse).
PAGES_HANDLES = {"29": "pages-29", "19": "pages-19"}


def base_of(key):
    return key.split(":")[0]


def pick_key(base, v):
    if base == "memoire":
        return v
    return base + (":" + v if v else "")


# ---- Liens ----
def page_url(name, frag=""):
    if name == "index":
        return "/" + frag
    if name in PRODUCT_PAGES:
        return "/products/" + PRODUCT_PAGES[name][0] + frag
    return "/pages/" + name + frag


def rewrite_links(t):
    t = re.sub(r'href="([a-z0-9-]+)\.html(#[^"]*)?"', lambda m: f'href="{page_url(m.group(1), m.group(2) or "")}"', t)
    t = re.sub(r'(src|href)="assets/(?:photos/|app/)?([A-Za-z0-9._-]+)"', lambda m: f"{m.group(1)}=\"{{{{ '{m.group(2)}' | asset_url }}}}\"", t)
    return t


STORES_SRC = re.search(r"STORES = \((.*?)\)\n", (SITE / "build.py").read_text(encoding="utf-8"), re.S).group(1)
STORES = "".join(eval("[" + ",".join(l.strip() for l in STORES_SRC.splitlines() if l.strip()) + "]"))


def placeholders(t):
    t = t.replace("{{CTA}}", "{% render 'cta-roll' %}").replace("{{ONDE}}", ONDE).replace("{{STORES}}", STORES)
    t = t.replace("{{BRAND}}", BRAND).replace("{{REASSURE}}", "{% render 'reassure' %}")
    # Inscriptions par email : l'adresse de la fonction serveur viendra d'un réglage du thème (inscription_url, à créer
    # dans settings_schema.json au branchement). Vide = rien n'est envoyé.
    t = t.replace("{{INSCRIPTION}}", "{% if settings.inscription_url != blank %} data-endpoint=\"{{ settings.inscription_url }}\"{% endif %}")
    return t


# ---- Réglages (settings) : chaque texte remplacé garde le texte actuel comme valeur par défaut ----
ALLOWED = re.compile(r"</?(em|b|strong)>|<a href=\"[^\"]*\">|</a>")


def simple(inner):
    if "{" in inner or not inner.strip():
        return None
    rest = ALLOWED.sub("", inner)
    if "<" in rest:
        return None
    return "inline_richtext" if ALLOWED.search(inner) else "text"


def plain(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s)).strip()


class Settings:
    def __init__(self):
        self.items = []  # schema settings
        self.values = {}
        self.ids = set()

    def add(self, sid, label, typ, default, info=None):
        n, base = 2, sid
        while sid in self.ids:
            sid = f"{base}_{n}"; n += 1
        self.ids.add(sid)
        if typ == "text":
            default = html.unescape(default)
        s = {"type": typ, "id": sid, "label": label[:70], "default": default}
        if info:
            s["info"] = info
        self.items.append(s)
        self.values[sid] = default
        return sid

    def header(self, content):
        self.items.append({"type": "header", "content": content[:50]})


def out(sid):
    return "{{ section.settings." + sid + " }}"


def settingize(block, st, prefix):
    """Titres, sur-titres, introductions et libellés de boutons -> réglages de section."""
    k = re.search(r'<p class="kicker"[^>]*>(.*?)</p>', block, re.S)
    h = re.search(r"<h[12][^>]*>(.*?)</h[12]>", block, re.S)
    title = plain(k.group(1)) if k and simple(k.group(1)) else (plain(h.group(1)) if h else "")
    if title:
        st.header(title)
    done = {"kicker": False, "lead": False}

    def kicker(m):
        if done["kicker"]:
            return m.group(0)
        done["kicker"] = True
        typ = simple(m.group(2))
        if not typ:
            return m.group(0)
        return m.group(1) + out(st.add(f"{prefix}_kicker", "Sur-titre", typ, m.group(2))) + m.group(3)

    block = re.sub(r'(<p class="kicker"[^>]*>)(.*?)(</p>)', kicker, block, flags=re.S)

    def heading(m):
        typ = simple(m.group(3))
        if not typ:
            return m.group(0)
        lab = "Titre principal" if m.group(2) == "1" else "Titre"
        typ = "inline_richtext" if typ == "inline_richtext" else "text"
        return m.group(1) + out(st.add(f"{prefix}_h{m.group(2)}", lab, typ, m.group(3))) + m.group(4)

    block = re.sub(r"(<h([12])(?: [^>]*)?>)(.*?)(</h\2>)", heading, block, flags=re.S)

    def lead(m):
        if done["lead"]:
            return m.group(0)
        done["lead"] = True
        typ = simple(m.group(2))
        if not typ:
            return m.group(0)
        return m.group(1) + out(st.add(f"{prefix}_lead", "Introduction", typ, m.group(2))) + m.group(3)

    block = re.sub(r'(<p class="lead"[^>]*>)(.*?)(</p>)', lead, block, flags=re.S)

    def btn(m):
        txt = m.group(3)
        if not txt.strip() or "{" in txt:
            return m.group(0)
        return m.group(1) + out(st.add(f"{prefix}_btn", f"Bouton « {plain(txt)[:40]} »", "text", txt)) + m.group(4)

    block = re.sub(r'(<(a|button)\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>)([^<]+)(</\2>)', btn, block)
    return block


# ---- Achat : formulaires produit, pastilles, prix ----
def mm(key, what, fallback=""):
    fb = f", fallback: '{fallback}'" if fallback else ""
    return "{% render 'mm-variant', key: '" + key + "', out: '" + what + "'" + fb + " %}"


PRICE_RE = r" · (\d+) €$"


def buy_conversions(block, st, prefix, page):
    """Remplace les boutons d'achat par de vrais formulaires Shopify (ou garde le panier latéral pour les autres livres)."""
    own = PRODUCT_PAGES.get(page)
    own_base = own[2] if own else None
    n = [0]

    def label_and_price(label):
        m = re.search(PRICE_RE, label)
        return (label[: m.start()], m.group(1)) if m else (label, None)

    def onclick(m):
        cls, key, label = m.group(1), m.group(2), m.group(3)
        n[0] += 1
        text, price = label_and_price(label)
        sid = st.add(f"{prefix}_buy", f"Bouton d'achat « {plain(text)[:35]} »", "text", text,
                     info="Le prix s'ajoute tout seul, depuis la fiche produit Shopify." if price else None)
        if own and base_of(key) == own_base or (own and key == own[1]):
            if ":" in key:
                vid, pr = mm(key, "id"), mm(key, "price", price + " €" if price else "")
            else:
                vid, pr = "{{ product.selected_or_first_available_variant.id }}", "{{ product.price | money_without_trailing_zeros }}"
            return ("{%- form 'product', product, class: 'mm-buy' -%}"
                    f'<input type="hidden" name="id" value="{vid}">'
                    f'<button class="{cls}" type="submit">{out(sid)}' + (f" · {pr}" if price else "") + "</button>{%- endform -%}")
        pr = " · " + mm(key, "price", price + " €") if price else ""
        return f'<button class="{cls}" type="button" onclick="ltAddToCart(\'{key}\')">{out(sid)}{pr}</button>'

    block = re.sub(r'<button class="([^"]+)" type="button" onclick="ltAddToCart\(\'([^\']+)\'\)">([^<]*)</button>', onclick, block)

    def pick(m):
        base, chips, cls, label = m.group(1), m.group(2), m.group(3), m.group(4)
        default = re.search(r'data-v="(\w+)"[^>]*aria-pressed="true"', chips)
        dkey = pick_key(base, default.group(1) if default else "")
        chips = re.sub(r'data-v="(\w+)"', lambda c: f'data-v="{c.group(1)}" data-id="{mm(pick_key(base, c.group(1)), "id")}"', chips)
        text, price = label_and_price(label)
        sid = st.add(f"{prefix}_pick", f"Bouton d'achat « {plain(text)[:35]} »", "text", text)
        pr = " · " + mm(dkey, "price", price + " €") if price else ""
        inner = (f'<input type="hidden" name="id" value="{mm(dkey, "id")}">{chips}'
                 f'<button class="{cls}" type="submit">{out(sid)}{pr}</button>')
        if own and base == own_base:
            return "{%- form 'product', product, class: 'pick' -%}" + inner + "{%- endform -%}"
        return f'<form method="post" action="{{{{ routes.cart_add_url }}}}" class="pick" data-base="{base}">{inner}</form>'

    block = re.sub(r'<div class="pick" data-base="(\w+)">(<div class="chips-pick".*?</div>)<button class="([^"]+)" type="button" data-pick-add>([^<]*)</button></div>', pick, block, flags=re.S)

    # Prix affichés : cartes de tarifs (accueil) et tuiles de la page Offrir
    def tier(m):
        a = m.group(0)
        b = re.search(r'data-base="(\w+)"', a)
        if not b:
            return a
        pressed = re.search(r'data-v="(\w+)" data-id="[^"]*"[^>]*aria-pressed="true"', a)
        key = pick_key(b.group(1), pressed.group(1) if pressed else "")
        # « à partir de » (Vœux, 13/10) devant le prix : gardé tel quel.
        return re.sub(r'<div class="amount">((?:<small>[^<]*</small>\s*)?)(\d+ €)</div>', lambda p: f'<div class="amount">{p.group(1)}{mm(key, "price", p.group(2))}</div>', a)

    block = re.sub(r'<article class="tier.*?</article>', tier, block, flags=re.S)

    def tile(m):
        a = m.group(0)
        k = re.search(r"ltAddToCart\('([^']+)'\)", a)
        key = k.group(1) if k else "mavie"
        return re.sub(r'<span class="price">([^<\d]*)(\d+ €)</span>', lambda p: f'<span class="price">{p.group(1)}{mm(key, "price", p.group(2))}</span>', a)

    block = re.sub(r'<article class="of-tile.*?</article>', tile, block, flags=re.S)

    # Fiche technique d'un produit : son propre prix vient de Shopify
    if own and own[1]:
        own_price = None
        src = (SRC / f"{page}.html").read_text(encoding="utf-8")
        mp = re.search(r"onclick=\"ltAddToCart\('" + re.escape(own[1]) + r"'\)\">[^<]* · (\d+ €)", src) or re.search(r"· (\d+ €)</button>", src)
        if mp:
            own_price = mp.group(1)
        if own_price:
            money = "{{ product.price | money_without_trailing_zeros }}" if ":" not in own[1] else mm(own[1], "price", own_price)
            block = block.replace(f"<b>{own_price}</b><span>tout compris", f"<b>{money}</b><span>tout compris")
            block = block.replace(f"<dt>Prix</dt><dd>{own_price}", f"<dt>Prix</dt><dd>{money}")
            block = block.replace(f"<dt>Prix</dt><dd>À partir de {own_price}", f"<dt>Prix</dt><dd>À partir de {money}")
    return block


# ---- Découpage des pages ----
def is_example(b):
    return 'class="reviews"' in b or "jamais publiés" in b or b.lstrip().startswith('<div class="press-band"')


def example_name(b):
    if "press-band" in b:
        return "Presse (exemple)"
    if 'class="reviews"' in b or "of-post" in b:
        return "Avis (exemples)"
    return "Extraits (exemples)"


def read(page):
    t = (SRC / f"{page}.html").read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(.*?)-->", t, re.S)
    meta = {}
    for part in m.group(1).split("|"):
        if ":" in part:
            k, v = part.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, t[m.end():]


def schema(name, st, extra=None, presets=False):
    s = {"name": name, "settings": st.items}
    if extra:
        s.update(extra)
    if presets:
        s["presets"] = [{"name": name}]
    return "{% schema %}\n" + json.dumps(s, ensure_ascii=False, indent=2) + "\n{% endschema %}\n"


EXAMPLE_INFO = ("Exemples rédigés pour la mise en page, jamais publiés. À n'afficher qu'avec de vrais "
                "témoignages ou extraits, et l'accord des personnes.")


def write_section(fname, body, st, name, example=False, legal=False):
    if example:
        st.items.insert(0, {"type": "checkbox", "id": "show", "label": "Afficher cette section", "default": False, "info": EXAMPLE_INFO})
        st.values["show"] = False
        body = ("{%- if section.settings.show -%}\n" + body + "\n{%- elsif request.design_mode -%}\n"
                '<div class="wrap"><p class="note" style="padding:24px 0">Section masquée : ' + name +
                ". Cochez « Afficher cette section » quand le contenu sera réel.</p></div>\n{%- endif -%}\n")
    if legal:
        st.items.insert(0, {"type": "checkbox", "id": "use_page_content", "label": "Utiliser le texte saisi dans Shopify",
                            "default": False, "info": "Coché : la page affiche le texte écrit dans Boutique en ligne > Pages, à la place du texte ci-dessous."})
        st.values["use_page_content"] = False
        body = ("{%- if section.settings.use_page_content and page.content != blank -%}\n"
                '<div class="wrap page-hero narrow"><p class="kicker">Légal</p><h1>{{ page.title }}</h1><div class="prose" style="margin-top:32px">{{ page.content }}</div></div>\n'
                "{%- else -%}\n" + body + "\n{%- endif -%}\n")
    (OUT / "sections" / f"{fname}.liquid").write_text(
        "{%- comment -%} Généré depuis site/src. Textes modifiables dans l'éditeur de thème. {%- endcomment -%}\n" + body.strip() + "\n\n" + schema(name, st),
        encoding="utf-8")


def template(tname, sections, order, extra=None):
    d = {"sections": sections, "order": order}
    if extra:
        d.update(extra)
    (OUT / "templates" / f"{tname}.json").write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


LEGAL = {"cgv", "mentions-legales", "confidentialite", "cookies"}
HOME_NAMES = ["Haut de page", "Comme une interview", "L'app", "Les livres", "Extrait d'un livre", "Ce que vous offrez",
              "Tarifs", "Avis (exemples)", "Questions fréquentes", "Question du dimanche", "Dernier appel"]
HOME_FILES = ["home-hero", "home-interview", "home-app", "home-livres", "home-extrait", "home-compris",
              "home-tarifs", "home-avis", "home-faq", "home-dimanche", "home-final"]

PAGE_LABEL = {
    "ma-vie": "Ma vie", "mes-ancetres": "Mes ancêtres", "un-temps-fort": "Un temps fort", "anniversaire": "Vœux",
    "recit": "Récit", "chronique": "Chronique", "voyage-solo": "Carnet de bord", "lignes-de-vie": "Lignes de vie",
    "memoire": "Mémoire", "aide": "Aide", "comment-ca-marche": "Comment ça marche", "application": "L'app",
    "donnees": "Vos données", "engagement": "Engagement", "devenir-ambassadeur": "Ambassadeur", "offrir-noel": "Noël",
    "fete-des-grands-meres": "Fête des grands-mères", "compte": "Mon compte", "merci": "Merci", "app": "Télécharger l'app",
    "carte-cadeau": "Offrir", "cgv": "CGV", "mentions-legales": "Mentions légales", "confidentialite": "Confidentialité",
    "cookies": "Cookies", "grossesse": "Grossesse", "annee-enfant": "L'année",
}


def convert(page, block, st, prefix):
    block = placeholders(block)
    block = rewrite_links(block)
    if page == "memoire":
        block = block.replace("<script>location.replace('/#prix')</script>",
                              "{%- unless request.design_mode -%}<script>location.replace('/#prix')</script>{%- endunless -%}")
    block = buy_conversions(block, st, prefix, page)
    block = settingize(block, st, prefix)
    return block


def home_hero(block, st):
    """Haut de l'accueil : la bande presse (exemple) passe derrière un réglage, éteint par défaut."""
    st.items.append({"type": "checkbox", "id": "show_press", "label": "Afficher la bande « Ils parlent de nous »", "default": False,
                     "info": "Exemple de mise en page : à n'afficher qu'avec de vrais articles et l'accord des médias pour leur nom."})
    st.values["show_press"] = False
    block = re.sub(r'(\s*<div class="press-band".*?</div></div>\n  </div>)', r"\n  {%- if section.settings.show_press -%}\1\n  {%- endif -%}", block, count=1, flags=re.S)
    # étiquettes du haut de page et étapes : modifiables aussi
    def tag(m):
        return m.group(1) + out(st.add("hero_tag", "Étiquette du haut", "text", m.group(2))) + m.group(3)
    block = re.sub(r"(<span>)([^<{]+)(</span>)(?=(?:<span>[^<]*</span>)*</p>)", tag, block, count=3)
    return block


def build_home():
    meta, body = read("index")
    blocks, _ = top_blocks(body)
    assert len(blocks) == 11, len(blocks)
    sections, order = {}, []
    for i, (b, fname, name) in enumerate(zip(blocks, HOME_FILES, HOME_NAMES)):
        st = Settings()
        if i == 0:
            b = home_hero(b, st)
        b = convert("index", b, st, "s")
        # étapes de « Comment ça marche » (dans le haut de page)
        if i == 0:
            def step(m):
                return m.group(1) + out(st.add("step", "Étape : texte", "text", m.group(2))) + m.group(3)
            b = re.sub(r'(<div class="stack-text">\s*<span class="num">[^<]*</span>\s*<h3>.*?</h3>\s*<p>)([^<{]+)(</p>)', step, b, flags=re.S)
            def stepnum(m):
                return m.group(1) + out(st.add("step_num", "Étape : sur-titre", "text", m.group(2))) + m.group(3)
            b = re.sub(r'(<span class="num">)([^<{]+)(</span>)', stepnum, b)
            def steph3(m):
                return m.group(1) + out(st.add("step_title", "Étape : titre", "inline_richtext", m.group(2))) + m.group(3)
            b = re.sub(r'(<div class="stack-text">\s*<span class="num">[^<]*</span>\s*<h3>)(.*?)(</h3>)', steph3, b, flags=re.S)
        example = fname == "home-avis"
        write_section(fname, b, st, name, example=example)
        sections[fname] = {"type": fname, "settings": st.values}
        order.append(fname)
    template("index", sections, order)
    return meta


def build_page(page):
    meta, body = read(page)
    blocks, _ = top_blocks(body)
    groups = []  # (is_example, [blocks])
    for b in blocks:
        ex = is_example(b)
        if ex or not groups or groups[-1][0]:
            groups.append((ex, [b]))
        else:
            groups[-1][1].append(b)
    is_product = page in PRODUCT_PAGES
    label = PAGE_LABEL[page]
    sections, order = {}, []
    n_content = 0
    for gi, (ex, bl) in enumerate(groups):
        st = Settings()
        parts = []
        for bi, b in enumerate(bl):
            parts.append(convert(page, b, st, f"b{bi + 1}"))
        body_html = "\n\n".join(parts)
        if ex:
            name = example_name(bl[0])
            fname = f"{page}-{gi + 1}-exemples"
        else:
            n_content += 1
            name = "Contenu" if len(groups) == 1 else f"Contenu {n_content}"
            fname = f"{page}-{gi + 1}"
        name = f"{label} · {name}"
        if len(name) > 25:
            name = name.replace("Fête des grands-mères", "Grands-mères").replace("Télécharger l'app", "App")
        if len(name) > 25:
            name = name[:25]
        write_section(fname, body_html, st, name, example=ex, legal=(page in LEGAL and gi == 0))
        sections[fname] = {"type": fname, "settings": st.values}
        order.append(fname)
    template(("product." if is_product else "page.") + page, sections, order)
    return meta


def snippets():
    lines = ["{%- comment -%}",
             "  Trouve la variante Shopify d'un livre à partir de sa clé (mavie, voeux:mariage…).",
             "  Paramètres : key, out ('id' ou 'price'), fallback (texte affiché si le produit n'existe pas encore).",
             "  Le tableau des clés est décrit dans README.md.",
             "{%- endcomment -%}",
             "{%- liquid", "  assign handle = ''", "  assign vtitle = ''", "  case key"]
    for k, (h, t) in KEYS.items():
        lines.append(f"    when '{k}'")
        lines.append(f"      assign handle = '{h}'")
        if t:
            lines.append(f"      assign vtitle = '{t}'")
    lines += ["  endcase",
              "  assign v = nil",
              "  if handle != ''",
              "    assign p = all_products[handle]",
              "    if p.id",
              "      if vtitle != ''",
              "        assign v = p.variants | where: 'title', vtitle | first",
              "      else",
              "        assign v = p.selected_or_first_available_variant",
              "      endif",
              "    endif",
              "  endif",
              "  if out == 'id'",
              "    if v", "      echo v.id", "    endif",
              "  else",
              "    if v", "      echo v.price | money_without_trailing_zeros", "    else", "      echo fallback", "    endif",
              "  endif",
              "-%}"]
    (OUT / "snippets" / "mm-variant.liquid").write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Données pour le panier latéral (site.js) : clé -> variante, compléments, adresse des images.
    d = ["{%- comment -%} Données lues par site.js pour le panier latéral (variantes des livres, compléments, images). {%- endcomment -%}",
         "<script>",
         "window.MM = {",
         "  asset: {{ 'site.js' | asset_url | split: 'site.js' | first | json }},",
         "  root: {{ routes.root_url | json }},",
         "  copyHandle: '" + COPY_HANDLE + "',",
         "  voixHandle: '" + VOIX_HANDLE + "',",
         "  hint: {% if settings.cart_hint_show and settings.cart_hint_text != blank %}{{ settings.cart_hint_text | json }}{% else %}null{% endif %},",
         "  keys: {"]
    for k, (h, t) in KEYS.items():
        sel = f"all_products['{h}'].variants | where: 'title', '{t}' | first" if t else f"all_products['{h}'].selected_or_first_available_variant"
        d.append("    {%- assign v = " + sel + " %}" + f"{json.dumps(k)}: " +
                 "{% if v %}{ \"id\": {{ v.id }}, \"price\": {{ v.price }}, \"available\": {{ v.available }} }{% else %}null{% endif %},")
    d += ["  },",
          f"  copy: [{{%- for v in all_products['{COPY_HANDLE}'].variants -%}}{{ \"id\": {{{{ v.id }}}}, \"price\": {{{{ v.price }}}} }}{{%- unless forloop.last -%}},{{%- endunless -%}}{{%- endfor -%}}],",
          f"  voix10: {{%- assign v = all_products['{VOIX_HANDLE}'].selected_or_first_available_variant -%}}{{% if v %}}{{ \"id\": {{{{ v.id }}}}, \"price\": {{{{ v.price }}}} }}{{% else %}}null{{% endif %}},",
          "  video: {" + ", ".join(f"{json.dumps(k)}: {{%- assign v = all_products['{h}'].selected_or_first_available_variant -%}}{{% if v %}}{{ \"id\": {{{{ v.id }}}}, \"price\": {{{{ v.price }}}} }}{{% else %}}null{{% endif %}}" for k, h in VIDEO_HANDLES.items()) + "},",
          "  pages: {" + ", ".join(f"{json.dumps(k)}: {{%- assign v = all_products['{h}'].selected_or_first_available_variant -%}}{{% if v %}}{{ \"id\": {{{{ v.id }}}}, \"price\": {{{{ v.price }}}} }}{{% else %}}null{{% endif %}}" for k, h in PAGES_HANDLES.items()) + "}",
          "};",
          "</script>"]
    (OUT / "snippets" / "mm-data.liquid").write_text("\n".join(d) + "\n", encoding="utf-8")


def assets():
    a = OUT / "assets"
    a.mkdir(parents=True, exist_ok=True)
    for f in (SITE / "assets").iterdir():
        if f.is_file() and f.name not in ("site.js",):
            shutil.copy2(f, a / f.name)
    for sub in ("photos", "app"):
        for f in (SITE / "assets" / sub).iterdir():
            if f.is_file():
                shutil.copy2(f, a / f.name)


def main():
    for d in ("sections", "templates", "snippets", "assets"):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    assets()
    snippets()
    metas = {"index": build_home()}
    for f in sorted(SRC.glob("*.html")):
        if f.stem != "index":
            metas[f.stem] = build_page(f.stem)
    hero = sorted(("index" if p == "index" else ("product." if p in PRODUCT_PAGES else "page.") + p) for p, m in metas.items() if m.get("hero"))
    nav = {(("product." if p in PRODUCT_PAGES else "page.") + p): m.get("nav", "") for p, m in metas.items() if p != "index" and m.get("nav")}
    print("HERO", ",".join(hero))
    print("NAV", nav)


if __name__ == "__main__":
    main()
