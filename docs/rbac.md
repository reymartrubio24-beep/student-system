# Roles and Permissions

Roles:
- student: personal dashboard, own grades, own permits, own payments
- teacher: full access to dashboard, search, students, subjects, grades; permit verification by room/block
- saps: assign/manage student permits; full access to students, subjects, grades, payments, search
- register (Registrar): full access to students, subjects, grades, payments, search
- cashier: payments, students, student permits, search
- developer/owner: full access; owner can restore deleted entities

Permission Matrix (summary):
- Students: GET /students (self only), GET /grades (self only)
- Teachers: full CRUD on /students, /subjects, /grades
- SAPS: GET/PUT /students/:id/permit, GET/PUT /students/:id/tuition-balance, GET /students, GET /payments/:studentId
- Register: POST/PUT/DELETE /subjects, POST/PUT/DELETE /grades, GET/PUT /students/:id/tuition-balance, GET /students, GET /payments/:studentId
- Cashier: POST /payments, GET /payments/:studentId, GET/PUT /students/:id/tuition-balance, GET /students
- Developer/Owner: all endpoints; owner-only /admin/restore

Key Endpoints:
- Auth
  - POST /auth/login
  - POST /auth/register (developer only)
  - POST /auth/register-student (removed from UI, still available)
  - POST /auth/bootstrap-owner (protected by env token)
- Users (developer/owner)
  - GET /users
  - POST /users
  - PUT /users/:id
  - DELETE /users/:id
- Students
  - GET /students (student sees self; others see all, RBAC-enforced)
  - POST /students (teacher/developer/register/saps)
  - PUT /students/:id (teacher/developer/register/saps)
  - DELETE /students/:id (teacher/developer/register)
  - GET /students/:id/permit (saps/developer/owner/register)
  - PUT /students/:id/permit (saps/developer/owner)
  - GET /students/:id/tuition-balance (saps/register/cashier/developer/owner)
  - PUT /students/:id/tuition-balance (saps/register/cashier/developer/owner)
- Subjects
  - GET /subjects (RBAC-enforced; cashier blocked)
  - POST /subjects (teacher/developer/register)
  - PUT /subjects/:id (teacher/developer/register)
  - DELETE /subjects/:id (teacher/developer/register)
- Grades
  - GET /grades (student = own only; others = all, RBAC-enforced)
  - GET /grades/:studentId (student blocked from others)
  - POST /grades (teacher/developer/register)
  - PUT /grades/:studentId/:subjectId (teacher/developer/register)
  - DELETE /grades/:studentId/:subjectId (teacher/developer/register)
- Payments
  - POST /payments (cashier/developer/owner)
  - GET /payments/:studentId (cashier/register/saps/developer/owner)
  - GET /payments (student = own only; staff = all)
- Admin
  - POST /admin/backup (developer/owner)
  - POST /admin/cleanup-orphan-grades (developer/owner)
  - POST /admin/restore (owner)

Audit Logging:
- Records LOGIN, CREATE/UPDATE/DELETE/RESTORE actions, ROLE_CHANGE, CLEANUP, BACKUP with details.

Privacy Controls:
- Students only see their own student record, subjects, grades, permits, and payments.
- Higher roles retain visibility to all students and grades.
