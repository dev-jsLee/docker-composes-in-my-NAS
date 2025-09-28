-- 파이썬 학습 플랫폼 데이터베이스 초기화 스크립트

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 학습 모듈 테이블
CREATE TABLE IF NOT EXISTS learning_modules (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 레슨 테이블
CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES learning_modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
    estimated_time INTEGER DEFAULT 30, -- 예상 소요 시간 (분)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 실습 문제 테이블
CREATE TABLE IF NOT EXISTS practice_problems (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    starter_code TEXT,
    solution_code TEXT,
    test_cases JSONB, -- 테스트 케이스들
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    points INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 진도 테이블
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    completion_date TIMESTAMP WITH TIME ZONE,
    time_spent INTEGER DEFAULT 0, -- 소요 시간 (초)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, lesson_id)
);

-- 사용자 문제 해결 기록 테이블
CREATE TABLE IF NOT EXISTS user_problem_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    problem_id INTEGER REFERENCES practice_problems(id) ON DELETE CASCADE,
    submitted_code TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    execution_result JSONB, -- 실행 결과 저장
    points_earned INTEGER DEFAULT 0,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 코드 저장소 테이블
CREATE TABLE IF NOT EXISTS user_code_snippets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    tags VARCHAR(500), -- 쉼표로 구분된 태그들
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 세션 테이블 (Redis 대신 DB 사용시)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_practice_problems_lesson_id ON practice_problems(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_attempts_user_id ON user_problem_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_attempts_problem_id ON user_problem_attempts(problem_id);
CREATE INDEX IF NOT EXISTS idx_user_code_snippets_user_id ON user_code_snippets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- 기본 데이터 삽입
INSERT INTO learning_modules (title, description, order_index) VALUES
('파이썬 기초', '변수, 데이터 타입, 기본 연산을 배웁니다', 1),
('제어 구조', '조건문, 반복문, 예외 처리를 학습합니다', 2),
('함수와 모듈', '함수 정의, 모듈 사용법을 익힙니다', 3),
('객체 지향 프로그래밍', '클래스, 객체, 상속을 배웁니다', 4)
ON CONFLICT DO NOTHING;

-- 기본 레슨 데이터
INSERT INTO lessons (module_id, title, content, order_index, difficulty_level) VALUES
(1, '변수와 데이터 타입', '파이썬의 기본 데이터 타입을 배워봅시다', 1, 'beginner'),
(1, '문자열 다루기', '문자열 조작 방법을 학습합니다', 2, 'beginner'),
(2, '조건문 (if/else)', '조건에 따른 프로그램 흐름 제어', 1, 'beginner'),
(2, '반복문 (for/while)', '반복 작업을 효율적으로 처리하기', 2, 'beginner')
ON CONFLICT DO NOTHING;

-- 기본 실습 문제
INSERT INTO practice_problems (lesson_id, title, description, starter_code, solution_code, difficulty_level, points) VALUES
(1, 'Hello World 출력하기', '화면에 "Hello, Python!"을 출력하는 프로그램을 작성하세요', 
 '# 여기에 코드를 작성하세요\n', 
 'print("Hello, Python!")', 
 'beginner', 5),
(1, '변수 사용하기', '이름을 저장하는 변수를 만들고 인사말을 출력하세요', 
 '# 변수에 당신의 이름을 저장하세요\nname = \n# 인사말을 출력하세요\n', 
 'name = "Python"\nprint(f"안녕하세요, {name}님!")', 
 'beginner', 10)
ON CONFLICT DO NOTHING;

-- 업데이트 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 적용
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_modules_updated_at BEFORE UPDATE ON learning_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_practice_problems_updated_at BEFORE UPDATE ON practice_problems FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_code_snippets_updated_at BEFORE UPDATE ON user_code_snippets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
