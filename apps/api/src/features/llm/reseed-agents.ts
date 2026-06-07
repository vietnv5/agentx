import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import { DatabaseSeeder } from '../../database/seeds/admin-seeding';
import * as schema from '../../database/schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(DRIZZLE_PROVIDER);
  const seeder = app.get(DatabaseSeeder);

  console.log('\n========================================');
  console.log('Clearing database logs and agents to trigger re-seed...');
  console.log('========================================\n');

  try {
    // Delete in reverse dependency order
    await db.delete(schema.llmUsageLogs);
    await db.delete(schema.toolExecutions);
    await db.delete(schema.approvalRequests);
    await db.delete(schema.messages);
    await db.delete(schema.conversations);
    
    // Now delete agents (related skills & tool bindings will cascade delete)
    await db.delete(schema.agents);
    console.log('Successfully cleared all agents and operational logs from database.');

    // 2. Trigger the seeder to run
    console.log('Triggering seeder to populate default agents from markdown files...');
    await seeder.onApplicationBootstrap();

    // 3. Query and verify the seeded agents
    const agents = await db.query.agents.findMany({
      with: {
        skills: true,
      }
    });

    console.log(`\nFound ${agents.length} agent(s) after seeding:\n`);
    for (const agent of agents) {
      console.log(`- Agent Name: "${agent.name}"`);
      console.log(`  Is Router: ${agent.isRouter}`);
      console.log(`  System Instructions:\n"""\n${agent.systemInstructions}\n"""`);
      console.log(`  Skills: ${agent.skills.map((s: any) => s.name).join(', ') || '(none)'}`);
      console.log('----------------------------------------');
    }
  } catch (error) {
    console.error('Error during agent reseeding:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap();
