import { PrismaClient } from '@prisma/client';

declare const global: any;

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore
  global.prisma = prisma;
}
export default prisma;
