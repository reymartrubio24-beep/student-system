# API Overview

Base URL: http://localhost:4000

Authentication
- POST /auth/login
- POST /auth/register (developer/owner via users module)
- POST /auth/register-student (public, student accounts only)
- POST /auth/bootstrap-owner (one-time, env protected)

Students
- GET /students — read (student sees self only)
- POST /students — write
- PUT /students/:id — write
- DELETE /students/:id — delete

Subjects
- GET /subjects — read (teachers see own; students see enrolled subjects)
- POST /subjects — write (accepts semester_id)
- PUT /subjects/:id — write (accepts semester_id)
- DELETE /subjects/:id — delete

Grades
- GET /grades — read (student = self only)
- GET /grades/:studentId — read (student blocked from others)
- POST /grades — write
- PUT /grades/:studentId/:subjectId — write
- DELETE /grades/:studentId/:subjectId — delete

Student–Subject Management
- GET /students/:id/subjects — read (optionally ?semester_id=)
  - Role: staff via students:read; student may read only when :id matches own

Permits and Semesters
- GET /semesters — read
- POST /semesters — write
- PUT /semesters/:id — write
- DELETE /semesters/:id — delete
- GET /semesters/:id/periods — read
- POST /semesters/:id/periods — write
- PUT /periods/:id — write
- DELETE /periods/:id — delete
- GET /students/:id/permits — read
- POST /students/:id/permits — write
- PUT /students/:id/permits/:periodId — write
- DELETE /students/:id/permits/:periodId — delete
- GET /my-permits — student self permits

Payments
- GET /payments — read (student sees self only)
- GET /payments/:studentId — read (student blocked from others)
- POST /payments — write
- GET /students/:id/tuition-balance — read
- PUT /students/:id/tuition-balance — write

Dashboard
- GET /dashboard-stats — role-sensitive stats

RBAC Modules
- students, subjects, grades, payments, permits, dashboard, search, users

Super Roles
- developer, owner bypass checks

Notes
- All endpoints require Bearer token (authRequired) unless stated.
- Student privacy enforced at API: students cannot access other student records.
