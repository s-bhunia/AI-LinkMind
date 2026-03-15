'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as cheerio from 'cheerio';


const BOT_USER_AGENT = 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)';

async function extractMetadataFallback(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': BOT_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    return {
      title: $('meta[property="og:title"]').attr('content') || $('title').text() || 'No title found',
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || 'No description found',
      creatorName: $('meta[property="og:site_name"]').attr('content') || 'Unknown',
      thumbnailUrl: $('meta[property="og:image"]').attr('content') || '',
    };
  } catch (error: any) {
    console.warn(`Fallback blocked (${error.message}). Extracting domain instead.`);
    
    // ULTIMATE FALLBACK: If the site completely blocks us, grab the domain from the URL
    // so Gemini at least has something to categorize!
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return {
        title: `Web link to ${domain}`,
        description: `Content hosted on ${domain}`,
        creatorName: domain,
        thumbnailUrl: '', // Keeps Zod happy
      };
    } catch (parseError) {
      // If the URL itself is completely broken
      return { title: 'No title found', description: 'No description found', creatorName: 'Unknown', thumbnailUrl: '' };
    }
  }
}

async function extractMetadata(url: string) {
  const SCRAPING_API_KEY = process.env.BROWSERLESS_API_KEY;
  
  if (!SCRAPING_API_KEY) {
    return extractMetadataFallback(url);
  }

  // Browserless /content API is usually better for raw HTML than /scrape
  const scrapingUrl = `https://chrome.browserless.io/content?token=${SCRAPING_API_KEY}`;

  try {
    const response = await fetch(scrapingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        // Tell Browserless to disguise itself
        setExtraHTTPHeaders: {
            'User-Agent': BOT_USER_AGENT,
            'Accept-Language': 'en-US,en;q=0.9'
        },
        stealth: true, // Turns on anti-bot evasion
        gotoOptions: { waitUntil: 'domcontentloaded' } // Faster than waiting for full network idle
      }),
    });

    if (!response.ok) {
      return extractMetadataFallback(url);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Helper to grab the best meta tag
    const getMetaTag = (name: string) => {
      return $(`meta[property="og:${name}"]`).attr('content') || 
             $(`meta[name="${name}"]`).attr('content') || 
             $(`meta[property="twitter:${name}"]`).attr('content') || '';
    };

    let creatorName = getMetaTag('site_name') || getMetaTag('author') || 'Unknown';

    return {
      title: getMetaTag('title') || $('title').text() || 'No title found',
      description: getMetaTag('description') || 'No description found',
      creatorName: creatorName.trim(),
      thumbnailUrl: getMetaTag('image'),
    };
  } catch (error) {
    console.error('Browserless scraping failed:', error);
    return extractMetadataFallback(url);
  }
}

const CategorizeSharedVideoLinkInputSchema = z.object({
  link: z.string().url().describe('The URL of the shared video.'),
});
export type CategorizeSharedVideoLinkInput = z.infer<
  typeof CategorizeSharedVideoLinkInputSchema
>;

const CategorizeSharedVideoLinkOutputSchema = z.object({
  title: z.string().describe('The original title of the video.'),
  description: z.string().describe('The original description of the video.'),
  creatorName: z
    .string()
    .describe("The video creator's channel or account name."),
  category: z.string().describe('The predicted category of the video.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence level of the category prediction (0 to 1).'),
  thumbnailUrl: z
    .string()
    .describe("A URL for the video's thumbnail image."),
    platform: z.string().describe('The name of the platform hosting the link (e.g., YouTube, Instagram, GitHub, Article).'),
});
export type CategorizeSharedVideoLinkOutput = z.infer<
  typeof CategorizeSharedVideoLinkOutputSchema
>;

export async function categorizeSharedVideoLink(
  input: CategorizeSharedVideoLinkInput
): Promise<CategorizeSharedVideoLinkOutput> {
  return categorizeSharedVideoLinkFlow(input);
}

const categorizePrompt = ai.definePrompt({
  name: 'categorizeSharedVideoLinkPrompt',
  input: {
    schema: z.object({
      title: z.string(),
      description: z.string(),
    }),
  },
  output: {
    schema: z.object({
      category: z.string().describe('The predicted category of the link.'),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe('The confidence level of the category prediction (0 to 1).'),
        platform: z.string(),
    }),

  },
  // UPGRADE: Tell the AI it is categorizing ANY web link, not just videos, 
  // and add categories like 'Technology', 'AI', and 'Productivity'.
  prompt: `You are an AI expert in categorizing web links, websites, articles, and videos. Based on the following title and description, assign the most accurate category.
  Available categories: Technology, AI, Productivity, Education, Entertainment, Music, Sports, News, Gaming, or suggest a new one if none fit well.
  
  If the title or description says "No title found", assign the category "Other" with a confidence of 0.5.
  
  Title: {{title}}
  Description: {{description}}`,
});

const categorizeSharedVideoLinkFlow = ai.defineFlow(
  {
    name: 'categorizeSharedVideoLinkFlow',
    inputSchema: CategorizeSharedVideoLinkInputSchema,
    outputSchema: CategorizeSharedVideoLinkOutputSchema,
  },
  async (input) => {
    const metadata = await extractMetadata(input.link);
    
    // GUARANTEE strings so Zod validation never throws an error
    const safeTitle = metadata.title || 'No title found';
    const safeDescription = metadata.description || 'No description found';
    const safeCreatorName = metadata.creatorName || 'Unknown';
    const safeThumbnailUrl = metadata.thumbnailUrl || ''; // Forces empty string if undefined
    
    try {
      // Execute the Gemini prompt with Genkit
      const { output } = await categorizePrompt({
        title: safeTitle,
        description: safeDescription,
      });
      
      if (!output) {
        throw new Error("Failed to get structured output from Gemini.");
      }

      return {
        title: safeTitle,
        description: safeDescription,
        creatorName: safeCreatorName,
        thumbnailUrl: safeThumbnailUrl,
        category: output.category || 'Other',
        confidence: output.confidence || 0.5,
        platform: output.platform ,
      };
      
    } catch (error) {
      console.error('Gemini classification failed:', error);
      
      // Fallback response so the UI doesn't crash if the AI fails
      return {
        title: safeTitle,
        description: safeDescription,
        creatorName: safeCreatorName,
        thumbnailUrl: safeThumbnailUrl,
        category: 'Other',
        confidence: 0.5,
        platform: 'Web',
      };
    }
  }
);