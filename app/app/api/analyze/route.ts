import { NextRequest, NextResponse } from 'next/server';
import { scrapeProduct } from '@/lib/scraper';
import { searchReviews } from '@/lib/reviews';
import { analyzeProduct } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL manquante ou invalide' }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Format d\'URL invalide' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'L\'URL doit commencer par http:// ou https://' }, { status: 400 });
    }

    // Step 1: Scrape product page
    let product;
    try {
      product = await scrapeProduct(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      return NextResponse.json(
        { error: `Impossible d'accéder à la page produit : ${msg}` },
        { status: 502 }
      );
    }

    if (!product.title) {
      return NextResponse.json(
        { error: 'Aucune information produit trouvée sur cette page' },
        { status: 422 }
      );
    }

    // Step 2: Search for reviews (parallel, don't fail if some sources fail)
    const reviews = await searchReviews(product.title);

    // Step 3: AI analysis with Gemini
    let analysis;
    try {
      analysis = await analyzeProduct(product, reviews);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      return NextResponse.json(
        { error: `Erreur lors de l'analyse IA : ${msg}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ product, reviews, analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur inconnue';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
