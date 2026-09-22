// Run: node --test docs/audits/event-path.qualification.mjs
// Uses installed workspace dependencies and disposable Docker resources only.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { relayOutbox } from '../../platform/runtime/outbox-relay/src/app.mjs';
import { createAccount } from '../../domains/accounts/workloads/api/src/services/accounts/create.mjs';
import { setPlan } from '../../domains/plans/workloads/api/src/services/plans/set.mjs';
import { projectAccountSnapshotV1 } from '../../domains/plans/workloads/accounts-projection/src/events/accounts.account.snapshot.v1.mjs';
import { startPostgres as accountsDatabase } from '../../domains/accounts/workloads/api/test/fixtures/postgres.mjs';
import { startPostgres as plansDatabase } from '../../domains/plans/workloads/accounts-projection/test/fixtures/postgres.mjs';

const require = createRequire(new URL('../../platform/runtime/outbox-relay/package.json', import.meta.url));
const { GenericContainer, Network, Wait } = require('testcontainers');
const { connect } = require('@nats-io/transport-node');
const { jetstream, AckPolicy, DeliverPolicy } = require('@nats-io/jetstream');
const file = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
async function eventually(fn) {
  let error;
  for (let i = 0; i < 100; i++) {
    try { return await fn(); } catch (err) { error = err; await delay(200); }
  }
  throw error;
}

test('qualify actual replicated streams and the composed snapshot path', { timeout: 180_000 }, async t => {
  await using resources = new AsyncDisposableStack();
  const network = resources.use(await new Network().start());
  const config = await file('platform/cluster/event-bus/base/nats.conf');
  const containers = [];
  for (let i = 0; i < 3; i++) {
    containers.push(resources.use(await new GenericContainer('nats:2.14.5-alpine3.22')
      .withNetwork(network)
      .withNetworkAliases(`nats-${i}.nats-headless.nats.svc.cluster.local`)
      .withEnvironment({ HOSTNAME: `nats-${i}` })
      .withCopyContentToContainer([{ content: config, target: '/etc/nats/qualification.conf' }])
      .withEntrypoint(['sh', '-c'])
      .withCommand(['mkdir -p /var/run/nats /data; exec nats-server -c /etc/nats/qualification.conf'])
      .withExposedPorts(4222)
      .withWaitStrategy(Wait.forListeningPorts()).start()));
  }
  const nc = resources.use(await connect({ servers: containers.map(c => `nats://localhost:${c.getMappedPort(4222)}`), maxReconnectAttempts: -1 }));
  const js = jetstream(nc);
  const jsm = await eventually(() => js.jetstreamManager());
  for (const domain of ['accounts', 'plans']) {
    const [stream] = JSON.parse(await file(`domains/${domain}/workloads/outbox-relay/infra/overlays/prod-eu/streams.json`));
    await eventually(() => jsm.streams.add(stream));
    await eventually(async () => {
      const info = await jsm.streams.info(stream.name);
      assert.equal(info.config.num_replicas, 3);
      assert.equal(info.cluster.replicas.filter(r => r.current).length, 2);
    });
  }
  const accounts = resources.use(await accountsDatabase());
  const plans = resources.use(await plansDatabase());
  async function drain(pool, client = js) {
    const abort = new AbortController();
    const run = relayOutbox({ abortSignal: abort.signal, pool, js: client, jsm });
    const failure = run.then(() => { throw Error('relay ended unexpectedly'); });
    try {
      await Promise.race([failure, eventually(async () => assert.equal((await pool.query('SELECT count(*)::integer AS n FROM outbox_messages')).rows[0].n, 0))]);
    } finally { abort.abort(); await run; }
  }
  let account;
  await t.test('source mutation rolls back when its outbox insert fails', async () => {
    await accounts.pool.query(`CREATE FUNCTION reject_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'qualification failure'; END $$;
      CREATE TRIGGER reject_outbox BEFORE INSERT ON outbox_messages FOR EACH ROW EXECUTE FUNCTION reject_outbox()`);
    await assert.rejects(createAccount({ pool: accounts.pool }, { currentUserId: randomUUID(), name: 'Rollback', type: 'organization' }), /qualification failure/);
    for (const table of ['accounts', 'account_members', 'account_member_roles', 'outbox_messages']) assert.equal((await accounts.pool.query(`SELECT count(*)::integer AS n FROM ${table}`)).rows[0].n, 0);
    await accounts.pool.query('DROP TRIGGER reject_outbox ON outbox_messages');
  });
  await t.test('producer → SQL → relay → replicated ACCOUNTS → pull consumer → Plans SQL → relay → replicated PLANS', async () => {
    ({ account } = await createAccount({ pool: accounts.pool }, { currentUserId: randomUUID(), name: 'Qualification', type: 'organization' }));
    const row = (await accounts.pool.query('SELECT * FROM outbox_messages')).rows[0];
    assert.equal(row.id, row.payload.id);
    assert.equal(row.headers['Content-Type'], 'application/cloudevents+json');
    await drain(accounts.pool);
    const info = await jsm.consumers.add('ACCOUNTS', { ack_policy: AckPolicy.Explicit, deliver_policy: DeliverPolicy.LastPerSubject, filter_subject: 'accounts.account.v1.*' });
    const consumer = js.consumers.getConsumerFromInfo(info);
    const message = await consumer.next({ expires: 2000 });
    assert.ok(message);
    assert.deepEqual(message.json(), row.payload);
    assert.equal(message.headers.get('Nats-Msg-Id'), row.id);
    await plans.pool.query(`CREATE FUNCTION reject_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'qualification failure'; END $$;
      CREATE TRIGGER reject_outbox BEFORE INSERT ON outbox_messages FOR EACH ROW EXECUTE FUNCTION reject_outbox()`);
    await assert.rejects(projectAccountSnapshotV1({ message, pool: plans.pool }), /qualification failure/);
    assert.equal((await plans.pool.query('SELECT count(*)::integer AS n FROM account_plans')).rows[0].n, 0);
    await plans.pool.query('DROP TRIGGER reject_outbox ON outbox_messages');
    await projectAccountSnapshotV1({ message, pool: plans.pool });
    // Replay after committed processing, before acknowledgement.
    await projectAccountSnapshotV1({ message, pool: plans.pool });
    assert.equal((await plans.pool.query('SELECT count(*)::integer AS n FROM outbox_messages')).rows[0].n, 1);
    message.ack();
    await drain(plans.pool);
    const stored = await jsm.streams.getMessage('PLANS', { last_by_subj: `plans.account-features.v1.${account.id}` });
    assert.equal(stored.json().data.account_id, account.id);
    assert.equal(stored.json().data.version, 1);
  });
  await t.test('plan changes coalesce and DiscardNew still replaces the retained subject', async () => {
    await plans.pool.query("INSERT INTO plans(id,name) VALUES ('pro','Pro')");
    for (const planId of ['pro', 'free', 'pro']) await setPlan({ pool: plans.pool }, { accountId: account.id, planId });
    const rows = (await plans.pool.query('SELECT * FROM outbox_messages')).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].payload.data.version, 4);
    await drain(plans.pool);
    const info = await jsm.streams.info('PLANS');
    assert.equal(info.state.messages, 1);
    assert.equal((await jsm.streams.getMessage('PLANS', { last_by_subj: rows[0].subject })).json().data.version, 4);
  });
  await t.test('publish accepted but acknowledgement lost retains row; fresh relay retry deduplicates', async () => {
    await setPlan({ pool: plans.pool }, { accountId: account.id, planId: 'free' });
    const before = (await plans.pool.query('SELECT * FROM outbox_messages')).rows[0];
    const abort = new AbortController();
    await assert.rejects(relayOutbox({ abortSignal: abort.signal, pool: plans.pool, jsm, js: {
      publish: async (...args) => { await js.publish(...args); throw Error('lost PubAck'); },
    } }), /lost PubAck/);
    assert.equal((await plans.pool.query('SELECT id FROM outbox_messages')).rows[0].id, before.id);
    const sequence = (await jsm.streams.info('PLANS')).state.last_seq;
    await drain(plans.pool);
    assert.equal((await jsm.streams.info('PLANS')).state.last_seq, sequence);
  });
  await t.test('actual consumer process initializes retained accounts and restarts without resetting Plans', async () => {
    const { account: additional } = await createAccount({ pool: accounts.pool }, { currentUserId: randomUUID(), name: 'Process test', type: 'individual' });
    await drain(accounts.pool);
    async function runConsumer(check) {
      let output = '';
      const child = spawn(process.execPath, [new URL('../../domains/plans/workloads/accounts-projection/src/index.mjs', import.meta.url).pathname], {
        env: { ...process.env, DATABASE_URL: plans.pool.options.connectionString, NATS_URL: `nats://localhost:${containers[1].getMappedPort(4222)}`, OTEL_EXPORTER_OTLP_ENDPOINT: '' },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.stdout.on('data', chunk => output += chunk);
      child.stderr.on('data', chunk => output += chunk);
      const exited = once(child, 'exit');
      try {
        await eventually(async () => {
          assert.equal(child.exitCode, null, output);
          const response = await fetch('http://127.0.0.1:3000/readyz');
          assert.equal(response.status, 200);
          await check();
        });
      } finally { child.kill('SIGTERM'); await exited; }
      assert.equal(child.exitCode, 0, output);
    }
    await runConsumer(async () => assert.equal((await plans.pool.query('SELECT plan_id FROM account_plans WHERE account_id=$1', [additional.id])).rows[0]?.plan_id, 'free'));
    await setPlan({ pool: plans.pool }, { accountId: additional.id, planId: 'pro' });
    await runConsumer(async () => {
      await delay(300);
      assert.equal((await plans.pool.query('SELECT plan_id FROM account_plans WHERE account_id=$1', [additional.id])).rows[0].plan_id, 'pro');
    });
    await drain(plans.pool);
  });
  await t.test('full stream rejects publication without deleting the outbox row', async () => {
    const info = await jsm.streams.info('PLANS');
    await jsm.streams.update('PLANS', { max_bytes: info.state.bytes + 1 });
    const { account: overflow } = await createAccount({ pool: accounts.pool }, { currentUserId: randomUUID(), name: 'Capacity test', type: 'individual' });
    const row = (await accounts.pool.query('SELECT * FROM outbox_messages WHERE payload->\'data\'->>\'id\'=$1', [overflow.id])).rows[0];
    await projectAccountSnapshotV1({ message: { json: () => row.payload, subject: row.subject }, pool: plans.pool });
    await assert.rejects(relayOutbox({ abortSignal: new AbortController().signal, pool: plans.pool, jsm, js }), /maximum bytes exceeded/i);
    assert.equal((await plans.pool.query('SELECT count(*)::integer AS n FROM outbox_messages')).rows[0].n, 1);
    assert.equal((await jsm.streams.info('PLANS')).state.messages, info.state.messages);
    await jsm.streams.update('PLANS', { max_bytes: info.config.max_bytes });
    await drain(plans.pool);
  });
  await t.test('one broker loss leaves a quorum able to accept and retain a snapshot', async () => {
    await containers[0].stop();
    await setPlan({ pool: plans.pool }, { accountId: account.id, planId: 'pro' });
    await eventually(() => drain(plans.pool));
    const stored = await jsm.streams.getMessage('PLANS', { last_by_subj: `plans.account-features.v1.${account.id}` });
    assert.equal(stored.json().data.version, 6);
  });
});
