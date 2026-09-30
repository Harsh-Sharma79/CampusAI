import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/errors.js';

export type OnboardingInput = {
  name?: string;
  university?: string;
  course?: string;
  semester?: string;
  subjects?: string[];
  preferredStudyMinutes?: number;
  examDates?: Array<{ title: string; examAt: string; subjectName?: string; importance?: number }>;
};

export async function getOnboarding(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, university: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } }, semester: { select: { id: true, name: true } },
      onboardingComplete: true, settings: true,
      exams: { where: { examAt: { gte: new Date() } }, orderBy: { examAt: 'asc' }, select: { id: true, title: true, examAt: true, importance: true, subject: { select: { name: true } } } },
      subjects: { orderBy: { name: 'asc' }, select: { id: true, name: true, importance: true } }
    }
  });
}

export async function saveOnboarding(userId: string, input: OnboardingInput) {
  if (input.subjects?.length && (!input.university || !input.course)) {
    throw new ApiError(400, 'ACADEMIC_PARENT_REQUIRED', 'University and course are required when adding subjects');
  }
  return prisma.$transaction(async (tx) => {
    const data: { name?: string; universityId?: string; courseId?: string; semesterId?: string; onboardingComplete: boolean } = { onboardingComplete: true };
    if (input.name) data.name = input.name;

    if (input.university && input.course) {
      const university = await tx.university.upsert({
        where: { ownerId_name: { ownerId: userId, name: input.university } },
        create: { ownerId: userId, name: input.university },
        update: {}
      });
      const course = await tx.course.upsert({
        where: { universityId_name: { universityId: university.id, name: input.course } },
        create: { ownerId: userId, universityId: university.id, name: input.course },
        update: {}
      });
      data.universityId = university.id;
      data.courseId = course.id;

      if (input.semester) {
        const semester = await tx.semester.upsert({
          where: { courseId_name: { courseId: course.id, name: input.semester } },
          create: { ownerId: userId, courseId: course.id, name: input.semester },
          update: {}
        });
        data.semesterId = semester.id;

        for (const subjectName of new Set(input.subjects ?? [])) {
          await tx.subject.upsert({
            where: { ownerId_courseId_name: { ownerId: userId, courseId: course.id, name: subjectName } },
            create: { ownerId: userId, courseId: course.id, semesterId: semester.id, name: subjectName },
            update: { semesterId: semester.id }
          });
        }
      } else if (input.subjects?.length) {
        for (const subjectName of new Set(input.subjects)) {
          await tx.subject.upsert({
            where: { ownerId_courseId_name: { ownerId: userId, courseId: course.id, name: subjectName } },
            create: { ownerId: userId, courseId: course.id, name: subjectName },
            update: {}
          });
        }
      }
    }

    if (input.preferredStudyMinutes !== undefined) {
      await tx.userSettings.upsert({
        where: { userId },
        create: { userId, preferredStudyMinutes: input.preferredStudyMinutes },
        update: { preferredStudyMinutes: input.preferredStudyMinutes }
      });
    }

    if (input.examDates?.length) {
      const subjects = await tx.subject.findMany({ where: { ownerId: userId }, select: { id: true, name: true } });
      const subjectByName = new Map(subjects.map((subject) => [subject.name.toLowerCase(), subject.id]));
      for (const exam of input.examDates) {
        await tx.examEvent.create({
          data: {
            userId,
            title: exam.title,
            examAt: new Date(exam.examAt),
            importance: exam.importance ?? 3,
            subjectId: exam.subjectName ? subjectByName.get(exam.subjectName.toLowerCase()) ?? null : null
          }
        });
      }
    }

    await tx.user.update({ where: { id: userId }, data });
    return tx.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, university: true, course: true, semester: true, onboardingComplete: true, settings: true, subjects: true }
    });
  });
}
