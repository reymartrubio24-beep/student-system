const fs = require('fs');

// 1. App.js Role Permissions and role renames
let appJs = fs.readFileSync('src/App.js', 'utf8');
appJs = appJs.replace(/\"register\"/g, '"registrar"');
appJs = appJs.replace(/\>register\</g, '>registrar<');
appJs = appJs.replace(/\/\/\s*\.\.\.\(.*hasPerm\("rolepermissions"\)/, '...(hasPerm("rolepermissions") || role === "developer"'); 
// Wait, actually I will just do exact replacements
appJs = appJs.replace(
  `// ...(hasPerm("rolepermissions") ? [{ id: "rolepermissions", icon: "🔐", label: "Role Permissions" }] : []),`,
  `...(hasPerm("rolepermissions") || role === "developer" ? [{ id: "rolepermissions", icon: "🔐", label: "Role Permissions" }] : []),`
);
fs.writeFileSync('src/App.js', appJs);

// 2. index.js backend role logic
let indexJs = fs.readFileSync('server/src/index.js', 'utf8');
// replace register string array checks but carefully avoid the auth/register handler
indexJs = indexJs.replace(/"saps", "register", "cashier", "viewer"/g, '"saps", "registrar", "cashier", "viewer"');
indexJs = indexJs.replace(/"owner", "register", "developer"/g, '"owner", "registrar", "developer"');
indexJs = indexJs.replace(/"saps", "owner", "register", "developer"/g, '"saps", "owner", "registrar", "developer"');
indexJs = indexJs.replace(/student, developer, saps, register, cashier/g, 'student, developer, saps, registrar, cashier');
fs.writeFileSync('server/src/index.js', indexJs);

// 3. db.js CHECK constraint
let dbJs = fs.readFileSync('server/src/db.js', 'utf8');
dbJs = dbJs.replace(/'student','teacher','developer','owner','saps','register','cashier'/g, "'student','teacher','developer','owner','saps','registrar','cashier'");
fs.writeFileSync('server/src/db.js', dbJs);

console.log("Renames complete!");
