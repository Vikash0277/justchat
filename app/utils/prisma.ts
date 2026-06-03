import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  // In production (Vercel) each invocation gets a fresh instance.
  prisma = new PrismaClient();
} else {
  // In development we reuse the client to avoid exhausting connections.
  // @ts-ignore – globalThis may not have prisma defined.
  if (!globalThis.prisma) {
    // @ts-ignore
    globalThis.prisma = new PrismaClient();
  }
  // @ts-ignore
  prisma = globalThis.prisma;
}

export default prisma;
