# DSM WebStation과 LDAP 통합 가이드

이 문서는 DSM WebStation에서 회원가입 페이지를 구현하고 LDAP에 사용자 정보를 저장하는 방법을 설명합니다.

## 📋 개요

### 현재 상황
- **kwonluna.co.kr**: DSM WebStation에서 메인 홈페이지 서빙
- **DSM WebStation**: Synology NAS의 웹 서버 (Apache + PHP + MySQL)
- **목표**: WebStation에서 회원가입 → LDAP 저장 → Docker SSO 연동

### 통합 아키텍처
```
DSM WebStation (kwonluna.co.kr)
├── 회원가입 페이지 (PHP)
├── LDAP 연동 모듈
└── 사용자 정보 저장

DSM LDAP Server
├── 사용자 계정 저장
└── 인증 정보 관리

Docker SSO 시스템
├── auth-service (OIDC Provider)
├── sso-provider (토큰 관리)
└── Redis (세션 공유)
```

## 🚀 구현 단계

### 1단계: DSM WebStation 준비사항

#### 1.1 DSM WebStation 활성화
1. DSM 제어판 → 웹 서비스 → Web Station 활성화
2. PHP 지원 활성화 (버전 7.4+ 권장)
3. MySQL 데이터베이스 활성화 (선택사항)

#### 1.2 웹 디렉토리 구조
```
/volume1/web/
├── index.php          # 메인 홈페이지
├── register.php       # 회원가입 페이지
├── login.php          # 로그인 페이지
├── auth/
│   ├── ldap.php       # LDAP 연동 모듈
│   ├── config.php     # 설정 파일
│   └── utils.php      # 유틸리티 함수
└── css/
    └── style.css      # 스타일시트
```

### 2단계: LDAP 연동 PHP 모듈 구현

#### 2.1 LDAP 연결 설정
```php
<?php
// auth/config.php
define('LDAP_SERVER', 'localhost');  // DSM LDAP 서버
define('LDAP_PORT', 389);
define('LDAP_BASE_DN', 'dc=dsm,dc=local');
define('LDAP_ADMIN_DN', 'cn=admin,dc=dsm,dc=local');
define('LDAP_ADMIN_PASSWORD', 'your-admin-password');
define('LDAP_USER_DN', 'ou=people,dc=dsm,dc=local');
define('LDAP_GROUP_DN', 'ou=groups,dc=dsm,dc=local');
```

#### 2.2 LDAP 연동 클래스
```php
<?php
// auth/ldap.php
class DSM_LDAP {
    private $connection;
    private $config;

    public function __construct() {
        $this->config = [
            'server' => LDAP_SERVER,
            'port' => LDAP_PORT,
            'base_dn' => LDAP_BASE_DN,
            'admin_dn' => LDAP_ADMIN_DN,
            'admin_password' => LDAP_ADMIN_PASSWORD,
            'user_dn' => LDAP_USER_DN
        ];
        $this->connect();
    }

    private function connect() {
        $this->connection = ldap_connect($this->config['server'], $this->config['port']);
        if (!$this->connection) {
            throw new Exception("LDAP 서버 연결 실패");
        }

        ldap_set_option($this->connection, LDAP_OPT_PROTOCOL_VERSION, 3);
        ldap_set_option($this->connection, LDAP_OPT_REFERRALS, 0);

        $bind = ldap_bind($this->connection, $this->config['admin_dn'], $this->config['admin_password']);
        if (!$bind) {
            throw new Exception("LDAP 바인드 실패");
        }
    }

    public function userExists($username) {
        $filter = "(|(uid=$username)(mail=$username))";
        $result = ldap_search($this->connection, $this->config['user_dn'], $filter, ['uid']);
        $entries = ldap_get_entries($this->connection, $result);
        return $entries['count'] > 0;
    }

    public function createUser($userData) {
        // 사용자 DN 생성
        $userDN = "uid={$userData['username']},{$this->config['user_dn']}";

        // LDAP 속성 설정
        $entry = [
            'objectClass' => ['inetOrgPerson', 'posixAccount', 'top'],
            'uid' => $userData['username'],
            'cn' => $userData['fullname'],
            'sn' => $userData['lastname'],
            'givenName' => $userData['firstname'],
            'mail' => $userData['email'],
            'userPassword' => $this->hashPassword($userData['password']),
            'displayName' => $userData['fullname'],
            'department' => $userData['department'] ?? '일반사용자',
            'homeDirectory' => "/home/{$userData['username']}",
            'loginShell' => '/bin/bash',
            'uidNumber' => time(), // 임시 UID 번호
            'gidNumber' => 1000     // 기본 그룹
        ];

        // 사용자 생성
        $result = ldap_add($this->connection, $userDN, $entry);
        if (!$result) {
            throw new Exception("사용자 생성 실패: " . ldap_error($this->connection));
        }

        // 기본 그룹에 추가
        $this->addUserToGroup($userData['username'], 'users');

        return true;
    }

    private function hashPassword($password) {
        // SSHA 해시 생성 (DSM LDAP 호환)
        $salt = random_bytes(8);
        $hash = '{SSHA}' . base64_encode(sha1($password . $salt, true) . $salt);
        return $hash;
    }

    public function authenticateUser($username, $password) {
        $filter = "(|(uid=$username)(mail=$username))";
        $result = ldap_search($this->connection, $this->config['user_dn'], $filter, ['dn', 'uid']);
        $entries = ldap_get_entries($this->connection, $result);

        if ($entries['count'] === 0) {
            return false;
        }

        $userDN = $entries[0]['dn'];
        $bind = ldap_bind($this->connection, $userDN, $password);

        return $bind;
    }

    public function getUserInfo($username) {
        $filter = "(uid=$username)";
        $attributes = ['uid', 'cn', 'mail', 'displayname', 'department', 'employeetype'];

        $result = ldap_search($this->connection, $this->config['user_dn'], $filter, $attributes);
        $entries = ldap_get_entries($this->connection, $result);

        if ($entries['count'] === 0) {
            return false;
        }

        return [
            'uid' => $entries[0]['uid'][0],
            'cn' => $entries[0]['cn'][0],
            'mail' => $entries[0]['mail'][0],
            'displayName' => $entries[0]['displayname'][0] ?? $entries[0]['cn'][0],
            'department' => $entries[0]['department'][0] ?? '',
            'employeeType' => $entries[0]['employeetype'][0] ?? '일반사용자'
        ];
    }

    private function addUserToGroup($username, $groupName) {
        // 그룹 DN 찾기
        $filter = "(cn=$groupName)";
        $result = ldap_search($this->connection, $this->config['group_dn'], $filter, ['dn']);
        $entries = ldap_get_entries($this->connection, $result);

        if ($entries['count'] === 0) {
            return; // 그룹이 없으면 무시
        }

        $groupDN = $entries[0]['dn'];
        $userDN = "uid=$username,{$this->config['user_dn']}";

        // 사용자 DN을 그룹의 member 속성에 추가
        $entry = [
            'member' => $userDN
        ];

        ldap_mod_add($this->connection, $groupDN, $entry);
    }

    public function __destruct() {
        if ($this->connection) {
            ldap_close($this->connection);
        }
    }
}
?>
```

### 3단계: 회원가입 페이지 구현

#### 3.1 회원가입 폼
```php
<?php
// register.php
require_once 'auth/config.php';
require_once 'auth/ldap.php';

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $ldap = new DSM_LDAP();

        // 입력값 검증
        $username = trim($_POST['username']);
        $email = trim($_POST['email']);
        $password = $_POST['password'];
        $fullname = trim($_POST['fullname']);
        $firstname = trim($_POST['firstname']);
        $lastname = trim($_POST['lastname']);
        $department = trim($_POST['department']);

        // 입력값 검증
        if (empty($username) || empty($email) || empty($password)) {
            throw new Exception("모든 필드를 입력해주세요.");
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("올바른 이메일 형식이 아닙니다.");
        }

        if (strlen($password) < 6) {
            throw new Exception("비밀번호는 6자리 이상이어야 합니다.");
        }

        // 사용자명 중복 확인
        if ($ldap->userExists($username)) {
            throw new Exception("이미 사용중인 사용자명입니다.");
        }

        if ($ldap->userExists($email)) {
            throw new Exception("이미 등록된 이메일입니다.");
        }

        // 사용자 정보 배열 생성
        $userData = [
            'username' => $username,
            'email' => $email,
            'password' => $password,
            'fullname' => $fullname,
            'firstname' => $firstname,
            'lastname' => $lastname,
            'department' => $department
        ];

        // 사용자 생성
        $ldap->createUser($userData);

        $success = "회원가입이 완료되었습니다. 이제 로그인할 수 있습니다.";

    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>회원가입 - kwonluna.co.kr</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>kwonluna.co.kr</h1>
            <p>DSM 기반 통합 회원 시스템</p>
        </header>

        <main>
            <div class="register-form">
                <h2>회원가입</h2>

                <?php if ($error): ?>
                    <div class="error-message">
                        <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php endif; ?>

                <?php if ($success): ?>
                    <div class="success-message">
                        <?php echo htmlspecialchars($success); ?>
                    </div>
                <?php endif; ?>

                <form method="POST" action="">
                    <div class="form-group">
                        <label for="username">사용자명 *</label>
                        <input type="text" id="username" name="username" required
                               pattern="[a-zA-Z0-9_]{3,20}"
                               title="3-20자의 영문, 숫자, 밑줄만 사용 가능">
                    </div>

                    <div class="form-group">
                        <label for="email">이메일 *</label>
                        <input type="email" id="email" name="email" required>
                    </div>

                    <div class="form-group">
                        <label for="password">비밀번호 *</label>
                        <input type="password" id="password" name="password" required minlength="6">
                    </div>

                    <div class="form-group">
                        <label for="fullname">성명 *</label>
                        <input type="text" id="fullname" name="fullname" required>
                    </div>

                    <div class="form-group">
                        <label for="firstname">이름</label>
                        <input type="text" id="firstname" name="firstname">
                    </div>

                    <div class="form-group">
                        <label for="lastname">성</label>
                        <input type="text" id="lastname" name="lastname">
                    </div>

                    <div class="form-group">
                        <label for="department">부서</label>
                        <select id="department" name="department">
                            <option value="">선택하세요</option>
                            <option value="일반사용자">일반사용자</option>
                            <option value="개발팀">개발팀</option>
                            <option value="디자인팀">디자인팀</option>
                            <option value="마케팅팀">마케팅팀</option>
                            <option value="영업팀">영업팀</option>
                            <option value="관리팀">관리팀</option>
                        </select>
                    </div>

                    <button type="submit" class="btn-primary">회원가입</button>
                </form>

                <div class="login-link">
                    <p>이미 계정이 있으신가요? <a href="login.php">로그인</a></p>
                </div>
            </div>
        </main>

        <footer>
            <p>&copy; 2024 kwonluna.co.kr. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>
```

#### 3.2 로그인 페이지
```php
<?php
// login.php
require_once 'auth/config.php';
require_once 'auth/ldap.php';

session_start();
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $ldap = new DSM_LDAP();

        $username = trim($_POST['username']);
        $password = $_POST['password'];

        if (empty($username) || empty($password)) {
            throw new Exception("사용자명과 비밀번호를 입력해주세요.");
        }

        // LDAP 인증
        if ($ldap->authenticateUser($username, $password)) {
            // 세션에 사용자 정보 저장
            $_SESSION['username'] = $username;
            $_SESSION['login_time'] = time();

            // 사용자 정보 가져오기
            $userInfo = $ldap->getUserInfo($username);

            // Docker SSO로 리다이렉트 (OIDC 인증)
            header("Location: http://localhost:3002/oidc/authorize?" .
                   "response_type=code&" .
                   "client_id=webstation-client&" .
                   "redirect_uri=http://kwonluna.co.kr/auth/callback&" .
                   "scope=openid+profile+email&" .
                   "state=" . urlencode(json_encode([
                       'service' => 'webstation',
                       'username' => $username
                   ])));
            exit();
        } else {
            throw new Exception("로그인에 실패했습니다.");
        }

    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>로그인 - kwonluna.co.kr</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>kwonluna.co.kr</h1>
            <p>DSM 기반 통합 회원 시스템</p>
        </header>

        <main>
            <div class="login-form">
                <h2>로그인</h2>

                <?php if ($error): ?>
                    <div class="error-message">
                        <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php endif; ?>

                <form method="POST" action="">
                    <div class="form-group">
                        <label for="username">사용자명 또는 이메일</label>
                        <input type="text" id="username" name="username" required>
                    </div>

                    <div class="form-group">
                        <label for="password">비밀번호</label>
                        <input type="password" id="password" name="password" required>
                    </div>

                    <button type="submit" class="btn-primary">로그인</button>
                </form>

                <div class="register-link">
                    <p>계정이 없으신가요? <a href="register.php">회원가입</a></p>
                </div>
            </div>
        </main>

        <footer>
            <p>&copy; 2024 kwonluna.co.kr. All rights reserved.</p>
        </footer>
    </div>
</body>
</html>
```

### 4단계: Docker SSO 연동

#### 4.1 WebStation용 OIDC 클라이언트 등록
```sql
-- WebStation용 OIDC 클라이언트 등록
INSERT INTO oauth_clients (
    client_id,
    client_secret,
    client_name,
    redirect_uris,
    grant_types,
    response_types,
    scope
) VALUES (
    'webstation-client',
    'webstation-client-secret-change-in-production',
    'DSM WebStation',
    ARRAY[
        'http://kwonluna.co.kr/auth/callback',
        'https://kwonluna.co.kr/auth/callback'
    ],
    ARRAY['authorization_code'],
    ARRAY['code'],
    'openid profile email'
) ON CONFLICT (client_id) DO NOTHING;
```

#### 4.2 인증 콜백 처리
```php
<?php
// auth/callback.php
require_once '../auth/config.php';
require_once '../auth/ldap.php';

session_start();

// OIDC 콜백 처리
if (isset($_GET['code'])) {
    $code = $_GET['code'];
    $state = json_decode($_GET['state'] ?? '{}', true);

    try {
        // Authorization Code를 Access Token으로 교환
        $tokenResponse = exchangeCodeForToken($code);

        // 사용자 정보 조회
        $userInfo = getUserInfoFromToken($tokenResponse['access_token']);

        // 세션에 사용자 정보 저장
        $_SESSION['access_token'] = $tokenResponse['access_token'];
        $_SESSION['user_info'] = $userInfo;
        $_SESSION['authenticated'] = true;

        // 메인 페이지로 리다이렉트
        header('Location: /');
        exit();

    } catch (Exception $e) {
        error_log("OIDC 콜백 처리 실패: " . $e->getMessage());
        header('Location: /login.php?error=authentication_failed');
        exit();
    }
}

function exchangeCodeForToken($code) {
    $tokenEndpoint = 'http://localhost:3002/oidc/token';

    $postData = [
        'grant_type' => 'authorization_code',
        'code' => $code,
        'client_id' => 'webstation-client',
        'client_secret' => 'webstation-client-secret-change-in-production',
        'redirect_uri' => 'http://kwonluna.co.kr/auth/callback'
    ];

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => http_build_query($postData)
        ]
    ]);

    $result = file_get_contents($tokenEndpoint, false, $context);
    return json_decode($result, true);
}

function getUserInfoFromToken($accessToken) {
    $userinfoEndpoint = 'http://localhost:3002/oidc/userinfo';

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Authorization: Bearer ' . $accessToken
        ]
    ]);

    $result = file_get_contents($userinfoEndpoint, false, $context);
    return json_decode($result, true);
}
?>
```

### 5단계: 스타일시트 및 보안

#### 5.1 기본 스타일시트
```css
/* css/style.css */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
    background-color: #f4f4f4;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    margin-bottom: 40px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 10px;
}

main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
}

.register-form, .login-form {
    background: white;
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 500px;
}

.form-group {
    margin-bottom: 20px;
}

label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #555;
}

input, select {
    width: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 16px;
}

input:focus, select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 2px rgba(102,126,234,0.2);
}

.btn-primary {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.2s;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(102,126,234,0.4);
}

.error-message {
    background: #ffebee;
    color: #c62828;
    padding: 12px;
    border-radius: 5px;
    margin-bottom: 20px;
    border-left: 4px solid #c62828;
}

.success-message {
    background: #e8f5e8;
    color: #2e7d32;
    padding: 12px;
    border-radius: 5px;
    margin-bottom: 20px;
    border-left: 4px solid #2e7d32;
}

footer {
    text-align: center;
    margin-top: 40px;
    color: #666;
}
```

#### 5.2 보안 설정
```php
<?php
// auth/security.php
function validateInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validateCSRFToken($token) {
    return hash_equals($_SESSION['csrf_token'], $token);
}

function rateLimitCheck($username, $maxAttempts = 5, $timeWindow = 300) {
    $file = "/tmp/ratelimit_$username.txt";

    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true);
        $lastAttempt = $data['last_attempt'];
        $attempts = $data['attempts'];

        if (time() - $lastAttempt < $timeWindow) {
            if ($attempts >= $maxAttempts) {
                throw new Exception("너무 많은 로그인 시도. {$timeWindow}초 후 재시도하세요.");
            }
        } else {
            // 시간 초과로 초기화
            $attempts = 0;
        }
    } else {
        $attempts = 0;
    }

    // 시도 횟수 증가
    $attempts++;
    $data = [
        'attempts' => $attempts,
        'last_attempt' => time()
    ];

    file_put_contents($file, json_encode($data));
    return $attempts;
}
?>
```

## 🔧 DSM 설정

### 1. DSM WebStation 설정
1. DSM 제어판 → 웹 서비스 → Web Station
2. PHP 설정에서 `file_uploads = On` 활성화
3. `upload_max_filesize` 및 `post_max_size` 조정

### 2. PHP 설정 최적화
```ini
; /usr/local/etc/php/conf.d/custom.ini
display_errors = Off
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
log_errors = On
error_log = /var/log/php/error.log

memory_limit = 128M
upload_max_filesize = 10M
post_max_size = 10M
max_execution_time = 30

session.save_path = /tmp/php_sessions
session.gc_maxlifetime = 1440
```

### 3. 파일 권한 설정
```bash
# DSM 쉘에서
chmod 755 /volume1/web/
chmod 644 /volume1/web/*.php
chmod 755 /volume1/web/auth/
chmod 644 /volume1/web/css/*
```

## 🚀 배포 및 테스트

### 1. DSM WebStation에 파일 업로드
```
/volume1/web/
├── index.php
├── register.php
├── login.php
├── auth/
│   ├── ldap.php
│   ├── config.php
│   └── security.php
└── css/
    └── style.css
```

### 2. LDAP 연결 테스트
```php
<?php
require_once 'auth/ldap.php';

try {
    $ldap = new DSM_LDAP();
    echo "LDAP 연결 성공!\n";

    // 테스트 사용자 생성
    $testUser = [
        'username' => 'testuser',
        'email' => 'test@example.com',
        'password' => 'testpass123',
        'fullname' => '테스트 사용자',
        'firstname' => '테스트',
        'lastname' => '사용자',
        'department' => '테스트팀'
    ];

    $ldap->createUser($testUser);
    echo "테스트 사용자 생성 완료!\n";

} catch (Exception $e) {
    echo "오류: " . $e->getMessage() . "\n";
}
?>
```

### 3. 회원가입 테스트
1. http://kwonluna.co.kr/register.php 접속
2. 테스트 사용자 정보 입력
3. LDAP에 사용자 정보 저장 확인

### 4. Docker SSO 연동 테스트
1. 로그인 페이지에서 OIDC 인증
2. Docker SSO로 리다이렉트 확인
3. 토큰 발급 및 세션 생성 확인

## 🔒 보안 고려사항

### 1. 입력값 검증
- XSS 방지를 위한 HTML 이스케이프
- SQL 인젝션 방지를 위한 입력값 검증
- CSRF 토큰 사용

### 2. LDAP 보안
- LDAPS (LDAP over SSL) 사용 권장
- LDAP 연결 풀링 및 타임아웃 설정
- 에러 메시지에 민감한 정보 노출 금지

### 3. 세션 보안
- HTTPS 전용 쿠키 설정
- 세션 만료 시간 설정
- 세션 하이재킹 방지

### 4. Rate Limiting
- 로그인 시도 제한
- 회원가입 요청 제한
- 브루트 포스 공격 방지

## 📊 모니터링 및 로깅

### 1. PHP 에러 로그
```bash
tail -f /var/log/php/error.log
```

### 2. DSM 시스템 로그
```bash
tail -f /var/log/synolog/synolog.log
```

### 3. LDAP 로그 (필요시)
```bash
# DSM LDAP 서비스 로그 위치
/var/log/slapd.log
```

## 🔧 문제 해결

### 일반적인 문제

#### 1. LDAP 연결 실패
```bash
# DSM LDAP 서비스 상태 확인
systemctl status directory-service

# LDAP 포트 확인
netstat -tlnp | grep :389

# DSM LDAP 설정 확인
# DSM 제어판 → 도메인/LDAP → LDAP 서버
```

#### 2. PHP 파일 권한 문제
```bash
# 파일 권한 확인 및 수정
ls -la /volume1/web/
chmod 644 /volume1/web/*.php
chmod 755 /volume1/web/auth/
```

#### 3. OIDC 콜백 실패
```bash
# Docker SSO 서비스 상태 확인
docker-compose logs sso-provider

# OIDC 클라이언트 설정 확인
docker-compose exec postgres psql -U sso_user -d sso_db -c \
  "SELECT * FROM oauth_clients WHERE client_id = 'webstation-client';"
```

이제 DSM WebStation에서 LDAP를 통한 회원가입과 Docker SSO 연동이 완성되었습니다! 🎉
