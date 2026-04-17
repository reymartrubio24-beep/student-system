const fs = require('fs');
const c = fs.readFileSync('src/App.js', 'utf8');
const lines = c.split('\n');
lines.forEach((l, i) => {
  if (l.includes('"dashboard", "search"') || l.includes('"grades","attendance"') || l.includes('"grades", "attendance"')) {
    console.log((i+1) + ':', l.slice(0, 200));
  }
});
