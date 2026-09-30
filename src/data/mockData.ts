import type { FlashcardData, Material, QuizQuestion, StudyDay, StudyTask, Student, Subject, Topic } from '../types';

export const demoStudent: Student = {
  id: 'alex-morgan', name: 'Alex Morgan', email: 'alex.morgan@university.example',
  university: 'University of Example', course: 'B.Tech Computer Science', semester: 6, dailyGoalMinutes: 90,
};

export const subjects: Subject[] = [
  { id: 'ml', name: 'Machine Learning', mastery: 72, accent: 'violet', icon: 'BrainCircuit' },
  { id: 'db', name: 'Database Systems', mastery: 84, accent: 'blue', icon: 'Database' },
  { id: 'stats', name: 'Statistics', mastery: 51, accent: 'amber', icon: 'ChartNoAxesCombined' },
  { id: 'net', name: 'Computer Networks', mastery: 67, accent: 'teal', icon: 'Network' },
];

export const topics: Topic[] = [
  { id: 'regression', name: 'Regression', subjectId: 'ml', mastery: 82, recentScore: 78, lastStudied: 'Yesterday', recommendation: 'Try a 5-question practice set', band: 'strong' },
  { id: 'classification', name: 'Classification', subjectId: 'ml', mastery: 71, recentScore: 69, lastStudied: '2 days ago', recommendation: 'Review decision boundaries', band: 'review' },
  { id: 'knn', name: 'K-Nearest Neighbors', subjectId: 'ml', mastery: 51, recentScore: 43, lastStudied: 'Today', recommendation: 'Revisit distance metrics for 20 minutes', band: 'weak' },
  { id: 'svm', name: 'Support Vector Machines', subjectId: 'ml', mastery: 63, recentScore: 58, lastStudied: '4 days ago', recommendation: 'Practice margin intuition', band: 'review' },
  { id: 'normalization', name: 'Normalization', subjectId: 'db', mastery: 64, recentScore: 61, lastStudied: 'Today', recommendation: 'Compare 2NF, 3NF and BCNF', band: 'weak' },
  { id: 'sql-joins', name: 'SQL Joins', subjectId: 'db', mastery: 91, recentScore: 88, lastStudied: 'Yesterday', recommendation: 'Maintain with a short retrieval quiz', band: 'strong' },
  { id: 'functional-dependencies', name: 'Functional Dependencies', subjectId: 'db', mastery: 59, recentScore: 52, lastStudied: '5 days ago', recommendation: 'Practice spotting candidate keys', band: 'weak' },
  { id: 'probability', name: 'Probability', subjectId: 'stats', mastery: 57, recentScore: 54, lastStudied: '3 days ago', recommendation: 'Review conditional probability', band: 'review' },
  { id: 'hypothesis-testing', name: 'Hypothesis Testing', subjectId: 'stats', mastery: 45, recentScore: 39, lastStudied: '1 week ago', recommendation: 'Start with a guided example', band: 'weak' },
  { id: 'tcp-ip', name: 'TCP/IP', subjectId: 'net', mastery: 74, recentScore: 70, lastStudied: '2 days ago', recommendation: 'Review congestion control', band: 'review' },
  { id: 'routing', name: 'Routing', subjectId: 'net', mastery: 62, recentScore: 60, lastStudied: '6 days ago', recommendation: 'Practice shortest-path algorithms', band: 'review' },
];

export const materials: Material[] = [
  { id: 'mat-1', name: 'Data Structures Notes.pdf', subject: 'Data Structures', kind: 'PDF', pages: 142, uploadedAt: 'Sep 24, 2026', status: 'Analyzed', topics: ['Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Trees'] },
  { id: 'mat-2', name: 'Machine Learning — Unit 3.pdf', subject: 'Machine Learning', kind: 'PDF', pages: 38, uploadedAt: 'Sep 22, 2026', status: 'Analyzed', topics: ['Classification', 'K-Nearest Neighbors', 'Support Vector Machines'] },
  { id: 'mat-3', name: 'DBMS Revision Notes.txt', subject: 'Database Systems', kind: 'Notes', pages: 12, uploadedAt: 'Sep 20, 2026', status: 'Analyzed', topics: ['Normalization', 'SQL Joins', 'Functional Dependencies'] },
  { id: 'mat-4', name: 'Semester VI Syllabus.pdf', subject: 'All subjects', kind: 'Syllabus', pages: 24, uploadedAt: 'Sep 18, 2026', status: 'Analyzed', topics: ['Machine Learning', 'Database Systems', 'Statistics'] },
  { id: 'mat-5', name: 'Probability PYQ 2025.pdf', subject: 'Statistics', kind: 'PYQ', pages: 16, uploadedAt: 'Sep 16, 2026', status: 'Analyzed', topics: ['Probability', 'Hypothesis Testing'] },
];

export const questionBank: QuizQuestion[] = [
  { id: 'q1', prompt: 'What is the primary purpose of normalization in a relational database?', options: ['To increase data duplication', 'To reduce redundancy and improve data integrity', 'To speed up every query automatically', 'To remove all foreign keys'], correctIndex: 1, explanation: 'Normalization organizes data to reduce unnecessary duplication and prevent update anomalies while preserving relationships.', topic: 'Normalization' },
  { id: 'q2', prompt: 'What does K-Nearest Neighbors use to classify a new data point?', options: ['The nearest training examples', 'A learned decision tree only', 'The global mean of every feature', 'A fixed random label'], correctIndex: 0, explanation: 'KNN finds the k closest training examples under a chosen distance metric, then uses their labels to classify the new point.', topic: 'K-Nearest Neighbors' },
  { id: 'q3', prompt: 'Which measure is most commonly used to assess a binary classifier’s precision–recall trade-off?', options: ['F1 score', 'Mean squared error', 'R-squared', 'Silhouette score'], correctIndex: 0, explanation: 'The F1 score is the harmonic mean of precision and recall, so it summarizes their balance.', topic: 'Classification' },
  { id: 'q4', prompt: 'A functional dependency X → Y means that…', options: ['Y uniquely determines X', 'Each X value determines exactly one Y value', 'X and Y can never appear together', 'Y must be a primary key'], correctIndex: 1, explanation: 'For any two rows with the same X value, the Y values must also match.', topic: 'Functional Dependencies' },
  { id: 'q5', prompt: 'If P(A) = 0.4 and P(B|A) = 0.5, what is P(A ∩ B)?', options: ['0.2', '0.45', '0.9', '0.8'], correctIndex: 0, explanation: 'The multiplication rule gives P(A ∩ B) = P(B|A) × P(A) = 0.5 × 0.4 = 0.2.', topic: 'Probability' },
];

export const flashcards: FlashcardData[] = [
  { id: 'fc1', subject: 'Database Systems', front: 'What is normalization?', back: 'The process of structuring relational tables to reduce redundancy and prevent insertion, update, and deletion anomalies.', topic: 'Normalization' },
  { id: 'fc2', subject: 'Machine Learning', front: 'How does KNN classify a new data point?', back: 'It finds the k closest labeled examples under a chosen distance metric, then predicts from their labels (often by majority vote).', topic: 'K-Nearest Neighbors' },
  { id: 'fc3', subject: 'Statistics', front: 'What is conditional probability?', back: 'P(A|B) = P(A ∩ B) / P(B), for P(B) > 0; it measures the likelihood of A when B is known to have occurred.', topic: 'Probability' },
  { id: 'fc4', subject: 'Database Systems', front: 'What is a candidate key?', back: 'A minimal set of attributes that uniquely identifies each tuple in a relation.', topic: 'Functional Dependencies' },
  { id: 'fc5', subject: 'Computer Networks', front: 'What does TCP’s congestion control protect?', back: 'It helps prevent a sender from overwhelming the network by adjusting the volume of unacknowledged data in flight.', topic: 'TCP/IP' },
];

export const initialTasks: StudyTask[] = [
  { id: 'task-1', title: 'KNN Revision', subject: 'Machine Learning', time: '09:00', duration: 20, completed: false, type: 'revision' },
  { id: 'task-2', title: 'Database Quiz', subject: 'Database Systems', time: '10:30', duration: 15, completed: false, type: 'quiz' },
  { id: 'task-3', title: 'Statistics Flashcards', subject: 'Statistics', time: '18:00', duration: 25, completed: false, type: 'flashcards' },
  { id: 'task-4', title: 'Weekly revision', subject: 'Computer Networks', time: '20:00', duration: 30, completed: false, type: 'study' },
];

export const studyWeek: StudyDay[] = [
  { day: 'Mon', hours: 1.2, quiz: 62, mastery: 58 },
  { day: 'Tue', hours: 1.7, quiz: 68, mastery: 60 },
  { day: 'Wed', hours: 1.1, quiz: 64, mastery: 61 },
  { day: 'Thu', hours: 2.3, quiz: 74, mastery: 63 },
  { day: 'Fri', hours: 1.8, quiz: 71, mastery: 65 },
  { day: 'Sat', hours: 2.6, quiz: 79, mastery: 67 },
  { day: 'Sun', hours: 1.5, quiz: 82, mastery: 70 },
];
