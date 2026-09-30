import { materials } from '../data/mockData';
import type { Material, MaterialKind } from '../types';

const pause = (ms = 220) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const extraMaterials: Material[] = [];

export const materialService = {
  async list(): Promise<Material[]> {
    await pause();
    return [...extraMaterials, ...materials];
  },
  async get(id: string): Promise<Material | undefined> {
    await pause(120);
    return [...extraMaterials, ...materials].find((material) => material.id === id);
  },
  async uploadMock(name: string, kind: MaterialKind): Promise<Material> {
    await pause(780);
    const entry: Material = {
      id: `mat-${Date.now()}`, name, subject: 'Machine Learning', kind,
      pages: kind === 'PDF' ? 24 : 6,
      uploadedAt: new Intl.DateTimeFormat('en', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date()),
      status: 'Analyzed', topics: ['Core concepts', 'Key definitions', 'Worked examples'],
    };
    extraMaterials.unshift(entry);
    return entry;
  },
};
