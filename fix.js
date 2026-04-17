const fs = require('fs');
let c = fs.readFileSync('c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js', 'utf8');
const lines = c.split('\n');
lines.splice(4632, 3, 
`                          {(canWrite || canDelete) ? (
                            <Td>
                              <div style={{ display: "flex", gap: 5 }}>
                                {canWrite && <Btn variant="outline" onClick={() => {
                                    setForm({ subjectId: subj.id, prelim1: g.prelim1, prelim2: g.prelim2, midterm: g.midterm, semi_final: g.semi_final, final: g.final });
                                    setEditingSubj(subj.id); setModal("form");
                                }} style={{ fontSize: 10, padding: "3px 8px" }}>✏️</Btn>}
                                {canDelete && <Btn variant="danger" onClick={() => setDeleteConfirm(subj.id)} style={{ fontSize: 10, padding: "3px 8px" }}>🗑️</Btn>}
                              </div>
                            </Td>
                          ) : role !== "student" ? (
                            <Td>
                              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <span style={{ fontSize: 11, color: "#94a3b8" }}>Read-only</span>
                                {role === "teacher" && (
                                  <Btn variant="outline" onClick={() => {
                                    setReqForm({ subjectId: subj.id, term: "1st Prelim", reason: "" });
                                    setRequestModal("form");
                                  }} style={{ fontSize: 10, padding: "3px 8px", borderColor: "var(--neon-blue)", color: "var(--neon-blue)" }}>📣 Request Change</Btn>
                                )}
                              </div>
                            </Td>
                          ) : null}`);
fs.writeFileSync('c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js', lines.join('\n'));
