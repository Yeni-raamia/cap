"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Check, CheckCircle2, ExternalLink, RotateCcw, X } from "lucide-react";
import { courseProgress, LESSON_TYPE_META, type TrainingCourse, type TrainingLesson } from "@/lib/domain";
import { useApp } from "./app-context";
import { fireConfetti } from "@/lib/confetti";

/** Lecteur de parcours : liste des leçons + rendu/jeu de la leçon courante. */
export function LessonPlayer({ course, onClose }: { course: TrainingCourse; onClose: () => void }) {
  const { trainingDone, completeLesson } = useApp();
  const doneIds = useMemo(() => new Set(trainingDone.map((d) => d.lessonId)), [trainingDone]);
  const scoreById = useMemo(() => new Map(trainingDone.map((d) => [d.lessonId, d.score])), [trainingDone]);
  const firstUndone = course.lessons.findIndex((l) => !doneIds.has(l.id));
  const [idx, setIdx] = useState(firstUndone >= 0 ? firstUndone : 0);
  const lesson = course.lessons[idx];
  const prog = courseProgress(course, doneIds);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl my-6 max-h-[94vh] overflow-hidden flex flex-col animate-pop" onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-2xl">{course.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 truncate">{course.title}</div>
            <div className="text-[11px] text-slate-400">{prog.done}/{prog.total} leçons · {prog.pct}%{prog.pct === 100 && course.badge ? ` · 🏅 ${course.badge}` : ""}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 grid md:grid-cols-[220px_1fr] overflow-hidden">
          {/* Sommaire */}
          <div className="border-r border-slate-100 dark:border-slate-800 overflow-y-auto p-2 hidden md:block bg-slate-50/50 dark:bg-slate-900">
            {course.lessons.map((l, i) => {
              const done = doneIds.has(l.id);
              return (
                <button key={l.id} onClick={() => setIdx(i)} className={`w-full text-left rounded-lg px-2.5 py-2 mb-0.5 flex items-center gap-2 ${i === idx ? "bg-white dark:bg-slate-800 shadow-sm" : "hover:bg-white/60 dark:hover:bg-slate-800/50"}`}>
                  <span className={`h-5 w-5 shrink-0 rounded-full grid place-items-center text-[10px] ${done ? "bg-emerald-500 text-white" : "border border-slate-300 text-slate-400"}`}>{done ? <Check size={12} /> : i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12px] text-slate-700 dark:text-slate-200 truncate">{l.title}</span>
                    <span className="text-[10px] text-slate-400">{LESSON_TYPE_META[l.type].icon} {LESSON_TYPE_META[l.type].label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Contenu de la leçon */}
          <div className="overflow-y-auto p-5">
            {lesson ? (
              <LessonView
                key={lesson.id}
                lesson={lesson}
                alreadyScore={scoreById.get(lesson.id)}
                onComplete={async (score) => {
                  const wasDone = doneIds.has(lesson.id);
                  await completeLesson(lesson.id, score);
                  if (!wasDone && score >= 60) fireConfetti();
                }}
                onNext={idx < course.lessons.length - 1 ? () => setIdx(idx + 1) : undefined}
              />
            ) : (
              <div className="text-[13px] text-slate-400">Ce parcours n&apos;a pas encore de leçon.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonView({ lesson, alreadyScore, onComplete, onNext }: { lesson: TrainingLesson; alreadyScore: number | undefined; onComplete: (score: number) => void; onNext?: () => void }) {
  const meta = LESSON_TYPE_META[lesson.type];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${meta.tone}`}>{meta.icon} {meta.label}</span>
        <span className="text-[10px] text-slate-400">+{lesson.xp} XP</span>
        {alreadyScore !== undefined && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600"><CheckCircle2 size={12} /> Fait · {alreadyScore}%</span>}
      </div>
      <h3 className="text-[18px] font-bold text-slate-800 dark:text-slate-100 mb-3">{lesson.title}</h3>

      {lesson.type === "lesson" && <LessonText lesson={lesson} onComplete={onComplete} onNext={onNext} />}
      {lesson.type === "quiz" && <QuizView lesson={lesson} onComplete={onComplete} onNext={onNext} />}
      {lesson.type === "case" && <CaseView lesson={lesson} onComplete={onComplete} onNext={onNext} />}
      {lesson.type === "challenge" && <ChallengeView lesson={lesson} onComplete={onComplete} onNext={onNext} />}
    </div>
  );
}

const Prose = ({ text }: { text: string }) => (
  <div className="text-[13.5px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{text}</div>
);
const NextBtn = ({ onNext }: { onNext?: () => void }) =>
  onNext ? (
    <button onClick={onNext} className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-700">Leçon suivante <ArrowRight size={14} /></button>
  ) : null;

function LessonText({ lesson, onComplete, onNext }: { lesson: TrainingLesson; onComplete: (s: number) => void; onNext?: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-4">
      <Prose text={lesson.content} />
      <div className="flex items-center gap-3">
        <button onClick={() => { setDone(true); onComplete(100); }} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-600 rounded-xl px-4 py-2 hover:bg-emerald-700"><Check size={15} /> {done ? "Marqué comme lu" : "Marquer comme lu"}</button>
        {done && <NextBtn onNext={onNext} />}
      </div>
    </div>
  );
}

function QuizView({ lesson, onComplete, onNext }: { lesson: TrainingLesson; onComplete: (s: number) => void; onNext?: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const total = lesson.questions.length;
  const correct = lesson.questions.filter((q) => answers[q.id] === q.correct).length;
  const score = total ? Math.round((correct / total) * 100) : 100;

  return (
    <div className="space-y-4">
      {lesson.content && <Prose text={lesson.content} />}
      <div className="space-y-4">
        {lesson.questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-[13.5px] font-medium text-slate-800 dark:text-slate-100 mb-2">{qi + 1}. {q.prompt}</div>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => {
                const chosen = answers[q.id] === oi;
                const isCorrect = oi === q.correct;
                const tone = submitted
                  ? isCorrect ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10" : chosen ? "border-rose-300 bg-rose-50 dark:bg-rose-500/10" : "border-slate-200"
                  : chosen ? "border-violet-400 bg-violet-50 dark:bg-violet-500/10" : "border-slate-200 hover:border-slate-300";
                return (
                  <button key={oi} disabled={submitted} onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} className={`w-full text-left text-[13px] rounded-lg border px-3 py-1.5 flex items-center gap-2 ${tone}`}>
                    <span className="flex-1">{opt}</span>
                    {submitted && isCorrect && <Check size={14} className="text-emerald-600" />}
                    {submitted && chosen && !isCorrect && <X size={14} className="text-rose-600" />}
                  </button>
                );
              })}
            </div>
            {submitted && q.explanation && <div className="mt-2 text-[12px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-1.5">💡 {q.explanation}</div>}
          </div>
        ))}
      </div>
      {!submitted ? (
        <button onClick={() => { setSubmitted(true); onComplete(score); }} disabled={Object.keys(answers).length < total} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-violet-600 rounded-xl px-4 py-2 hover:bg-violet-700 disabled:opacity-40">Valider mes réponses</button>
      ) : (
        <div className="flex items-center gap-3">
          <div className={`text-[14px] font-bold ${score >= 60 ? "text-emerald-600" : "text-amber-600"}`}>Score : {correct}/{total} · {score}%</div>
          <button onClick={() => { setSubmitted(false); setAnswers({}); }} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-700"><RotateCcw size={13} /> Recommencer</button>
          <NextBtn onNext={onNext} />
        </div>
      )}
    </div>
  );
}

function CaseView({ lesson, onComplete, onNext }: { lesson: TrainingLesson; onComplete: (s: number) => void; onNext?: () => void }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const steps = lesson.steps;
  const current = steps[step];
  const finished = step >= steps.length;
  const avg = picks.length ? Math.round(picks.reduce((a, s) => a + s, 0) / picks.length) : 0;

  const choose = (score: number) => {
    const next = [...picks, score];
    setPicks(next);
  };
  const chosenScore = picks[step];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3"><Prose text={lesson.content} /></div>

      {!finished && current && (
        <div>
          <div className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 mb-2">Étape {step + 1}/{steps.length} — {current.prompt}</div>
          <div className="space-y-1.5">
            {current.options.map((opt, oi) => {
              const picked = chosenScore !== undefined;
              const isThis = picked && picks[step] === opt.score; // approx : score identifie le choix
              return (
                <div key={oi}>
                  <button disabled={picked} onClick={() => choose(opt.score)} className={`w-full text-left text-[13px] rounded-lg border px-3 py-2 ${picked ? (opt.score >= 70 ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10" : opt.score <= 30 ? "border-rose-200 bg-rose-50/60 dark:bg-rose-500/10" : "border-amber-200 bg-amber-50/60") : "border-slate-200 hover:border-slate-300"}`}>
                    {opt.label}
                  </button>
                  {picked && isThis && <div className="mt-1 text-[12px] text-slate-600 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-1.5">{opt.score >= 70 ? "✅" : opt.score <= 30 ? "⚠️" : "🟡"} {opt.feedback} <span className="text-slate-400">({opt.score}/100)</span></div>}
                </div>
              );
            })}
          </div>
          {chosenScore !== undefined && (
            <button onClick={() => { const ns = step + 1; setStep(ns); if (ns >= steps.length) onComplete(Math.round([...picks].reduce((a, s) => a + s, 0) / picks.length)); }} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-white bg-amber-600 rounded-xl px-4 py-2 hover:bg-amber-700">
              {step + 1 >= steps.length ? "Terminer l'étude de cas" : "Étape suivante"} <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {finished && (
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center gap-1.5 text-[14px] font-bold ${avg >= 60 ? "text-emerald-600" : "text-amber-600"}`}><Award size={16} /> Décision globale : {avg}%</div>
          <button onClick={() => { setStep(0); setPicks([]); }} className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-700"><RotateCcw size={13} /> Rejouer</button>
          <NextBtn onNext={onNext} />
        </div>
      )}
    </div>
  );
}

function ChallengeView({ lesson, onComplete, onNext }: { lesson: TrainingLesson; onComplete: (s: number) => void; onNext?: () => void }) {
  const [done, setDone] = useState(false);
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3"><Prose text={lesson.content} /></div>
      {lesson.challengeHref && (
        <Link href={lesson.challengeHref} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700 border border-emerald-300 rounded-xl px-4 py-2 hover:bg-emerald-50"><ExternalLink size={15} /> Ouvrir le module concerné</Link>
      )}
      <div className="flex items-center gap-3">
        <button onClick={() => { setDone(true); onComplete(100); }} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-600 rounded-xl px-4 py-2 hover:bg-emerald-700"><Check size={15} /> {done ? "Défi validé" : "J'ai réalisé le défi"}</button>
        {done && <NextBtn onNext={onNext} />}
      </div>
    </div>
  );
}
