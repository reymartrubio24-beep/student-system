const fs = require('fs');
let c = fs.readFileSync('c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js', 'utf8');

const search = `                          ) : null}
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </Card>
            </>
          )}
        </div>
      </div>

      <Modal show={modal === "form"} title={editingSubj ? "Update Grade" : "Add Subject Grade"} onClose={() => setModal(null)}>`;

const replacement = `                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </Card>
            </>
          )}

          {/* Grade Change Requests Table */}
          {role !== "student" && (
            <div style={{ marginTop: 24 }}>
              <Card title={\`Grade Change Requests (\${requests.length})\`} variant={requests.length > 0 ? "active" : "default"}>
                {requests.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-dim)", fontSize: 13 }}>No pending grade change requests.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {requests.map(req => (
                      <div key={req.id} style={{
                        padding: 16, borderRadius: 12, border: "1px solid var(--border-color)", background: req.status === "done" ? "rgba(16, 185, 129, 0.05)" : "rgba(255,255,255,0.03)",
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start"
                      }}>
                        <div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{req.student_name}</div>
                            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: req.status === "done" ? "#065f46" : "#854d0e", color: "white", fontWeight: 700 }}>{req.status.toUpperCase()}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--neon-blue)", marginBottom: 8 }}>{req.subject_name} • Requested by: {req.teacher_username}</div>
                          <div style={{ fontSize: 13, color: "var(--text-main)", background: "rgba(0,0,0,0.2)", padding: "8px 12px", borderRadius: 8, borderLeft: "3px solid var(--neon-blue)" }}>
                            {req.requested_changes}
                          </div>
                        </div>
                        {req.status !== "done" && ["saps", "owner", "register", "developer"].includes(role) && (
                          <Btn variant="primary" onClick={async () => {
                            try {
                              await api(\`/grade-change-requests/\${req.id}/done\`, { method: "PUT" }, token);
                              fetchRequests();
                              flash("✅ Request marked as done");
                            } catch (e) {
                              alert(e.message);
                            }
                          }} style={{ fontSize: 11, padding: "6px 12px" }}>Mark Done</Btn>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

        </div>
      </div>

      {/* Grade Change Request Modal for Teachers */}
      <Modal show={requestModal === "form"} title="Request Grade Change" onClose={() => setRequestModal(null)} width={450}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <Select label="Subject" value={reqForm.subjectId} onChange={e => setReqForm({...reqForm, subjectId: e.target.value})} disabled>
            <option value={reqForm.subjectId}>{subjects.find(s => s.id === reqForm.subjectId)?.name || reqForm.subjectId}</option>
          </Select>
          <Select label="Select Term" value={reqForm.term} onChange={e => setReqForm({...reqForm, term: e.target.value})}>
            {["1st Prelim", "2nd Prelim", "Midterm", "Semi-Final", "Final"].map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dim)", marginBottom: 6 }}>Reason / Details</label>
            <textarea 
              placeholder="e.g. Please change Midterm from 70 to 80, miscalculated..."
              value={reqForm.reason} onChange={e => setReqForm({...reqForm, reason: e.target.value})}
              style={{ width: "100%", padding: "12px 16px", border: "1px solid var(--border-color)", borderRadius: 10, fontSize: 14, outline: "none", background: "#0f172a", color: "#ffffff", minHeight: 100 }}
            />
          </div>
          <Btn variant="primary" onClick={async () => {
            if (!reqForm.reason.trim()) return alert("Please provide a reason.");
            try {
              const fullChange = \`Term: \${reqForm.term} | Reason: \${reqForm.reason}\`;
              await api("/grade-change-requests", { method: "POST", body: {
                student_id: selectedStudent,
                subject_id: reqForm.subjectId,
                semester_id: semesterId ? Number(semesterId) : null,
                requested_changes: fullChange
              }}, token);
              setRequestModal(null);
              setReqForm({...reqForm, reason: ""});
              fetchRequests();
              flash("✅ Grade change request submitted.");
            } catch (e) { alert(e.message); }
          }} style={{ width: "100%" }}>Submit Request</Btn>
        </div>
      </Modal>

      <Modal show={modal === "form"} title={editingSubj ? "Update Grade" : "Add Subject Grade"} onClose={() => setModal(null)}>`;

c = c.replace(search, replacement);
fs.writeFileSync('c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js', c);
