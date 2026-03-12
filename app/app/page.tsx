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

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 7.5 ? 'text-green-400 border-green-400' :
    score >= 5 ? 'text-yellow-400 border-yellow-400' :
    'text-red-400 border-red-400';

  return (
    <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center ${color}`}>
      <span className="text-3xl font-bold">{score.toFixed(1)}</span>
      <span className="text-xs opacity-70">/10</span>
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

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <div>
            <h1 className="text-xl font-bold text-white">ProductCheck</h1>
            <p className="text-xs text-gray-400">Analyse IA des avis produits</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4 pt-4">
          <h2 className="text-4xl font-bold tracking-tight leading-tight">
            Achetez malin.<br />Lisez les vrais avis.
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            ProductCheck analyse des dizaines d&apos;avis à travers le web et vous donne
            un verdict clair en quelques secondes — sans pub, sans parti pris.
          </p>
          <ul className="inline-flex flex-col items-start gap-2 text-sm text-gray-300 mt-2">
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
        </div>

        {/* URL Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
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
              {isLoading ? 'Analyse...' : 'Analyser ce produit'}
            </button>
          </div>
        </div>

        {/* Comment ça marche */}
        {status === 'idle' && (
          <div className="border border-gray-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-5 text-center">
              Comment ça marche
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="text-3xl">🔗</div>
                <p className="text-sm font-semibold text-white">Copiez le lien</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Trouvez le produit sur n&apos;importe quel site e-commerce et copiez son URL
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">🔍</div>
                <p className="text-sm font-semibold text-white">On analyse</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Notre IA parcourt le web pour collecter et synthétiser les avis
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">✅</div>
                <p className="text-sm font-semibold text-white">Décidez en confiance</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Lisez le verdict : score, avantages, inconvénients, recommandation
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Steps */}
        {isLoading && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
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

        {/* Error */}
        {status === 'error' && (
          <div className="bg-red-950 border border-red-800 rounded-2xl p-5 text-red-300">
            <p className="font-semibold mb-1">Erreur</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {status === 'done' && data && (
          <div className="space-y-6">
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
                <span className="text-xs text-blue-400 font-medium uppercase tracking-wide">
                  {data.analysis.category}
                </span>
                <h2 className="text-lg font-bold mt-1 leading-tight">{data.analysis.productName}</h2>
                <p className="text-gray-400 text-sm mt-1">{data.analysis.brand}</p>
                {data.product.price && (
                  <p className="text-green-400 font-semibold mt-2">{data.product.price}</p>
                )}
              </div>
            </div>

            {/* AI Score */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                Analyse IA
              </h3>
              <div className="flex items-start gap-6">
                <ScoreCircle score={data.analysis.globalScore} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      data.analysis.confidence === 'haute' ? 'bg-green-900 text-green-300' :
                      data.analysis.confidence === 'moyenne' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>
                      Confiance {data.analysis.confidence}
                    </span>
                  </div>
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
                      <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-red-400 font-semibold text-sm mb-3">Points négatifs</h3>
                <ul className="space-y-2">
                  {data.analysis.cons.map((con, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">−</span>
                      {con}
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
                    <a
                      key={i}
                      href={review.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-800 hover:bg-gray-700 rounded-xl p-4 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate">
                            {review.source}
                          </p>
                          {review.snippet && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{review.snippet}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          {review.rating !== null && <StarRating rating={review.rating} />}
                          {review.reviewCount !== null && (
                            <p className="text-xs text-gray-500 mt-1">{review.reviewCount.toLocaleString()} avis</p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Analyze another */}
            <button
              onClick={() => { setStatus('idle'); setData(null); setUrl(''); }}
              className="w-full border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white py-3 rounded-xl transition-colors text-sm"
            >
              Analyser un autre produit
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
