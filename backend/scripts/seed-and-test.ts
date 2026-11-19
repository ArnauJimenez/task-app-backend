import 'dotenv/config';
import { randomBytes, randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const requestedUserId = process.env.AGENT_TEST_USER_ID?.trim();
  let user = requestedUserId
    ? await prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { id: true },
      })
    : null;

  if (requestedUserId && !user) {
    console.warn(
      `AGENT_TEST_USER_ID '${requestedUserId}' was not found. Falling back to an existing or test user.`,
    );
  }

  if (!user) {
    user = await prisma.user.findFirst({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
  }

  if (!user) {
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    user = await prisma.user.create({
      data: {
        email: `agent-tester-${randomUUID()}@example.invalid`,
        password: passwordHash,
        name: 'Agent integration test',
      },
      select: { id: true },
    });
    console.log(`Created a test user with ID ${user.id}.`);
  } else {
    console.log(`Using existing user with ID ${user.id}.`);
  }

  console.log('\nRunning the AgentService + ToolExecutor integration test...\n');
  execSync('npx tsx scripts/test-agent-cli.ts', {
    stdio: 'inherit',
    env: { ...process.env, AGENT_TEST_USER_ID: user.id },
  });
}

main()
  .catch((error: unknown) => {
    console.error('Seed-and-test failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
