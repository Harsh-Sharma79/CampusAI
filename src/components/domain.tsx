import type { ReactNode } from 'react';
import { BookOpen, Check, File, FileText, MoreHorizontal, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FlashcardData, Material, Topic } from '../types';
import { Badge, Card, ProgressBar } from './ui';

export function AIMessage({ role, children, sources, actions, avatar }: {
  role: 'user' | 'assistant';
  children: ReactNode;
  sources?: string[];
  actions?: ReactNode;
  avatar?: ReactNode;
}) {
  const assistant = role === 'assistant';
  return <article className={`chat-message chat-${role}`}>
    <span className={`chat-avatar ${assistant ? 'chat-ai-avatar' : ''}`}>{avatar ?? (assistant ? <Sparkles size={15} /> : 'AM')}</span>
    <div className="chat-message-body">
      <div className="chat-message-label">{assistant ? 'CAMPUSAI' : 'YOU'} <span>· Just now</span></div>
      {children}
      {!!sources?.length && <div className="source-chips"><span>SOURCES</span>{sources.map((source) => <span className="source-chip" key={source}><FileText size={11} />{source}</span>)}</div>}
      {actions && <div className="ai-response-actions">{actions}</div>}
    </div>
  </article>;
}

export function TopicCard({ topic, onSelect }: { topic: Topic; onSelect: (topic: Topic) => void }) {
  return <button type="button" className={`topic-card topic-${topic.band}`} onClick={() => onSelect(topic)}>
    <div className="topic-card-top"><span>{topic.name}</span><span className={`topic-status-dot topic-status-${topic.band}`} /></div>
    <div className="topic-card-score"><strong>{topic.mastery}<small>%</small></strong><span>mastery</span></div>
    <ProgressBar value={topic.mastery} tone={topic.band === 'strong' ? 'success' : topic.band === 'weak' ? 'warning' : 'blue'} />
    <div className="topic-card-footer"><span>Last studied {topic.lastStudied.toLowerCase()}</span><span aria-hidden="true">›</span></div>
  </button>;
}

function DocumentIcon({ kind }: { kind: Material['kind'] }) {
  return <span className={`document-icon document-${kind.toLowerCase()}`}>{kind === 'PDF' ? <FileText size={17} /> : kind === 'Syllabus' ? <BookOpen size={17} /> : <File size={17} />}</span>;
}

export function DocumentCard({ material, onOpen, onMore }: { material: Material; onOpen: () => void; onMore: () => void }) {
  return <Card className="material-card">
    <div className="material-card-top"><DocumentIcon kind={material.kind} /><button type="button" className="icon-button" aria-label={`More actions for ${material.name}`} onClick={onMore}><MoreHorizontal size={18} /></button></div>
    <button type="button" className="material-title-button" onClick={onOpen}><h3>{material.name}</h3></button>
    <span className="material-subject">{material.subject}</span>
    <div className="material-topics">{material.topics.slice(0, 3).map((topic) => <span key={topic}>{topic}</span>)}{material.topics.length > 3 && <span>+{material.topics.length - 3}</span>}</div>
    <div className="material-meta"><span>{material.pages} pages</span><i /><span>{material.uploadedAt}</span></div>
    <div className="material-card-footer"><Badge tone={material.status === 'Analyzed' ? 'success' : 'warning'}><Check size={11} /> {material.status}</Badge><button type="button" className="material-open-link" onClick={onOpen}>Open <span aria-hidden="true">›</span></button></div>
  </Card>;
}

export function QuizOption({ option, index, selected, correctIndex, showResult, onSelect }: {
  option: string;
  index: number;
  selected: boolean;
  correctIndex: number;
  showResult: boolean;
  onSelect: () => void;
}) {
  const correct = showResult && index === correctIndex;
  const incorrect = showResult && selected && !correct;
  return <button type="button" role="radio" aria-checked={selected} disabled={showResult} className={`quiz-option ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${incorrect ? 'incorrect' : ''}`} onClick={onSelect}>
    <span className="quiz-option-letter">{String.fromCharCode(65 + index)}</span>
    <span>{option}</span>
    <i>{correct ? <Check size={15} /> : incorrect ? <X size={14} /> : selected ? <span /> : null}</i>
  </button>;
}

export function Flashcard({ card, flipped, onFlip }: { card: FlashcardData; flipped: boolean; onFlip: () => void }) {
  return <button type="button" className="flashcard-flip-target" aria-pressed={flipped} aria-label={flipped ? 'Show question side' : 'Flip card to reveal answer'} onClick={onFlip}>
    <motion.div className={`flashcard-card ${flipped ? 'flipped' : ''}`} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.48, ease: [.2, .7, .2, 1] }}>
      <div className="flashcard-face flashcard-front"><div className="flashcard-face-top"><Badge tone="accent">QUESTION</Badge><span><Sparkles size={14} /> QUICK RECALL</span></div><div className="flashcard-content"><span className="flashcard-decoration"><BookOpen size={20} /></span><p>{card.front}</p><span className="flashcard-hint">Take a moment to answer before you flip.</span></div><div className="flashcard-face-bottom"><span>Tap to reveal</span><kbd>SPACE</kbd></div></div>
      <div className="flashcard-face flashcard-back"><div className="flashcard-face-top"><Badge tone="success">ANSWER</Badge><span>{card.topic.toUpperCase()}</span></div><div className="flashcard-content"><span className="flashcard-decoration answer-decoration"><Check size={20} /></span><p>{card.back}</p><span className="flashcard-hint">How confidently could you explain it?</span></div><div className="flashcard-face-bottom"><span>Try explaining it out loud.</span><span className="flashcard-source"><Sparkles size={12} /> CampusAI concept guide</span></div></div>
    </motion.div>
  </button>;
}
