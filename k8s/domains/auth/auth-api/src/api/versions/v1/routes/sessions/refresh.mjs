import { createHash } from "node:crypto";

import { ErrorResponse, RefreshBody, RefreshResponse } from "../../schemas.mjs";
import { generateRefreshToken } from "../passkeys/shared.mjs";

/**
 * @param {import('../../../../../fastify.js').FastifyInstance} fastify
 */
export default async function (fastify) {
  fastify.post(
    "/refresh",
    {
      schema: {
        body: RefreshBody,
        description: "Exchanges a valid refresh token for a new refresh token.",
        operationId: "refreshSession",
        response: {
          200: RefreshResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
        summary: "Refresh session",
        tags: ["sessions"],
      },
    },
    async function (request, reply) {
      const { pool } = this;

      const { refresh_token } = request.body;

      if (!refresh_token || typeof refresh_token !== "string")
        return reply.code(401).send(null);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const {
          rows: [session],
        } = await client.query(
          `
            SELECT id, user_id
            FROM sessions
            WHERE refresh_token_hash = $1
              AND revoked_at IS NULL
              AND expires_at > NOW()
            FOR UPDATE
          `,
          [createHash("sha256").update(refresh_token).digest()],
        );

        if (!session) {
          await client.query("ROLLBACK");
          return reply.code(401).send(null);
        }

        const { hash: newHash, token: newRefreshToken } =
          generateRefreshToken();

        await client.query(
          `
            UPDATE sessions
            SET
              refresh_token_hash = $2,
              last_refreshed_at = NOW()
            WHERE id = $1
          `,
          [session.id, newHash],
        );

        await client.query("COMMIT");

        return reply.send({
          refresh_token: newRefreshToken,
        });
      } catch {
        await client.query("ROLLBACK");
        return reply.code(500).send(null);
      } finally {
        client.release();
      }
    },
  );
}

// passkey → session
// session → access token
// access token → domain authorization
