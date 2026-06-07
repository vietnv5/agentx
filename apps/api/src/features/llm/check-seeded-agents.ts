import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DRIZZLE_PROVIDER } from '../../database/drizzle.provider';
import * as schema from '../../database/schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(DRIZZLE_PROVIDER);

  console.log('\n========================================');
  console.log('Checking agents in Postgres database...');
  console.log('========================================\n');

  try {
    const agents = await db.query.agents.findMany({
      with: {
        skills: true,
      }
    });

    console.log(`Found ${agents.length} agent(s) in the database:\n`);
    for (const agent of agents) {
      console.log(`- Agent Name: "${agent.name}"`);
      console.log(`  ID: ${agent.id}`);
      console.log(`  Is Router: ${agent.isRouter}`);
      console.log(`  Provider: ${agent.llmProvider}`);
      console.log(`  Model: ${agent.llmModel}`);
      console.log(`  Is Active: ${agent.isActive}`);
      console.log(`  Skills: ${agent.skills.map((s: any) => s.name).join(', ') || '(none)'}`);
      console.log('----------------------------------------');
    }
  } catch (error) {
    console.error('Error querying database:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap();
