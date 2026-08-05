import prismaClientPkg from '@prisma/client';

const { PrismaClient } = prismaClientPkg as any;

declare global {
  // eslint-disable-next-line no-var
  var prisma: any;
}

export const prisma: any =
  global.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}