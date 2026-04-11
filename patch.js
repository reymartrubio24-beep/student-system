const fs = require('fs');
let text = fs.readFileSync('src/App.js', 'utf8');

const fixes = [
  { search: /dY\?/g, replace: "🏫" },
  { search: /dY"\?/g, replace: "🔍" },
  { search: /o\?,\?/g, replace: "✏️" },
  { search: /dY-,\?/g, replace: "🗑️" },
  { search: /o" ENROLLED/g, replace: "✅ ENROLLED" },
  { search: /z  Add New Subject/g, replace: "➕ Add New Subject" },
  { search: /dY'_ Save/g, replace: "💾 Save" },
  { search: /o\. /g, replace: "✅ " },
  { search: /dY - Student Management/g, replace: "🎓" },
  { search: /\?" Select \?"/g, replace: "-- Select --" },
  { search: /dY>,\? User /g, replace: "👥 User " },
  { search: /dY"o System Audit Logs/g, replace: "📜 System Audit Logs" },
  { search: /dY"\? Role Permissions/g, replace: "🛡️ Role Permissions" },
  { search: /dY-,\? Confirm Delete/g, replace: "🗑️ Confirm Delete" },
  { search: /dY", Restore Defaults/g, replace: "🔄 Restore Defaults" },
  { search: /dY", Refresh/g, replace: "🔄 Refresh" },
  { search: /\?\?\?\?\?\?\?\?/g, replace: "••••••••" },
  { search: /s,\? /g, replace: "⚠️ " },
  { search: /\?\? Manage Semesters/g, replace: "📅 Manage Semesters" },
  { search: /\?\? Settings/g, replace: "⚙️ Settings" },
  { search: /\?\? Logout/g, replace: "🚪 Logout" },
  { search: /sT,\? Settings/g, replace: "⚙️ Settings" },
  { search: /dYs Logout/g, replace: "🚪 Logout" },
  { search: /\?\? \{s\.term\}/g, replace: "• {s.term}" },
  { search: /dY-,\?/g, replace: "🗑️" },
  { search: /A /g, replace: "" },
  { search: /\?"/g, replace: "-" }
];

fixes.forEach(f => {
  text = text.replace(f.search, f.replace);
});

fs.writeFileSync('src/App.js', text, 'utf8');
console.log("Emojis fixed.");
