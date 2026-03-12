import Groq from 'groq-sdk';
import type { ProductData } from './scraper';
import type { ReviewSource } from './reviews';

export interface AnalysisResult {
  productName: string;
  brand: string;
  category: string;
  summary: string;
  pros: string[];
  cons: string[];
  globalScore: number;
  confidence: 'haute' | 'moyenne' | 'faible';
  recommendation: string;
}

export async function analyzeProduct(
  product: ProductData,
  reviews: ReviewSource[]
): Promise<AnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY manquante dans les variables d\'environnement');

  const groq = new Groq({ apiKey });

  const reviewsText = reviews
    .map(r => `- [${r.source}] Note: ${r.rating ?? 'N/A'}/5 | ${r.snippet}`)
    .join('\n');

  const prompt = `Tu es un expert en analyse de produits et d'avis consommateurs. Analyse ce produit et ses avis.

## Informations du produit
- Titre : ${product.title}
- Marque : ${product.brand || 'Inconnue'}
- Prix : ${product.price || 'Non renseigné'}
- Description : ${product.description}
- URL : ${product.url}
- Texte de la page : ${product.rawText.substring(0, 1500)}

## Avis trouvés sur le web
${reviewsText || 'Aucun avis trouvé.'}

## Instructions
Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans backticks) dans ce format exact :
{
  "productName": "Nom complet et précis du produit",
  "brand": "Marque du produit",
  "category": "Catégorie du produit (ex: Smartphone, Casque audio, Machine à café...)",
  "summary": "Résumé objectif de 3-4 phrases sur le produit et l'opinion générale des utilisateurs",
  "pros": ["Point positif 1", "Point positif 2", "Point positif 3"],
  "cons": ["Point négatif 1", "Point négatif 2", "Point négatif 3"],
  "globalScore": 7.5,
  "confidence": "haute",
  "recommendation": "Phrase courte de recommandation pour l'acheteur potentiel"
}

Règles :
- globalScore est un nombre décimal entre 0 et 10
- confidence est "haute", "moyenne" ou "faible" selon la quantité d'avis disponibles
- Si peu d'avis disponibles, base-toi sur les caractéristiques produit et la réputation de la marque
- Sois objectif et factuel
`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1024,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  const jsonText = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(jsonText) as AnalysisResult;
  } catch {
    throw new Error(`Réponse Groq invalide : ${text.substring(0, 200)}`);
  }
}
