"use client";

import { useMemo, useState } from "react";
import { FileJson, GraduationCap, Play, Plus, RotateCcw, Settings2 } from "lucide-react";
import { courseProgress, trainingLevel, trainingXp, TRAINING_LEVELS, type TrainingCourse } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { Ring } from "@/components/dataviz";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { LessonPlayer } from "@/components/LessonPlayer";
import { CourseEditorModal } from "@/components/CourseEditorModal";
import { ImportCourseModal } from "@/components/ImportCourseModal";

export function AcademieTab() {
  const { trainingCourses, trainingDone, me, demo } = useApp();
  const canEdit = !demo && (me.role === "manager" || me.role === "directeur" || me.role === "admin");
  const [playId, setPlayId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const doneIds = useMemo(() => new Set(trainingDone.map((d) => d.lessonId)), [trainingDone]);
  const courses = useMemo(() => [...trainingCourses].sort((a, b) => a.order - b.order).filter((c) => c.published || canEdit), [trainingCourses, canEdit]);

  const xp = useMemo(() => trainingXp(trainingCourses, trainingDone), [trainingCourses, trainingDone]);
  const lvl = trainingLevel(xp);
  const certifications = useMemo(
    () => courses.filter((c) => c.lessons.length > 0 && courseProgress(c, doneIds).pct === 100),
    [courses, doneIds]
  );

  const playing = playId ? trainingCourses.find((c) => c.id === playId) ?? null : null;
  const editing = editId ? trainingCourses.find((c) => c.id === editId) ?? null : null;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Académie GRC"
        subtitle="Un espace d'apprentissage ludique pour monter en compétence : leçons, quiz, études de cas décisionnelles et défis pratiques."
        right={canEdit ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditMode((v) => !v)} className={`inline-flex items-center gap-1.5 text-[13px] font-medium rounded-xl px-3 py-2 border ${editMode ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              <Settings2 size={15} /> {editMode ? "Terminer l'édition" : "Gérer le contenu"}
            </button>
            {editMode && (
              <>
                <button onClick={() => setImporting(true)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700 border border-emerald-200 rounded-xl px-3 py-2 hover:bg-emerald-50">
                  <FileJson size={15} /> Importer (JSON)
                </button>
                <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                  <Plus size={15} /> Nouveau parcours
                </button>
              </>
            )}
          </div>
        ) : undefined}
      />

      {/* Niveau de compétence */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Ring value={lvl.progressPct} size={76} stroke={8} color="#10b981"><span className="text-[22px]">{lvl.icon}</span></Ring>
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500">Niveau de compétence GRC</div>
            <div className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{lvl.name}</div>
            <div className="text-[12px] text-slate-500 mt-0.5">
              <b className="text-emerald-600">{xp} XP</b>
              {lvl.nextXp != null ? ` · ${lvl.nextXp - xp} XP avant « ${TRAINING_LEVELS[lvl.level + 1].name} »` : " · niveau maximal 🏆"}
            </div>
          </div>
          {certifications.length > 0 && (
            <div className="ml-auto text-right">
              <div className="text-[11px] text-slate-400 mb-1">Certifications ({certifications.length})</div>
              <div className="flex flex-wrap gap-1.5 justify-end max-w-xs">
                {certifications.map((c) => c.badge && <span key={c.id} className="text-[10px] font-medium text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">🏅 {c.badge}</span>)}
              </div>
            </div>
          )}
        </div>
      </Card>

      {courses.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Aucun parcours" subtitle={canEdit ? "Crée un premier parcours pour lancer l'Académie." : "Les parcours arrivent bientôt."} />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {courses.map((c) => (
            <CourseCard key={c.id} c={c} prog={courseProgress(c, doneIds)} editMode={editMode} onPlay={() => setPlayId(c.id)} onEdit={() => setEditId(c.id)} />
          ))}
        </div>
      )}

      {playing && <LessonPlayer course={playing} onClose={() => setPlayId(null)} />}
      {(creating || editing) && <CourseEditorModal course={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
      {importing && <ImportCourseModal onClose={() => setImporting(false)} />}
    </div>
  );
}

function CourseCard({ c, prog, editMode, onPlay, onEdit }: { c: TrainingCourse; prog: { done: number; total: number; pct: number }; editMode: boolean; onPlay: () => void; onEdit: () => void }) {
  const cta = prog.pct === 0 ? "Commencer" : prog.pct === 100 ? "Revoir" : "Continuer";
  return (
    <Card className="p-4 flex flex-col">
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none">{c.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-slate-400 uppercase">{c.category}</div>
          <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{c.title}{!c.published && <span className="text-[10px] text-amber-600 ml-1">· brouillon</span>}</div>
          <div className="text-[12px] text-slate-500 mt-0.5">{c.description}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>{c.lessons.length} leçon{c.lessons.length > 1 ? "s" : ""} · {prog.done}/{prog.total}</span>
          <span className="font-mono">{prog.pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${prog.pct === 100 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${prog.pct}%` }} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={onPlay} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-600 rounded-xl px-3.5 py-2 hover:bg-emerald-700">
          {prog.pct === 100 ? <RotateCcw size={14} /> : <Play size={14} />} {cta}
        </button>
        {prog.pct === 100 && c.badge && <span className="text-[11px] text-amber-700">🏅 {c.badge}</span>}
        {editMode && <button onClick={onEdit} className="ml-auto inline-flex items-center gap-1 text-[12px] text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50"><Settings2 size={13} /> Éditer</button>}
      </div>
    </Card>
  );
}
