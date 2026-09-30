import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { studyWeek } from '../data/mockData';
import type { Subject, StudyDay } from '../types';

const axisProps = { tickLine: false, axisLine: false, tick: { fill: 'var(--muted)', fontSize: 11 }, dy: 8 };
const tooltipStyle = { background: 'var(--surface-raised)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-md)', color: 'var(--ink)', fontSize: 12 };

export function WeeklyStudyChart({ data = studyWeek, compact = false }: { data?: StudyDay[]; compact?: boolean }) {
  return <div className={`chart-canvas ${compact ? 'chart-compact' : ''}`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 5, left: -24, bottom: 0 }}>
    <defs><linearGradient id="studyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} /><stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} /></linearGradient></defs>
    <CartesianGrid vertical={false} stroke="var(--line-soft)" strokeDasharray="3 5" /><XAxis dataKey="day" {...axisProps} /><YAxis tickFormatter={(value: number) => `${value}h`} {...axisProps} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value} hrs`, 'Study time']} cursor={{ stroke: 'var(--line)' }} /><Area type="monotone" dataKey="hours" stroke="var(--accent)" strokeWidth={2.5} fill="url(#studyFill)" activeDot={{ r: 5, strokeWidth: 3, stroke: 'var(--surface)' }} />
  </AreaChart></ResponsiveContainer></div>;
}

export function MasteryChart({ data = studyWeek }: { data?: StudyDay[] }) {
  return <div className="chart-canvas"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 12, right: 8, left: -24, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line-soft)" strokeDasharray="3 5" /><XAxis dataKey="day" {...axisProps} /><YAxis domain={[45, 90]} tickFormatter={(value: number) => `${value}%`} {...axisProps} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, 'Mastery']} /><Line type="monotone" dataKey="mastery" stroke="var(--accent)" strokeWidth={2.6} dot={{ r: 3, fill: 'var(--surface)', strokeWidth: 2, stroke: 'var(--accent)' }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div>;
}

export function QuizPerformanceChart({ data = studyWeek }: { data?: StudyDay[] }) {
  return <div className="chart-canvas"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 10, right: 6, left: -24, bottom: 0 }}><defs><linearGradient id="quizFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--blue)" stopOpacity={0.22} /><stop offset="100%" stopColor="var(--blue)" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line-soft)" strokeDasharray="3 5" /><XAxis dataKey="day" {...axisProps} /><YAxis domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} {...axisProps} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, 'Quiz accuracy']} /><Area type="monotone" dataKey="quiz" stroke="var(--blue)" strokeWidth={2.5} fill="url(#quizFill)" activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer></div>;
}

export function SubjectPerformanceChart({ data }: { data: Subject[] }) {
  const chartData = data.map((subject) => ({ name: subject.name.replace(' Systems', ''), mastery: subject.mastery }));
  return <div className="chart-canvas chart-subject"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}><CartesianGrid horizontal={false} stroke="var(--line-soft)" strokeDasharray="3 5" /><XAxis type="number" domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} {...axisProps} /><YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, 'Mastery']} /><Bar dataKey="mastery" fill="var(--accent)" radius={[0, 6, 6, 0]} barSize={12} background={{ fill: 'var(--line-soft)', radius: 6 }} /></BarChart></ResponsiveContainer></div>;
}
