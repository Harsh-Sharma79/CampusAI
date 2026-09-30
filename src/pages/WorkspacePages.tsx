import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, BrainCircuit, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, FileText, Filter, Lightbulb, MessageSquare, MoreHorizontal, Network, Paperclip, Pencil, Plus, RotateCcw, Search, Send, Sparkles, Trash2, Trophy, UploadCloud } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, Field, LoadingState, Modal, PageTitle, ProgressBar, SelectField, Tabs, Textarea, Dropdown } from '../components/ui';
import { AIMessage, DocumentCard, Flashcard, QuizOption } from '../components/domain';
import { aiService } from '../services/aiService';
import { materialService } from '../services/materialService';
import { quizService } from '../services/quizService';
import { flashcardService } from '../services/flashcardService';
import { plannerService } from '../services/plannerService';
import { materials as seededMaterials, subjects } from '../data/mockData';
import { useApp } from '../context/AppContext';
import type { AIResponse, FlashcardData, Material, MaterialKind, Quiz, QuizResult, StudyTask } from '../types';

interface ChatMessage { id: string; role: 'user' | 'assistant'; text: string; sources?: string[]; }
const quickPrompts = ['Explain a concept', 'Quiz me', 'Summarize notes', 'Help with homework', 'Prepare for exam'];

function renderAIText(text: string) {
  return text.split('\n').filter((line) => line.trim()).map((line, index) => {
    if (line.startsWith('## ')) return <h3 key={index}>{line.replace(/^##\s/, '')}</h3>;
    if (line.startsWith('- ')) return <div className="ai-bullet" key={index}><i />{line.slice(2).replaceAll('**', '').replaceAll('*', '')}</div>;
    if (/^\d\. /.test(line)) return <div className="ai-numbered" key={index}><span>{line[0]}</span>{line.slice(3).replaceAll('**', '').replaceAll('*', '')}</div>;
    return <p key={index}>{line.replaceAll('**', '').replaceAll('*', '')}</p>;
  });
}

export function TutorPage() {
  const { conversationId } = useParams();
  const guided = conversationId?.includes('guided') ?? false;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { toast, student } = useApp();
  const navigate = useNavigate();
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages, thinking]);
  useEffect(() => { setMessages([]); setStep(0); setAnswer(''); setShowHint(false); }, [conversationId]);

  const sendMessage = useCallback(async (content: string) => {
    const prompt = content.trim();
    if (!prompt || thinking) return;
    const userMessage: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', text: prompt };
    setMessages((current) => [...current, userMessage]); setInput(''); setThinking(true);
    try {
      const response: AIResponse = await aiService.ask(prompt);
      setMessages((current) => [...current, { id: `ai-${Date.now()}`, role: 'assistant', text: response.text, sources: response.sources }]);
    } catch { toast('The tutor couldn’t answer just now', 'Try sending your question once more.', 'error'); }
    finally { setThinking(false); }
  }, [thinking, toast]);
  const submitChat = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void sendMessage(input); };
  const doAction = (action: string) => { void sendMessage(action); };
  const guidedQuestions = [
    'What does KNN use to determine which class a new data point belongs to?',
    'If two nearby examples disagree, how could choosing k = 5 help?',
    'Why does feature scaling matter when KNN measures distance?',
    'When might Euclidean distance be a poor fit for a dataset?',
    'How would you decide whether to increase or decrease k?',
  ];
  const continueLesson = () => { if (!answer.trim() && !showHint) { toast('Take a moment to think', 'Write a quick answer, or choose “I don’t know” to see a hint.', 'info'); return; } if (step >= guidedQuestions.length - 1) { toast('Guided learning complete', 'You worked through KNN one step at a time.'); setStep(0); setAnswer(''); setShowHint(false); return; } setStep((current) => current + 1); setAnswer(''); setShowHint(false); };

  return <div className="page-content tutor-workspace"><div className="tutor-history"><div className="tutor-history-head"><div><span className="eyebrow">YOUR LEARNING</span><h2>AI Tutor</h2></div><button className="icon-button" aria-label="New conversation" onClick={() => { setMessages([]); navigate('/tutor'); }}><Plus size={16} /></button></div><Button variant="soft" className="new-chat-button" icon={<Plus size={15} />} onClick={() => { setMessages([]); navigate('/tutor'); }}>New conversation</Button><span className="history-label">RECENT</span><button className={`history-item ${!guided ? 'active' : ''}`} onClick={() => navigate('/tutor')}><span className="history-item-icon"><MessageSquare size={15} /></span><span><strong>Let’s work through an idea</strong><small>Today · Machine Learning</small></span></button><button className={`history-item ${guided ? 'active' : ''}`} onClick={() => navigate('/tutor/knn-guided')}><span className="history-item-icon"><BrainCircuit size={15} /></span><span><strong>KNN — Guided Learning</strong><small>5 steps · In progress</small></span></button><div className="tutor-history-tip"><Sparkles size={15} /><strong>Learn, don’t just look it up.</strong><p>Ask for an example, test your recall, or work through an idea together.</p></div></div>
    <div className="tutor-main"><div className="tutor-topline"><div><span className="tutor-status-dot" /> CampusAI tutor <span className="tutor-context">· {guided ? 'Guided learning' : 'Machine Learning'}</span></div><button type="button" className="tutor-mode-pill" onClick={() => navigate(guided ? '/tutor' : '/tutor/knn-guided')}><BrainCircuit size={14} /> {guided ? 'Guided mode' : 'Start guided mode'} <ChevronDown size={13} /></button></div>
      <div className="tutor-scroll"><div className="tutor-welcome"><div className="tutor-orbit-logo"><Sparkles size={20} /></div><span className="eyebrow">YOUR ACADEMIC COPILOT</span><h1>Hi {student.name.split(' ')[0]}.<br />What are you learning today?</h1><p>Bring a question, a concept, or simply a place where you feel stuck.</p></div>
        {!guided && !messages.length && <div className="quick-actions-grid">{quickPrompts.map((prompt,index)=><button key={prompt} className="quick-action" onClick={() => sendMessage(prompt)}><span className={`quick-action-icon quick-${index}`}><Sparkles size={15} /></span><span>{prompt}</span><ArrowRight size={13} /></button>)}</div>}
        {guided && <Card className="guided-card"><div className="guided-head"><div><Badge tone="accent"><BrainCircuit size={12} /> GUIDED LEARNING</Badge><h2>KNN, one step at a time.</h2></div><span className="guided-count">0{step + 1}<small> / 05</small></span></div><ProgressBar value={(step + 1) * 20} /><div className="guided-content"><span className="eyebrow">BEFORE WE CONTINUE...</span><h3>{guidedQuestions[step]}</h3><Textarea className="guided-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Take a guess in your own words…" aria-label="Your answer" />{showHint && <div className="guided-hint"><Lightbulb size={15} /><span><strong>Think about proximity.</strong> KNN looks at examples that are most similar under a distance measure.</span></div>}<div className="guided-actions"><button className="text-action subtle-action" onClick={() => { setShowHint(true); if (!answer) setAnswer('I’m not sure yet'); }}>I don’t know <CircleHelp size={14} /></button><Button onClick={continueLesson}>{step === 4 ? 'Finish lesson' : 'Continue'} <ArrowRight size={14} /></Button></div></div><div className="guided-footer"><span><Sparkles size={13} /> No pressure—curiosity counts as progress.</span><button type="button" onClick={() => navigate('/knowledge')}>View KNN mastery <ArrowRight size={12} /></button></div></Card>}
        {messages.map((message) => <AIMessage key={message.id} role={message.role} sources={message.sources} actions={message.role === 'assistant' && <>{['Explain simpler','Give an example','Quiz me','Make flashcards','Save to notes'].map((action) => <button key={action} onClick={() => { if(action === 'Save to notes') { toast('Saved to your notes','This demo keeps changes locally.'); return; } doAction(action === 'Quiz me' ? 'Quiz me on that idea' : action === 'Make flashcards' ? 'Make flashcards from that' : `${action} about this idea`); }}><Sparkles size={11} />{action}</button>)}</>}><div className="ai-prose">{renderAIText(message.text)}</div></AIMessage>)}
        {thinking && <div className="chat-message chat-assistant"><span className="chat-avatar chat-ai-avatar"><Sparkles size={15} /></span><div className="chat-message-body"><div className="chat-message-label">CAMPUSAI <span>· Thinking</span></div><LoadingState /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="tutor-composer-wrap"><form className="tutor-composer" onSubmit={submitChat}><textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(input); } }} placeholder="Ask about a concept, or share what feels unclear…" aria-label="Message CampusAI" /><div className="composer-bottom"><button type="button" className="composer-attach" onClick={() => toast('Add a material', 'Choose a document from My Materials in this demo.', 'info')}><Paperclip size={15} /> Add context</button><span><kbd>↵</kbd> to send · <kbd>⇧ ↵</kbd> new line</span><button type="submit" className="composer-send" aria-label="Send message" disabled={!input.trim() || thinking}><Send size={16} /></button></div></form><p className="tutor-disclaimer">CampusAI can make mistakes. Check important course details against your materials.</p></div>
    </div></div>;
}

const materialFilters = ['All', 'PDF', 'Notes', 'Syllabus', 'PYQ'];
function kindForFile(fileName: string): MaterialKind { const ext = fileName.split('.').pop()?.toLowerCase(); return ext === 'pdf' ? 'PDF' : ext === 'docx' || ext === 'txt' ? 'Notes' : 'PYQ'; }

export function MaterialsPage() {
  const [list, setList] = useState<Material[]>(seededMaterials);
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedMaterialId, setUploadedMaterialId] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'analyzing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useApp();
  const navigate = useNavigate();
  const beginUpload = () => { setSelectedFile(null); setUploadedMaterialId(null); setUploadState('idle'); setProgress(0); setUploadOpen(true); };
  useEffect(() => { materialService.list().then(setList).catch(() => setList(seededMaterials)); }, []);
  const filtered = useMemo(() => list.filter((material) => (filter === 'All' || material.kind === filter) && `${material.name} ${material.subject} ${material.topics.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [filter,list,query]);
  const acceptFile = (file?: File) => { if (!file) return; const ext = file.name.split('.').pop()?.toLowerCase(); if (!['pdf','txt','docx'].includes(ext ?? '')) { setUploadState('error'); toast('Unsupported file type','Upload a PDF, TXT or DOCX file.','error'); return; } setSelectedFile(file); setUploadState('idle'); setProgress(0); };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files[0]); };
  const processUpload = async () => { if (!selectedFile || busy) return; setBusy(true); setUploadState('analyzing'); setProgress(5); setAnalysisStep(0); let progressTimer = 0; const timer = window.setInterval(() => { progressTimer += 1; setProgress((value) => Math.min(value + 11, 91)); setAnalysisStep(Math.min(2, Math.floor(progressTimer / 3))); }, 180); try { const entry = await materialService.uploadMock(selectedFile.name,kindForFile(selectedFile.name)); window.clearInterval(timer); setProgress(100); setAnalysisStep(3); setList((current)=>[entry,...current]); setUploadedMaterialId(entry.id); setUploadState('complete'); toast('Analysis complete',`${entry.name} is ready in your study space.`); } catch { window.clearInterval(timer); setUploadState('error'); } finally { setBusy(false); } };
  const closeModal = () => { setUploadOpen(false); if (uploadState === 'complete' || uploadState === 'error') { setSelectedFile(null); setUploadedMaterialId(null); setUploadState('idle'); setProgress(0); } };
  return <div className="page-content"><PageTitle eyebrow="YOUR COURSE MATERIALS" title="My Materials" description="One organized study space for the notes and ideas you’re learning." action={<Button icon={<Plus size={15} />} onClick={beginUpload}>Upload Material</Button>} />
    <div className="materials-toolbar"><div className="material-filter-tabs" role="tablist" aria-label="Filter materials by type">{materialFilters.map((item)=> <button key={item} type="button" role="tab" aria-selected={filter===item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}{item==='All' && <span>{list.length}</span>}</button>)}</div><label className="material-search"><SearchIcon /><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search materials or topics…" aria-label="Search materials" /><kbd>⌘ F</kbd></label></div>
    <div className="materials-summary"><span><strong>{filtered.length}</strong> materials <i /> Updated across <strong>4 subjects</strong></span><button type="button" onClick={()=>{setFilter('All');setQuery('');}}><Filter size={13} /> {filter==='All'?'Recently added':`${filter} filter`} <ChevronDown size={13} /></button></div>
    {filtered.length > 0 ? <div className="material-card-grid">{filtered.map((material,index)=><motion.div key={material.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:index*.035}}><DocumentCard material={material} onOpen={()=>navigate(`/materials/${material.id}`)} onMore={()=>toast('Material options',`${material.name} is ready to open.`, 'info')} /></motion.div>)}</div> : <EmptyState icon={<Search size={22}/>} title={filter !== 'All' || query.trim() ? 'No materials match these filters' : 'Your study workspace is empty.'} description={filter !== 'All' || query.trim() ? 'Try a different search or format, or clear the current filters.' : 'Upload your first notes or syllabus to get started.'} action={filter !== 'All' || query.trim() ? <Button variant="secondary" onClick={()=>{setFilter('All');setQuery('');}}>Clear filters</Button> : <Button onClick={beginUpload} icon={<Plus size={14}/>}>Upload a material</Button>} />}
    <Modal open={uploadOpen} onClose={closeModal} title={uploadState==='complete'?'Analysis complete.':uploadState==='error'?'Something went wrong.':'Add to your study space'} description={uploadState==='analyzing'?'CampusAI is building a topic map from your file.':uploadState==='complete'?'Your material is ready to use in your workspace.':'Drop in a course document. You can organize it after upload.'} size="md">
      {uploadState==='idle'&&<><div className={`upload-dropzone ${dragging?'dragging':''}`} onDragOver={(event)=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop} onClick={()=>inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' ')inputRef.current?.click();}}><span className="upload-drop-icon"><UploadCloud size={22}/></span><strong>{selectedFile?.name??'Drop your study material here'}</strong><span>{selectedFile?`${(selectedFile.size/1024/1024).toFixed(2)} MB · ${kindForFile(selectedFile.name)}`:'or browse files from your device'}</span><small>PDF · TXT · DOCX · up to 20 MB</small><input ref={inputRef} hidden type="file" accept=".pdf,.txt,.docx" onChange={(event)=>acceptFile(event.target.files?.[0])}/></div><div className="upload-modal-note"><Sparkles size={15}/><span><strong>Give your notes a little structure.</strong><small>CampusAI will find topics, connect concepts and prepare a study path.</small></span></div><div className="upload-modal-actions"><Button variant="ghost" onClick={closeModal}>Cancel</Button><Button disabled={!selectedFile} onClick={processUpload}>Upload & analyze <ArrowRight size={14}/></Button></div></>}
      {uploadState==='analyzing'&&<div className="analysis-state"><div className="analysis-orbit"><span><Sparkles size={21}/></span><i/><i/><i/></div><span className="eyebrow">CAMPUSAI IS THINKING</span><h3>Analyzing your material…</h3><p>We’re making the useful ideas easier to find.</p><ProgressBar value={progress} label={`${progress}%`} /><div className="analysis-steps">{['Extracting topics','Building knowledge map','Preparing insights'].map((label,index)=><div className={index<analysisStep?'done':index===analysisStep?'active':''} key={label}><span>{index<analysisStep?<Check size={12}/>:index===analysisStep?<span className="analysis-pulse"/>:null}</span>{label}</div>)}</div><p className="mock-upload-note">Demo upload: file contents stay on your device and are not sent to a backend.</p></div>}
      {uploadState==='complete'&&<div className="upload-complete"><span className="upload-complete-icon"><CheckCircle2 size={26}/></span><h3>Analysis complete.</h3><p><strong>{selectedFile?.name}</strong> has been added to your study space. A few topics are ready to explore.</p><div className="upload-topic-chips">{['Key concepts','Definitions','Worked examples'].map((topic)=><Badge key={topic}>{topic}</Badge>)}</div><Button onClick={()=>{const id=uploadedMaterialId;closeModal();if(id)navigate(`/materials/${id}`);}}>Open material <ArrowRight size={14}/></Button></div>}
      {uploadState==='error'&&<div className="upload-error"><span><AlertCircle size={22}/></span><h3>We couldn’t analyze this document.</h3><p>Check that it’s a PDF, TXT or DOCX and try once more.</p><Button variant="secondary" onClick={()=>setUploadState('idle')}>Try Again</Button></div>}
    </Modal>
  </div>;
}

function SearchIcon() { return <span className="search-lucide"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></span>; }

export function MaterialDetailPage() {
  const { id = '' } = useParams();
  const [material, setMaterial] = useState<Material | undefined>(()=>seededMaterials.find((item)=>item.id===id));
  const [loading, setLoading] = useState(true);
  const [documentPage, setDocumentPage] = useState(1);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [thinking, setThinking] = useState(false);
  const [question, setQuestion] = useState('');
  const { toast } = useApp();
  const navigate = useNavigate();
  useEffect(()=>{setLoading(true);setDocumentPage(1);materialService.get(id).then(setMaterial).finally(()=>setLoading(false));},[id]);
  const doAI=async(action:string)=>{setThinking(true);setAiResult(null);try{const result=await aiService.ask(action==='Ask AI'?question||'Explain the most important idea in this material':`${action} ${material?.name??'this material'}`);setAiResult(result);toast(`${action} ready`,'A mock response based on your selected material.');}catch{toast('We couldn’t process that request','Please try again.','error');}finally{setThinking(false);}};
  if(loading)return <div className="page-content"><LoadingState message="Opening your material…"/></div>;
  if(!material)return <div className="page-content"><EmptyState icon={<FileText size={21}/>} title="We couldn’t find that material" description="It may have been removed from your study space." action={<Button onClick={()=>navigate('/materials')}>Back to materials</Button>}/></div>;
  const pageTopic=material.topics[(documentPage-1)%Math.max(1,material.topics.length)]??'Core concepts';
  return <div className="page-content"><div className="detail-breadcrumb"><Link to="/materials"><ArrowLeft size={14}/> My Materials</Link><span>/</span><span>{material.name}</span></div><PageTitle eyebrow={`${material.subject.toUpperCase()} · ${material.pages} PAGES`} title={material.name} description={`Added ${material.uploadedAt} · ${material.status}`} action={<Button variant="secondary" icon={<MoreHorizontal size={15}/>} onClick={()=>toast('Material options','This is a frontend-only demo.','info')}>Options</Button>}/>
    <div className="document-detail-layout"><div className="document-preview-area"><Card className="document-preview-card"><div className="document-preview-toolbar"><span><FileText size={14}/>{material.name}</span><span><button type="button" className="icon-button" aria-label="Previous page" disabled={documentPage<=1} onClick={()=>setDocumentPage((page)=>Math.max(1,page-1))}><ChevronLeft size={14}/></button> <span>{documentPage} / {material.pages}</span> <button type="button" className="icon-button" aria-label="Next page" disabled={documentPage>=material.pages} onClick={()=>setDocumentPage((page)=>Math.min(material.pages,page+1))}><ChevronRight size={14}/></button></span></div><div className="mock-document"><div className="mock-document-page"><div className="mock-document-kicker">{material.subject} · COURSE NOTES</div><h2>{material.name.replace(/\.[^.]+$/,'')}</h2><div className="mock-document-rule"/><div className="mock-doc-heading">{documentPage===1?'Core ideas at a glance':`Topic spotlight · ${pageTopic}`}</div><p>These notes are organized around the key concepts in this course. Start with the definitions, then connect each idea to an example you can explain in your own words.</p><div className="mock-doc-highlight"><Sparkles size={13}/><span><strong>Key idea</strong> Build a clear mental model before memorizing details.</span></div><div className="mock-doc-lines"><i/><i/><i/><i className="short"/></div><div className="mock-doc-heading">Topics in this material</div><ul>{material.topics.slice(0,5).map((topic)=><li key={topic}><span/>{topic}</li>)}</ul><div className="mock-doc-lines"><i/><i/><i className="medium"/></div><div className="mock-doc-page-footer"><span>CampusAI · Study copy</span><span>{String(documentPage).padStart(2,'0')}</span></div></div></div></Card><div className="document-actions-row"><Button variant="secondary" onClick={()=>doAI('Summarize')} icon={<Sparkles size={14}/>}>Summarize</Button><Button variant="secondary" onClick={()=>doAI('Explain')} icon={<Lightbulb size={14}/>}>Explain</Button><Button variant="secondary" onClick={()=>navigate('/quiz',{state:{sourceMaterialId:material.id}})} icon={<BrainCircuit size={14}/>}>Generate Quiz</Button><Button variant="secondary" onClick={()=>navigate('/flashcards',{state:{sourceMaterialId:material.id}})} icon={<BookOpen size={14}/>}>Flashcards</Button></div></div>
    <aside className="document-ai-panel"><Card className="document-ai-card"><div className="document-ai-heading"><span className="ai-panel-icon"><Sparkles size={16}/></span><div><h2>Study this material</h2><p>Your notes, with a little more clarity.</p></div></div><div className="document-ai-actions"><button onClick={()=>doAI('Summarize')}><span><FileText size={15}/></span><span><strong>Summarize</strong><small>Get the key ideas at a glance</small></span><ArrowRight size={14}/></button><button onClick={()=>doAI('Explain')}><span><Lightbulb size={15}/></span><span><strong>Explain a concept</strong><small>Break down what feels unclear</small></span><ArrowRight size={14}/></button><button onClick={()=>navigate('/quiz',{state:{sourceMaterialId:material.id}})}><span><BrainCircuit size={15}/></span><span><strong>Generate a quiz</strong><small>Practice what you just reviewed</small></span><ArrowRight size={14}/></button><button onClick={()=>navigate('/flashcards',{state:{sourceMaterialId:material.id}})}><span><BookOpen size={15}/></span><span><strong>Make flashcards</strong><small>Build quick recall</small></span><ArrowRight size={14}/></button></div><label className="document-ask"><span>Ask about this material</span><div><input value={question} onChange={(event)=>setQuestion(event.target.value)} onKeyDown={(event)=>{if(event.key==='Enter')void doAI('Ask AI');}} placeholder="e.g. What is most important?"/><button type="button" aria-label="Ask CampusAI" onClick={()=>doAI('Ask AI')}><ArrowRight size={15}/></button></div></label>{thinking&&<LoadingState message="CampusAI is thinking…"/>}{aiResult&&<div className="document-ai-response"><div className="eyebrow">MOCK AI RESPONSE</div>{renderAIText(aiResult.text)}<div className="source-chips">{aiResult.sources.map((source)=><span className="source-chip" key={source}><FileText size={11}/>{source}</span>)}</div></div>}</Card>
      <Card className="extracted-topics-card"><div className="extracted-heading"><span><Network size={15}/></span><div><h3>Topics detected</h3><small>{material.topics.length} concepts in this material</small></div></div>{material.topics.map((topic,index)=><div className="extracted-topic" key={topic}><span className="extracted-check"><Check size={11}/></span><span>{topic}</span><small>{index<2?'Strong':'Mapped'}</small></div>)}</Card></aside></div>
  </div>;
}

export function QuizBuilderPage() {
  const [subject,setSubject]=useState('Machine Learning');
  const [topic,setTopic]=useState('Any topic');
  const [difficulty,setDifficulty]=useState<'Easy'|'Medium'|'Hard'>('Medium');
  const [count,setCount]=useState('5');
  const [source,setSource]=useState(false);
  const [busy,setBusy]=useState(false);
  const [availableMaterials,setAvailableMaterials]=useState<Material[]>(seededMaterials);
  const [materialId,setMaterialId]=useState(seededMaterials[0]?.id??'');
  const {toast}=useApp();
  const navigate=useNavigate();
  const location=useLocation();
  const routeMaterialId=(location.state as {sourceMaterialId?:string}|null)?.sourceMaterialId??'';
  const sourceMaterial=availableMaterials.find((material)=>material.id===materialId);
  useEffect(()=>{void materialService.list().then((items)=>{setAvailableMaterials(items);setMaterialId((current)=>items.some((item)=>item.id===current)?current:items[0]?.id??'');}).catch(()=>setAvailableMaterials(seededMaterials));},[]);
  useEffect(()=>{if(!routeMaterialId)return;const selected=availableMaterials.find((material)=>material.id===routeMaterialId);if(selected){setSource(true);setMaterialId(selected.id);setSubject(selected.subject);setTopic('Any topic');}},[availableMaterials,routeMaterialId]);
  const subjectOptions=[...new Set([...subjects.map((item)=>item.name),...availableMaterials.map((material)=>material.subject),'All subjects'])];
  const topicOptions=useMemo(()=>['Any topic',...new Set(source&&sourceMaterial?sourceMaterial.topics:subject==='All subjects'?['K-Nearest Neighbors','Normalization','Probability','Classification','Functional Dependencies']:subject==='Machine Learning'?['K-Nearest Neighbors','Classification','Regression','Support Vector Machines']:subject==='Database Systems'?['Normalization','Functional Dependencies','SQL Joins']:subject==='Statistics'?['Probability','Hypothesis Testing']:subject==='Computer Networks'?['TCP/IP','Routing']:[])],[source,sourceMaterial,subject]);
  const generate=async()=>{setBusy(true);try{const quiz=await quizService.create({subject,topic,difficulty,count:Number(count),sourceMaterialId:source?materialId:undefined});navigate(`/quiz/${quiz.id}`,{state:{quiz}});}catch{toast('Couldn’t create a quiz','Try another topic or choose an available material.','error');}finally{setBusy(false);}};
  const chooseSource=(enabled:boolean)=>{setSource(enabled);if(enabled&&sourceMaterial){setSubject(sourceMaterial.subject);setTopic('Any topic');}};
  return <div className="page-content quiz-builder-page"><PageTitle eyebrow="PRACTICE THAT MEETS YOU WHERE YOU ARE" title="A little practice goes a long way." description="Build a focused quiz around a course, topic or material you’ve already uploaded." />
    <div className="quiz-builder-layout"><Card className="quiz-builder-card"><div className="quiz-builder-heading"><span><BrainCircuit size={18}/></span><div><h2>Build a practice set</h2><p>Choose your focus. CampusAI will take care of the questions.</p></div></div><div className="quiz-builder-fields"><SelectField label="Subject" value={subject} onChange={(value)=>{setSubject(value);setTopic('Any topic');}} options={subjectOptions}/><SelectField label="Topic" value={topic} onChange={setTopic} options={topicOptions}/><div><span className="field-label">Difficulty</span><div className="difficulty-options">{(['Easy','Medium','Hard'] as const).map((level)=><button key={level} type="button" onClick={()=>setDifficulty(level)} className={difficulty===level?'selected':''}>{level}</button>)}</div></div><SelectField label="Number of questions" value={count} onChange={setCount} options={['3','5','10']}/></div><label className={`quiz-source-toggle ${source?'selected':''}`}><span className="source-toggle-icon"><FileText size={16}/></span><span><strong>Use my uploaded material</strong><small>Draw questions from the detected topics in your study space.</small></span><input type="checkbox" checked={source} onChange={(event)=>chooseSource(event.target.checked)} /><i>{source&&<Check size={12}/>}</i></label>{source&&<div className="quiz-source-selection"><SelectField label="Uploaded material" value={materialId} onChange={(value)=>{setMaterialId(value);const selected=availableMaterials.find((item)=>item.id===value);if(selected){setSubject(selected.subject);setTopic('Any topic');}}} options={availableMaterials.map((material)=>({value:material.id,label:material.name}))}/><p>Demo quizzes use detected topic labels and curated sample questions; document contents stay on your device.</p></div>}<Button size="lg" className="generate-quiz-button" disabled={busy||(source&&!materialId)} onClick={generate}>{busy?<><span className="button-spinner"/> Building your quiz…</>:<>Generate Quiz <Sparkles size={15}/></>}</Button><p className="quiz-builder-footnote"><Sparkles size={13}/> Adaptive practice is based on sample questions in this frontend demo.</p></Card>
    <aside className="quiz-aside"><Card className="quiz-aside-card"><span className="quiz-aside-icon"><TargetIcon/></span><div className="eyebrow">PRACTICE WITH INTENTION</div><h3>Small checks beat big crams.</h3><p>Start with a few focused questions. Review the explanation, then try again later to strengthen recall.</p><div className="quiz-aside-stat"><span><Clock3 size={14}/> Around 4 minutes</span><span><CheckCircle2 size={14}/> Clear explanations</span><span><TrendingIcon/> Your next step, included</span></div></Card><Card className="quiz-weak-card"><div><span className="weak-card-orb"><BrainCircuit size={15}/></span><div><div className="eyebrow">A GOOD PLACE TO START</div><strong>K-Nearest Neighbors</strong><small>51% mastery · 3 missed recently</small></div></div><button onClick={()=>navigate('/tutor/knn-guided')}>Try a guided lesson <ArrowRight size={14}/></button></Card></aside></div></div>;
}

function TargetIcon(){return <span className="target-icon-css"><i/></span>;}
function TrendingIcon(){return <ArrowRight size={14}/>;}

export function QuizPage() {
  const {id=''}=useParams();
  const location=useLocation();
  const navigate=useNavigate();
  const routeQuiz=(location.state as {quiz?:Quiz}|null)?.quiz;
  const [quiz,setQuiz]=useState<Quiz|undefined>(routeQuiz);
  const [index,setIndex]=useState(0);
  const [answers,setAnswers]=useState<number[]>([]);
  const [selected,setSelected]=useState<number|null>(null);
  const [loading,setLoading]=useState(!routeQuiz);
  const [submitting,setSubmitting]=useState(false);
  useEffect(()=>{if(routeQuiz){setQuiz(routeQuiz);setLoading(false);return;}quizService.get(id).then((value)=>{setQuiz(value);setLoading(false);}).catch(()=>setLoading(false));},[id,routeQuiz]);
  if(loading)return <div className="quiz-focus-page"><LoadingState message="Preparing your practice set…"/></div>;
  if(!quiz)return <div className="page-content"><EmptyState icon={<BrainCircuit size={21}/>} title="This quiz isn’t in the current session" description="Create a new practice set to keep learning. Quiz data in this frontend demo is kept in memory." action={<Link className="btn btn-primary" to="/quiz">Build a quiz</Link>}/></div>;
  const question=quiz.questions[index];
  const hasAnswered=selected!==null;
  const next=async()=>{const nextAnswers=[...answers,selected??-1];if(index<quiz.questions.length-1){setAnswers(nextAnswers);setIndex((current)=>current+1);setSelected(null);return;}setSubmitting(true);const result=await quizService.submit(quiz,nextAnswers);navigate(`/quiz/${quiz.id}/result`,{state:{quiz,result}});};
  const leave=()=>navigate('/quiz');
  return <div className="quiz-focus-page"><div className="quiz-focus-top"><button className="quiz-exit" onClick={leave}><ArrowLeft size={15}/> Exit quiz</button><span className="quiz-focus-subject"><BrainCircuit size={14}/> {quiz.subject} · {quiz.title}</span><span className="quiz-focus-level">{quiz.difficulty} practice</span></div><div className="quiz-focus-progress"><span>QUESTION {String(index+1).padStart(2,'0')} <i>/ {String(quiz.questions.length).padStart(2,'0')}</i></span><ProgressBar value={((index+(hasAnswered?1:0))/quiz.questions.length)*100}/><span>{Math.round((index+(hasAnswered?1:0))/quiz.questions.length*100)}%</span></div><div className="quiz-question-wrap"><div className="quiz-question-meta"><Badge tone="accent"><Sparkles size={11}/> {index===0?'Let’s warm up':'You’re building momentum'}</Badge><span><Clock3 size={13}/> Take your time</span></div><h1>{question.prompt}</h1><p className="quiz-question-topic">TOPIC · {question.topic.toUpperCase()}</p><div className="quiz-options" role="radiogroup" aria-label="Answer options">{question.options.map((option,optionIndex)=><QuizOption key={`${question.id}-${optionIndex}`} option={option} index={optionIndex} selected={selected===optionIndex} correctIndex={question.correctIndex} showResult={hasAnswered} onSelect={()=>setSelected(optionIndex)}/>)}</div>{hasAnswered&&<motion.div className={`quiz-explanation ${selected===question.correctIndex?'answer-correct':'answer-review'}`} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}><span>{selected===question.correctIndex?<CheckCircle2 size={17}/>:<Lightbulb size={17}/>}</span><div><strong>{selected===question.correctIndex?'That’s right.':'A useful thing to remember'}</strong><p>{question.explanation}</p></div></motion.div>}<div className="quiz-next-row">{!hasAnswered?<span className="quiz-select-hint">Select an answer to continue</span>:<span className="quiz-select-hint"><Sparkles size={13}/> One step closer to a clearer picture.</span>}<Button disabled={!hasAnswered||submitting} onClick={()=>void next()}>{submitting?'Saving…':index===quiz.questions.length-1?'See my results':'Next question'} <ArrowRight size={14}/></Button></div></div><div className="quiz-focus-foot"><span><LockKeyholeMini/> Your practice stays in this demo workspace.</span><button onClick={()=>navigate('/tutor')}>Need a hint? Ask your tutor <ArrowRight size={12}/></button></div></div>;
}
function LockKeyholeMini(){return <span className="tiny-lock">•</span>;}

export function QuizResultPage() {
  const {id=''}=useParams();
  const [reviewOpen,setReviewOpen]=useState(false);
  const location=useLocation();
  const navigate=useNavigate();
  const state=(location.state as {quiz?:Quiz;result?:QuizResult}|null)??null;
  const [payload,setPayload]=useState<{quiz?:Quiz;result?:QuizResult}>(state??{});
  const [loading,setLoading]=useState(false);
  useEffect(()=>{if(payload.quiz&&payload.result)return;setLoading(true);void quizService.result(id).then(setPayload).finally(()=>setLoading(false));},[id,payload.quiz,payload.result]);
  const {quiz,result}=payload;
  const missedQuestions=quiz&&result?quiz.questions.map((question,index)=>({question,index})).filter(({question,index})=>result.answers[index]!==question.correctIndex):[];
  if(loading)return <div className="page-content"><LoadingState message="Putting your results together…"/></div>;
  if(!quiz||!result)return <div className="page-content"><EmptyState icon={<Trophy size={21}/>} title="No quiz result to show yet" description="Finish a practice set and your topic-by-topic results will appear here." action={<Button onClick={()=>navigate('/quiz')}>Create a quiz</Button>}/></div>;
  return <div className="page-content quiz-result-page"><div className="result-confetti result-confetti-a"/><div className="result-confetti result-confetti-b"/><div className="result-header"><span className="result-trophy"><Trophy size={21}/></span><Badge tone="success">PRACTICE COMPLETE</Badge><h1>{result.score>=70?'Great work':'Good effort'}, Alex!</h1><p>You’ve made your understanding a little clearer. Here’s what to keep—and what to revisit.</p></div><Card className="result-score-card"><div className="result-score-ring" style={{background:`conic-gradient(var(--accent) ${result.score}%,var(--line) ${result.score}%)`}}><div><strong>{result.score}<small>%</small></strong><span>YOUR SCORE</span></div></div><div className="result-score-details"><div><span>Correct answers</span><strong>{result.correct} <small>/ {result.total}</small></strong></div><div><span>Mastery gained</span><strong className="result-mastery-gain"><ArrowUpRight size={17}/> +{result.masteryGain}</strong></div><div><span>Time invested</span><strong>4 <small>min</small></strong></div></div></Card><div className="result-topic-grid"><Card className="result-topic-card"><span className="result-list-icon result-strong-icon"><Check size={14}/></span><div className="eyebrow">WHAT’S STICKING</div><h3>Strong areas</h3>{result.strongTopics.length?result.strongTopics.map((topic,index)=><div className="result-topic-row" key={`${topic}-${index}`}><span>{topic}</span><Badge tone="success">Solid</Badge></div>):<p className="result-empty-line">Every practice is a useful signal. Keep going.</p>}</Card><Card className="result-topic-card"><span className="result-list-icon result-review-icon"><ArrowUpRight size={14}/></span><div className="eyebrow">A CHANCE TO GROW</div><h3>Worth another look</h3>{result.reviewTopics.length?result.reviewTopics.map((topic,index)=><div className="result-topic-row" key={`${topic}-${index}`}><span>{topic}</span><Badge tone="warning">Review</Badge></div>):<p className="result-empty-line">Nothing to revisit this time. Nicely done.</p>}</Card></div><div className="result-actions"><Button variant="secondary" onClick={()=>setReviewOpen(true)}>Review mistakes <RotateCcw size={14}/></Button><Button variant="ghost" onClick={()=>navigate('/quiz')}>Build another quiz <Sparkles size={14}/></Button><Button variant="soft" onClick={()=>navigate('/knowledge')}>Practice weak topics <BrainCircuit size={14}/></Button><Button onClick={()=>navigate('/dashboard')}>Back to dashboard <ArrowRight size={14}/></Button></div><Modal open={reviewOpen} onClose={()=>setReviewOpen(false)} title="Review your answers" description={missedQuestions.length?`${missedQuestions.length} question${missedQuestions.length===1?'':'s'} to revisit from this practice set.`:'You answered every question correctly.'}>{missedQuestions.length===0?<EmptyState icon={<CheckCircle2 size={20}/>} title="Nothing to review this time" description="You got every answer right. Keep building on that understanding."/>:<div className="quiz-review-list">{missedQuestions.map(({question,index})=><Card key={question.id} className="quiz-review-item"><span className="eyebrow">QUESTION {index+1} · {question.topic.toUpperCase()}</span><h3>{question.prompt}</h3><p><strong>Your answer</strong> {question.options[result.answers[index]??-1]??'No answer selected'}</p><p><strong>Best answer</strong> {question.options[question.correctIndex]}</p><p className="quiz-review-explanation">{question.explanation}</p></Card>)}</div>}</Modal><p className="result-footer-note"><Sparkles size={13}/> Progress isn’t a score—it’s the next idea you understand.</p></div>;
}

export function FlashcardsPage() {
  const location=useLocation();
  const sourceMaterialId=(location.state as {sourceMaterialId?:string}|null)?.sourceMaterialId??'';
  const [cards,setCards]=useState<FlashcardData[]>([]);
  const [index,setIndex]=useState(0);
  const [flipped,setFlipped]=useState(false);
  const [marked,setMarked]=useState<Record<string,'known'|'review'>>({});
  const [loading,setLoading]=useState(true);
  const [sourceMaterialName,setSourceMaterialName]=useState('');
  const {toast}=useApp();
  const navigate=useNavigate();
  useEffect(()=>{
    let active=true;
    setLoading(true);setIndex(0);setFlipped(false);setMarked({});
    const load=async()=>{
      try{
        if(sourceMaterialId){
          const [nextCards,material]=await Promise.all([flashcardService.fromMaterial(sourceMaterialId),materialService.get(sourceMaterialId)]);
          if(active){setCards(nextCards);setSourceMaterialName(material?.name??'');}
        }else{
          const nextCards=await flashcardService.list();
          if(active){setCards(nextCards);setSourceMaterialName('');}
        }
      }catch{if(active){setCards([]);setSourceMaterialName('');}}
      finally{if(active)setLoading(false);}
    };
    void load();
    return()=>{active=false;};
  },[sourceMaterialId]);
  const move=(direction:number)=>{setIndex((current)=>Math.max(0,Math.min(cards.length-1,current+direction)));setFlipped(false);};
  useEffect(()=>{const listener=(event:KeyboardEvent)=>{const target=event.target instanceof HTMLElement?event.target:null;const textEntry=target?.closest('input,textarea,select,[contenteditable="true"]');if(event.code==='Space'&&!textEntry&&!target?.closest('button')){event.preventDefault();setFlipped((value)=>!value);}if(!textEntry&&event.key==='ArrowRight')move(1);if(!textEntry&&event.key==='ArrowLeft')move(-1);};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[cards.length]);
  const mark=(value:'known'|'review')=>{const card=cards[index];if(!card)return;setMarked((current)=>({...current,[card.id]:value}));toast(value==='known'?'Marked as known':'Added to review list',value==='known'?'We’ll bring this concept back less often.':'We’ll help you revisit this one.');move(1);};
  const card=cards[index];
  if(loading)return <div className="page-content"><LoadingState message="Gathering your flashcards…"/></div>;
  return <div className="page-content flashcards-page"><PageTitle eyebrow="LOW-PRESSURE RETRIEVAL PRACTICE" title={sourceMaterialName?'Study this material.':'Make it stick.'} description={sourceMaterialName?`Topic-label demo cards from ${sourceMaterialName}; original file contents stay on your device.`:'A quick recall session, shaped around the concepts you’ve been learning.'} action={<Button variant="secondary" icon={<Sparkles size={14}/>} onClick={()=>sourceMaterialId?navigate('/flashcards',{replace:true,state:null}):toast('Cards ready','These sample cards come from your course concepts.')}>{sourceMaterialName?'All cards':'My cards'}</Button>} />{!card?<EmptyState icon={<BookOpen size={21}/>} title="No flashcards yet" description="Turn your notes or a topic you’ve studied into a small set of cards." action={<Link to="/materials" className="btn btn-primary">Open materials</Link>}/>:<div className="flashcards-stage"><div className="flashcard-topline"><span><span className="flashcard-dot"/> {card.subject}</span><span>{String(index+1).padStart(2,'0')} <i>/ {String(cards.length).padStart(2,'0')}</i></span></div><ProgressBar value={(index+1)/cards.length*100}/><Flashcard card={card} flipped={flipped} onFlip={()=>setFlipped((current)=>!current)}/><div className="flashcard-controls"><button type="button" className="flashcard-control-btn" disabled={index===0} onClick={()=>move(-1)}><ChevronLeft size={15}/> Previous</button><div className="flashcard-review-actions"><button type="button" className="flashcard-review-btn review-again" onClick={()=>mark('review')}><RotateCcw size={15}/> Needs review</button><button type="button" className="flashcard-review-btn review-known" onClick={()=>mark('known')}><Check size={15}/> Known</button></div><button type="button" className="flashcard-control-btn" disabled={index===cards.length-1} onClick={()=>move(1)}>Next <ChevronRight size={15}/></button></div><p className="flashcard-keyboard-note">Use <kbd>←</kbd> <kbd>→</kbd> to move between cards · <kbd>Space</kbd> to flip</p><div className="flashcard-status-counts"><span><Check size={12}/> Known {Object.values(marked).filter((value)=>value==='known').length}</span><span><RotateCcw size={12}/> Review {Object.values(marked).filter((value)=>value==='review').length}</span></div></div>}</div>;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function dateForKey(key: string): Date {
  const [year,month,day]=key.split('-').map(Number);
  return new Date(year,month-1,day);
}

function plannerRange(view: 'Today'|'Week'|'Month', anchor: Date): {start: Date; end: Date} {
  const start=new Date(anchor.getFullYear(),anchor.getMonth(),anchor.getDate());
  if(view==='Today')return {start,end:new Date(start)};
  if(view==='Week'){
    start.setDate(start.getDate()-((start.getDay()+6)%7));
    const end=new Date(start);end.setDate(end.getDate()+6);return {start,end};
  }
  start.setDate(1);
  return {start,end:new Date(start.getFullYear(),start.getMonth()+1,0)};
}

function shortPlannerDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(date);
}

export function PlannerPage() {
  const [tasks,setTasks]=useState<StudyTask[]>([]);
  const [view,setView]=useState<'Today'|'Week'|'Month'>('Today');
  const [courseFilter,setCourseFilter]=useState('All courses');
  const [anchorDate,setAnchorDate]=useState(()=>new Date());
  const [modalOpen,setModalOpen]=useState(false);
  const [editing,setEditing]=useState<StudyTask|null>(null);
  const [title,setTitle]=useState('');
  const [subject,setSubject]=useState('Machine Learning');
  const [date,setDate]=useState(()=>localDateKey(new Date()));
  const [time,setTime]=useState('14:00');
  const [duration,setDuration]=useState('20');
  const [type,setType]=useState<StudyTask['type']>('revision');
  const {toast}=useApp();
  useEffect(()=>{plannerService.list().then(setTasks).catch(()=>setTasks([]));},[]);
  const todayKey=localDateKey(new Date());
  const range=useMemo(()=>plannerRange(view,anchorDate),[view,anchorDate]);
  const rangeStart=localDateKey(range.start);
  const rangeEnd=localDateKey(range.end);
  const courseOptions=[...new Set(tasks.map((task)=>task.subject).filter(Boolean))].sort();
  const visibleTasks=useMemo(()=>tasks.filter((task)=>{const key=task.date??todayKey;return key>=rangeStart&&key<=rangeEnd&&(courseFilter==='All courses'||task.subject===courseFilter);}).sort((a,b)=>(a.date??todayKey).localeCompare(b.date??todayKey)||a.time.localeCompare(b.time)),[tasks,rangeEnd,rangeStart,todayKey,courseFilter]);
  const completed=visibleTasks.filter((task)=>task.completed).length;
  const percent=visibleTasks.length?Math.round(completed/visibleTasks.length*100):0;
  const plannedMinutes=visibleTasks.filter((task)=>!task.completed).reduce((sum,task)=>sum+task.duration,0);
  const rangeLabel=view==='Today'?new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(anchorDate):view==='Week'?`${shortPlannerDate(range.start)} – ${shortPlannerDate(range.end)}`:new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(anchorDate);
  const heading=view==='Today'?(localDateKey(anchorDate)===todayKey?'Today’s sessions':rangeLabel):view==='Week'?'This week':'Your month';
  const shiftRange=(direction:number)=>setAnchorDate((current)=>{const next=new Date(current);if(view==='Today')next.setDate(next.getDate()+direction);else if(view==='Week')next.setDate(next.getDate()+direction*7);else {next.setDate(1);next.setMonth(next.getMonth()+direction);}return next;});
  const openNew=()=>{setEditing(null);setTitle('');setSubject(courseFilter==='All courses'?'Machine Learning':courseFilter);setDate(localDateKey(anchorDate));setTime('14:00');setDuration('20');setType('revision');setModalOpen(true);};
  const openEdit=(task:StudyTask)=>{setEditing(task);setTitle(task.title);setSubject(task.subject);setDate(task.date??todayKey);setTime(task.time);setDuration(String(task.duration));setType(task.type);setModalOpen(true);};
  const saveTask=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!title.trim()||!date)return;const input={title:title.trim(),subject,date,time,duration:Number(duration)||20,type};const next=editing?await plannerService.update(editing.id,input):await plannerService.add(input);setTasks(next);setModalOpen(false);toast(editing?'Study session updated':'Study session added',`${title.trim()} is on your plan.`);};
  const toggleTask=async(task:StudyTask)=>{const next=await plannerService.update(task.id,{completed:!task.completed});setTasks(next);toast(task.completed?'Session reopened':'Nice work — session complete',task.title);};
  const removeTask=async(task:StudyTask)=>{const next=await plannerService.remove(task.id);setTasks(next);toast('Study session removed',task.title,'info');};
  const viewChoices=[{value:'Today',label:'Today'},{value:'Week',label:'Week'},{value:'Month',label:'Month'}];
  return <div className="page-content"><PageTitle eyebrow="A PLAN THAT LEAVES ROOM TO BREATHE" title="Your study planner" description="A few thoughtful sessions can make a busy week feel manageable." action={<Button icon={<Plus size={15}/>} onClick={openNew}>Add task</Button>} />
    <div className="planner-overview"><Card className="planner-progress-card"><div className="planner-progress-copy"><span className="eyebrow">{view==='Today'?"TODAY’S MOMENTUM":view==='Week'?"THIS WEEK’S MOMENTUM":"THIS MONTH’S MOMENTUM"}</span><strong>{percent}<small>%</small></strong><p>{completed} of {visibleTasks.length} sessions complete</p></div><div className="planner-progress-ring" style={{background:`conic-gradient(var(--accent) ${percent}%,var(--line) ${percent}%)`}}><div><Check size={19}/></div></div><div className="planner-progress-foot"><span><Sparkles size={14}/> Every completed session counts.</span><span>{plannedMinutes} min planned</span></div></Card><Card className="planner-focus-card"><span className="planner-focus-icon"><BrainCircuit size={16}/></span><div className="eyebrow">A GOOD PLACE TO BEGIN</div><h3>K-Nearest Neighbors</h3><p>Your current gap is in distance metrics. A focused 20-minute review could make a difference.</p><Link to="/tutor/knn-guided" className="small-link">Start a guided lesson <ArrowRight size={13}/></Link></Card></div>
    <div className="planner-toolbar"><Tabs className="planner-view-tabs" label="Planner view" value={view} onChange={(value)=>setView(value as 'Today'|'Week'|'Month')} items={viewChoices}/><div className="planner-date"><button type="button" className="icon-button" aria-label="Previous date range" onClick={()=>shiftRange(-1)}><ChevronLeft size={15}/></button><strong>{rangeLabel}</strong><button type="button" className="icon-button" aria-label="Next date range" onClick={()=>shiftRange(1)}><ChevronRight size={15}/></button><button type="button" className="planner-today-button" onClick={()=>{setView('Today');setAnchorDate(new Date());}}>Today</button></div><label className="planner-filter"><Filter size={14}/><Dropdown aria-label="Filter planner by course" value={courseFilter} onChange={setCourseFilter} options={['All courses',...courseOptions]}/></label></div>
    <Card className="planner-timeline-card"><div className="planner-timeline-heading"><div><h2>{heading}</h2><p>{view==='Today'?'Make a little space for what matters.':'A flexible plan, centered on the next useful step.'}</p></div><span>{visibleTasks.length} sessions</span></div>{!visibleTasks.length?<EmptyState icon={<CalendarDays size={20}/>} title="Your planner is clear" description={`There are no sessions in this ${view.toLowerCase()} view. Add a short study session to make a little progress.`} action={<Button onClick={openNew} icon={<Plus size={14}/>}>Add a task</Button>}/>:<div className="planner-timeline">{visibleTasks.map((task,index)=><div className={`planner-task-row ${task.completed?'is-complete':''}`} key={task.id}><div className="planner-task-time"><strong>{task.time}</strong><span>{task.duration} min</span>{view!=='Today'&&<span className="planner-task-date">{shortPlannerDate(dateForKey(task.date??todayKey))}</span>}</div><div className="planner-task-rail"><i className={`task-kind-dot task-kind-${task.type}`}/>{index<visibleTasks.length-1&&<span/>}</div><div className="planner-task-card"><button type="button" className={`task-check ${task.completed?'checked':''}`} aria-label={task.completed?`Reopen ${task.title}`:`Complete ${task.title}`} onClick={()=>void toggleTask(task)}>{task.completed&&<Check size={12}/>}</button><span className={`task-kind-icon task-kind-${task.type}`}>{task.type==='quiz'?<BrainCircuit size={15}/>:task.type==='flashcards'?<BookOpen size={15}/>:task.type==='revision'?<Sparkles size={15}/>:<FileText size={15}/>}</span><div className="planner-task-copy"><strong>{task.title}</strong><small>{task.subject} <i/> {task.duration} min</small></div><Badge tone={task.completed?'success':task.type==='quiz'?'accent':'neutral'}>{task.completed?'Complete':task.type==='quiz'?'Practice':task.type==='flashcards'?'Recall':'Study'}</Badge><div className="task-row-actions"><button type="button" aria-label={`Edit ${task.title}`} className="icon-button" onClick={()=>openEdit(task)}><Pencil size={14}/></button><button type="button" aria-label={`Delete ${task.title}`} className="icon-button" onClick={()=>void removeTask(task)}><Trash2 size={14}/></button></div></div></div>)}</div>}</Card>
    <Modal open={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit study session':'Add a study session'} description="Make it realistic; a focused 20 minutes is a great start."><form className="task-form" onSubmit={(event)=>void saveTask(event)}><Field label="What would you like to study?" value={title} onChange={(event)=>setTitle(event.target.value)} placeholder="e.g. Review KNN distance metrics" required/><SelectField label="Subject" value={subject} onChange={setSubject} options={subjects.map((item)=>item.name)}/><Field label="Study date" type="date" value={date} onChange={(event)=>setDate(event.target.value)} required/><div className="task-form-row"><Field label="Start time" type="time" value={time} onChange={(event)=>setTime(event.target.value)} required/><Field label="Duration (minutes)" type="number" min="5" max="240" value={duration} onChange={(event)=>setDuration(event.target.value)} required/></div><SelectField label="Session type" value={type} onChange={(value)=>setType(value as StudyTask['type'])} options={['revision','quiz','flashcards','study']}/><div className="task-form-actions"><Button type="button" variant="ghost" onClick={()=>setModalOpen(false)}>Cancel</Button><Button type="submit">{editing?'Save changes':'Add to planner'} <ArrowRight size={14}/></Button></div></form></Modal>
  </div>;
}
