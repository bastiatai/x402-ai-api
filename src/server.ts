import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { paymentMiddleware, STXtoMicroSTX } from 'x402-stacks';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || 'SP3QVGQG4SFHP0C983N1Y49V27CA70D2Y46E5Q4ZT'; // Bastiat's address
const NETWORK = (process.env.NETWORK as 'mainnet' | 'testnet') || 'testnet';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://x402-relay.aibtc.com';

// Free endpoint - no payment required
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'x402 AI API is running',
    network: NETWORK,
    endpoints: {
      '/api/health': 'Free - Health check',
      '/api/sentiment': 'Paid - Sentiment analysis (0.001 STX)',
      '/api/summarize': 'Paid - Text summarization (0.002 STX)',
      '/api/extract': 'Paid - Key point extraction (0.001 STX)'
    }
  });
});

// Paid endpoint: Sentiment analysis (0.001 STX)
app.post(
  '/api/sentiment',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.001), // 0.001 STX = 1000 microSTX
    payTo: PAYMENT_ADDRESS,
    network: NETWORK,
    facilitatorUrl: FACILITATOR_URL,
  }),
  async (req, res) => {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Simple sentiment analysis (in production, use real AI model)
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter((word: string) => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter((word: string) => lowerText.includes(word)).length;

    let sentiment: 'positive' | 'negative' | 'neutral';
    let score: number;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      score = Math.min(0.5 + (positiveCount * 0.1), 1.0);
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      score = Math.max(-0.5 - (negativeCount * 0.1), -1.0);
    } else {
      sentiment = 'neutral';
      score = 0;
    }

    res.json({
      text,
      sentiment,
      score,
      analysis: {
        positiveCount,
        negativeCount,
        textLength: text.length
      },
      provider: 'x402-ai-api',
      cost: '0.001 STX'
    });
  }
);

// Paid endpoint: Text summarization (0.002 STX)
app.post(
  '/api/summarize',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.002),
    payTo: PAYMENT_ADDRESS,
    network: NETWORK,
    facilitatorUrl: FACILITATOR_URL,
  }),
  async (req, res) => {
    const { text, maxSentences = 3 } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Simple summarization: extract first N sentences
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
    const summary = sentences.slice(0, maxSentences).join(' ');

    res.json({
      original: text,
      summary,
      stats: {
        originalLength: text.length,
        summaryLength: summary.length,
        compressionRatio: (summary.length / text.length * 100).toFixed(2) + '%',
        sentencesExtracted: Math.min(maxSentences, sentences.length)
      },
      provider: 'x402-ai-api',
      cost: '0.002 STX'
    });
  }
);

// Paid endpoint: Key point extraction (0.001 STX)
app.post(
  '/api/extract',
  paymentMiddleware({
    amount: STXtoMicroSTX(0.001),
    payTo: PAYMENT_ADDRESS,
    network: NETWORK,
    facilitatorUrl: FACILITATOR_URL,
  }),
  async (req, res) => {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Simple key point extraction: find sentences with important keywords
    const importantKeywords = ['important', 'key', 'critical', 'essential', 'significant', 'must', 'should', 'will'];
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];

    const keyPoints = sentences
      .filter((sentence: string) => {
        const lowerSentence = sentence.toLowerCase();
        return importantKeywords.some((keyword: string) => lowerSentence.includes(keyword));
      })
      .map((sentence: string) => sentence.trim());

    res.json({
      original: text,
      keyPoints,
      stats: {
        totalSentences: sentences.length,
        keyPointsFound: keyPoints.length
      },
      provider: 'x402-ai-api',
      cost: '0.001 STX'
    });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 x402 AI API running on port ${PORT}`);
  console.log(`📡 Network: ${NETWORK}`);
  console.log(`💰 Payment address: ${PAYMENT_ADDRESS}`);
  console.log(`🔗 Facilitator: ${FACILITATOR_URL}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/health      - Free health check`);
  console.log(`  POST /api/sentiment   - Paid (0.001 STX)`);
  console.log(`  POST /api/summarize   - Paid (0.002 STX)`);
  console.log(`  POST /api/extract     - Paid (0.001 STX)`);
});
