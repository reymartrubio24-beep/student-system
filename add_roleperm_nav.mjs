import { readFileSync, writeFileSync } from 'fs';

const file = 'src/App.js';
let src = readFileSync(file, 'utf8');

// Find nav items end - look for the exact pattern around line 424
// Use a simpler marker
const marker = '? [{ id: "logs",     icon: "\uD83D\uDCDC", label: "System Logs" }] : []),';
const insertAfter = '    ...((role === "developer" || role === "owner")\r\n       ? [{ id: "rolepermissions", icon: "\uD83D\uDD10", label: "Role Permissions" }] : []),';

if (src.includes(marker)) {
  const idx = src.indexOf(marker);
  // Find the next newline after this marker
  const nlIdx = src.indexOf('\n', idx + marker.length);
  if (nlIdx !== -1) {
    src = src.substring(0, nlIdx + 1) + insertAfter + '\r\n' + src.substring(nlIdx + 1);
    console.log('✅ Inserted Role Permissions nav item after System Logs');
  }
} else {
  // Try without \r
  const marker2 = '? [{ id: "logs",     icon: "\uD83D\uDCDC", label: "System Logs" }] : []),';
  console.log('marker not found, checking what logs line looks like...');
  const logsIdx = src.indexOf('"logs"');
  if (logsIdx !== -1) {
    const lineStart = src.lastIndexOf('\n', logsIdx);
    const lineEnd = src.indexOf('\n', logsIdx);
    console.log('Logs line:', JSON.stringify(src.substring(lineStart, lineEnd + 1)));
  }
}

// Check if rolepermissions is already in navItems
const already = src.indexOf('"rolepermissions"');
console.log('rolepermissions count in file:', (src.match(/"rolepermissions"/g) || []).length);

writeFileSync(file, src, 'utf8');
console.log('Done.');

const result = readFileSync(file, 'utf8');
const navStart = result.indexOf('const navItems = [');
const navEnd = result.indexOf('];', navStart);
console.log('navItems content:');
console.log(result.substring(navStart, navEnd + 2));
