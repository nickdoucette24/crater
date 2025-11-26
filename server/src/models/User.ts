import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { db, query } from "../config/database";

export type OAuthProvider = "google" | "github" | "facebook" | "dev";

export type User = {
  id: number;
  name: string;
  email: string;
  oauthProvider: OAuthProvider;
  oauthProviderId: string;
  currency: string;
  darkMode: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  oauthProvider: OAuthProvider;
  oauthProviderId: string;
  currency: string;
  darkMode: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    oauthProvider: row.oauthProvider,
    oauthProviderId: row.oauthProviderId,
    currency: row.currency,
    darkMode: row.darkMode === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * TABLE (create this once manually or via migrations):
 *
 * CREATE TABLE users (
 *   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 *   name VARCHAR(255) NOT NULL,
 *   email VARCHAR(255) NOT NULL,
 *   oauth_provider VARCHAR(32) NOT NULL,
 *   oauth_provider_id VARCHAR(255) NOT NULL,
 *   currency VARCHAR(8) NOT NULL DEFAULT 'CAD',
 *   dark_mode TINYINT(1) NOT NULL DEFAULT 0,
 *   created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *   UNIQUE KEY uniq_provider (oauth_provider, oauth_provider_id),
 *   UNIQUE KEY uniq_email (email)
 * ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
 */

export const UserRepository = {
  async findById(id: number): Promise<User | null> {
    const rows = await query<UserRow[]>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    if (rows.length === 0) return null;
    return toUser(rows[0]);
  },

  async findByProvider(
    oauthProvider: OAuthProvider,
    oauthProviderId: string,
  ): Promise<User | null> {
    const rows = await query<UserRow[]>(
      "SELECT * FROM users WHERE oauth_provider = ? AND oauth_provider_id = ? LIMIT 1",
      [oauthProvider, oauthProviderId],
    );
    if (rows.length === 0) return null;
    return toUser(rows[0]);
  },

  /**
   * Upsert pattern for OAuth:
   * - If the provider+id exists, update profile fields.
   * - Else create a new user.
   */
  async upsertOAuthUser(input: {
    name: string;
    email: string;
    oauthProvider: OAuthProvider;
    oauthProviderId: string;
  }): Promise<User> {
    const existing = await this.findByProvider(input.oauthProvider, input.oauthProviderId);

    if (existing) {
      await db.execute(
        `UPDATE users
         SET name = ?, email = ?,
         WHERE id = ?`,
        [input.name, input.email ?? null, existing.id],
      );
      const updated = await this.findById(existing.id);
      if (!updated) throw new Error("User disappeared after update");
      return updated;
    }

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO users (oauth_provider, oauth_provider_id, name, email, currency, dark_mode)
       VALUES (?, ?, ?, ?, ?, 'CAD', 0)`,
      [input.name, input.email, input.oauthProvider, input.oauthProviderId],
    );

    const createdId = Number(result.insertId);
    const created = await this.findById(createdId);
    if (!created) throw new Error("Failed to load created user");
    return created;
  },

  async updatePreferences(
    userId: number,
    patch: Partial<Pick<User, "name" | "currency" | "darkMode">>,
  ): Promise<User> {
    const current = await this.findById(userId);
    if (!current) throw new Error("User not found");

    const next = {
      name: patch.name ?? current.name,
      currency: patch.currency ?? current.currency,
      darkMode: patch.darkMode ?? current.darkMode,
    };

    await db.execute(`UPDATE users SET name = ?, currency = ?, dark_mode = ? WHERE id = ?`, [
      next.name,
      next.currency,
      next.darkMode ? 1 : 0,
      userId,
    ]);

    const updated = await this.findById(userId);
    if (!updated) throw new Error("Failed to load updated user");
    return updated;
  },
};
