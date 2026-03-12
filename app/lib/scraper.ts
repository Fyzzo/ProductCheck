import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ProductData {
  title: string;
  description: string;
  image: string;
  price: string;
  brand: string;
  url: string;
  rawText: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/** Extract product name hints directly from the URL (no network call needed) */
function extractFromUrl(url: string): Partial<ProductData> {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');

    // Amazon: /dp/ASIN or /gp/product/ASIN
    const amazonMatch = parsed.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);

    // Generic: try to extract readable text from path segments
    const pathSegments = parsed.pathname
      .split('/')
      .filter(s => s.length > 3 && !/^[A-Z0-9]{10}$/.test(s)) // exclude ASINs
      .map(s => s.replace(/[-_+]/g, ' ').replace(/\.[a-z]+$/, '').trim())
      .filter(s => !/^\d+$/.test(s)); // exclude pure numbers

    const titleFromPath = pathSegments
      .sort((a, b) => b.length - a.length)[0] // longest segment = most descriptive
      ?.replace(/\b\w/g, c => c.toUpperCase()) || '';

    return {
      title: titleFromPath,
      url,
      rawText: `URL: ${url}. Domaine: ${host}. ${amazonMatch ? `ASIN Amazon: ${amazonMatch[1]}.` : ''}`,
      description: '',
      image: '',
      price: '',
      brand: '',
    };
  } catch {
    return { title: '', url, rawText: `URL: ${url}`, description: '', image: '', price: '', brand: '' };
  }
}

async function fetchWithRetry(url: string): Promise<string> {
  const errors: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': randomUA(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
        },
        timeout: 12000,
        maxRedirects: 5,
        // Accept any status (we'll handle non-200 ourselves)
        validateStatus: () => true,
      });

      if (response.status === 200) return response.data as string;
      if (response.status === 403 || response.status === 503) {
        errors.push(`HTTP ${response.status} — site bloqué`);
        break; // No point retrying
      }
      errors.push(`HTTP ${response.status}`);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Erreur réseau');
    }
  }

  throw new Error(errors.join(' / '));
}

function parseHtml(html: string, url: string): ProductData {
  const $ = cheerio.load(html);

  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const pageTitle = $('title').text().split('|')[0].split('-')[0].trim() || '';

  let schemaPrice = '';
  let schemaBrand = '';
  let schemaName = '';

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).html() || '{}';
      const json = JSON.parse(raw);
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const product = item['@type'] === 'Product' ? item
          : item?.mainEntity?.['@type'] === 'Product' ? item.mainEntity
          : null;
        if (product) {
          schemaName = schemaName || product.name || '';
          schemaBrand = schemaBrand || product.brand?.name || (typeof product.brand === 'string' ? product.brand : '') || '';
          const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
          schemaPrice = schemaPrice || (offers?.price ? `${offers.price} ${offers.priceCurrency || '€'}`.trim() : '');
        }
      }
    } catch { /* ignore */ }
  });

  const rawText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000);

  return {
    title: schemaName || ogTitle || pageTitle,
    description: ogDescription || metaDescription,
    image: ogImage,
    price: schemaPrice,
    brand: schemaBrand,
    url,
    rawText,
  };
}

export async function scrapeProduct(url: string): Promise<ProductData> {
  let html: string | null = null;
  let scrapeError = '';

  try {
    html = await fetchWithRetry(url);
  } catch (e) {
    scrapeError = e instanceof Error ? e.message : 'Erreur inconnue';
  }

  // If we got HTML, parse it
  if (html) {
    const parsed = parseHtml(html, url);
    // If we got meaningful data, return it
    if (parsed.title) return parsed;
  }

  // Fallback: extract what we can from the URL itself
  // This is enough for the AI to identify and search for the product
  const urlData = extractFromUrl(url);

  if (!urlData.title && scrapeError) {
    throw new Error(
      scrapeError.includes('bloqué')
        ? `Ce site bloque les requêtes automatiques (${scrapeError}). Essayez un lien d'un autre site.`
        : `Impossible d'accéder à la page : ${scrapeError}`
    );
  }

  // Return URL-based data even if partial — the AI will do its best
  return urlData as ProductData;
}
