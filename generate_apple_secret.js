const fs = require('fs');
const crypto = require('crypto');

const privateKey = fs.readFileSync('X:\\app docs\\AuthKey_R732LNNMLL.p8', 'utf8');
const teamId = '9644MW274P';
const keyId = 'R732LNNMLL';
const clientId = 'com.yourname.veetha.siwa';

const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId })).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const payload = Buffer.from(JSON.stringify({
  iss: teamId,
  iat: now,
  exp: now + 15777000,
  aud: 'https://appleid.apple.com',
  sub: clientId,
})).toString('base64url');

const sign = crypto.createSign('SHA256');
sign.update(`${header}.${payload}`);
const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');

console.log(`${header}.${payload}.${signature}`);