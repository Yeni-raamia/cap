"use client";

import { useState } from "react";
import { Download, GraduationCap, Plus, Trash2, X } from "lucide-react";
import {
  LESSON_TYPE_META,
  LESSON_TYPES,
  TRAINING_CATEGORIES,
  type CaseStep,
  type LessonType,
  type QuizQuestion,
  type TrainingCourse,
  type TrainingLesson,
} from "@/lib/domain";
import { useApp } from "./app-context";

let seq = 0;
const tid = () => `n_${++seq}`;
const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

/** Éditeur d'un parcours : métadonnées + gestion des leçons (formateur/admin). */
export function CourseEditorModal({ course, creating, track = "grc", onClose }: { course: TrainingCourse | null; creating: boolean; track?: string; onClose: () => void }) {
  const { trainingCourses, trainingEdit } = useApp();
  const live = course ? trainingCourses.find((c) => c.id === course.id) ?? course : null;

  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [category, setCategory] = useState(course?.category ?? TRAINING_CATEGORIES[0]);
  const [icon, setIcon] = useState(course?.icon ?? "🎓");
  const [badge, setBadge] = useState(course?.badge ?? "");
  const [published, setPublished] = useState(course?.published ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<TrainingLesson | "new" | null>(null);

  const saveCourse = async () => {
    if (!title.trim()) return;
    setBusy(true); setErr(null);
    const payload = { title: title.trim(), description, category, icon, badge, published };
    const e = creating ? await trainingEdit("course.create", { ...payload, track }) : live ? await trainingEdit("course.update", { id: live.id, ...payload }) : "—";
    setBusy(false);
    if (e) setErr(e); else if (creating) onClose();
  };
  const removeCourse = async () => {
    if (!live || !window.confirm(`Supprimer le parcours « ${live.title} » et ses leçons ?`)) return;
    const e = await trainingEdit("course.delete", { id: live.id });
    if (!e) onClose();
  };
  const removeLesson = async (id: string) => {
    if (!window.confirm("Supprimer cette leçon ?")) return;
    await trainingEdit("lesson.delete", { id });
  };
  const exportJson = () => {
    if (!live) return;
    const data = { title: live.title, description: live.description, category: live.category, icon: live.icon, badge: live.badge, lessons: live.lessons.map((l) => ({ type: l.type, title: l.title, content: l.content, xp: l.xp, ...(l.questions.length ? { questions: l.questions } : {}), ...(l.steps.length ? { steps: l.steps } : {}), ...(l.challengeHref ? { challengeHref: l.challengeHref } : {}) })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${live.ref}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <GraduationCap size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouveau parcours" : live?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Éditeur de contenu</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div>
              <label className={labelCls}>Icône</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={2} className={`${inputCls} w-16 text-center text-lg`} />
            </div>
            <div>
              <label className={labelCls}>Titre du parcours</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Analyse de risque…" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>{TRAINING_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Certification (badge à 100 %)</label>
              <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Ex. Analyste de risque certifié" className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-slate-600">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4 accent-emerald-600" /> Publié (visible des apprenants)
          </label>
          <div className="flex items-center gap-2">
            <button onClick={saveCourse} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50">{creating ? "Créer le parcours" : "Enregistrer"}</button>
            {!creating && live && <button onClick={exportJson} className="inline-flex items-center gap-1 text-[12px] text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"><Download size={14} /> Exporter JSON</button>}
            {!creating && live && <button onClick={removeCourse} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer le parcours</button>}
          </div>

          {/* Leçons (édition possible une fois le parcours créé) */}
          {!creating && live && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-medium text-slate-500 uppercase">Leçons ({live.lessons.length})</div>
                <button onClick={() => setEditingLesson("new")} className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 hover:underline"><Plus size={14} /> Ajouter une leçon</button>
              </div>
              <div className="space-y-1.5">
                {live.lessons.length === 0 && <div className="text-[12px] text-slate-400">Aucune leçon. Ajoutez-en une.</div>}
                {live.lessons.map((l) => (
                  <div key={l.id} className="flex items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800 px-2.5 py-1.5">
                    <span className="text-[13px]">{LESSON_TYPE_META[l.type].icon}</span>
                    <button onClick={() => setEditingLesson(l)} className="flex-1 min-w-0 text-left text-[12.5px] text-slate-700 dark:text-slate-200 truncate hover:text-emerald-600">{l.title}</button>
                    <span className="text-[10px] text-slate-400">{LESSON_TYPE_META[l.type].label} · {l.xp} XP</span>
                    <button onClick={() => removeLesson(l.id)} className="text-slate-300 hover:text-rose-600" aria-label="Supprimer"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingLesson && live && (
        <LessonEditor courseId={live.id} lesson={editingLesson === "new" ? null : editingLesson} onClose={() => setEditingLesson(null)} />
      )}
    </div>
  );
}

/* Éditeur d'une leçon (tous types). */
function LessonEditor({ courseId, lesson, onClose }: { courseId: string; lesson: TrainingLesson | null; onClose: () => void }) {
  const { trainingEdit } = useApp();
  const [type, setType] = useState<LessonType>(lesson?.type ?? "lesson");
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [xp, setXp] = useState(lesson?.xp ?? 20);
  const [content, setContent] = useState(lesson?.content ?? "");
  const [href, setHref] = useState(lesson?.challengeHref ?? "");
  const [questions, setQuestions] = useState<QuizQuestion[]>(lesson?.questions ?? []);
  const [steps, setSteps] = useState<CaseStep[]>(lesson?.steps ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true); setErr(null);
    const payload = { title: title.trim(), type, xp: Number(xp) || 20, content, challengeHref: href, questions, steps };
    const e = lesson ? await trainingEdit("lesson.update", { id: lesson.id, ...payload }) : await trainingEdit("lesson.create", { courseId, ...payload });
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex-1 text-[15px] font-semibold text-slate-800 dark:text-slate-100">{lesson ? "Modifier la leçon" : "Nouvelle leçon"}</div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as LessonType)} className={inputCls}>
                {LESSON_TYPES.map((t) => <option key={t} value={t}>{LESSON_TYPE_META[t].icon} {LESSON_TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>XP</label>
              <input type="number" value={xp} onChange={(e) => setXp(Number(e.target.value))} className={`${inputCls} w-20`} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Titre</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>{type === "challenge" ? "Consigne du défi" : type === "case" ? "Mise en situation" : "Contenu"}</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={type === "lesson" ? 6 : 3} className={inputCls} />
          </div>

          {type === "challenge" && (
            <div>
              <label className={labelCls}>Lien vers un module (facultatif)</label>
              <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/grc?tab=risques" className={inputCls} />
            </div>
          )}

          {type === "quiz" && <QuizEditor questions={questions} setQuestions={setQuestions} />}
          {type === "case" && <CaseEditor steps={steps} setSteps={setSteps} />}
        </div>
        <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50">Enregistrer la leçon</button>
        </div>
      </div>
    </div>
  );
}

function QuizEditor({ questions, setQuestions }: { questions: QuizQuestion[]; setQuestions: (q: QuizQuestion[]) => void }) {
  const add = () => setQuestions([...questions, { id: tid(), prompt: "", options: ["", ""], correct: 0, explanation: "" }]);
  const patch = (i: number, p: Partial<QuizQuestion>) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...p } : q)));
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <div className="text-[11px] font-medium text-slate-500 uppercase">Questions ({questions.length})</div>
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-lg border border-slate-100 dark:border-slate-800 p-2 space-y-1.5">
          <div className="flex gap-2">
            <input value={q.prompt} onChange={(e) => patch(i, { prompt: e.target.value })} placeholder="Question…" className={`${inputCls} flex-1`} />
            <button onClick={() => setQuestions(questions.filter((_, j) => j !== i))} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>
          </div>
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input type="radio" checked={q.correct === oi} onChange={() => patch(i, { correct: oi })} className="accent-emerald-600" title="Bonne réponse" />
              <input value={opt} onChange={(e) => patch(i, { options: q.options.map((o, j) => (j === oi ? e.target.value : o)) })} placeholder={`Option ${oi + 1}`} className={`${inputCls} flex-1 text-[12px] py-1`} />
              {q.options.length > 2 && <button onClick={() => patch(i, { options: q.options.filter((_, j) => j !== oi) })} className="text-slate-300 hover:text-rose-600"><X size={13} /></button>}
            </div>
          ))}
          <div className="flex items-center gap-2">
            {q.options.length < 5 && <button onClick={() => patch(i, { options: [...q.options, ""] })} className="text-[11px] text-emerald-700 hover:underline">+ option</button>}
          </div>
          <input value={q.explanation} onChange={(e) => patch(i, { explanation: e.target.value })} placeholder="Explication (le « pourquoi »)…" className={`${inputCls} text-[12px] py-1`} />
        </div>
      ))}
      <button onClick={add} className="text-[12px] font-medium text-emerald-700 hover:underline">+ Ajouter une question</button>
    </div>
  );
}

function CaseEditor({ steps, setSteps }: { steps: CaseStep[]; setSteps: (s: CaseStep[]) => void }) {
  const add = () => setSteps([...steps, { id: tid(), prompt: "", options: [{ label: "", feedback: "", score: 100 }, { label: "", feedback: "", score: 0 }] }]);
  const patch = (i: number, p: Partial<CaseStep>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...p } : s)));
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
      <div className="text-[11px] font-medium text-slate-500 uppercase">Étapes décisionnelles ({steps.length})</div>
      {steps.map((s, i) => (
        <div key={s.id} className="rounded-lg border border-slate-100 dark:border-slate-800 p-2 space-y-1.5">
          <div className="flex gap-2">
            <input value={s.prompt} onChange={(e) => patch(i, { prompt: e.target.value })} placeholder="Question de l'étape…" className={`${inputCls} flex-1`} />
            <button onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="text-slate-300 hover:text-rose-600"><Trash2 size={14} /></button>
          </div>
          {s.options.map((o, oi) => (
            <div key={oi} className="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
              <input value={o.label} onChange={(e) => patch(i, { options: s.options.map((x, j) => (j === oi ? { ...x, label: e.target.value } : x)) })} placeholder="Choix…" className={`${inputCls} text-[12px] py-1`} />
              <input value={o.feedback} onChange={(e) => patch(i, { options: s.options.map((x, j) => (j === oi ? { ...x, feedback: e.target.value } : x)) })} placeholder="Retour…" className={`${inputCls} text-[12px] py-1`} />
              <input type="number" min={0} max={100} value={o.score} onChange={(e) => patch(i, { options: s.options.map((x, j) => (j === oi ? { ...x, score: Number(e.target.value) } : x)) })} title="Qualité (0–100)" className={`${inputCls} w-14 text-[12px] py-1`} />
              {s.options.length > 2 && <button onClick={() => patch(i, { options: s.options.filter((_, j) => j !== oi) })} className="text-slate-300 hover:text-rose-600"><X size={13} /></button>}
            </div>
          ))}
          <button onClick={() => patch(i, { options: [...s.options, { label: "", feedback: "", score: 50 }] })} className="text-[11px] text-emerald-700 hover:underline">+ choix</button>
        </div>
      ))}
      <button onClick={add} className="text-[12px] font-medium text-emerald-700 hover:underline">+ Ajouter une étape</button>
    </div>
  );
}
