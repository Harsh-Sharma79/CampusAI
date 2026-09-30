import { demoStudent } from '../data/mockData';
import type { Student } from '../types';

const pause = (ms = 260) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  university: string;
  course: string;
  semester: number;
}

export const authService = {
  async signIn(_email: string, _password: string): Promise<Student> {
    await pause();
    return demoStudent;
  },
  async signUp(input: SignUpInput): Promise<Student> {
    await pause(360);
    return { ...demoStudent, name: input.name.trim() || demoStudent.name, email: input.email, university: input.university || demoStudent.university, course: input.course || demoStudent.course, semester: input.semester || demoStudent.semester };
  },
  async getProfile(): Promise<Student> {
    await pause(100);
    return demoStudent;
  },
};
