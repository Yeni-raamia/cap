/* ==================================================================
 *  lib/db/training.ts — Académie GRC : parcours, leçons, progression.
 *  Le curriculum expert est semé automatiquement si la base est vide.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { LESSON_TYPES, type LessonType, type TrainingCourse, type TrainingDone, type TrainingLesson } from "@/lib/domain";
import { CURRICULUM } from "@/lib/data/trainingCurriculum";

const now = () => new Date().toISOString();

interface CourseRow {
  id: string; ref: string; title: string; description: string; category: string;
  icon: string; badge: string; ordre: number; published: number;
  created_by: string | null; created_at: string; updated_at: string;
}
interface LessonRow {
  id: string; course_id: string; ordre: number; type: string; title: string; content: string; xp: number; payload: string;
}

function mapLesson(r: LessonRow): TrainingLesson {
  let payload: { questions?: unknown; steps?: unknown; challengeHref?: unknown } = {};
  try { payload = JSON.parse(r.payload || "{}"); } catch { payload = {}; }
  return {
    id: r.id,
    courseId: r.course_id,
    order: r.ordre,
    type: (LESSON_TYPES.includes(r.type as LessonType) ? r.type : "lesson") as LessonType,
    title: r.title,
    content: r.content,
    xp: r.xp,
    questions: Array.isArray(payload.questions) ? (payload.questions as TrainingLesson["questions"]) : [],
    steps: Array.isArray(payload.steps) ? (payload.steps as TrainingLesson["steps"]) : [],
    challengeHref: typeof payload.challengeHref === "string" ? payload.challengeHref : "",
  };
}

function mapCourse(r: CourseRow, lessons: TrainingLesson[]): TrainingCourse {
  return {
    id: r.id, ref: r.ref, title: r.title, description: r.description, category: r.category,
    icon: r.icon, badge: r.badge, order: r.ordre, published: r.published === 1, lessons,
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

const lessonPayload = (l: Partial<TrainingLesson>) => JSON.stringify({ questions: l.questions ?? [], steps: l.steps ?? [], challengeHref: l.challengeHref ?? "" });

function nextRef(db = getDb()): string {
  const prefix = `ACAD-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from training_courses where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

/** Sème le curriculum expert si aucun parcours n'existe (idempotent). */
function ensureCurriculum(): void {
  const db = getDb();
  const n = (db.prepare("select count(*) c from training_courses").get() as { c: number }).c;
  if (n > 0) return;
  const insC = db.prepare("insert into training_courses (id, ref, title, description, category, icon, badge, ordre, published, created_by) values (?,?,?,?,?,?,?,?,1,null)");
  const insL = db.prepare("insert into training_lessons (id, course_id, ordre, type, title, content, xp, payload) values (?,?,?,?,?,?,?,?)");
  const year = new Date().getFullYear();
  const tx = db.transaction(() => {
    CURRICULUM.forEach((c, ci) => {
      const cid = randomUUID();
      insC.run(cid, `ACAD-${year}-${String(ci + 1).padStart(3, "0")}`, c.title, c.description, c.category, c.icon, c.badge, ci);
      c.lessons.forEach((l, li) =>
        insL.run(randomUUID(), cid, li, l.type, l.title, l.content, l.xp, JSON.stringify({ questions: l.questions ?? [], steps: l.steps ?? [], challengeHref: l.challengeHref ?? "" }))
      );
    });
  });
  tx();
}

export function listCourses(): TrainingCourse[] {
  ensureCurriculum();
  const db = getDb();
  const courses = db.prepare("select * from training_courses order by ordre, created_at").all() as CourseRow[];
  const lessons = db.prepare("select * from training_lessons order by ordre, rowid").all() as LessonRow[];
  const byCourse = new Map<string, TrainingLesson[]>();
  lessons.forEach((l) => byCourse.set(l.course_id, [...(byCourse.get(l.course_id) ?? []), mapLesson(l)]));
  return courses.map((c) => mapCourse(c, byCourse.get(c.id) ?? []));
}

export function getCourse(id: string): TrainingCourse | null {
  const db = getDb();
  const c = db.prepare("select * from training_courses where id=?").get(id) as CourseRow | undefined;
  if (!c) return null;
  const lessons = (db.prepare("select * from training_lessons where course_id=? order by ordre, rowid").all(id) as LessonRow[]).map(mapLesson);
  return mapCourse(c, lessons);
}
export const courseExists = (id: string) => Boolean(getDb().prepare("select 1 from training_courses where id=?").get(id));

/* ---------- Progression de l'apprenant ---------- */
export function listProgressFor(userId: string): TrainingDone[] {
  return (getDb().prepare("select lesson_id, score, completed_at from training_progress where user_id=?").all(userId) as { lesson_id: string; score: number; completed_at: string }[])
    .map((r) => ({ lessonId: r.lesson_id, score: r.score, completedAt: new Date(r.completed_at) }));
}
export function markLessonDone(userId: string, lessonId: string, score: number): void {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  getDb().prepare(
    "insert into training_progress (id, user_id, lesson_id, score, completed_at) values (?,?,?,?,?) " +
    "on conflict(user_id, lesson_id) do update set score=max(training_progress.score, excluded.score), completed_at=excluded.completed_at"
  ).run(randomUUID(), userId, lessonId, s, now());
}
export const lessonExists = (id: string) => Boolean(getDb().prepare("select 1 from training_lessons where id=?").get(id));

/* ---------- Édition (formateur / admin) ---------- */
interface CourseFields { title?: string; description?: string; category?: string; icon?: string; badge?: string; published?: boolean }
export function createCourse(input: CourseFields & { title: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  const ordre = (db.prepare("select coalesce(max(ordre),-1)+1 n from training_courses").get() as { n: number }).n;
  db.prepare("insert into training_courses (id, ref, title, description, category, icon, badge, ordre, published, created_by) values (?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.title, input.description ?? "", input.category ?? "", input.icon || "🎓", input.badge ?? "", ordre, input.published === false ? 0 : 1, input.createdBy
  );
  return id;
}
export function updateCourse(id: string, f: CourseFields): void {
  const db = getDb();
  const cur = db.prepare("select * from training_courses where id=?").get(id) as CourseRow | undefined;
  if (!cur) return;
  db.prepare("update training_courses set title=?, description=?, category=?, icon=?, badge=?, published=?, updated_at=? where id=?").run(
    f.title ?? cur.title, f.description !== undefined ? f.description : cur.description, f.category !== undefined ? f.category : cur.category,
    f.icon || cur.icon, f.badge !== undefined ? f.badge : cur.badge, f.published !== undefined ? (f.published ? 1 : 0) : cur.published, now(), id
  );
}
export function deleteCourse(id: string): void {
  const db = getDb();
  db.prepare("delete from training_lessons where course_id=?").run(id);
  db.prepare("delete from training_courses where id=?").run(id);
}

interface LessonFields { type?: LessonType; title?: string; content?: string; xp?: number; questions?: TrainingLesson["questions"]; steps?: TrainingLesson["steps"]; challengeHref?: string }
export function createLesson(courseId: string, input: LessonFields & { title: string }): string {
  const id = randomUUID();
  const db = getDb();
  const ordre = (db.prepare("select coalesce(max(ordre),-1)+1 n from training_lessons where course_id=?").get(courseId) as { n: number }).n;
  db.prepare("insert into training_lessons (id, course_id, ordre, type, title, content, xp, payload) values (?,?,?,?,?,?,?,?)").run(
    id, courseId, ordre, LESSON_TYPES.includes(input.type as LessonType) ? input.type : "lesson", input.title, input.content ?? "",
    Number.isFinite(input.xp) ? input.xp : 20, lessonPayload(input)
  );
  db.prepare("update training_courses set updated_at=? where id=?").run(now(), courseId);
  return id;
}
export function updateLesson(id: string, input: LessonFields): void {
  const db = getDb();
  const cur = db.prepare("select * from training_lessons where id=?").get(id) as LessonRow | undefined;
  if (!cur) return;
  const merged = mapLesson(cur);
  db.prepare("update training_lessons set type=?, title=?, content=?, xp=?, payload=? where id=?").run(
    LESSON_TYPES.includes(input.type as LessonType) ? input.type : cur.type,
    input.title ?? cur.title,
    input.content !== undefined ? input.content : cur.content,
    Number.isFinite(input.xp) ? input.xp : cur.xp,
    lessonPayload({
      questions: input.questions ?? merged.questions,
      steps: input.steps ?? merged.steps,
      challengeHref: input.challengeHref !== undefined ? input.challengeHref : merged.challengeHref,
    }),
    id
  );
}
export function deleteLesson(id: string): void {
  getDb().prepare("delete from training_lessons where id=?").run(id);
}
