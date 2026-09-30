import { flashcards } from '../data/mockData';
import { materialService } from './materialService';
import type { FlashcardData } from '../types';

const pause = (ms = 160) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const flashcardService = {
  async list(): Promise<FlashcardData[]> {
    await pause();
    return flashcards;
  },
  async fromMaterial(materialId: string): Promise<FlashcardData[]> {
    await pause();
    const material = await materialService.get(materialId);
    if (!material) return [];
    const topics = material.topics.length ? material.topics : ['Key concepts'];
    return topics.map((topic, index) => ({
      id: `${material.id}-flashcard-${index + 1}`,
      subject: material.subject,
      topic,
      front: `What is ${topic}, and how could you explain it in your own words?`,
      back: `Describe the key definition or principle behind ${topic}, then connect it to an example from ${material.name}. These demo cards use topic labels; the file contents are not sent to a backend.`,
    }));
  },
};
