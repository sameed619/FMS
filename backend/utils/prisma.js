// src/utils/prisma.js (or wherever you put it)

import { PrismaClient } from '@prisma/client';

// Instantiate PrismaClient
const prisma = new PrismaClient();

// Export the instance for use throughout your application
export default prisma;