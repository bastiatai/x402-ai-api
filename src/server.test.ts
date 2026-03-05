import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Mock the payment middleware so tests don't require real STX payments
vi.mock('x402-stacks', () => ({
  STXtoMicroSTX: (val: number) => val * 1_000_000,
  paymentMiddleware: () => (_req: any, _res: any, next: () => void) => next(),
}));

// Import app after mocking dependencies
const { app } = await import('./server');

describe('x402 AI API', () => {
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

    it('should return 400 if text exceeds 10,000 characters', async () => {
      const response = await request(app)
        .post('/api/sentiment')
        .send({ text: 'a'.repeat(10001) });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('10,000');
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

    it('should return 400 if text exceeds 10,000 characters', async () => {
      const response = await request(app)
        .post('/api/summarize')
        .send({ text: 'a'.repeat(10001) });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('10,000');
    });

    it('should clamp maxSentences to minimum of 1', async () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const response = await request(app)
        .post('/api/summarize')
        .send({ text, maxSentences: -5 });

      expect(response.status).toBe(200);
      // With maxSentences clamped to 1, only the first sentence should appear
      expect(response.body.summary).toContain('First sentence');
      expect(response.body.summary).not.toContain('Second sentence');
    });

    it('should clamp maxSentences to maximum of 20', async () => {
      const text = 'First sentence. Second sentence.';
      const response = await request(app)
        .post('/api/summarize')
        .send({ text, maxSentences: 999 });

      expect(response.status).toBe(200);
      // Should not error out — clamped to 20
      expect(response.body.summary).toBeDefined();
    });

    it('should default maxSentences to 3 for invalid string input', async () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
      const response = await request(app)
        .post('/api/summarize')
        .send({ text, maxSentences: 'abc' });

      expect(response.status).toBe(200);
      // Defaults to 3 sentences
      expect(response.body.stats.sentencesExtracted).toBe(3);
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

    it('should return 400 if text exceeds 10,000 characters', async () => {
      const response = await request(app)
        .post('/api/extract')
        .send({ text: 'a'.repeat(10001) });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('10,000');
    });
  });
});
