import { questionBank } from '../data/mockData';
import { materialService } from './materialService';
import type { Quiz, QuizQuestion, QuizResult } from '../types';

const pause = (ms = 250) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const quizzes = new Map<string, Quiz>();
const results = new Map<string, QuizResult>();

export interface QuizOptions {
  subject: string;
  topic: string;
  difficulty: Quiz['difficulty'];
  count: number;
  sourceMaterialId?: string;
}

const subjectTopics: Record<string, string[]> = {
  'Machine Learning': ['K-Nearest Neighbors', 'Classification', 'Regression', 'Support Vector Machines'],
  'Database Systems': ['Normalization', 'Functional Dependencies', 'SQL Joins'],
  Statistics: ['Probability', 'Hypothesis Testing'],
  'Computer Networks': ['TCP/IP', 'Routing'],
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function topicMatches(left: string, right: string): boolean {
  const a = normalize(left);
  const b = normalize(right);
  return a === b || a.includes(b) || b.includes(a) || (a === 'knn' && b.includes('nearest neighbors')) || (b === 'knn' && a.includes('nearest neighbors'));
}

function topicTagQuestion(topic: string, referenceName: string, index: number, context: 'material' | 'course' = 'material'): QuizQuestion {
  const prompts = [
    `When reviewing “${topic}” in ${referenceName}, which response best shows understanding?`,
    `Which study check is most useful for the “${topic}” topic detected in ${referenceName}?`,
    `How can you make recall of “${topic}” from ${referenceName} more reliable?`,
    `Which action best connects “${topic}” from ${referenceName} to real understanding?`,
  ];
  const correctAnswers = [
    `Explain the core idea of ${topic} and support it with a correct example.`,
    `Try to explain ${topic} from memory, then verify it against the source notes.`,
    `Apply ${topic} to a fresh example and explain why the steps make sense.`,
    `State the key definition of ${topic}, then distinguish it from a related idea.`,
  ];
  return {
    id: `material-${normalize(referenceName).replaceAll(' ', '-')}-${index + 1}`,
    prompt: prompts[index % prompts.length],
    options: [correctAnswers[index % correctAnswers.length], 'Memorize the document filename without reviewing its ideas.', 'Skip the topic because it has already appeared in the notes.', 'Choose an answer without checking the relevant concept.'],
    correctIndex: 0,
    explanation: context === 'material'
      ? `The topic map identifies ${topic} in this material. This demo uses detected topic tags and sample practice prompts; it does not upload or read the original file contents.`
      : `This frontend demo uses a general recall prompt for ${topic}; it is not a full course-specific question bank.`,
    topic,
  };
}

export const quizService = {
  async create(options: QuizOptions): Promise<Quiz> {
    await pause(520);
    const requestedCount = Math.max(1, Math.min(10, options.count));
    const sourceMaterial = options.sourceMaterialId ? await materialService.get(options.sourceMaterialId) : undefined;
    if (options.sourceMaterialId && !sourceMaterial) throw new Error('Selected material is unavailable in this demo session.');

    let pool: QuizQuestion[];
    if (sourceMaterial) {
      const matched = questionBank.filter((question) => sourceMaterial.topics.some((topic) => topicMatches(question.topic, topic)));
      const tagged = sourceMaterial.topics.filter((topic) => !matched.some((question) => topicMatches(question.topic, topic))).map((topic, index) => topicTagQuestion(topic, sourceMaterial.name, index));
      pool = [...matched, ...tagged];
      if (options.topic !== 'Any topic') {
        const topicPool = pool.filter((question) => topicMatches(question.topic, options.topic));
        if (topicPool.length) pool = topicPool;
      }
      while (pool.length < requestedCount) {
        const topic = options.topic !== 'Any topic' ? options.topic : sourceMaterial.topics[pool.length % Math.max(1, sourceMaterial.topics.length)] ?? 'Core concepts';
        pool.push(topicTagQuestion(topic, sourceMaterial.name, pool.length));
      }
    } else {
      const allowedTopics = subjectTopics[options.subject];
      const subjectPool = options.subject === 'All subjects' || !allowedTopics
        ? [...questionBank]
        : questionBank.filter((question) => allowedTopics.some((topic) => topicMatches(question.topic, topic)));
      const topicPool = options.topic === 'Any topic' ? subjectPool : subjectPool.filter((question) => topicMatches(question.topic, options.topic));
      pool = options.topic !== 'Any topic' && !topicPool.length
        ? Array.from({ length: requestedCount }, (_, index) => topicTagQuestion(options.topic, options.subject, index, 'course'))
        : topicPool.length ? topicPool : subjectPool.length ? subjectPool : [...questionBank];
    }

    const selected = pool.slice(0, requestedCount);
    const quiz: Quiz = {
      id: `quiz-${Date.now()}`,
      subject: sourceMaterial?.subject ?? options.subject,
      title: sourceMaterial ? `${sourceMaterial.name} practice` : options.topic === 'Any topic' ? `${options.subject} practice` : options.topic,
      difficulty: options.difficulty,
      questions: selected,
      createdAt: new Date().toISOString(),
    };
    quizzes.set(quiz.id, quiz);
    return quiz;
  },
  async get(id: string): Promise<Quiz | undefined> {
    await pause(100);
    return quizzes.get(id);
  },
  async submit(quiz: Quiz, answers: number[]): Promise<QuizResult> {
    await pause(280);
    const correct = quiz.questions.reduce((sum, question, index) => sum + (answers[index] === question.correctIndex ? 1 : 0), 0);
    const result: QuizResult = {
      quizId: quiz.id,
      score: Math.round((correct / quiz.questions.length) * 100),
      correct,
      total: quiz.questions.length,
      masteryGain: Math.max(3, Math.round((correct / quiz.questions.length) * 12)),
      answers,
      strongTopics: quiz.questions.filter((question, index) => answers[index] === question.correctIndex).map((question) => question.topic),
      reviewTopics: quiz.questions.filter((question, index) => answers[index] !== question.correctIndex).map((question) => question.topic),
    };
    results.set(quiz.id, result);
    return result;
  },
  async result(id: string): Promise<{ quiz?: Quiz; result?: QuizResult }> {
    await pause(100);
    return { quiz: quizzes.get(id), result: results.get(id) };
  },
};
