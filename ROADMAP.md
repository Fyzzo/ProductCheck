# ProductCheck — Feuille de route

## Vision

Application web permettant d'analyser automatiquement un produit à partir de son lien URL.
L'IA identifie le produit et agrège les avis de plusieurs sources pour fournir une synthèse claire et objective.

---

## Phases de développement

### Phase 1 — Fondations (MVP)

**Objectif :** Avoir une app fonctionnelle de bout en bout avec les cas d'usage essentiels.

#### 1.1 — Structure du projet
- [ ] Initialiser un projet **Next.js 14** (App Router) avec TypeScript
- [ ] Configurer **Tailwind CSS** pour le style
- [ ] Mettre en place **ESLint / Prettier**
- [ ] Définir la structure des dossiers (`/app`, `/components`, `/lib`, `/services`)

#### 1.2 — Interface utilisateur
- [ ] Page d'accueil avec champ de saisie d'URL de produit
- [ ] Bouton d'analyse avec état de chargement (spinner)
- [ ] Page / section de résultats :
  - Nom et image du produit
  - Note globale (étoiles)
  - Synthèse IA des avis
  - Liste des avis par source avec lien original

#### 1.3 — Backend & API Routes
- [ ] Route `POST /api/analyze` : point d'entrée principal
- [ ] Service de **scraping de la page produit** (Puppeteer ou Cheerio)
  - Extraction : nom, marque, catégorie, description, image
- [ ] Service de **recherche d'avis** :
  - Google Shopping / serp scraping
  - Trustpilot
  - Amazon (si applicable)
  - Avis Vérifiés / Ciao / PriceRunner selon la région

#### 1.4 — Intégration IA (Claude API)
- [ ] Identification du produit depuis les métadonnées extraites
- [ ] Résumé des avis (points positifs / négatifs)
- [ ] Score de confiance global calculé par l'IA
- [ ] Détection de faux avis suspects

---

### Phase 2 — Enrichissement

**Objectif :** Améliorer la qualité des données et l'expérience utilisateur.

#### 2.1 — Sources d'avis supplémentaires
- [ ] Reddit (subreddits pertinents)
- [ ] YouTube (commentaires de reviews vidéos)
- [ ] Forums spécialisés par catégorie de produit
- [ ] Google Reviews

#### 2.2 — Analyse IA avancée
- [ ] Analyse de sentiment par critère (qualité, rapport qualité/prix, livraison, SAV)
- [ ] Comparaison avec des produits similaires
- [ ] Détection de la langue et traduction automatique des avis étrangers
- [ ] Historique des avis dans le temps (tendance)

#### 2.3 — UX / UI
- [ ] Design responsive mobile-first
- [ ] Mode sombre
- [ ] Graphiques visuels (radar chart des critères, histogramme des notes)
- [ ] Partage de l'analyse via lien unique

---

### Phase 3 — Scalabilité & Fonctionnalités avancées

**Objectif :** Préparer l'app à un usage intensif et multi-utilisateurs.

#### 3.1 — Authentification & Historique
- [ ] Connexion utilisateur (NextAuth.js — Google / email)
- [ ] Historique des analyses par utilisateur
- [ ] Favoris / watchlist produits

#### 3.2 — Performance & Infrastructure
- [ ] Cache des analyses (Redis) pour éviter les re-scraping inutiles
- [ ] Queue de jobs (BullMQ) pour les analyses longues
- [ ] Base de données (PostgreSQL + Prisma)
- [ ] Déploiement sur **Vercel** (frontend) + **Railway** ou **Fly.io** (workers)

#### 3.3 — API publique
- [ ] Clés API pour intégration tierce
- [ ] Rate limiting & quotas
- [ ] Documentation Swagger / OpenAPI

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Node.js |
| IA | Claude API (Anthropic) |
| Scraping | Puppeteer, Cheerio, Playwright |
| Base de données | PostgreSQL, Prisma ORM |
| Cache | Redis (Upstash) |
| Auth | NextAuth.js |
| Déploiement | Vercel + Railway |
| Monitoring | Sentry, Vercel Analytics |

---

## Architecture simplifiée

```
Utilisateur
    │
    ▼
[Page Web] ──URL produit──► [API /analyze]
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
             [Scraper      [Recherche   [Agrégateur
              page produit]  d'avis]     d'avis]
                    │           │           │
                    └───────────┴───────────┘
                                │
                                ▼
                        [Claude API]
                     (identification +
                      synthèse des avis)
                                │
                                ▼
                     [Résultats affichés]
```

---

## Priorités immédiates (Semaine 1)

1. Initialiser le projet Next.js
2. Créer l'interface d'entrée URL
3. Implémenter le scraping basique d'une page produit Amazon/Fnac
4. Connecter Claude API pour identifier le produit et résumer les avis trouvés
5. Afficher un premier résultat fonctionnel

---

## Risques & Mitigation

| Risque | Impact | Mitigation |
|---|---|---|
| Sites qui bloquent le scraping | Élevé | Rotation de proxies, délais, user-agent rotation |
| Qualité variable des avis | Moyen | Pondération par source, filtrage IA |
| Coût API Claude élevé | Moyen | Cache agressif, prompts optimisés |
| Faux avis non détectés | Moyen | Modèle de détection dédié |
| Légalité du scraping | Élevé | Utiliser des APIs officielles quand disponibles, respecter robots.txt |
