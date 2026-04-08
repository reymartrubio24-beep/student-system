on_session_start:
- run_command: npm run dev
  cwd: c:\Users\anneb\OneDrive\Desktop\student-system
  async: true

on_prompt_received:
- check_url: http://localhost:4000/health
  if_fail:
    - run_command: npm start
      cwd: c:\Users\anneb\OneDrive\Desktop\student-system\server
      async: true
- check_url: http://localhost:3000/
  if_fail:
    - run_command: npm start
      cwd: c:\Users\anneb\OneDrive\Desktop\student-system
      async: true
