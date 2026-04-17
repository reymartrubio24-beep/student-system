const fs = require('fs');
let c = fs.readFileSync('c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js', 'utf8');

// Insert the new state declarations and fetchRequests after the semesterId state line
const searchState = `  const [semesterId, setSemesterId] = useState("");\r\n\r\n  useEffect(() => {
    api("/semesters", {}, token).then(setSemesters).catch(() => {});
  }, [role, token]);`;

const replaceState = `  const [semesterId, setSemesterId] = useState("");
  const [requests, setRequests] = useState([]);
  const [requestModal, setRequestModal] = useState(null);
  const [reqForm, setReqForm] = useState({ subjectId: "", term: "1st Prelim", reason: "" });

  const fetchRequests = useCallback(async () => {
    try {
      if (role !== "student") {
        const data = await api("/grade-change-requests", {}, token);
        if (Array.isArray(data)) setRequests(data);
      }
    } catch {}
  }, [role, token]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    api("/semesters", {}, token).then(setSemesters).catch(() => {});
  }, [role, token]);`;

if (c.includes(searchState)) {
  c = c.replace(searchState, replaceState);
  console.log("State injection: SUCCESS");
} else {
  // Try CRLF version
  const searchCrlf = `  const [semesterId, setSemesterId] = useState("");\r\n\r\n  useEffect(() =\u003e {\r\n    api(\"/semesters\", {}, token).then(setSemesters).catch(() =\u003e {});\r\n  }, [role, token]);`;
  if (c.includes(searchCrlf)) {
    c = c.replace(searchCrlf, replaceState.replace(/\n/g, '\r\n'));
    console.log("State injection CRLF: SUCCESS");
  } else {
    console.log("State injection: FAILED - pattern not found");
  }
}

fs.writeFileSync('c:/Users/ADMIN/Desktop/bingtan/student-system/src/App.js', c);
