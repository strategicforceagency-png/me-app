import { cravatte, galateo, vestirsi } from "./content-a";
import { accessori, grooming, scarpe } from "./content-b";
import { inglese, vocabolario } from "./content-c";
import { coppia } from "./content-d";
import { pelletteria, profumi } from "./content-e";
import type { Course, Lesson } from "./types";

export const CORSI: Course[] = [inglese, vestirsi, galateo, coppia, vocabolario, cravatte, grooming, profumi, scarpe, accessori, pelletteria];

export const allLessons: { course: Course; lesson: Lesson }[] = CORSI.flatMap((c) => c.lezioni.map((l) => ({ course: c, lesson: l })));
export const lessonKey = (c: Course, l: Lesson) => `${c.id}/${l.id}`;
