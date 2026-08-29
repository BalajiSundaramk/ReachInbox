import { emails } from '../data/mockData';
export const emailService = { getAll: () => Promise.resolve(emails), getById: (id:string) => Promise.resolve(emails.find(x=>x.id===id)) };
