import { useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, BarChart3, BookOpen, BrainCircuit, Check, ChevronLeft, ChevronRight, CircleHelp, Compass, Database, FileText, Focus, GraduationCap, Layers3, LockKeyhole, NotebookTabs, Sparkles, UploadCloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicHeader } from '../components/Shell';
import { Badge, Button, Field, ProgressBar } from '../components/ui';
import { authService } from '../services/authService';
import { useApp } from '../context/AppContext';

const heroImage = '/hero-study-space.webp';
const featureCards = [
  { icon: Sparkles, title: 'AI Tutor', description: 'Learn interactively with explanations that meet you where you are.', color: 'violet' },
  { icon: Compass, title: 'Knowledge Map', description: 'See what you know, what is fading, and where to focus next.', color: 'blue' },
  { icon: BrainCircuit, title: 'Adaptive Quiz', description: 'Practice questions shaped around your actual learning gaps.', color: 'amber' },
  { icon: NotebookTabs, title: 'Study Planner', description: 'A realistic daily plan, prioritized by what will help most.', color: 'teal' },
  { icon: FileText, title: 'Exam Intelligence', description: 'Turn syllabi and past papers into a clear preparation path.', color: 'rose' },
  { icon: BarChart3, title: 'Progress', description: 'Watch your mastery grow across every course and concept.', color: 'indigo' },
];
const processSteps = [
  { title: 'Upload', detail: 'Bring your notes, PDFs and syllabus together.', icon: UploadCloud },
  { title: 'Understand', detail: 'CampusAI organizes the ideas inside.', icon: FileText },
  { title: 'Diagnose', detail: 'A short check reveals what is sticking.', icon: Compass },
  { title: 'Learn', detail: 'Get a guided explanation where you need it.', icon: Sparkles },
  { title: 'Practice', detail: 'Build recall with focused quizzes and cards.', icon: BrainCircuit },
  { title: 'Improve', detail: 'See mastery rise, then plan your next step.', icon: BarChart3 },
];

function ProductPreview() {
  return <motion.div className="product-preview" initial={{ opacity: 0, y: 18, rotateX: 3 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.8, delay: 0.16, ease: 'easeOut' }}>
    <div className="preview-window-bar"><div className="preview-dots"><i /><i /><i /></div><span>app.campusai.study</span><span className="preview-live"><i /> Live workspace</span></div>
    <div className="preview-app">
      <aside className="preview-side"><span className="preview-logo"><GraduationCap size={14} /></span><div className="preview-side-active"><span>⌂</span></div><span>✧</span><span>▤</span><span>◉</span><span>◷</span><div className="preview-avatar">AM</div></aside>
      <div className="preview-content"><div className="preview-greeting"><div><span>MONDAY, SEPTEMBER 30</span><strong>Good morning, Alex <i>✦</i></strong><small>Here's what deserves your attention today.</small></div><div className="preview-streak"><span>✦</span><b>7 days</b><small>study streak</small></div></div>
        <div className="preview-focus"><div className="preview-focus-copy"><span className="preview-eyebrow"><i /> YOUR NEXT BEST ACTION</span><strong>K-Nearest Neighbors</strong><p>You struggled with distance metrics in your last quiz.</p><div className="preview-focus-bottom"><span><Sparkles size={13} /> 20 min recommended</span><b>Start learning <ArrowRight size={13} /></b></div></div><div className="preview-focus-score"><div className="preview-ring"><b>51<small>%</small></b></div><span>Mastery</span><small><ArrowDownRight size={12} /> Needs a little attention</small></div></div>
        <div className="preview-lower"><div className="preview-subjects"><div className="preview-section-title">Your courses <span>This week</span></div>{[['Machine Learning',72,'#9085f6'],['Database Systems',84,'#68b9ed'],['Statistics',51,'#dfa964']].map(([name,value,color])=><div className="preview-subject" key={String(name)}><span>{name}</span><div><i style={{ width: `${value}%`, background: String(color) }} /></div><b>{value}%</b></div>)}</div><div className="preview-chart"><div className="preview-section-title">Your momentum <span>+18%</span></div><div className="mini-bars">{[34,42,39,60,53,76,88,67,79,91,72,100,83,95].map((height,index)=><i key={index} style={{ height: `${height}%` }} />)}</div><small>Mastery is growing steadily</small></div></div>
      </div>
    </div>
    <div className="preview-note"><span><Check size={14} /></span> A clear next step, not another pile of tabs.</div>
  </motion.div>;
}

export function LandingPage() {
  const navigate = useNavigate();
  return <div className="public-page"><PublicHeader />
    <main>
      <section className="hero-section"><div className="hero-glow" /><div className="hero-copy"><Badge tone="accent"><span className="live-pulse" /> A smarter way to study</Badge><h1>Your AI Academic<br /><span>Copilot</span></h1><p>CampusAI understands what you know, finds what you don't, and tells you what to study next.</p><div className="hero-actions"><Button size="lg" icon={<ArrowRight size={17} />} onClick={() => navigate('/signup')}>Start Learning Free</Button><button className="text-action" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>Explore CampusAI <ArrowDownRight size={16} /></button></div><div className="hero-social-proof"><div className="avatar-stack"><span>AM</span><span>JL</span><span>SK</span><i><Sparkles size={12} /></i></div><span>Made for the way you <strong>actually learn.</strong></span></div></div>
        <div className="hero-preview-wrap"><ProductPreview /></div>
        <div className="hero-bottom-note"><span>BUILT AROUND YOUR LEARNING</span><div><i /> Upload <b>→</b> Understand <b>→</b> Improve</div></div>
      </section>

      <section className="trust-strip"><span>One calm place for your whole course</span><div><span><FileText size={15} /> PDFs & notes</span><i /><span><BrainCircuit size={15} /> Practice</span><i /><span><BarChart3 size={15} /> Progress</span><i /><span><Sparkles size={15} /> Guidance</span></div></section>

      <section className="problem-section section-pad"><div className="section-eyebrow"><span /> THE REAL PROBLEM</div><div className="problem-heading"><h2>Studying isn't the problem.<br /><em>Knowing what to study is.</em></h2><p>Between lectures, notes and deadlines, it's easy to spend a lot of time studying—and still not know what matters most.</p></div><div className="problem-grid">{[
        { icon: FileText, title: 'Too many PDFs', copy: 'Your course material is everywhere, and none of it talks to each other.' },
        { icon: Layers3, title: 'Notes in every place', copy: 'Good ideas get buried in folders, tabs and half-finished docs.' },
        { icon: CircleHelp, title: 'No clear next step', copy: 'You know you should revise. The hard part is deciding what to revisit.' },
        { icon: Focus, title: 'Concepts fade', copy: 'A familiar page can feel learned—even when recall is still shaky.' },
        { icon: BrainCircuit, title: 'Random practice', copy: 'Generic question sets rarely target the gap you actually have.' },
        { icon: Database, title: 'Last-minute pressure', copy: 'Exam prep gets stressful when your priorities only become clear too late.' },
      ].map(({ icon: Icon, title, copy }, index) => <motion.article key={title} className="problem-card" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }}><span className="problem-icon"><Icon size={18} /></span><h3>{title}</h3><p>{copy}</p></motion.article>)}</div></section>

      <section className="loop-section section-pad" id="how-it-works"><div className="loop-intro"><div className="section-eyebrow"><span /> A BETTER LEARNING LOOP</div><h2>Small steps.<br /><em>Real momentum.</em></h2><p>Your materials become a living map of what you know—so every study session starts with a reason.</p><button className="text-action" onClick={() => navigate('/signup')}>See how it works <ArrowRight size={15} /></button></div><div className="loop-steps">{processSteps.map(({ title, detail, icon: Icon }, index) => <motion.div className="loop-step" key={title} initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.07 }}><div className="loop-step-icon"><Icon size={17} /></div><div className="loop-step-copy"><span>0{index + 1}</span><strong>{title}</strong><small>{detail}</small></div>{index < processSteps.length - 1 && <div className="loop-connector" />}</motion.div>)}</div></section>

      <section className="features-section section-pad" id="features"><div className="section-heading-centered"><div className="section-eyebrow"><span /> YOUR STUDY TOOLKIT</div><h2>Everything connects<br />to <em>what matters next.</em></h2><p>One thoughtful workspace, built around your understanding—not just your content.</p></div><div className="feature-grid">{featureCards.map(({ icon: Icon, title, description, color }, index) => <motion.article className="feature-card" key={title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }}><span className={`feature-icon icon-${color}`}><Icon size={19} /></span><h3>{title}</h3><p>{description}</p><span className="feature-arrow"><ArrowRight size={15} /></span></motion.article>)}</div></section>

      <section className="next-action-section"><div className="next-action-art" style={{ backgroundImage: `linear-gradient(90deg, rgba(16,20,33,.98) 5%, rgba(16,20,33,.8) 55%, rgba(16,20,33,.55) 100%), url(${heroImage})` }} /><div className="next-action-content"><div className="next-action-copy"><div className="section-eyebrow light-eyebrow"><span /> A LITTLE MORE CLARITY</div><h2>What should I<br /><em>study now?</em></h2><p>CampusAI brings your next best action into focus—based on your mastery, recent practice and the time you have.</p><Button variant="secondary" onClick={() => navigate('/signup')}>Find my next step <ArrowRight size={15} /></Button></div><motion.div className="next-action-card" animate={{ y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}><div className="nac-label"><Sparkles size={14} /> YOUR NEXT BEST ACTION <span>JUST FOR YOU</span></div><h3>K-Nearest Neighbors</h3><p>You missed 3 questions about distance metrics.</p><div className="nac-progress"><ProgressBar value={51} /><strong>51% <small>mastery</small></strong></div><div className="nac-footer"><span><Check size={13} /> 20 minutes, focused</span><Button size="sm" onClick={() => navigate('/signup')}>Start learning <ArrowRight size={14} /></Button></div></motion.div></div></section>

      <section className="how-section section-pad"><div className="section-heading-centered"><div className="section-eyebrow"><span /> FROM UPLOAD TO UNDERSTANDING</div><h2>Your study time,<br /><em>pointed in the right direction.</em></h2></div><div className="how-grid">{[
        ['01', 'Upload your study material.', 'Bring in notes, course PDFs and the syllabus you already use.'],
        ['02', 'Build your knowledge map.', 'See the topics inside your materials and how they fit together.'],
        ['03', 'Take a diagnostic quiz.', 'A quick pulse check, designed to learn—not just grade.'],
        ['04', 'Find your weak areas.', 'CampusAI highlights the ideas that would benefit from a second look.'],
        ['05', 'Learn with guided tutoring.', 'Get a clear explanation, example and space to ask follow-up questions.'],
        ['06', 'Practice and improve.', 'Revisit adaptive questions and see your understanding strengthen.'],
      ].map(([number, title, description]) => <div className="how-card" key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></div>)}</div></section>

      <section className="final-cta-section"><div className="cta-orb cta-orb-one" /><div className="cta-orb cta-orb-two" /><div className="section-eyebrow light-eyebrow"><span /> MAKE YOUR NEXT SESSION COUNT</div><h2>Stop studying everything.<br /><em>Start studying what matters.</em></h2><p>A thoughtful first step is free. Your study workspace is ready when you are.</p><Button size="lg" onClick={() => navigate('/signup')}>Start with CampusAI <ArrowRight size={16} /></Button><span className="cta-footnote"><Check size={13} /> Your notes. Your pace. A clearer next step.</span></section>
    </main><footer className="public-footer"><Link to="/" className="brand" aria-label="CampusAI home"><span className="brand-mark"><GraduationCap size={19} /><i /></span><span className="brand-word">Campus<span>AI</span><small>Your AI Academic Copilot</small></span></Link><span>© 2026 CampusAI · Your AI Academic Copilot</span><div><a href="#features">Features</a><Link to="/login">Sign in</Link><button onClick={() => navigate('/signup')}>Get started</button></div></footer>
  </div>;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { toast, setStudent } = useApp();
  const [email, setEmail] = useState('alex.morgan@university.example');
  const [password, setPassword] = useState('campusai-demo');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setBusy(true); try { const profile = await authService.signIn(email, password); setStudent(profile); navigate('/dashboard'); toast('Welcome back, Alex', 'Your study space is ready.'); } catch { toast('We couldn’t sign you in', 'Please try again.', 'error'); } finally { setBusy(false); } };
  return <div className="auth-page"><PublicHeader /><div className="auth-layout"><div className="auth-story"><div className="auth-story-art" style={{ backgroundImage: `linear-gradient(180deg,rgba(16,20,33,.12),rgba(16,20,33,.86)),url(${heroImage})` }} /><div className="auth-story-content"><Badge tone="accent"><Sparkles size={13} /> Your next step, made clearer</Badge><h2>Good learning starts<br />with <em>good questions.</em></h2><p>Pick up where you left off. Your understanding is already moving forward.</p><div className="auth-story-stat"><span className="auth-stat-ring">72%</span><span><strong>Machine Learning</strong><small>mastery this week <b>+8%</b></small></span></div></div></div><div className="auth-form-side"><div className="auth-form-wrap"><span className="auth-icon"><LockKeyhole size={18} /></span><div className="section-eyebrow"><span /> YOUR STUDY SPACE</div><h1>Welcome back</h1><p className="auth-subtitle">Sign in to keep your learning in motion.</p><button type="button" className="google-button" onClick={() => toast('Google sign-in is a demo', 'Connect an authentication provider when a backend is added.', 'info')}><span className="google-g">G</span> Continue with Google</button><div className="auth-divider"><span />or continue with email<span /></div><form onSubmit={submit} className="form-stack"><Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /><Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /><div className="forgot-row"><span>At least 8 characters</span><button type="button" onClick={() => toast('Password reset', 'Password recovery is not connected in this frontend demo.', 'info')}>Forgot password?</button></div><Button type="submit" size="lg" className="auth-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={15} /></Button></form><p className="auth-switch">New to CampusAI? <Link to="/signup">Create an account</Link></p><p className="auth-privacy"><LockKeyhole size={12} /> Demo only — no real credentials are stored or sent.</p></div></div></div></div>;
}

const onboardingSteps = [
  { title: 'Your university', description: 'Where are you studying?', field: 'university' },
  { title: 'Your course', description: 'Choose your degree or program.', field: 'course' },
  { title: 'Your semester', description: 'We’ll tailor your study path.', field: 'semester' },
  { title: 'Your subjects', description: 'Pick what you’re learning right now.', field: 'subjects' },
  { title: 'Your daily goal', description: 'Set a study rhythm that feels realistic.', field: 'goal' },
  { title: 'Add your syllabus', description: 'Optional for now—you can add materials later.', field: 'upload' },
];

export function SignupPage() {
  const navigate = useNavigate();
  const { toast, setStudent } = useApp();
  const [stage, setStage] = useState<'account' | 'onboarding'>('account');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('Alex Morgan');
  const [email, setEmail] = useState('alex.morgan@university.example');
  const [password, setPassword] = useState('campusai-demo');
  const [university, setUniversity] = useState('University of Example');
  const [course, setCourse] = useState('B.Tech Computer Science');
  const [semester, setSemester] = useState('6');
  const [subjectsSelected, setSubjectsSelected] = useState(['Machine Learning', 'Database Systems']);
  const [goal, setGoal] = useState(90);
  const [fileName, setFileName] = useState('');
  const selectedCount = useMemo(() => subjectsSelected.length, [subjectsSelected]);
  const accountSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setBusy(true); try { const profile = await authService.signUp({ name, email, password, university, course, semester: Number(semester) || 6 }); setStudent(profile); setStage('onboarding'); } catch { toast('We couldn’t create your demo account', 'Please try again.', 'error'); } finally { setBusy(false); } };
  const finish = () => { setStudent({ id: 'alex-morgan', name: name || 'Alex Morgan', email, university, course, semester: Number(semester) || 6, dailyGoalMinutes: goal }); toast('Your CampusAI workspace is ready', 'We’ve shaped a first study plan around your goals.'); navigate('/dashboard'); };
  const toggleSubject = (subject: string) => setSubjectsSelected((current) => current.includes(subject) ? current.filter((item) => item !== subject) : [...current, subject]);
  return <div className="auth-page"><PublicHeader /><div className="signup-shell"><div className="signup-brand-panel"><div className="signup-orb" /><Badge tone="accent"><Sparkles size={13} /> A learning workspace that knows you</Badge><h1>Make every<br />study session <em>count.</em></h1><p>CampusAI helps you understand what you know, find your gaps, and spend your time where it matters.</p><div className="signup-check-list"><span><Check size={15} /> Your notes, organized</span><span><Check size={15} /> Your understanding, visible</span><span><Check size={15} /> Your next step, clear</span></div><div className="signup-brand-mark"><span className="brand-mark"><GraduationCap size={19} /><i /></span><strong>CampusAI</strong><small>Your AI Academic Copilot</small></div></div><div className="signup-form-panel"><div className="signup-form-wrap">{stage === 'account' ? <><div className="section-eyebrow"><span /> GET STARTED FREE</div><h2>Create your account</h2><p className="auth-subtitle">First, let’s make a home for your learning.</p><form onSubmit={accountSubmit} className="form-stack signup-fields"><Field label="Name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /><Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /><Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /><Field label="University" value={university} onChange={(event) => setUniversity(event.target.value)} required /><div className="signup-row-fields"><Field label="Course" value={course} onChange={(event) => setCourse(event.target.value)} required /><label className="field" htmlFor="signup-semester"><span className="field-label">Semester</span><select id="signup-semester" className="input" value={semester} onChange={(event) => setSemester(event.target.value)}>{Array.from({ length: 10 }, (_, index) => <option key={index + 1}>{index + 1}</option>)}</select></label></div><Button size="lg" type="submit" disabled={busy}>{busy ? 'Setting things up…' : 'Continue'} <ArrowRight size={15} /></Button></form><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p><p className="auth-privacy"><LockKeyhole size={12} /> Frontend demo only; no real account is created.</p></> : <><div className="onboarding-top"><div><div className="section-eyebrow"><span /> YOUR WORKSPACE</div><h2>{onboardingSteps[step].title}</h2><p className="auth-subtitle">{onboardingSteps[step].description}</p></div><span className="onboarding-count">0{step + 1}<i> / 06</i></span></div><div className="onboarding-progress" aria-label={`Step ${step + 1} of 6`}>{onboardingSteps.map((item, index) => <i key={item.field} className={index <= step ? 'done' : ''} />)}</div>
    <div className="onboarding-body">
      {step === 0 && <label className="field"><span className="field-label">University</span><input className="input" value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="Search university" /><small className="field-hint">Your academic context helps shape your study space.</small></label>}
      {step === 1 && <div className="onboarding-options">{['B.Tech Computer Science', 'B.Sc. Data Science', 'BBA', 'Other degree'].map((value) => <button key={value} type="button" className={`choice-card ${course === value ? 'selected' : ''}`} onClick={() => setCourse(value)}><span>{value}</span>{course === value && <Check size={16} />}</button>)}<Field label="Course name" value={course} onChange={(event) => setCourse(event.target.value)} /></div>}
      {step === 2 && <div className="semester-grid">{Array.from({ length: 8 }, (_, index) => String(index + 1)).map((value) => <button key={value} type="button" className={`semester-option ${semester === value ? 'selected' : ''}`} onClick={() => setSemester(value)}><small>SEMESTER</small><strong>{value.padStart(2, '0')}</strong>{semester === value && <Check size={13} />}</button>)}</div>}
      {step === 3 && <div className="subject-pick-grid">{['Machine Learning', 'Database Systems', 'Computer Networks', 'Statistics'].map((subject) => <button type="button" key={subject} onClick={() => toggleSubject(subject)} className={`subject-pick ${subjectsSelected.includes(subject) ? 'selected' : ''}`}><span className="subject-pick-icon"><BookOpen size={16} /></span><span>{subject}</span><i>{subjectsSelected.includes(subject) && <Check size={13} />}</i></button>)}<small className="field-hint">{selectedCount} subjects selected</small></div>}
      {step === 4 && <div className="goal-picker"><span className="goal-value">{goal}<small> min / day</small></span><input type="range" min="20" max="180" step="10" value={goal} onChange={(event) => setGoal(Number(event.target.value))} aria-label="Daily study goal in minutes" /><div><span>20 min</span><span>3 hours</span></div><p>A steady, realistic rhythm beats a perfect plan you can’t keep.</p></div>}
      {step === 5 && <label className="onboarding-upload" htmlFor="onboarding-file"><UploadCloud size={24} /><strong>{fileName || 'Upload your syllabus'}</strong><span>PDF, DOCX or TXT · Optional</span><input id="onboarding-file" type="file" accept=".pdf,.docx,.txt" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? '')} /><small>{fileName ? 'This upload is simulated in the frontend demo.' : 'You can always add course materials later.'}</small></label>}
    </div><div className="onboarding-actions">{step > 0 && <Button variant="ghost" onClick={() => setStep((current) => current - 1)} icon={<ChevronLeft size={15} />}>Back</Button>}<Button className="onboarding-next" onClick={() => step < onboardingSteps.length - 1 ? setStep((current) => current + 1) : finish()}>{step === onboardingSteps.length - 1 ? 'Finish setup' : 'Continue'} {step < onboardingSteps.length - 1 ? <ChevronRight size={15} /> : <Sparkles size={14} />}</Button></div></>}</div></div></div></div>;
}

export function NotFoundPage() {
  return <div className="not-found-page"><div className="not-found-mark"><GraduationCap size={24} /></div><span className="eyebrow">404 · PAGE NOT FOUND</span><h1>This page took a<br /><em>study break.</em></h1><p>That route isn’t in your CampusAI workspace. Let’s get you back to a clear next step.</p><Link className="btn btn-primary btn-lg" to="/dashboard">Go to dashboard <ArrowRight size={15} /></Link><Link className="not-found-home" to="/">Back to CampusAI home</Link></div>;
}
