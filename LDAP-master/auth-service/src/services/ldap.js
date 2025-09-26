const ldap = require('ldapjs');
const winston = require('winston');

// LDAP 클라이언트 풀
let ldapClient = null;
let isConnected = false;

// LDAP 설정
const ldapConfig = {
  url: process.env.LDAP_URL || 'ldap://localhost:389',
  timeout: 5000,
  connectTimeout: 10000,
  idleTimeout: 30000,
  reconnect: true,
  bindDN: process.env.LDAP_BIND_DN || '',
  bindCredentials: process.env.LDAP_BIND_PASSWORD || '',
  baseDN: process.env.LDAP_BASE_DN || '',
  userDN: process.env.LDAP_USER_DN || 'ou=people',
  groupDN: process.env.LDAP_GROUP_DN || 'ou=groups'
};

// LDAP 속성 매핑 (DSM → 표준 속성)
const LDAP_ATTRIBUTE_MAPPING = {
  // 사용자 속성
  'uid': 'uid',
  'cn': 'cn',
  'sn': 'sn',
  'givenName': 'givenName',
  'displayName': 'displayName',
  'mail': 'mail',
  'telephoneNumber': 'phone',
  'mobile': 'mobile',
  'title': 'title',
  'department': 'department',
  'employeeID': 'employeeID',
  'employeeNumber': 'employeeNumber',
  'manager': 'manager',

  // 주소 정보
  'street': 'street',
  'l': 'city',
  'st': 'state',
  'postalCode': 'postalCode',
  'co': 'country',

  // 회사 정보
  'o': 'organization',
  'ou': 'organizationalUnit',

  // 계정 상태
  'accountStatus': 'accountStatus',
  'lockoutTime': 'lockoutTime',
  'lastLogon': 'lastLogon',
  'pwdLastSet': 'pwdLastSet'
};

// OIDC 클레임 매핑
const OIDC_CLAIM_MAPPING = {
  'sub': 'uid',
  'name': 'cn',
  'given_name': 'givenName',
  'family_name': 'sn',
  'preferred_username': 'displayName',
  'email': 'mail',
  'phone_number': 'telephoneNumber',
  'department': 'department',
  'employee_id': 'employeeID',
  'title': 'title'
};

// SAML 속성 매핑
const SAML_ATTRIBUTE_MAPPING = {
  'uid': 'urn:oid:0.9.2342.19200300.100.1.1',  // userID
  'mail': 'urn:oid:0.9.2342.19200300.100.1.3',  // mail
  'cn': 'urn:oid:2.5.4.3',  // commonName
  'givenName': 'urn:oid:2.5.4.42',  // givenName
  'sn': 'urn:oid:2.5.4.4',  // surname
  'displayName': 'urn:oid:2.16.840.1.113730.3.1.241',  // displayName
  'department': 'urn:oid:2.5.4.11',  // organizationalUnitName
  'title': 'urn:oid:2.5.4.12'  // title
};

/**
 * LDAP 클라이언트 초기화
 */
function initializeLDAP() {
  return new Promise((resolve, reject) => {
    try {
      if (ldapClient) {
        ldapClient.unbind();
      }

      ldapClient = ldap.createClient({
        url: ldapConfig.url,
        timeout: ldapConfig.timeout,
        connectTimeout: ldapConfig.connectTimeout,
        idleTimeout: ldapConfig.idleTimeout,
        reconnect: ldapConfig.reconnect
      });

      // 연결 이벤트
      ldapClient.on('connect', () => {
        winston.info('LDAP 서버에 연결되었습니다.');
        isConnected = true;
        resolve();
      });

      ldapClient.on('error', (err) => {
        winston.error('LDAP 연결 오류:', err);
        isConnected = false;
      });

      ldapClient.on('close', () => {
        winston.warn('LDAP 연결이 종료되었습니다.');
        isConnected = false;
      });

      // 초기 연결 시도
      ldapClient.bind(ldapConfig.bindDN, ldapConfig.bindCredentials, (err) => {
        if (err) {
          winston.error('LDAP 바인드 실패:', err);
          reject(err);
        } else {
          winston.info('LDAP 바인드 성공');
        }
      });

    } catch (error) {
      winston.error('LDAP 클라이언트 초기화 실패:', error);
      reject(error);
    }
  });
}

/**
 * LDAP 연결 상태 확인
 */
async function checkLDAPConnection() {
  return new Promise((resolve, reject) => {
    if (!ldapClient || !isConnected) {
      reject(new Error('LDAP 클라이언트가 초기화되지 않았습니다.'));
      return;
    }

    // 간단한 검색으로 연결 상태 확인
    const opts = {
      filter: '(objectClass=*)',
      scope: 'base',
      attributes: ['namingContexts']
    };

    ldapClient.search('', opts, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      res.on('searchEntry', () => {
        resolve(true);
      });

      res.on('error', (error) => {
        reject(error);
      });

      res.on('end', () => {
        // 검색 결과가 없어도 연결은 정상
        resolve(true);
      });
    });
  });
}

/**
 * LDAP 사용자 인증
 */
async function authenticateUser(username, password) {
  return new Promise((resolve, reject) => {
    if (!ldapClient || !isConnected) {
      reject(new Error('LDAP 클라이언트가 초기화되지 않았습니다.'));
      return;
    }

    // 사용자 DN 검색
    const userDN = await findUserDN(username);
    if (!userDN) {
      reject(new Error('사용자를 찾을 수 없습니다.'));
      return;
    }

    // 사용자 인증
    const client = ldap.createClient({
      url: ldapConfig.url,
      timeout: ldapConfig.timeout,
      connectTimeout: ldapConfig.connectTimeout
    });

    client.bind(userDN, password, (err) => {
      client.unbind();

      if (err) {
        winston.warn(`LDAP 인증 실패 - 사용자: ${username}, 오류: ${err.message}`);
        reject(new Error('인증에 실패했습니다.'));
      } else {
        winston.info(`LDAP 인증 성공 - 사용자: ${username}`);
        resolve({ username, userDN });
      }
    });
  });
}

/**
 * 사용자 DN 찾기
 */
async function findUserDN(username) {
  return new Promise((resolve, reject) => {
    if (!ldapClient || !isConnected) {
      reject(new Error('LDAP 클라이언트가 초기화되지 않았습니다.'));
      return;
    }

    const searchDN = `${ldapConfig.userDN},${ldapConfig.baseDN}`;
    const opts = {
      filter: `(|(uid=${username})(mail=${username})(cn=${username}))`,
      scope: 'sub',
      attributes: ['dn', 'uid']
    };

    let userDN = null;

    ldapClient.search(searchDN, opts, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      res.on('searchEntry', (entry) => {
        userDN = entry.dn;
      });

      res.on('error', (error) => {
        reject(error);
      });

      res.on('end', (result) => {
        if (result.status !== 0) {
          reject(new Error(`LDAP 검색 실패: ${result.errorMessage}`));
        } else {
          resolve(userDN);
        }
      });
    });
  });
}

/**
 * 사용자 정보 조회
 */
async function getUserInfo(username) {
  return new Promise((resolve, reject) => {
    if (!ldapClient || !isConnected) {
      reject(new Error('LDAP 클라이언트가 초기화되지 않았습니다.'));
      return;
    }

    const userDN = await findUserDN(username);
    if (!userDN) {
      reject(new Error('사용자를 찾을 수 없습니다.'));
      return;
    }

    const searchOptions = {
      filter: `(uid=${username})`,
      scope: 'sub',
      attributes: Object.keys(LDAP_ATTRIBUTE_MAPPING)
    };

    ldapClient.search(userDN, searchOptions, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      let userEntry = null;

      res.on('searchEntry', (entry) => {
        userEntry = entry;
      });

      res.on('error', (error) => {
        reject(error);
      });

      res.on('end', (result) => {
        if (result.status !== 0) {
          reject(new Error(`LDAP 검색 실패: ${result.errorMessage}`));
        } else if (!userEntry) {
          reject(new Error('사용자 정보를 찾을 수 없습니다.'));
        } else {
          resolve(parseLDAPEntry(userEntry));
        }
      });
    });
  });
}

/**
 * LDAP 엔트리 파싱
 */
function parseLDAPEntry(entry) {
  const user = {
    dn: entry.dn,
    raw: entry.object,
    ldapAttributes: {}
  };

  // LDAP 속성 매핑
  Object.entries(LDAP_ATTRIBUTE_MAPPING).forEach(([standardAttr, ldapAttr]) => {
    if (entry.object[ldapAttr]) {
      user.ldapAttributes[standardAttr] = entry.object[ldapAttr];
    }
  });

  // 표준 속성 설정
  user.uid = entry.object.uid || '';
  user.cn = entry.object.cn || '';
  user.sn = entry.object.sn || '';
  user.givenName = entry.object.givenName || '';
  user.displayName = entry.object.displayName || '';
  user.mail = entry.object.mail || '';
  user.department = entry.object.department || '';
  user.employeeID = entry.object.employeeID || '';
  user.title = entry.object.title || '';

  return user;
}

/**
 * OIDC 클레임으로 변환
 */
function mapToOidcClaims(ldapUser) {
  const claims = {
    sub: ldapUser.uid,
    name: ldapUser.cn,
    given_name: ldapUser.givenName,
    family_name: ldapUser.sn,
    preferred_username: ldapUser.displayName,
    email: ldapUser.mail,
    department: ldapUser.department,
    employee_id: ldapUser.employeeID,
    title: ldapUser.title,
    ldap_dn: ldapUser.dn
  };

  // 커스텀 클레임 추가
  Object.entries(OIDC_CLAIM_MAPPING).forEach(([claim, ldapAttr]) => {
    if (ldapUser[ldapAttr]) {
      claims[claim] = ldapUser[ldapAttr];
    }
  });

  return claims;
}

/**
 * SAML 속성으로 변환 (주석 처리됨 - 필요시 활성화)
 */
// function mapToSamlAttributes(ldapUser) {
//   const attributes = [];
//
//   Object.entries(SAML_ATTRIBUTE_MAPPING).forEach(([ldapAttr, samlAttr]) => {
//     if (ldapUser[ldapAttr]) {
//       attributes.push({
//         name: samlAttr,
//         value: Array.isArray(ldapUser[ldapAttr]) ? ldapUser[ldapAttr] : [ldapUser[ldapAttr]]
//       });
//     }
//   });
//
//   return attributes;
// }

/**
 * 사용자 그룹 조회
 */
async function getUserGroups(username) {
  return new Promise((resolve, reject) => {
    if (!ldapClient || !isConnected) {
      reject(new Error('LDAP 클라이언트가 초기화되지 않았습니다.'));
      return;
    }

    const userDN = await findUserDN(username);
    if (!userDN) {
      reject(new Error('사용자를 찾을 수 없습니다.'));
      return;
    }

    const searchDN = `${ldapConfig.groupDN},${ldapConfig.baseDN}`;
    const opts = {
      filter: `(member=${userDN})`,
      scope: 'sub',
      attributes: ['cn', 'description', 'member']
    };

    const groups = [];

    ldapClient.search(searchDN, opts, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      res.on('searchEntry', (entry) => {
        groups.push({
          cn: entry.object.cn,
          dn: entry.dn,
          description: entry.object.description || ''
        });
      });

      res.on('error', (error) => {
        reject(error);
      });

      res.on('end', (result) => {
        if (result.status !== 0) {
          reject(new Error(`LDAP 검색 실패: ${result.errorMessage}`));
        } else {
          resolve(groups);
        }
      });
    });
  });
}

/**
 * 사용자 검색
 */
async function searchUsers(searchTerm, limit = 50, offset = 0) {
  return new Promise((resolve, reject) => {
    if (!ldapClient || !isConnected) {
      reject(new Error('LDAP 클라이언트가 초기화되지 않았습니다.'));
      return;
    }

    const searchDN = `${ldapConfig.userDN},${ldapConfig.baseDN}`;
    const filter = `(|(uid=*${searchTerm}*)(cn=*${searchTerm}*)(mail=*${searchTerm}*)(displayName=*${searchTerm}*))`;

    const opts = {
      filter: filter,
      scope: 'sub',
      attributes: Object.keys(LDAP_ATTRIBUTE_MAPPING),
      sizeLimit: limit,
      paged: offset > 0 ? { pageSize: limit, pagePause: true } : false
    };

    const users = [];

    ldapClient.search(searchDN, opts, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      res.on('searchEntry', (entry) => {
        users.push(parseLDAPEntry(entry));
      });

      res.on('error', (error) => {
        reject(error);
      });

      res.on('end', (result) => {
        if (result.status !== 0) {
          reject(new Error(`LDAP 검색 실패: ${result.errorMessage}`));
        } else {
          resolve(users);
        }
      });
    });
  });
}

/**
 * 연결 종료
 */
function closeLDAP() {
  if (ldapClient) {
    ldapClient.unbind();
    ldapClient = null;
    isConnected = false;
    winston.info('LDAP 연결이 종료되었습니다.');
  }
}

// 프로세스 종료 시 정리
process.on('SIGINT', closeLDAP);
process.on('SIGTERM', closeLDAP);

module.exports = {
  initializeLDAP,
  checkLDAPConnection,
  authenticateUser,
  findUserDN,
  getUserInfo,
  getUserGroups,
  searchUsers,
  mapToOidcClaims,
  // mapToSamlAttributes, // SAML 기능 주석 처리됨
  parseLDAPEntry,
  closeLDAP,
  OIDC_CLAIM_MAPPING,
  // SAML_ATTRIBUTE_MAPPING, // SAML 기능 주석 처리됨
  LDAP_ATTRIBUTE_MAPPING
};
