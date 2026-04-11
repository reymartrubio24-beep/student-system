const fs = require('fs');
const appJsPath = 'src/App.js';
const backupJsPath = 'src/App.backup.js';

let appJs = fs.readFileSync(appJsPath, 'utf8');
const backupJs = fs.readFileSync(backupJsPath, 'utf8');

// 1. Extract renderSemesterOptions
const renderSemOptionsMatch = backupJs.match(/function renderSemesterOptions\(semesters\) {[\s\S]+?return Object\.entries\(groups\)[\s\S]+?<\/optgroup>\n  \)\);\n}/);
if (renderSemOptionsMatch) {
    appJs = appJs.replace('export { Dashboard };', 'export { Dashboard };\n\n' + renderSemOptionsMatch[0]);
}

// 2. Extract ManageSemestersModal
const manageSemsModalMatch = backupJs.match(/function ManageSemestersModal\(\{ show, onClose, token \}\) {[\s\S]+?return \(\s*<Modal show=\{true\} title="⚙️ Manage Semesters[\s\S]+?<\/Modal>\n  \);\n}/);
if (manageSemsModalMatch) {
    appJs = appJs.replace('const Badge = ({ text, type }) => {', manageSemsModalMatch[0] + '\n\nconst Badge = ({ text, type }) => {');
}

// 3. Add useState
appJs = appJs.replace('const [settingsOpen, setSettingsOpen] = useState(false);', 'const [settingsOpen, setSettingsOpen] = useState(false);\n  const [semesterMgmtOpen, setSemesterMgmtOpen] = useState(false);');

// 4. Update the dropdown button menu
const oldDropdown = '{role !== "student" && (\n                        <button onClick={() => { setSettingsOpen(true); setDropdownOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", borderRadius: 8, fontSize: 13, color: "var(--text-main)", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = \'rgba(255,255,255,0.05)\'} onMouseLeave={e => e.currentTarget.style.background = \'none\'}>\n                          ⚙️ Settings\n                        </button>\n                      )}';

const newDropdown = '{role !== "student" && (\n                        <button onClick={() => { setSettingsOpen(true); setDropdownOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", borderRadius: 8, fontSize: 13, color: "var(--text-main)", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = \'rgba(255,255,255,0.05)\'} onMouseLeave={e => e.currentTarget.style.background = \'none\'}>\n                          ⚙️ Settings\n                        </button>\n                      )}\n                      {(role === "owner" || role === "developer") && (\n                        <button onClick={() => { setSemesterMgmtOpen(true); setDropdownOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", borderRadius: 8, fontSize: 13, color: "var(--text-main)", cursor: "pointer", fontWeight: 600, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = \'rgba(255,255,255,0.05)\'} onMouseLeave={e => e.currentTarget.style.background = \'none\'}>\n                          📅 Manage Semesters\n                        </button>\n                      )}';

appJs = appJs.replace(oldDropdown, newDropdown);

// 5. Instaniate Modal
const oldModalRender = '<SettingsModal\n          title={appTitle}\n          logo={appLogo}\n          onClose={() => setSettingsOpen(false)}\n          onSave={handleSaveSettings}\n        />\n      )}';
const newModalRender = oldModalRender + '\n      <ManageSemestersModal \n        show={semesterMgmtOpen} \n        onClose={() => setSemesterMgmtOpen(false)} \n        token={auth.token} \n      />';

appJs = appJs.replace(oldModalRender, newModalRender);

// 6. Fix Map loops
appJs = appJs.replace(/\{semesters\.map\(s => <option key=\{s\.id\} value=\{s\.id\}( style=\{\{.*?\}\})?>\{s\.school_year\} - \{s\.term\}<\/option>\)\}/g, '{renderSemesterOptions(semesters)}');

fs.writeFileSync(appJsPath, appJs, 'utf8');
