const http = require('http');

async function testEndpoint(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:4000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ path, status: res.statusCode });
      });
    }).on('error', err => {
      resolve({ path, status: 'error', message: err.message });
    });
  });
}

async function run() {
  const endpoints = ['/subjects', '/students', '/roles', '/grades', '/semesters'];
  for (const ep of endpoints) {
    const res = await testEndpoint(ep);
    console.log(res.path, '->', res.status);
  }
}
run();
