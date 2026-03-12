import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ReviewSource {
  source: string;
  rating: number | null;
  reviewCount: number | null;
  snippet: string;
  url: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    },
    timeout: 10000,
    maxRedirects: 5,
  });
  return response.data;
}

async function searchGoogle(productName: string): Promise<ReviewSource[]> {
  const query = encodeURIComponent(`${productName} avis test`);
  const url = `https://www.google.com/search?q=${query}&hl=fr&num=8`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results: ReviewSource[] = [];

    // Parse organic search results
    $('div.g, div[data-hveid]').each((_, el) => {
      const title = $(el).find('h3').first().text().trim();
      const snippet = $(el).find('div[data-sncf], span.aCOpRe, div.VwiC3b').first().text().trim();
      const link = $(el).find('a[href]').first().attr('href') || '';

      if (title && snippet && link.startsWith('http')) {
        results.push({
          source: `Google — ${title.substring(0, 60)}`,
          rating: null,
          reviewCount: null,
          snippet: snippet.substring(0, 300),
          url: link,
        });
      }
    });

    return results.slice(0, 4);
  } catch {
    return [];
  }
}

async function searchTrustpilot(productName: string): Promise<ReviewSource[]> {
  const query = encodeURIComponent(productName);
  const url = `https://fr.trustpilot.com/search?query=${query}`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results: ReviewSource[] = [];

    // Parse Trustpilot search results
    $('div[class*="businessUnitResult"], article[class*="business"]').each((_, el) => {
      const name = $(el).find('h2, h3, [class*="title"]').first().text().trim();
      const ratingText = $(el).find('[class*="rating"], [class*="score"]').first().text().trim();
      const reviewText = $(el).find('[class*="review"], [class*="count"]').first().text().trim();
      const link = $(el).find('a[href]').first().attr('href') || '';

      const rating = parseFloat(ratingText.replace(',', '.')) || null;
      const reviewMatch = reviewText.match(/[\d\s]+/);
      const reviewCount = reviewMatch ? parseInt(reviewMatch[0].replace(/\s/g, '')) : null;

      if (name && link) {
        results.push({
          source: `Trustpilot — ${name}`,
          rating: rating && rating <= 5 ? rating : null,
          reviewCount,
          snippet: `Évaluation Trustpilot pour ${name}`,
          url: link.startsWith('http') ? link : `https://fr.trustpilot.com${link}`,
        });
      }
    });

    return results.slice(0, 3);
  } catch {
    return [];
  }
}

async function searchAmazonReviews(productName: string): Promise<ReviewSource[]> {
  const query = encodeURIComponent(productName);
  const url = `https://www.amazon.fr/s?k=${query}`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results: ReviewSource[] = [];

    $('div[data-component-type="s-search-result"]').each((_, el) => {
      const title = $(el).find('h2 span').first().text().trim();
      const ratingText = $(el).find('i[class*="a-star"] span.a-offscreen').first().text().trim();
      const reviewText = $(el).find('span[aria-label*="évaluation"], span[aria-label*="avis"]').first().attr('aria-label') || '';
      const link = $(el).find('h2 a[href]').first().attr('href') || '';

      const ratingMatch = ratingText.match(/[\d,.]+/);
      const rating = ratingMatch ? parseFloat(ratingMatch[0].replace(',', '.')) : null;

      if (title && link) {
        results.push({
          source: `Amazon.fr — ${title.substring(0, 60)}`,
          rating: rating && rating <= 5 ? rating : null,
          reviewCount: null,
          snippet: reviewText || `Produit trouvé sur Amazon.fr : ${title}`,
          url: link.startsWith('http') ? link : `https://www.amazon.fr${link}`,
        });
      }
    });

    return results.slice(0, 3);
  } catch {
    return [];
  }
}

export async function searchReviews(productName: string): Promise<ReviewSource[]> {
  // Run all searches in parallel
  const [googleResults, trustpilotResults, amazonResults] = await Promise.allSettled([
    searchGoogle(productName),
    searchTrustpilot(productName),
    searchAmazonReviews(productName),
  ]);

  const all: ReviewSource[] = [
    ...(googleResults.status === 'fulfilled' ? googleResults.value : []),
    ...(trustpilotResults.status === 'fulfilled' ? trustpilotResults.value : []),
    ...(amazonResults.status === 'fulfilled' ? amazonResults.value : []),
  ];

  return all;
}
