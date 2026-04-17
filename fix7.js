const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');
c = c.replace(
  `          )}\r\n        </div>\r\n      </div>\r\n\r\n      <Modal show={requestModal === "form"}`,
  `          )}\r\n          {role !== "student" && <div style={{ marginTop: 40, borderTop: "1px solid var(--border-color)", paddingTop: 40 }}><GradeRequestsView token={token} role={role} /></div>}\r\n        </div>\r\n      </div>\r\n\r\n      <Modal show={requestModal === "form"}`
);
c = c.replace(
  `          )}\n        </div>\n      </div>\n\n      <Modal show={requestModal === "form"}`,
  `          )}\n          {role !== "student" && <div style={{ marginTop: 40, borderTop: "1px solid var(--border-color)", paddingTop: 40 }}><GradeRequestsView token={token} role={role} /></div>}\n        </div>\n      </div>\n\n      <Modal show={requestModal === "form"}`
);
fs.writeFileSync('src/App.js', c);
console.log(c.includes('<GradeRequestsView token={token} role={role} />') ? "SUCCESS" : "FAILED");
