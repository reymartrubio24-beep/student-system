# Student ID and Account Workflow

- Student IDs use pattern YYYY-XXXXXX
  - YYYY = current year
  - XXXXXX = 6-digit sequential counter per year
  - No gaps: sequence advances only on successful insert
  - Concurrency safety via BEGIN IMMEDIATE transaction

- On student creation:
  - Generate next ID atomically and insert student
  - Create linked user:
    - Username = sanitized last name; duplicates gain numeric suffix
    - Password = student ID (hashed)
    - role = student, user_type = student, users.student_id links the record
  - Audit:
    - ID_GENERATE for student
    - USER_CREATE for user

- Failure handling:
  - Entire operation runs in a single transaction
  - Any error triggers rollback; sequence not advanced

- Tables:
  - student_id_sequence(year TEXT PRIMARY KEY, last INTEGER NOT NULL)

- Tests cover:
  - Pattern conformity
  - Concurrency (parallel creations)
  - Username sanitization and duplicate suffixes
  - Rollback behavior on failures
