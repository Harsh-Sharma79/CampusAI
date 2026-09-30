import { studyWeek, subjects, topics } from '../data/mockData';

const pause = (ms = 180) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export const progressService = {
  async overview() {
    await pause();
    return {
      overallMastery: 69,
      weeklyHours: 11.2,
      quizAccuracy: 78,
      currentStreak: 7,
      improvement: 18,
      week: studyWeek,
      subjects,
      topics,
      insight: 'Your Database Systems performance improved 14% this week. Your biggest remaining gap is normalization.',
    };
  },
};
