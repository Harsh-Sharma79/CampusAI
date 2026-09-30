const bearer = [{ bearerAuth: [] }];
const jsonBody = (schema: Record<string, unknown>) => ({ required: true, content: { 'application/json': { schema } } });
const response = (description: string) => ({ description });
const ok = { '200': response('Successful response'), '400': response('Validation error'), '401': response('Authentication required'), '500': response('Unexpected server error') };
const protectedOp = (summary: string, extra: Record<string, unknown> = {}) => ({ summary, security: bearer, responses: ok, ...extra });

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'CampusAI API', version: '1.0.0',
    description: 'Backend API for authenticated academic study workflows. Private records are scoped to the authenticated owner. AI outputs are validated; citations refer to uploaded source chunks. PostgreSQL with pgvector is required.'
  },
  servers: [{ url: '/', description: 'Current API origin' }],
  tags: [
    { name: 'Health' }, { name: 'Authentication' }, { name: 'Onboarding' }, { name: 'Documents' },
    { name: 'Tutor' }, { name: 'Learning' }, { name: 'Planning' }, { name: 'Progress' }, { name: 'Administration' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: '15-minute access token; refresh tokens are rotated through the HttpOnly refresh cookie.' },
      sessionCookie: { type: 'apiKey', in: 'cookie', name: 'campusai_access' }
    },
    schemas: {
      ApiError: { type: 'object', properties: { success: { type: 'boolean', example: false }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: { type: 'array', items: { type: 'object' } } }, required: ['code', 'message'] } }, required: ['success', 'error'] },
      Page: { type: 'object', properties: { items: { type: 'array', items: {} }, nextCursor: { type: 'string', nullable: true } }, required: ['items', 'nextCursor'] },
      QuizGeneration: { type: 'object', required: ['count'], properties: { subjectId: { type: 'string', format: 'uuid' }, topicId: { type: 'string', format: 'uuid' }, documentId: { type: 'string', format: 'uuid' }, count: { type: 'integer', minimum: 1, maximum: 40, default: 10 }, difficulty: { type: 'string', enum: ['FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED'] }, quizType: { type: 'string', enum: ['PRACTICE', 'DIAGNOSTIC'], default: 'PRACTICE' } } },
      Document: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, fileName: { type: 'string' }, documentType: { type: 'string', enum: ['SYLLABUS', 'NOTES', 'PREVIOUS_YEAR_PAPER', 'OTHER'] }, status: { type: 'string', enum: ['UPLOADING', 'PROCESSING', 'READY', 'FAILED'] }, pageCount: { type: 'integer', nullable: true }, createdAt: { type: 'string', format: 'date-time' } } }
    }
  },
  paths: {
    '/api/health/live': { get: { tags: ['Health'], summary: 'Liveness probe', responses: { '200': response('Service process is alive') } } },
    '/api/health/ready': { get: { tags: ['Health'], summary: 'Database readiness probe', responses: { '200': response('Database is ready'), '503': response('Database unavailable') } } },
    '/api/auth/register': { post: { tags: ['Authentication'], summary: 'Create a student account and session', requestBody: jsonBody({ type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 } } }), responses: { '201': response('Account created'), '400': response('Validation error'), '409': response('Email already registered') } } },
    '/api/auth/login': { post: { tags: ['Authentication'], summary: 'Create an authenticated session', requestBody: jsonBody({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } }), responses: { '200': response('Signed in; HttpOnly session cookies set'), '401': response('Invalid credentials') } } },
    '/api/auth/refresh': { post: { tags: ['Authentication'], summary: 'Rotate the refresh session', responses: { '200': response('Tokens rotated'), '401': response('Refresh session required') } } },
    '/api/auth/logout': { post: { tags: ['Authentication'], summary: 'Revoke current refresh session', responses: { '204': response('Session revoked') } } },
    '/api/auth/me': { get: protectedOp('Get the authenticated user', { tags: ['Authentication'] }) },
    '/api/auth/forgot-password': { post: { tags: ['Authentication'], summary: 'Request a password reset email', responses: { '202': response('Generic accepted response') } } },
    '/api/auth/reset-password': { post: { tags: ['Authentication'], summary: 'Reset password using a single-use emailed token', responses: { '200': response('Password reset') } } },
    '/api/onboarding': { get: protectedOp('Read the authenticated learner profile', { tags: ['Onboarding'] }), put: protectedOp('Save academic onboarding details, subjects, preferences and exams', { tags: ['Onboarding'], requestBody: jsonBody({ type: 'object' }), responses: { '200': response('Onboarding saved'), '400': response('Validation error') } }) },
    '/api/documents/upload': { post: protectedOp('Upload a private PDF, DOCX or TXT source document', { tags: ['Documents'], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, subjectId: { type: 'string', format: 'uuid' }, topicId: { type: 'string', format: 'uuid' }, documentType: { type: 'string', enum: ['SYLLABUS', 'NOTES', 'PREVIOUS_YEAR_PAPER', 'OTHER'] } } } } } }, responses: { '202': response('Upload stored and processing job queued'), '413': response('Upload exceeds configured file limit') } }) },
    '/api/documents': { get: protectedOp('List owned documents with pagination and optional status filter', { tags: ['Documents'] }) },
    '/api/documents/{id}': { get: protectedOp('Read owned document, extracted source chunks and topic evidence', { tags: ['Documents'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }] }), delete: protectedOp('Delete owned document and stored file', { tags: ['Documents'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '204': response('Document deleted'), '404': response('Document not found') } }) },
    '/api/documents/{id}/download': { get: protectedOp('Download an owned source file', { tags: ['Documents'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': response('Private file bytes') } }) },
    '/api/jobs/{id}': { get: protectedOp('Get status for an owned background job', { tags: ['Learning'], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }] }) },
    '/api/dashboard': { get: protectedOp('Read real dashboard aggregates and next-best action', { tags: ['Progress'] }) },
    '/api/progress': { get: protectedOp('Read analytics calculated from recorded activities and assessments', { tags: ['Progress'] }) },
    '/api/progress/topics': { get: protectedOp('Read topic performance and assessment-based mastery', { tags: ['Progress'] }) },
    '/api/progress/subjects': { get: protectedOp('Read subject-level aggregates calculated from topic outcomes', { tags: ['Progress'] }) },
    '/api/progress/history': { get: protectedOp('Read paginated learning activity history', { tags: ['Progress'] }) },
    '/api/knowledge': { get: protectedOp('Read topic tree, objectives, mastery and source evidence', { tags: ['Learning'] }) },
    '/api/chats': { get: protectedOp('List owned tutor conversations', { tags: ['Tutor'] }) },
    '/api/chats/{id}': { get: protectedOp('Read a tutor conversation and its citations', { tags: ['Tutor'] }), delete: protectedOp('Delete a tutor conversation', { tags: ['Tutor'], responses: { '204': response('Conversation deleted') } }) },
    '/api/chats/messages': { post: protectedOp('Send a grounded tutor message', { tags: ['Tutor'], requestBody: jsonBody({ type: 'object', required: ['question'], properties: { chatId: { type: 'string', format: 'uuid' }, question: { type: 'string', maxLength: 10000 }, subjectId: { type: 'string', format: 'uuid' }, topicId: { type: 'string', format: 'uuid' }, documentId: { type: 'string', format: 'uuid' } } }), responses: { '201': response('Tutor reply with source citations') } }) },
    '/api/quizzes': { get: protectedOp('List generated quizzes', { tags: ['Learning'] }) },
    '/api/quizzes/generate': { post: protectedOp('Generate a source-grounded adaptive quiz', { tags: ['Learning'], requestBody: jsonBody({ $ref: '#/components/schemas/QuizGeneration' }), responses: { '201': response('Quiz generated from owned ready material'), '422': response('No eligible source material') } }) },
    '/api/quizzes/{id}': { get: protectedOp('Get quiz questions without answer keys', { tags: ['Learning'] }) },
    '/api/quizzes/{id}/submit': { post: protectedOp('Grade submitted quiz answers and update recorded mastery', { tags: ['Learning'], requestBody: jsonBody({ type: 'object', required: ['answers'], properties: { answers: { type: 'array', items: { type: 'object', required: ['questionId', 'answer'], properties: { questionId: { type: 'string', format: 'uuid' }, answer: { type: 'string' } } } } } }) }) },
    '/api/quizzes/{id}/result': { get: protectedOp('Read latest completed quiz result with answer feedback', { tags: ['Learning'] }) },
    '/api/diagnostic/start': { post: protectedOp('Generate a diagnostic from owned source material', { tags: ['Learning'], requestBody: jsonBody({ $ref: '#/components/schemas/QuizGeneration' }) }) },
    '/api/diagnostic/{id}/submit': { post: protectedOp('Submit diagnostic answers', { tags: ['Learning'] }) },
    '/api/diagnostic/{id}/result': { get: protectedOp('Read latest diagnostic results', { tags: ['Learning'] }) },
    '/api/flashcards': { get: protectedOp('List due or owned flashcards', { tags: ['Learning'] }) },
    '/api/flashcards/generate': { post: protectedOp('Generate grounded flashcards and save a deck', { tags: ['Learning'], requestBody: jsonBody({ type: 'object', properties: { subjectId: { type: 'string', format: 'uuid' }, topicId: { type: 'string', format: 'uuid' }, documentId: { type: 'string', format: 'uuid' }, count: { type: 'integer', minimum: 1, maximum: 50 } } }) }) },
    '/api/flashcards/{id}/review': { post: protectedOp('Record actual spaced-repetition recall', { tags: ['Learning'], requestBody: jsonBody({ type: 'object', required: ['known'], properties: { known: { type: 'boolean' }, responseTimeMs: { type: 'integer' } } }) }) },
    '/api/plans': { get: protectedOp('List owned study plans', { tags: ['Planning'] }) },
    '/api/plans/generate': { post: protectedOp('Generate a study plan from actual exams, materials, mastery and availability', { tags: ['Planning'], requestBody: jsonBody({ type: 'object', properties: { startDate: { type: 'string', format: 'date-time' }, days: { type: 'integer', minimum: 1, maximum: 90 }, subjectId: { type: 'string', format: 'uuid' } } }) }) },
    '/api/plans/{id}': { get: protectedOp('Read one owned plan and tasks', { tags: ['Planning'] }) },
    '/api/plans/{id}/tasks': { post: protectedOp('Create a plan task', { tags: ['Planning'] }) },
    '/api/tasks/{id}': { patch: protectedOp('Update task state or schedule', { tags: ['Planning'] }), delete: protectedOp('Delete a task', { tags: ['Planning'], responses: { '204': response('Task deleted') } }) },
    '/api/study-sessions': { get: protectedOp('List actual focus-session history', { tags: ['Progress'] }), post: protectedOp('Start a timed focus session', { tags: ['Progress'] }) },
    '/api/study-sessions/{id}/finish': { post: protectedOp('Finish a focus session and record elapsed time', { tags: ['Progress'] }) },
    '/api/guided-learning/start': { post: protectedOp('Start a Socratic lesson from owned topic materials', { tags: ['Learning'] }) },
    '/api/guided-learning/{id}': { get: protectedOp('Read owned guided-learning progress', { tags: ['Learning'] }) },
    '/api/guided-learning/{id}/answer': { post: protectedOp('Submit a guided response for rubric-grounded feedback', { tags: ['Learning'] }) },
    '/api/recommendations/next': { get: protectedOp('Get the next action based on real learning evidence', { tags: ['Learning'] }) },
    '/api/recommendations/{id}/complete': { post: protectedOp('Mark an owned recommendation complete', { tags: ['Learning'] }) },
    '/api/settings': { get: protectedOp('Read learner preferences', { tags: ['Authentication'] }), patch: protectedOp('Update learner preferences', { tags: ['Authentication'] }) },
    '/api/profile': { get: protectedOp('Read authenticated learner profile', { tags: ['Authentication'] }), patch: protectedOp('Update profile fields', { tags: ['Authentication'] }) },
    '/api/exams': { get: protectedOp('List actual exam events', { tags: ['Planning'] }), post: protectedOp('Create an exam event', { tags: ['Planning'] }) },
    '/api/exams/{id}': { delete: protectedOp('Delete an owned exam event', { tags: ['Planning'], responses: { '204': response('Exam event deleted') } }) },
    '/api/exam/analyze': { post: protectedOp('Analyze selected uploaded syllabi and previous-year papers with verified document/page citations', { tags: ['Learning'], requestBody: jsonBody({ type: 'object', required: ['documentIds'], properties: { documentIds: { type: 'array', items: { type: 'string', format: 'uuid' }, minItems: 1, maxItems: 10 } } }) }) },
    '/api/exam/insights': { get: protectedOp('Read topic coverage and page evidence from real uploaded documents', { tags: ['Learning'] }) },
    '/api/admin/dashboard': { get: protectedOp('Read admin dashboard aggregates', { tags: ['Administration'], security: [{ bearerAuth: [] }], description: 'Requires role ADMIN.' }) },
    '/api/admin/users': { get: protectedOp('Search and page through users without sensitive account fields', { tags: ['Administration'], description: 'Requires role ADMIN.' }) },
    '/api/admin/users/{id}': { get: protectedOp('Read a safe user profile and real activity summary', { tags: ['Administration'], description: 'Requires role ADMIN.' }), delete: protectedOp('Delete a user account and cascaded data; cannot target the current administrator', { tags: ['Administration'], description: 'Requires role ADMIN.' }) },
    '/api/admin/documents': { get: protectedOp('Search documents without exposing storage credentials', { tags: ['Administration'], description: 'Requires role ADMIN.' }) },
    '/api/admin/analytics': { get: protectedOp('Read application usage and learning aggregates', { tags: ['Administration'], description: 'Requires role ADMIN.' }) }
  }
} as const;
