-- PURWAVERSE IPA VIII - SQLITE RELATIONAL SCHEMA
-- Versi: 1.0.0
-- Migrasi dari Google Sheets ke SQLite (VPS Mandiri)

-- 1. MASTER CLASSES (Kelas 8A - 8E)
CREATE TABLE IF NOT EXISTS master_classes (
    class_id TEXT PRIMARY KEY,
    class_name TEXT NOT NULL,
    school_year TEXT NOT NULL,
    active INTEGER DEFAULT 1
);

-- 2. MASTER STUDENTS (Roster 207 Siswa Resmi)
CREATE TABLE IF NOT EXISTS master_students (
    student_id TEXT PRIMARY KEY,
    nis TEXT,
    nisn TEXT UNIQUE,
    name TEXT NOT NULL,
    gender TEXT,
    class_id TEXT NOT NULL REFERENCES master_classes(class_id) ON DELETE RESTRICT,
    roll_no INTEGER NOT NULL,
    pin_hash TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    source_row TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_students_class_roll ON master_students(class_id, roll_no);
CREATE INDEX IF NOT EXISTS idx_students_nisn ON master_students(nisn);

-- 3. MASTER ACTIVITIES (Materi, Kuis, Praktik, Riset, Tantangan)
CREATE TABLE IF NOT EXISTS master_activities (
    activity_id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    unit_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    max_score REAL DEFAULT 0,
    required INTEGER DEFAULT 1,
    public INTEGER DEFAULT 1,
    active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_activities_unit ON master_activities(unit_id);
CREATE INDEX IF NOT EXISTS idx_activities_chapter ON master_activities(chapter_id);

-- 4. DIAGNOSTIC ITEMS (25 Butir Soal Resmi Mission 0)
CREATE TABLE IF NOT EXISTS diagnostic_items (
    item_id TEXT PRIMARY KEY,
    source_number INTEGER,
    domain TEXT NOT NULL,
    prompt TEXT NOT NULL,
    rubric_json TEXT NOT NULL,
    max_score INTEGER DEFAULT 4,
    active INTEGER DEFAULT 1,
    source_status TEXT
);
CREATE INDEX IF NOT EXISTS idx_diag_items_domain ON diagnostic_items(domain);

-- 5. SELF MAP ITEMS (Angket Disposisi & Minat Sains)
CREATE TABLE IF NOT EXISTS self_map_items (
    item_id TEXT PRIMARY KEY,
    dimension TEXT,
    prompt TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    source_status TEXT
);

-- 6. SESSIONS (Token Sesi Siswa & Guru Berdurasi 8 Jam)
CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    class_id TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_actor ON sessions(actor_id, actor_type);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 7. PROGRESS (Rekam Jejak Status Aktivitas Siswa)
CREATE TABLE IF NOT EXISTS progress (
    progress_id TEXT PRIMARY KEY, -- format: student_id|activity_id
    student_id TEXT NOT NULL REFERENCES master_students(student_id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES master_activities(activity_id) ON DELETE RESTRICT,
    status TEXT NOT NULL,
    score REAL,
    evidence_json TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_progress_student ON progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_activity ON progress(activity_id);

-- 8. DIAGNOSTIC RESPONSES (Jawaban Mission 0 Siswa & Skor Guru 0-4)
CREATE TABLE IF NOT EXISTS diagnostic_responses (
    response_id TEXT PRIMARY KEY, -- format: student_id|item_id
    student_id TEXT NOT NULL REFERENCES master_students(student_id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES diagnostic_items(item_id) ON DELETE RESTRICT,
    answer TEXT,
    score INTEGER,
    scored_by TEXT,
    submitted_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_diag_resp_student ON diagnostic_responses(student_id);

-- 9. DIAGNOSTIC PROFILES (Agregasi 5 Domain, Leader Index, Research Readiness)
CREATE TABLE IF NOT EXISTS diagnostic_profiles (
    profile_id TEXT PRIMARY KEY REFERENCES master_students(student_id) ON DELETE CASCADE,
    student_id TEXT NOT NULL UNIQUE REFERENCES master_students(student_id) ON DELETE CASCADE,
    observe_infer REAL,
    evidence_experiment REAL,
    model_concept REAL,
    systems_causality REAL,
    technology_design REAL,
    overall_reasoning REAL,
    self_map_score REAL,
    leader_index REAL,
    research_readiness TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 10. TEAMS (Header Tim Laboratorium Per Kelas)
CREATE TABLE IF NOT EXISTS teams (
    team_id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES master_classes(class_id) ON DELETE RESTRICT,
    version INTEGER NOT NULL,
    balance_score REAL,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_teams_class_version ON teams(class_id, version);

-- 11. TEAM MEMBERS (Keanggotaan Tim, Leader, Deputy, Peran, Lock)
CREATE TABLE IF NOT EXISTS team_members (
    membership_id TEXT PRIMARY KEY, -- format: team_id|student_id
    team_id TEXT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES master_students(student_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    is_leader INTEGER DEFAULT 0,
    locked INTEGER DEFAULT 0,
    override_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_student ON team_members(student_id);

-- 12. GROUP LAB (Laporan Praktikum Tim LKPD 11 Bagian & Nilai Guru)
CREATE TABLE IF NOT EXISTS group_lab (
    lab_result_id TEXT PRIMARY KEY, -- format: team_id|activity_id
    class_id TEXT NOT NULL REFERENCES master_classes(class_id) ON DELETE RESTRICT,
    activity_id TEXT NOT NULL REFERENCES master_activities(activity_id) ON DELETE RESTRICT,
    team_id TEXT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    score REAL,
    result_json TEXT,
    teacher_note TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    updated_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_group_lab_team ON group_lab(team_id);
CREATE INDEX IF NOT EXISTS idx_group_lab_class_act ON group_lab(class_id, activity_id);

-- 13. STUDENT ACTIVITY STATE (Cache Status Gerbang Belajar Siswa)
CREATE TABLE IF NOT EXISTS student_activity_state (
    state_id TEXT PRIMARY KEY, -- format: student_id|activity_id
    student_id TEXT NOT NULL REFERENCES master_students(student_id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES master_activities(activity_id) ON DELETE RESTRICT,
    learning_status TEXT,
    unlock_status TEXT,
    best_score REAL,
    attempt_count INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_student_act_state_std ON student_activity_state(student_id);

-- 14. TEACHER CHECKS (Riwayat Append-Only Validasi Rangkuman Buku & LKPD)
CREATE TABLE IF NOT EXISTS teacher_checks (
    check_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES master_students(student_id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES master_activities(activity_id) ON DELETE RESTRICT,
    check_type TEXT NOT NULL,
    status TEXT NOT NULL,
    score REAL,
    note TEXT,
    checked_by TEXT,
    checked_at TEXT DEFAULT (datetime('now')),
    revision INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_teacher_checks_student ON teacher_checks(student_id, activity_id, check_type);

-- 15. QUIZ ITEMS (Bank Soal Kuis Per Submateri Tanpa Bocor ke Klien)
CREATE TABLE IF NOT EXISTS quiz_items (
    quiz_item_id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL REFERENCES master_activities(activity_id) ON DELETE RESTRICT,
    question_type TEXT NOT NULL,
    prompt TEXT NOT NULL,
    options_json TEXT NOT NULL,
    answer_json TEXT NOT NULL,
    feedback_json TEXT,
    max_score REAL DEFAULT 1,
    active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_quiz_items_act ON quiz_items(activity_id);

-- 16. QUIZ ATTEMPTS (Percobaan Kuis Siswa, Skor Akhir, KKM 70)
CREATE TABLE IF NOT EXISTS quiz_attempts (
    attempt_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES master_students(student_id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES master_activities(activity_id) ON DELETE RESTRICT,
    attempt_number INTEGER NOT NULL,
    score REAL,
    passed INTEGER DEFAULT 0,
    started_at TEXT DEFAULT (datetime('now')),
    submitted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_std ON quiz_attempts(student_id, activity_id);

-- 17. QUIZ RESPONSES (Log Jawaban Butir Kuis Per Percobaan)
CREATE TABLE IF NOT EXISTS quiz_responses (
    response_id TEXT PRIMARY KEY, -- format: attempt_id|quiz_item_id
    attempt_id TEXT NOT NULL REFERENCES quiz_attempts(attempt_id) ON DELETE CASCADE,
    quiz_item_id TEXT NOT NULL REFERENCES quiz_items(quiz_item_id) ON DELETE RESTRICT,
    answer_json TEXT,
    score REAL,
    feedback_code TEXT
);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_att ON quiz_responses(attempt_id);

-- 18. SKILL EVIDENCE (Bukti Keterampilan Inkuiri Kurikulum Merdeka)
CREATE TABLE IF NOT EXISTS skill_evidence (
    evidence_id TEXT PRIMARY KEY, -- format: student_id|activity_id|skill_code
    student_id TEXT NOT NULL REFERENCES master_students(student_id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES master_activities(activity_id) ON DELETE RESTRICT,
    team_id TEXT,
    skill_code TEXT NOT NULL,
    source_type TEXT,
    source_id TEXT,
    status TEXT NOT NULL,
    verified_by TEXT,
    verified_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_std ON skill_evidence(student_id);

-- 19. UNLOCK OVERRIDES (Dispensasi Pembukaan Materi oleh Guru)
CREATE TABLE IF NOT EXISTS unlock_overrides (
    override_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES master_students(student_id) ON DELETE CASCADE,
    activity_id TEXT NOT NULL REFERENCES master_activities(activity_id) ON DELETE RESTRICT,
    allowed INTEGER DEFAULT 1,
    reason TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_unlock_std_act ON unlock_overrides(student_id, activity_id);

-- 20. ATTENDANCE (Presensi Otomatis Harian Siswa Saat Login)
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id TEXT PRIMARY KEY, -- format: student_id|YYYY-MM-DD
    student_id TEXT NOT NULL REFERENCES master_students(student_id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES master_classes(class_id) ON DELETE RESTRICT,
    date TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);

-- 21. SETTINGS (Pengaturan Non-Rahasia & Sinyal Kebingungan Siswa)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 22. AUDIT LOG (Jejak Forensik Aksi Penting Siswa & Guru)
CREATE TABLE IF NOT EXISTS audit_log (
    event_id TEXT PRIMARY KEY,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    detail_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- 23. PIN ISSUANCE (Penerbitan PIN Siswa untuk Cetak Kartu Fisik - Privat)
CREATE TABLE IF NOT EXISTS pin_issuance (
    student_id TEXT PRIMARY KEY REFERENCES master_students(student_id) ON DELETE CASCADE,
    class_id TEXT NOT NULL REFERENCES master_classes(class_id) ON DELETE RESTRICT,
    roll_no INTEGER NOT NULL,
    pin TEXT NOT NULL,
    issued_at TEXT DEFAULT (datetime('now')),
    rotated_at TEXT
);
