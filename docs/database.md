Overview
- Persistent storage uses SQLite with WAL journaling for durability.
- All mutations use transactions to ensure atomicity and integrity.
- Records are soft-deleted via deleted_at; only admin/teacher can delete.
- Audit log records create/update/delete/login and manual backups.

Schema
- users(id, username unique, password_hash, role ['student','teacher','developer'], user_type ['student','teacher'] nullable, deleted_at, created_at)
- students(id PK, name, course, year, email, status, deleted_at)
- subjects(id PK, name, units, professor, schedule, room, deleted_at)
- grades(student_id, subject_id, prelim, midterm, prefinal, final, deleted_at, PK(student_id,subject_id))
- audit_log(id, user_id, action, entity, entity_id, details JSON, created_at)
- user_files(id, user_id, rel_path, deleted_at, created_at)

Security
- JWT auth using HMAC; secret loaded from environment (JWT_SECRET).
- Passwords hashed with bcrypt.
- Role-based access control:
  - admin, teacher: create/update/delete; backups
  - viewer: read only
- Soft delete prevents physical removal; only rows with deleted_at IS NULL are visible.

API Summary
- POST /auth/login
- POST /auth/register (developer only)
- POST /auth/register-student
- GET /users (developer only; add ?include_deleted=1 to include soft-deleted)
- POST /users (developer only)
- PUT /users/:id (developer only)
- DELETE /users/:id (developer only; soft delete)
- GET/POST/PUT/DELETE /students
- GET/POST/PUT/DELETE /subjects
- GET /grades/:studentId
- POST /grades
- PUT/DELETE /grades/:studentId/:subjectId
- POST /admin/backup (admin only)

Backup & Recovery
- One-off backup: from server folder run: npm run backup
- The script copies server/data/app.db to server/data/backups/app-<timestamp>.db
- Disaster recovery:
  - Stop server.
  - Copy chosen backup to server/data/app.db (replace existing).
  - Start server.

Operational Notes
- First boot creates a default admin user (username: admin, password: admin123). Change the password and create named admins immediately.
- Always set JWT_SECRET in production and rotate periodically.
- Use OS-level backups or scheduled tasks to run npm run backup regularly.
