import request from 'supertest';

import { app } from '../../app';

test('422 when providing an invalid email for signining in', () =>
  request(app)
    .post('/signin')
    .send({ email: 'email', password: 'asd12' })
    .expect(422));

test('422 when providing no password for signining in', () =>
  request(app).post('/signin').send({ email: 'email@email.com' }).expect(422));

test('422 when providing no email for signining in', () =>
  request(app).post('/signin').send({ password: 'asd12' }).expect(422));

test('422 when providing no password and no email for signining in', () =>
  request(app).post('/signin').send({}).expect(422));

test('403 when providing a password that does not match the provided email', async () => {
  await request(app)
    .post('/register')
    .send({ email: 'pass@me.com', password: 'secretpass' })
    .expect(201);

  await request(app)
    .post('/signin')
    .send({ email: 'pass@me.com', password: 'secretpas' })
    .expect(403);
});

test('200 when providing a matching password and email for signining in', async () => {
  await request(app)
    .post('/register')
    .send({ email: 'me@me.com', password: 'secretpass' })
    .expect(201);

  await request(app)
    .post('/signin')
    .send({ email: 'me@me.com', password: 'secretpass' })
    .expect(200);
});
