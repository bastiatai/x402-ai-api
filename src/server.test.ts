import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';

// Create a test server instance without payment middleware for logic testing
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      message: 'x402 AI API is running',
    });
  });

  // Sentiment analysis (without payment middleware for testing)
  app.post('/api/sentiment', (req, res) => {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

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

    res.json({ text, sentiment, score });
  });

  // Summarization
  app.post('/api/summarize', (req, res) => {
    const { text, maxSentences = 3 } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];
    const summary = sentences.slice(0, maxSentences).join(' ');

    res.json({
      summary,
      stats: {
        originalLength: text.length,
        summaryLength: summary.length,
      },
    });
  });

  // Key point extraction
  app.post('/api/extract', (req, res) => {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const importantKeywords = ['important', 'key', 'critical', 'essential', 'significant', 'must', 'should', 'will'];
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];

    const keyPoints = sentences
      .filter((sentence: string) => {
        const lowerSentence = sentence.toLowerCase();
        return importantKeywords.some((keyword: string) => lowerSentence.includes(keyword));
      })
      .map((sentence: string) => sentence.trim());

    res.json({ keyPoints });
  });

  return app;
};

describe('x402 AI API', () => {
  const app = createTestApp();

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/sentiment', () => {
    it('should return positive sentiment for positive text', async () => {
      const response = await request(app)
        .post('/api/sentiment')
        .send({ text: 'Bitcoin is amazing! Stacks is great!' });

      expect(response.status).toBe(200);
      expect(response.body.sentiment).toBe('positive');
      expect(response.body.score).toBeGreaterThan(0);
    });

    it('should return negative sentiment for negative text', async () => {
      const response = await request(app)
        .post('/api/sentiment')
        .send({ text: 'This is terrible and awful.' });

      expect(response.status).toBe(200);
      expect(response.body.sentiment).toBe('negative');
      expect(response.body.score).toBeLessThan(0);
    });

    it('should return neutral sentiment for neutral text', async () => {
      const response = await request(app)
        .post('/api/sentiment')
        .send({ text: 'The sky is blue today.' });

      expect(response.status).toBe(200);
      expect(response.body.sentiment).toBe('neutral');
      expect(response.body.score).toBe(0);
    });

    it('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/sentiment')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/summarize', () => {
    it('should summarize text to specified number of sentences', async () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const response = await request(app)
        .post('/api/summarize')
        .send({ text, maxSentences: 2 });

      expect(response.status).toBe(200);
      expect(response.body.summary).toContain('First sentence');
      expect(response.body.summary).toContain('Second sentence');
      expect(response.body.summary).not.toContain('Fourth sentence');
    });

    it('should handle text with no sentence endings', async () => {
      const text = 'Just some text without punctuation';
      const response = await request(app)
        .post('/api/summarize')
        .send({ text });

      expect(response.status).toBe(200);
      expect(response.body.summary).toBe(text);
    });

    it('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/summarize')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/extract', () => {
    it('should extract sentences with important keywords', async () => {
      const text = 'This is important. Random text here. The key feature is security. Another sentence.';
      const response = await request(app)
        .post('/api/extract')
        .send({ text });

      expect(response.status).toBe(200);
      expect(response.body.keyPoints).toHaveLength(2);
      expect(response.body.keyPoints[0]).toContain('important');
      expect(response.body.keyPoints[1]).toContain('key');
    });

    it('should return empty array if no keywords found', async () => {
      const text = 'Just some regular text without any special words.';
      const response = await request(app)
        .post('/api/extract')
        .send({ text });

      expect(response.status).toBe(200);
      expect(response.body.keyPoints).toHaveLength(0);
    });

    it('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/extract')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
