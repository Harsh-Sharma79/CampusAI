import type { AIResponse } from '../types';

const pause = (ms = 620) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const aiService = {
  async ask(prompt: string): Promise<AIResponse> {
    await pause();
    const normalized = prompt.toLowerCase();
    if (normalized.includes('knn') || normalized.includes('nearest')) {
      return { text: '## K-Nearest Neighbors, simply\n\nKNN classifies a new point by looking at the **k closest examples** it has already seen. Think of it as asking your nearest study group what they think.\n\n1. Choose *k* (how many neighbors to ask).\n2. Measure distance to each labeled example.\n3. Use a majority vote for the predicted class.\n\n**A useful check:** the scale of your features matters—normalize them before comparing distances.', sources: ['Machine Learning — Unit 3, pp. 18–20', 'Your recent quiz: Distance metrics'] };
    }
    if (normalized.includes('normal')) {
      return { text: '## Why normalize a database?\n\nNormalization puts each fact in the right place. This reduces duplicated data and helps prevent update anomalies.\n\n- **1NF:** values are atomic; no repeating groups.\n- **2NF:** every non-key attribute depends on the whole key.\n- **3NF:** non-key attributes depend only on the key.\n\nTry tracing one functional dependency before deciding which normal form applies.', sources: ['DBMS Revision Notes, section 4', 'Database Systems — Week 5'] };
    }
    return { text: `## Let's work through it\n\n${prompt.trim() ? `You asked about **${prompt.trim()}**. ` : ''}Start with the core idea, then connect it to one concrete example. What part feels least clear so far?\n\nI can also turn this into a quick quiz or a set of flashcards.`, sources: ['Your course materials', 'CampusAI concept guide'] };
  },
  async summarize(text: string): Promise<AIResponse> {
    await pause(420);
    return { text: `## Quick summary\n\nThis material covers ${text}. Focus first on the definitions, then on how the concepts connect.\n\n**What to remember**\n- Be able to explain the main idea in your own words.
- Practice one worked example without notes.`, sources: ['Selected material · mock analysis'] };
  },
};
