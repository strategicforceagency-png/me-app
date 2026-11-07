import { cravatte, galateo, vestirsi } from "./content-a";
import { accessori, grooming, scarpe } from "./content-b";
import type { Course, Lesson } from "./types";

export const CORSI: Course[] = [vestirsi, galateo, cravatte, grooming, scarpe, accessori];

export const allLessons: { course: Course; lesson: Lesson }[] = CORSI.flatMap((c) => c.lezioni.map((l) => ({ course: c, lesson: l })));
export const lessonKey = (c: Course, l: Lesson) => `${c.id}/${l.id}`;
