/**
 * @typedef {object} Entitlement
 * @property {string} id
 * @property {boolean | number} value
 */

/**
 * @typedef {object} StoredGrant
 * @property {string} id
 * @property {"boolean_or" | "number_max" | "number_sum"} strategy
 * @property {boolean | number} value
 */

/**
 * @param {{
 *   accountId: string,
 *   client: import("pg").PoolClient,
 * }} args
 * @returns {Promise<Entitlement[]>}
 */
export async function resolveEntitlements({ accountId, client }) {
  /** @type {{ rows: StoredGrant[] }} */
  const { rows: grants } = await client.query(
    `
      SELECT g.capability_id AS id,
        g.value,
        c.strategy
      FROM grants g
      JOIN capabilities c ON c.id = g.capability_id
      WHERE g.account_id = $1
      ORDER BY g.capability_id, g.grant_id
    `,
    [accountId],
  );

  /** @type {Map<string, Entitlement>} */
  const entitlements = new Map();

  for (const grant of grants) {
    const entitlement = entitlements.get(grant.id);

    if (!entitlement) {
      entitlements.set(grant.id, {
        id: grant.id,
        value: grant.value,
      });
      continue;
    }

    if (grant.strategy === "boolean_or") {
      entitlement.value = entitlement.value === true || grant.value === true;
    }

    if (grant.strategy === "number_max") {
      entitlement.value = Math.max(
        Number(entitlement.value),
        Number(grant.value),
      );
    }

    if (grant.strategy === "number_sum") {
      entitlement.value = Number(entitlement.value) + Number(grant.value);
    }
  }

  return [...entitlements.values()];
}
