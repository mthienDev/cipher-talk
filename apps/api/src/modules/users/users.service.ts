import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database';
import { users } from '@/database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@/database/schema';

export interface CreateUserData {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findByEmail(email: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0] || null;
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return result[0];
  }

  async create(data: CreateUserData) {
    const result = await this.db
      .insert(users)
      .values({
        email: data.email,
        username: data.username,
        displayName: data.displayName,
        passwordHash: data.passwordHash,
      })
      .returning();

    return result[0];
  }
}
