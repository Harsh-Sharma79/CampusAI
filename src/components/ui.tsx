import { cloneElement, isValidElement, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type PropsWithChildren, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, Search, Sparkles, TriangleAlert, X } from 'lucide-react';
import type { ToastMessage } from '../types';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg'; icon?: ReactNode; }
export function Button({ variant = 'primary', size = 'md', icon, className = '', children, ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props}>{icon && <span className="btn-icon">{icon}</span>}{children}</button>;
}

export function Card({ children, className = '', ...props }: PropsWithChildren<{ id?: string; className?: string; 'aria-label'?: string }>) {
  return <div className={`card ${className}`} {...props}>{children}</div>;
}

export function Badge({ children, tone = 'neutral', className = '' }: PropsWithChildren<{ tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'; className?: string }>) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}

export function ProgressBar({ value, label, tone = 'accent', className = '' }: { value: number; label?: string; tone?: 'accent' | 'blue' | 'success' | 'warning'; className?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className={`progress-wrap ${className}`} aria-label={label ?? `${safe}% complete`} role="progressbar" aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100}>
    <div className="progress-track"><motion.div className={`progress-fill progress-${tone}`} initial={{ width: 0 }} animate={{ width: `${safe}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} /></div>
    {label && <span className="progress-label">{label}</span>}
  </div>;
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...props} />;
}

export function Textarea({ className = '', rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input ${className}`} rows={rows} {...props} />;
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> { label: string; hint?: string; }
export function Field({ label, hint, id, ...props }: FieldProps) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label className="field" htmlFor={fieldId}><span className="field-label">{label}</span><Input id={fieldId} {...props} />{hint && <span className="field-hint">{hint}</span>}</label>;
}

export type DropdownOption = string | { value: string; label: string };
interface DropdownProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
}
export function Dropdown({ value, onChange, options, className = '', ...props }: DropdownProps) {
  return <select className={`input select-input ${className}`} value={value} onChange={(event) => onChange(event.target.value)} {...props}>
    {options.map((option) => {
      const item = typeof option === 'string' ? { value: option, label: option } : option;
      return <option key={item.value} value={item.value}>{item.label}</option>;
    })}
  </select>;
}

export function SelectField({ label, value, onChange, options, id }: { label: string; value: string; onChange: (value: string) => void; options: DropdownOption[]; id?: string }) {
  const fieldId = id ?? `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label className="field" htmlFor={fieldId}><span className="field-label">{label}</span><Dropdown id={fieldId} value={value} onChange={onChange} options={options} /></label>;
}

export interface TabItem { value: string; label: string; count?: number; }
export function Tabs({ label, value, items, onChange, className = '' }: { label: string; value: string; items: TabItem[]; onChange: (value: string) => void; className?: string }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const moveFocus = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'Home' ? -index : event.key === 'End' ? items.length - 1 - index : 0;
    if (!offset && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = (index + offset + items.length) % items.length;
    refs.current[next]?.focus();
    onChange(items[next].value);
  };
  return <div className={className} role="tablist" aria-label={label}>{items.map((item, index) => <button key={item.value} ref={(node) => { refs.current[index] = node; }} type="button" role="tab" aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} className={value === item.value ? 'active' : ''} onClick={() => onChange(item.value)} onKeyDown={(event) => moveFocus(event, index)}>{item.label}{item.count !== undefined && <span className="filter-count">{item.count}</span>}</button>)}</div>;
}

export function Avatar({ name, initials, className = '', src }: { name: string; initials?: string; className?: string; src?: string }) {
  const label = initials ?? name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <span className={`avatar ${className}`} role="img" aria-label={name}>{src ? <img src={src} alt="" /> : label}</span>;
}

export function Tooltip({ content, children, disabled = false }: PropsWithChildren<{ content: string; disabled?: boolean }>) {
  const tooltipId = useId();
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, { 'aria-describedby': tooltipId })
    : <span tabIndex={0} aria-describedby={tooltipId}>{children}</span>;
  return <span className="tooltip-anchor">{trigger}<span id={tooltipId} role="tooltip" className={`tooltip-bubble ${disabled ? 'tooltip-hidden' : ''}`}>{content}</span></span>;
}

export function ChartCard({ title, badge, children, className = '' }: PropsWithChildren<{ title: string; badge?: ReactNode; className?: string }>) {
  return <Card className={`analytics-chart-card ${className}`}><div className="analytics-chart-header"><span>{title}</span>{badge}</div>{children}</Card>;
}

export function Toast({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  const Icon = message.tone === 'success' ? Check : message.tone === 'error' ? TriangleAlert : Info;
  return <motion.div className={`toast toast-${message.tone}`} role="status" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 10 }}>
    <span className="toast-icon"><Icon size={16} /></span>
    <span className="toast-copy"><strong>{message.title}</strong>{message.description && <small>{message.description}</small>}</span>
    <button type="button" className="icon-button toast-close" aria-label="Dismiss notification" onClick={onDismiss}><X size={15} /></button>
  </motion.div>;
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: PropsWithChildren<{ open: boolean; onClose: () => void; title: string; description?: string; size?: 'sm' | 'md' | 'lg' }>) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);
  return <AnimatePresence>{open && <motion.div className="modal-backdrop" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.section className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? 'modal-description' : undefined} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.985 }} transition={{ duration: 0.2 }}>
      <header className="modal-head"><div><h2 id="modal-title">{title}</h2>{description && <p id="modal-description">{description}</p>}</div><button ref={closeRef} type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>×</button></header>
      <div className="modal-body">{children}</div>
    </motion.section>
  </motion.div>}</AnimatePresence>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon">{icon ?? <Search size={20} />}</div><h3>{title}</h3><p>{description}</p>{action && <div className="empty-action">{action}</div>}</div>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

export function LoadingState({ message = 'CampusAI is thinking…' }: { message?: string }) {
  return <div className="loading-state"><span className="loading-spark"><Sparkles size={17} /></span><span>{message}</span><span className="thinking-dots" aria-label="Loading"><i /><i /><i /></span></div>;
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-title-row"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-title-action">{action}</div>}</div>;
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="section-title-row"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>;
}
