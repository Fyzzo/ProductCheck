'use client';

import { useState } from 'react';
import type { ProductData } from '@/lib/scraper';
import type { ReviewSource } from '@/lib/reviews';
import type { AnalysisResult } from '@/lib/gemini';

interface AnalyzeResponse {
  product: ProductData;
  reviews: ReviewSource[];
  analysis: AnalysisResult;
  error?: string;
}

type Status = 'idle' | 'scraping' | 'searching' | 'analyzing' | 'done' | 'error';

const STEPS = [
  { key: 'scraping', label: 'Extraction des infos produit...' },
  { key: 'searching', label: 'Recherche des avis sur le web...' },
  { key: 'analyzing', label: 'Analyse IA en cours...' },
];

const EXAMPLES = [
  {
    name: 'Samsung Galaxy S24',
    category: 'Smartphone',
    score: 8.2,
    summary: 'Excellent rapport qualité-prix, autonomie améliorée, mais chauffe légèrement en charge intensive.',
    pros: ['Écran sublime', 'Bonne autonomie'],
    cons: ['Prix des accessoires'],
  },
  {
    name: 'Nespresso Vertuo Pop',
    category: 'Machine à café',
    score: 7.4,
    summary: 'Facile à utiliser, design compact, mais les capsules sont chères et le choix limité.',
    pros: ['Très silencieuse', 'Rapide'],
    cons: ['Coût par tasse élevé'],
  },
  {
    name: 'Nike Air Max 270',
    category: 'Chaussures',
    score: 8.8,
    summary: 'Confort remarquable au quotidien, design apprécié, taille fidèle aux habituelles.',
    pros: ['Très confortable', 'Look soigné'],
    cons: ['Semelle salissante'],
  },
];

const FAQ = [
  {
    q: "C'est vraiment gratuit ?",
    a: "Oui, complètement. Pas d'inscription, pas de carte bancaire, pas de version payante cachée.",
  },
  {
    q: 'Quels sites sont supportés ?',
    a: "Tout site e-commerce accessible publiquement : Amazon, Fnac, Darty, Cdiscount, Boulanger, et bien d'autres. Si la page est publique, on peut l'analyser.",
  },
  {
    q: "D'où viennent les avis ?",
    a: "On agrège les avis disponibles sur Google, Trustpilot et Amazon.fr pour vous donner une vision large et représentative.",
  },
  {
    q: 'Les résultats sont-ils fiables ?',
    a: "L'IA se base sur les avis réels trouvés sur le web. Plus il y a d'avis disponibles, plus l'analyse est précise. Un indicateur de confiance vous indique la fiabilité du résultat.",
  },
  {
    q: 'Mes données sont-elles conservées ?',
    a: "Non. On ne stocke aucune URL analysée ni aucune donnée personnelle. Chaque analyse est indépendante.",
  },
];

function ScoreCircle({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const color =
    score >= 7.5 ? 'text-green-400 border-green-400' :
    score >= 5 ? 'text-yellow-400 border-yellow-400' :
    'text-red-400 border-red-400';
  const dim = size === 'lg' ? 'w-24 h-24' : 'w-14 h-14';
  const textSize = size === 'lg' ? 'text-3xl' : 'text-xl';

  return (
    <div className={`${dim} rounded-full border-4 flex flex-col items-center justify-center ${color} flex-shrink-0`}>
      <span className={`${textSize} font-bold leading-none`}>{score.toFixed(1)}</span>
      <span className="text-xs opacity-60">/10</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      <span className="text-gray-400 text-sm ml-1">{rating.toFixed(1)}/5</span>
    </span>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-900 transition-colors"
      >
        <span className="text-sm font-medium text-white">{q}</span>
        <span className={`text-gray-400 transition-transform flex-shrink-0 ml-4 ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  async function handleAnalyze() {
    if (!url.trim()) return;
    setError('');
    setData(null);

    setStatus('scraping');
    const stepTimer1 = setTimeout(() => setStatus('searching'), 3000);
    const stepTimer2 = setTimeout(() => setStatus('analyzing'), 7000);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const json = await res.json();

      if (!res.ok || json.error) {
        setError(json.error || 'Une erreur est survenue');
        setStatus('error');
        return;
      }

      setData(json);
      setStatus('done');
    } catch {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setError('Impossible de contacter le serveur. Vérifiez votre connexion.');
      setStatus('error');
    }
  }

  const isLoading = ['scraping', 'searching', 'analyzing'].includes(status);
  const showLanding = status === 'idle';

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 sticky top-0 bg-gray-950/90 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h1 className="text-xl font-bold text-white">ProductCheck</h1>
            <p className="text-xs text-gray-400">Analyse IA des avis produits</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-20">

        {/* ── HERO ── */}
        <section className="text-center space-y-6 py-16">
          <div className="inline-flex items-center gap-2 bg-blue-950 border border-blue-800 text-blue-300 text-xs font-medium px-3 py-1 rounded-full">
            ✨ Gratuit · Sans inscription · Résultat en 30 secondes
          </div>
          <h2 className="text-5xl font-bold tracking-tight leading-tight">
            Achetez malin.<br />
            <span className="text-blue-400">Lisez les vrais avis.</span>
          </h2>
          <p className="text-gray-400 text-xl max-w-xl mx-auto leading-relaxed">
            Collez le lien d&apos;un produit Amazon, Fnac ou Darty. Notre IA analyse des dizaines
            d&apos;avis en quelques secondes et vous donne un verdict honnête — sans pub, sans parti pris.
          </p>

          {/* Input */}
          <div className="flex gap-2 max-w-2xl mx-auto">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isLoading && handleAnalyze()}
              placeholder="Collez le lien du produit (Amazon, Fnac, Darty...)"
              disabled={isLoading}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleAnalyze}
              disabled={isLoading || !url.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
            >
              {isLoading ? 'Analyse...' : 'Analyser ce produit →'}
            </button>
          </div>

          <ul className="inline-flex flex-col items-start gap-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <span className="text-green-400 font-bold">✓</span>
              Avis agrégés depuis Google, Trustpilot et Amazon — plus de sources = plus de fiabilité
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400 font-bold">✓</span>
              Résumé IA instantané : points forts, défauts et score sur 10
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400 font-bold">✓</span>
              100% gratuit, aucune inscription requise
            </li>
          </ul>
        </section>

        {/* ── LOADING ── */}
        {isLoading && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 max-w-2xl mx-auto">
            {STEPS.map((step, i) => {
              const stepIndex = STEPS.findIndex(s => s.key === status);
              const isDone = i < stepIndex;
              const isCurrent = i === stepIndex;
              return (
                <div key={step.key} className={`flex items-center gap-3 transition-opacity ${i > stepIndex ? 'opacity-30' : 'opacity-100'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isDone ? 'bg-green-500' : isCurrent ? 'bg-blue-500 animate-pulse' : 'bg-gray-700'}`}>
                    {isDone ? '✓' : isCurrent ? '…' : '·'}
                  </div>
                  <span className={`text-sm ${isCurrent ? 'text-white' : isDone ? 'text-green-400' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ERROR ── */}
        {status === 'error' && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-5 text-red-300 max-w-2xl mx-auto">
            <p className="font-semibold mb-1">Erreur</p>
            <p className="text-sm">{error}</p>
            <button onClick={() => setStatus('idle')} className="mt-3 text-xs text-red-400 underline">
              Réessayer
            </button>
          </div>
        )}

        {/* ── RESULTS ── */}
        {status === 'done' && data && (
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Product Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex gap-4">
              {data.product.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.product.image}
                  alt={data.analysis.productName}
                  className="w-24 h-24 object-contain rounded-xl bg-white/5 flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs text-blue-400 font-medium uppercase tracking-wide">{data.analysis.category}</span>
                <h2 className="text-lg font-bold mt-1 leading-tight">{data.analysis.productName}</h2>
                <p className="text-gray-400 text-sm mt-1">{data.analysis.brand}</p>
                {data.product.price && <p className="text-green-400 font-semibold mt-2">{data.product.price}</p>}
              </div>
            </div>

            {/* AI Score */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Analyse IA</h3>
              <div className="flex items-start gap-6">
                <ScoreCircle score={data.analysis.globalScore} />
                <div className="flex-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mb-2 inline-block ${
                    data.analysis.confidence === 'haute' ? 'bg-green-900 text-green-300' :
                    data.analysis.confidence === 'moyenne' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    Confiance {data.analysis.confidence}
                  </span>
                  <p className="text-gray-300 text-sm leading-relaxed">{data.analysis.summary}</p>
                  <p className="text-blue-300 text-sm mt-3 italic">💡 {data.analysis.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Pros & Cons */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-green-400 font-semibold text-sm mb-3">Points positifs</h3>
                <ul className="space-y-2">
                  {data.analysis.pros.map((pro, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>{pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-red-400 font-semibold text-sm mb-3">Points négatifs</h3>
                <ul className="space-y-2">
                  {data.analysis.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">−</span>{con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Review Sources */}
            {data.reviews.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Sources d&apos;avis ({data.reviews.length})
                </h3>
                <div className="space-y-3">
                  {data.reviews.map((review, i) => (
                    <a key={i} href={review.url} target="_blank" rel="noopener noreferrer"
                      className="block bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate">{review.source}</p>
                          {review.snippet && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{review.snippet}</p>}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {review.rating !== null && <StarRating rating={review.rating} />}
                          {review.reviewCount !== null && <p className="text-xs text-gray-500 mt-1">{review.reviewCount.toLocaleString()} avis</p>}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { setStatus('idle'); setData(null); setUrl(''); }}
              className="w-full border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white py-3 rounded-xl transition-colors text-sm"
            >
              Analyser un autre produit
            </button>
          </div>
        )}

        {/* ── LANDING SECTIONS (only when idle) ── */}
        {showLanding && (
          <>
            {/* COMMENT ÇA MARCHE */}
            <section className="py-16 border-t border-gray-800">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold">Simple comme un copier-coller</h2>
                <p className="text-gray-400 mt-2 text-sm">Trois étapes, zéro friction.</p>
              </div>
              <div className="grid grid-cols-3 gap-6 text-center">
                {[
                  { icon: '🔗', title: 'Copiez le lien', text: "Trouvez le produit sur n'importe quel site e-commerce et copiez son URL" },
                  { icon: '🔍', title: 'On fait le travail', text: "Notre IA parcourt Google, Trustpilot et Amazon pour collecter tous les avis disponibles" },
                  { icon: '✅', title: 'Décidez en confiance', text: "Score sur 10, avantages, inconvénients, recommandation : tout est là" },
                ].map((step, i) => (
                  <div key={i} className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-2xl mx-auto">
                      {step.icon}
                    </div>
                    <p className="font-semibold text-white">{step.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* EXEMPLES D'ANALYSE */}
            <section className="py-16 border-t border-gray-800">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold">Ce que vous obtenez en 30 secondes</h2>
                <p className="text-gray-400 mt-2 text-sm">Voici à quoi ressemble une analyse ProductCheck sur des produits réels.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {EXAMPLES.map((ex, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-blue-400 uppercase tracking-wide font-medium">{ex.category}</span>
                        <h3 className="text-sm font-bold mt-0.5">{ex.name}</h3>
                      </div>
                      <ScoreCircle score={ex.score} size="sm" />
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed italic">&ldquo;{ex.summary}&rdquo;</p>
                    <div className="space-y-1">
                      {ex.pros.map((p, j) => (
                        <p key={j} className="text-xs text-green-400">+ {p}</p>
                      ))}
                      {ex.cons.map((c, j) => (
                        <p key={j} className="text-xs text-red-400">− {c}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* POURQUOI PRODUCTCHECK */}
            <section className="py-16 border-t border-gray-800">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold">Fini de passer 30 minutes à lire des avis contradictoires</h2>
                <p className="text-gray-400 mt-2 text-sm max-w-xl mx-auto">
                  On a tous déjà été perdus entre un avis 5 étoiles et un avis 1 étoile sur le même produit.
                  ProductCheck synthétise tout en quelques secondes.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🌐', title: 'Multi-sources', text: "On ne se limite pas à un seul site. Google, Trustpilot, Amazon — on croise les sources pour une image complète." },
                  { icon: '🤖', title: 'Résumé IA', text: "L'IA lit et synthétise à votre place. Plus besoin de parcourir des dizaines de pages d'avis." },
                  { icon: '⚖️', title: 'Objectif', text: "Aucune affiliation, aucune commission. Notre seul objectif : vous aider à faire le bon choix." },
                  { icon: '⚡', title: 'Rapide', text: "Résultat en moins de 30 secondes. Moins de temps à chercher, plus de temps à profiter." },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex gap-4">
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-white mb-1">{item.title}</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section className="py-16 border-t border-gray-800">
              <div className="text-center mb-10">
                <h2 className="text-2xl font-bold">Questions fréquentes</h2>
              </div>
              <div className="space-y-3 max-w-2xl mx-auto">
                {FAQ.map((item, i) => (
                  <FaqItem key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-6 text-center text-xs text-gray-600">
        ProductCheck — Analyse IA des avis produits · Gratuit · Sans inscription
      </footer>
    </div>
  );
}
