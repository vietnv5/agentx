import { Module, Global } from '@nestjs/common';
import { drizzleProvider, DRIZZLE_PROVIDER } from './drizzle.provider';
import { DatabaseSeeder } from './seeds/admin-seeding';

@Global()
@Module({
  providers: [drizzleProvider, DatabaseSeeder],
  exports: [DRIZZLE_PROVIDER],
})
export class DatabaseModule {}
