
const fs = require('fs');

function loadEnv() {
  const envPath = 'c:\\Users\\casta\\Desktop\\app\\app\\.env';
  
  if (!fs.existsSync(envPath)) {
    console.error('Env not found at:', envPath);
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf8');
  console.log('Env file length:', content.length);
  const env = {};
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      env[key] = value;
    }
  });
  return env;
}

const env = loadEnv();
console.log('Available keys:', Object.keys(env));

const config = {
  apiBaseUrl: "https://api.cooperto.it",
  apiKey: env.COOPERTO_API_KEY ?? "",
  sedeCode: env.COOPERTO_SEDE_CODE ?? "",
};

async function testConnection() {
  console.log('Testing Cooperto Connection...');
  console.log('API Base URL:', config.apiBaseUrl);
  console.log('API Key (first 5):', (config.apiKey || '').substring(0, 5) + '...');
  console.log('Sede Code:', config.sedeCode);

  if (!config.apiKey || !config.sedeCode) {
    console.error('Missing configuration in .env');
    return;
  }

  try {
    const url = `${config.apiBaseUrl}/api/Sedi/Elenco?skip=0&pageSize=10`;
    console.log('Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    console.log('Status:', response.status);
    const body = await response.text();
    
    if (response.ok) {
      console.log('SUCCESS: Connection working!');
    } else {
      console.error('FAILURE: Cooperto responded with error.');
      console.log('Response Body:', body);
    }
  } catch (err) {
    console.error('ERROR: Could not connect to Cooperto.', err.message);
  }
}

testConnection();
