import request from 'supertest';

import { app } from '../../app';

test('422 when providing an invalid email for registration', () =>
  request(app)
    .post('/register')
    .send({ email: 'email', password: 'asd12' })
    .expect(422));

test('422 when providing an invalid password for registration', () =>
  request(app)
    .post('/register')
    .send({ email: 'email@email.com', password: '' })
    .expect(422));

test('422 when providing no email for registration', () =>
  request(app).post('/register').send({ password: 'asd12' }).expect(422));

test('422 when providing no password for registration', () =>
  request(app)
    .post('/register')
    .send({ email: 'email@email.com' })
    .expect(422));

test('422 when providing no email and no password for registration', () =>
  request(app).post('/register').send({}).expect(422));

test('201 when providing a valid email and password for registration', () =>
  request(app)
    .post('/register')
    .send({ email: 'me@me.com', password: 'secretpass' })
    .expect(201));

test('400 when providing an email that is not available for registration', async () => {
  await request(app)
    .post('/register')
    .send({ email: 'pass@me.com', password: 'secretpass' })
    .expect(201);

  await request(app)
    .post('/register')
    .send({ email: 'pass@me.com', password: 'secretpass' })
    .expect(400);
});
