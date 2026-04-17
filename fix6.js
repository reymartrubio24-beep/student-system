const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

c = c.replace(
  `...(["saps", "owner", "register", "developer", "teacher"].includes(role) ? [{ id: "graderequests", icon: "📬", label: "Grade Requests" }] : []),`,
  `...(["owner", "register", "developer", "teacher"].includes(role) ? [{ id: "graderequests", icon: "📬", label: "Grade Requests" }] : []),`
);

c = c.replace(
  `{req.status !== "done" && ["saps","owner","register","developer"].includes(role) && (`,
  `{req.status !== "done" && ["owner","register","developer"].includes(role) && (`
);

const originalStatusTag = `<span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: req.status === "done" ? "#065f46" : "#854d0e", color: "white", fontWeight: 700 }}>{req.status.toUpperCase()}</span>`;
const newStatusTag = `<span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: req.status === "done" ? "#065f46" : "#854d0e", color: "white", fontWeight: 700 }}>{req.status.toUpperCase()}</span>
                    {req.status === "done" && req.marked_done_by && <span style={{ fontSize: 10, color: "var(--neon-blue)", fontStyle: "italic", fontWeight: 600 }}>By: {req.marked_done_by}</span>}`;

c = c.replace(originalStatusTag, newStatusTag);

fs.writeFileSync('src/App.js', c);
console.log("Replaced frontend refs");
