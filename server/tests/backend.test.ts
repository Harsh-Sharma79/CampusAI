import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { calculateMastery, difficultyForMastery, normalizeAnswer } from '../src/services/masteryEngine.js';
import { chunkPages } from '../src/services/chunkingService.js';
import { safeOriginalFileName, validateUploadedDocument } from '../src/services/documentValidationService.js';
import { registerSchema } from '../src/validators/authSchemas.js';

const testEnv = {
  NODE_ENV: 'test',
  PORT: '5000',
  CAMPUSAI_POSTGRES_URL: 'postgresql://test:test@127.0.0.1:5432/campusai?schema=public',
  JWT_ACCESS_SECRET: 'access-test-secret-0123456789-abcdefghijklmnopqrstuvwxyz',
  JWT_REFRESH_SECRET: 'refresh-test-secret-0123456789-abcdefghijklmnopqrstuvwxyz',
  CLIENT_URL: 'http://localhost:5173',
  CLIENT_URLS: 'http://localhost:5173'
} as const;

before(() => {
  Object.assign(process.env, testEnv);
});

describe('evidence-derived learning helpers', () => {
  it('does not assign a score without a measured assessment or recall signal', () => {
    assert.equal(calculateMastery({ attemptCount: 0, correctCount: 0 }), null);
  });

  it('calculates bounded scores and confidence only from actual supplied outcomes', () => {
    const result = calculateMastery({ attemptCount: 8, correctCount: 6, recentAccuracy: 0.5, flashcardRecall: 0.75, daysSinceStudied: 0 });
    assert.deepEqual(result, { score: 68.06, confidence: 0.6321 });
    assert.equal(difficultyForMastery(null), 'FOUNDATIONAL');
    assert.equal(difficultyForMastery(result!.score), 'INTERMEDIATE');
  });

  it('normalizes Unicode and punctuation for answer comparison', () => {
    assert.equal(normalizeAnswer('  Café—North! '), 'cafenorth');
  });
});

describe('source processing and upload validation', () => {
  it('preserves page references and uses deterministic overlap between adjacent chunks', () => {
    const text = 'a'.repeat(12_000);
    const chunks = chunkPages([{ pageNumber: 4, text }]);
    assert.ok(chunks.length > 1);
    assert.deepEqual(chunks.map((chunk) => chunk.chunkIndex), chunks.map((_, index) => index));
    assert.ok(chunks.every((chunk) => chunk.pageNumber === 4));
    assert.equal(chunks[1]!.content.slice(0, 100), chunks[0]!.content.slice(-480, -380));
  });

  it('validates PDF bytes and rejects extension/MIME mismatches', () => {
    const pdf = Buffer.from('%PDF-1.7\nsource text');
    assert.equal(validateUploadedDocument({ originalname: 'notes.pdf', mimetype: 'application/pdf', size: pdf.length, buffer: pdf }), '.pdf');
    assert.throws(() => validateUploadedDocument({ originalname: 'notes.pdf', mimetype: 'text/plain', size: pdf.length, buffer: pdf }), /does not match/);
  });

  it('normalizes file paths to a safe basename', () => {
    assert.equal(safeOriginalFileName('../../week-1.pdf'), 'week-1.pdf');
  });
});

describe('backend API contract', () => {
  let app: import('express').Express;
  before(async () => {
    const { createApp } = await import('../src/app.js');
    app = createApp();
  });

  it('serves the origin route manifest and API liveness probe', async () => {
    const manifest = await request(app).get('/manus-routes.json').expect(200);
    assert.deepEqual(manifest.body, { routes: [] });
    await request(app).get('/api/health/live').expect(200, { status: 'ok' });
  });

  it('serves OpenAPI documentation and protects private profile routes', async () => {
    const spec = await request(app).get('/api/openapi.json').expect(200);
    assert.ok(spec.body.paths['/api/documents/upload']);
    assert.ok(spec.body.paths['/api/quizzes/generate']);
    await request(app).get('/api/profile').expect(401);
  });

  it('rejects client-supplied privilege escalation on registration', () => {
    assert.equal(registerSchema.safeParse({ name: 'Learner', email: 'Learner@Example.com', password: 'safe-password-123', role: 'ADMIN' }).success, false);
    assert.equal(registerSchema.parse({ name: 'Learner', email: 'Learner@Example.com', password: 'safe-password-123' }).email, 'learner@example.com');
  });
});
