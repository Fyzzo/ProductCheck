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

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export async function scrapeProduct(url: string): Promise<ProductData> {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    timeout: 15000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data);

  // Extract from Open Graph meta tags
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';

  // Standard meta tags fallback
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const pageTitle = $('title').text() || '';

  // Try to extract JSON-LD structured data
  let schemaPrice = '';
  let schemaBrand = '';
  let schemaName = '';
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '{}');
      const schema = Array.isArray(json) ? json[0] : json;
      if (schema['@type'] === 'Product' || schema?.mainEntity?.['@type'] === 'Product') {
        const product = schema['@type'] === 'Product' ? schema : schema.mainEntity;
        schemaName = product.name || '';
        schemaBrand = product.brand?.name || product.brand || '';
        const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
        schemaPrice = offers?.price ? `${offers.price} ${offers.priceCurrency || ''}`.trim() : '';
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  // Extract visible page text (limited) for AI context
  const rawText = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 3000);

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
