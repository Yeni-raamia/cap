/* ==================================================================
 *  /api/training — Académie GRC.
 *  Apprenant : op "complete" (marque une leçon achevée).
 *  Formateur (manager+) : course/lesson create/update/delete.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  courseExists, createCourse, createLesson, deleteCourse, deleteLesson, importCourse,
  lessonExists, listCourses, listProgressFor, markLessonDone, updateCourse, updateLesson,
} from "@/lib/db/training";
import { logActivity } from "@/lib/db/admin";
import { LESSON_TYPES, type LessonType } from "@/lib/domain";

const canEdit = (role: string) => ["manager", "directeur", "admin"].includes(role);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  // ---- Apprenant : achever une leçon ----
  if (op === "complete") {
    const lessonId = String(body?.lessonId || "");
    if (!lessonExists(lessonId)) return NextResponse.json({ error: "Leçon introuvable." }, { status: 404 });
    const score = Number.isFinite(body?.score) ? Number(body.score) : 100;
    markLessonDone(user.id, lessonId, score);
    return NextResponse.json({ progress: listProgressFor(user.id) });
  }

  // ---- Formateur / admin : édition du contenu ----
  if (!canEdit(user.role)) return NextResponse.json({ error: "Édition réservée aux formateurs (manager/directeur/admin)." }, { status: 403 });

  const typeOf = (v: unknown): LessonType | undefined => (typeof v === "string" && LESSON_TYPES.includes(v as LessonType) ? (v as LessonType) : undefined);

  if (op === "course.import") {
    const course = body?.course;
    if (!course || typeof course !== "object" || !String(course?.title || "").trim()) {
      return NextResponse.json({ error: "JSON invalide : un objet parcours avec un « title » est attendu." }, { status: 400 });
    }
    if (course.lessons !== undefined && !Array.isArray(course.lessons)) {
      return NextResponse.json({ error: "JSON invalide : « lessons » doit être une liste." }, { status: 400 });
    }
    const res = importCourse(course, user.id, body?.track === "audit" ? "audit" : "grc");
    logActivity(user.id, "training.import", `${String(course.title)} (${res.lessons} leçons)`);
    return NextResponse.json({ courses: listCourses(), imported: res });
  } else if (op === "course.create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Titre du parcours requis." }, { status: 400 });
    createCourse({ title, description: String(body?.description || ""), category: String(body?.category || ""), icon: String(body?.icon || ""), badge: String(body?.badge || ""), track: body?.track === "audit" ? "audit" : "grc", createdBy: user.id });
    logActivity(user.id, "training.course", title);
  } else if (op === "course.update") {
    if (!courseExists(body?.id)) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });
    updateCourse(body.id, { title: typeof body?.title === "string" ? body.title.trim() : undefined, description: typeof body?.description === "string" ? body.description : undefined, category: typeof body?.category === "string" ? body.category : undefined, icon: typeof body?.icon === "string" ? body.icon : undefined, badge: typeof body?.badge === "string" ? body.badge : undefined, published: typeof body?.published === "boolean" ? body.published : undefined });
  } else if (op === "course.delete") {
    if (!courseExists(body?.id)) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });
    deleteCourse(body.id);
  } else if (op === "lesson.create") {
    if (!courseExists(body?.courseId)) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Titre de la leçon requis." }, { status: 400 });
    createLesson(body.courseId, { title, type: typeOf(body?.type), content: String(body?.content || ""), xp: Number(body?.xp), questions: Array.isArray(body?.questions) ? body.questions : undefined, steps: Array.isArray(body?.steps) ? body.steps : undefined, challengeHref: typeof body?.challengeHref === "string" ? body.challengeHref : undefined });
  } else if (op === "lesson.update") {
    if (!lessonExists(body?.id)) return NextResponse.json({ error: "Leçon introuvable." }, { status: 404 });
    updateLesson(body.id, { title: typeof body?.title === "string" ? body.title.trim() : undefined, type: typeOf(body?.type), content: typeof body?.content === "string" ? body.content : undefined, xp: Number.isFinite(body?.xp) ? Number(body.xp) : undefined, questions: Array.isArray(body?.questions) ? body.questions : undefined, steps: Array.isArray(body?.steps) ? body.steps : undefined, challengeHref: typeof body?.challengeHref === "string" ? body.challengeHref : undefined });
  } else if (op === "lesson.delete") {
    if (!lessonExists(body?.id)) return NextResponse.json({ error: "Leçon introuvable." }, { status: 404 });
    deleteLesson(body.id);
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ courses: listCourses() });
}
