// One-time setup script: run `npm run auth` once to grant the bot account's
// OAuth scopes and obtain a refresh token. After this, src/twitchAuth.js
// keeps the token fresh automatically - you should not need to run this again
// unless the refresh token itself gets revoked.

const http = require('http');
const fetch = require('node-fetch');
require('dotenv').config();

const { updateEnvFile } = require('../twitchAuth.js');

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPES = [
  'chat:read',
  'chat:edit',
  'moderator:manage:banned_users',
  'moderator:manage:shoutouts',
  'moderator:read:followers',
  'user:read:chat',
  'user:write:chat',
  'user:bot'
].join(' ');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('CLIENT_ID and CLIENT_SECRET must be set in .env before running this script.');
  process.exit(1);
}

const authorizeUrl = `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams({
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: SCOPES,
  force_verify: 'true',
})}`;

console.log('\nMake sure you are logged into twitch.tv as the BOT account in your browser, then open:\n');
console.log(authorizeUrl);
console.log(`\nWaiting for the redirect back to ${REDIRECT_URI} ...\n`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error_description');

  if (error) {
    res.end(`Authorization failed: ${error}. You can close this tab.`);
    console.error('Authorization failed:', error);
    server.close();
    process.exit(1);
    return;
  }

  if (!code) {
    res.end('Waiting for authorization...');
    return;
  }

  try {
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`${tokenResponse.status} - ${errorText}`);
    }

    const data = await tokenResponse.json();

    updateEnvFile({
      OAUTH_TOKEN: `'oauth:${data.access_token}'`,
      REFRESH_TOKEN: `'${data.refresh_token}'`,
    });

    res.end('Authorization successful! You can close this tab now.');
    console.log('Success! .env has been updated with a fresh OAUTH_TOKEN and REFRESH_TOKEN.');
    server.close();
    process.exit(0);
  } catch (err) {
    res.end('Something went wrong exchanging the code, check the terminal.');
    console.error('Failed to exchange authorization code:', err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT);
