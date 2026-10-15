const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const qa = require('./qa-env');
const { seedFixtures, cleanupFixtures, emailFor } = require('./fixtures');

let server;
let fixtures;
let baseUrl;
let AdminPassword;

test.before(async () => {
  fixtures = await seedFixtures();
  AdminPassword = mongoose.model('AdminPassword');
  const app = require('../src/app');
  server = await new Promise((resolve) => {
    const instance = app.listen(0, qa.HOST, () => resolve(instance));
  });
  baseUrl = `http://${qa.HOST}:${server.address().port}/api`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await cleanupFixtures(fixtures);
});

async function post(path, body, headers = {}) {
  const response = await fetch(`${baseUrl}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  let bodyJson = null;
  try {
    bodyJson = await response.json();
  } catch (err) {
    bodyJson = null;
  }
  return { response, body: bodyJson };
}

test('removed password-reset endpoints (/forgetpassword and /resetpassword) are not accessible', async () => {
  // Public requests are no longer handled by coreAuthRouter and fall through to auth guard (401)
  const unauthForget = await post('forgetpassword', { email: emailFor('admin') });
  assert.equal(unauthForget.response.status, 401, 'Unauthenticated POST /forgetpassword must be rejected');

  const unauthReset = await post('resetpassword', {
    userId: String(fixtures.admin.user._id),
    password: 'QA-new-password-2026!',
  });
  assert.equal(unauthReset.response.status, 401, 'Unauthenticated POST /resetpassword must be rejected');

  // Authenticated requests pass the guard and confirm the route does not exist anywhere in the API (404)
  const adminLogin = await post('login', { email: emailFor('admin'), password: qa.PASSWORD });
  const token = adminLogin.body.result.token;

  const authForget = await post('forgetpassword', { email: emailFor('admin') }, { authorization: `Bearer ${token}` });
  assert.equal(authForget.response.status, 404, 'Authenticated POST /forgetpassword must return 404 Not Found');

  const authReset = await post('resetpassword', {
    userId: String(fixtures.admin.user._id),
    password: 'QA-new-password-2026!',
  }, { authorization: `Bearer ${token}` });
  assert.equal(authReset.response.status, 404, 'Authenticated POST /resetpassword must return 404 Not Found');
});

test('login with valid credentials succeeds for admin, hr, and employee', async () => {
  for (const role of ['admin', 'hr', 'employee']) {
    const result = await post('login', {
      email: emailFor(role),
      password: qa.PASSWORD,
    });
    assert.equal(result.response.status, 200, `login for ${role} should succeed`);
    assert.equal(result.body.success, true);
    assert.ok(result.body.result?.token, `token should be returned for ${role}`);
  }
});

test('login with invalid credentials is rejected', async () => {
  const invalidPassword = await post('login', {
    email: emailFor('admin'),
    password: 'wrong-password-12345',
  });
  assert.notEqual(invalidPassword.response.status, 200, 'invalid password must not return 200');
  assert.equal(invalidPassword.body?.success, false);

  const unknownEmail = await post('login', {
    email: 'nonexistent-user@example.com',
    password: qa.PASSWORD,
  });
  assert.notEqual(unknownEmail.response.status, 200, 'unregistered user must not return 200');
  assert.equal(unknownEmail.body?.success, false);
});

test('logout works for authenticated user and terminates session', async () => {
  const loginRes = await post('login', { email: emailFor('admin'), password: qa.PASSWORD });
  assert.equal(loginRes.response.status, 200);
  const token = loginRes.body.result.token;

  const logoutRes = await post('logout', {}, { authorization: `Bearer ${token}` });
  assert.equal(logoutRes.response.status, 200);
  assert.equal(logoutRes.body.success, true);
});

test('authenticated admin password-change functionality continues to work', async () => {
  const adminLogin = await post('login', { email: emailFor('admin'), password: qa.PASSWORD });
  const adminToken = adminLogin.body.result.token;

  // Update password for test employee using the administrative password-update route
  const targetUser = fixtures.employee.user;
  const updateRes = await fetch(`${baseUrl}/admin/password-update/${targetUser._id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ password: 'New-Valid-Password-2026!' }),
  });

  assert.equal(updateRes.status, 200, 'admin should be able to update user password');
  const updateBody = await updateRes.json();
  assert.equal(updateBody.success, true);

  // Verify employee can log in with new password
  const empLogin = await post('login', {
    email: emailFor('employee'),
    password: 'New-Valid-Password-2026!',
  });
  assert.equal(empLogin.response.status, 200, 'employee should log in with newly updated password');
});

test('employee role is forbidden from administrative password updates', async () => {
  const empLogin = await post('login', { email: emailFor('employee'), password: 'New-Valid-Password-2026!' });
  const empToken = empLogin.body.result.token;

  const forbiddenRes = await fetch(`${baseUrl}/admin/password-update/${fixtures.hr.user._id}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({ password: 'Hacker-Password-2026!' }),
  });

  assert.equal(forbiddenRes.status, 403, 'employee must be forbidden from administrative password updates');
});

test('AdminPassword schema no longer defines resetToken or resetTokenExpires fields', async () => {
  const schemaPaths = Object.keys(AdminPassword.schema.paths);
  assert.equal(schemaPaths.includes('resetToken'), false, 'resetToken should not be in AdminPassword schema');
  assert.equal(schemaPaths.includes('resetTokenExpires'), false, 'resetTokenExpires should not be in AdminPassword schema');
});
