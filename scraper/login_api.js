const https = require('https');

const postData = JSON.stringify({
  username: '1000001601',
  password: 'A@makmur25'
});

// Try multiple possible login endpoints
const endpoints = [
  '/api/auth/login',
  '/api/login',
  '/api/v1/auth/login',
  '/api/v1/login',
  '/api/user/login',
];

async function tryLogin(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'gowcm.pupuk-indonesia.com',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://gowcm.pupuk-indonesia.com',
        'Referer': 'https://gowcm.pupuk-indonesia.com/',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data, path });
      });
    });

    req.on('error', (e) => resolve({ status: 0, error: e.message, path }));
    req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('Mencoba login ke berbagai endpoint API...\n');
  
  for (const ep of endpoints) {
    const result = await tryLogin(ep);
    console.log(`[${result.status}] ${ep}`);
    
    if (result.status !== 0 && result.status !== 404) {
      console.log('Headers:', JSON.stringify(result.headers, null, 2));
      console.log('Body:', result.body.substring(0, 1000));
      
      try {
        const json = JSON.parse(result.body);
        console.log('\nParsed JSON:', JSON.stringify(json, null, 2));
        
        const token = json?.token || json?.access_token || json?.data?.token || json?.data?.access_token;
        if (token) {
          console.log('\n🎯 TOKEN DITEMUKAN:', token);
        }
      } catch(e) {}
      
      console.log('---\n');
    }
  }
})();
