import { Module } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
