// 서비스 디스커버리 미들웨어 - 진짜 자동 인식
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ServiceDiscovery {
  constructor() {
    this.internalServices = new Map();
    this.externalServices = new Map();
    this.configPath = path.join(__dirname, '../config/services.json');
    this.loadServices();
    
    if (process.env.SERVICE_DISCOVERY_ENABLED === 'true') {
      this.startHealthCheck();
      
      // 네트워크 스캔 시작
      if (process.env.NETWORK_SCAN_ENABLED === 'true') {
        this.startNetworkDiscovery();
      }
    }
  }

  // 서비스 설정 파일 로드
  loadServices() {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        
        // 내부 서비스 로드
        if (config.internalServices) {
          config.internalServices.forEach(service => {
            this.internalServices.set(service.id, service);
          });
        }
        
        // 외부 서비스 로드
        if (config.externalServices) {
          config.externalServices.forEach(service => {
            this.externalServices.set(service.id, service);
          });
        }
        
        console.log(`[ServiceDiscovery] 내부 서비스 ${this.internalServices.size}개, 외부 서비스 ${this.externalServices.size}개 로드됨`);
      } else {
        console.log('[ServiceDiscovery] 서비스 설정 파일이 없습니다.');
        this.createDefaultConfig();
      }
    } catch (error) {
      console.error('[ServiceDiscovery] 서비스 로드 중 오류:', error.message);
    }
  }

  // 기본 서비스 설정 생성
  createDefaultConfig() {
    const defaultConfig = {
      internalServices: [
        {
          id: "board",
          name: "게시판",
          description: "공지사항 및 자유게시판",
          url: "/board",
          icon: "📝",
          category: "커뮤니케이션",
          status: "active",
          requiredRoles: ["user"],
          isInternal: true,
          features: ["글쓰기", "댓글", "파일첨부", "검색"]
        },
        {
          id: "calendar",
          name: "일정 공유",
          description: "팀 일정 관리 및 공유",
          url: "/calendar",
          icon: "📅",
          category: "협업",
          status: "active",
          requiredRoles: ["user"],
          isInternal: true,
          features: ["일정등록", "알림", "공유", "반복일정"]
        },
        {
          id: "gallery",
          name: "이미지 공유",
          description: "이미지 업로드 및 갤러리",
          url: "/gallery",
          icon: "🖼️",
          category: "미디어",
          status: "active",
          requiredRoles: ["user"],
          isInternal: true,
          features: ["이미지업로드", "썸네일", "앨범", "다운로드"]
        }
      ],
      externalServices: [],
      categories: [
        {
          id: "커뮤니케이션",
          name: "커뮤니케이션",
          description: "소통과 정보 공유를 위한 서비스들",
          icon: "💬",
          order: 1
        },
        {
          id: "협업",
          name: "협업",
          description: "팀워크와 업무 효율성을 위한 서비스들",
          icon: "🤝",
          order: 2
        },
        {
          id: "미디어",
          name: "미디어",
          description: "파일 및 미디어 관리 서비스들",
          icon: "📁",
          order: 3
        }
      ],
      settings: {
        autoDiscovery: true,
        networkScanEnabled: true,
        scanPorts: [3000, 3001, 3002, 3003, 3004, 3005, 8000, 8080, 9000],
        healthCheckInterval: 30000,
        discoveryInterval: 60000,
        maxRetries: 3,
        timeout: 5000
      }
    };

    this.saveConfig(defaultConfig);
  }

  // 서비스별 기본 아이콘 반환
  getDefaultIcon(serviceId) {
    const iconMap = {
      'product-service': '📦',
      'user-service': '👤',
      'order-service': '🛒',
      'payment-service': '💳',
      'notification-service': '📧',
      'analytics-service': '📊'
    };
    return iconMap[serviceId] || '🔧';
  }

  // 설정 파일 저장
  saveConfig(config) {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log('[ServiceDiscovery] 서비스 설정 파일 저장됨');
    } catch (error) {
      console.error('[ServiceDiscovery] 설정 파일 저장 중 오류:', error.message);
    }
  }

  // 네트워크 디스커버리 시작
  startNetworkDiscovery() {
    const discoveryInterval = parseInt(process.env.DISCOVERY_INTERVAL) || 60000;
    
    setInterval(async () => {
      await this.scanNetwork();
    }, discoveryInterval);

    // 초기 네트워크 스캔
    setTimeout(() => this.scanNetwork(), 10000);
    console.log('[ServiceDiscovery] 네트워크 스캔 시작됨');
  }

  // 네트워크 스캔 수행
  async scanNetwork() {
    try {
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      const scanPorts = config.settings?.scanPorts || [3000, 3001, 3002, 3003, 3004, 3005, 8000, 8080, 9000];
      
      console.log('[ServiceDiscovery] 네트워크 스캔 시작...');
      
      // Docker 네트워크 내 컨테이너들 스캔
      await this.scanDockerNetwork(scanPorts);
      
      // 로컬 네트워크 스캔
      await this.scanLocalNetwork(scanPorts);
      
    } catch (error) {
      console.error('[ServiceDiscovery] 네트워크 스캔 중 오류:', error.message);
    }
  }

  // Docker 네트워크 스캔
  async scanDockerNetwork(ports) {
    try {
      // Docker 컨테이너 목록 가져오기
      const { stdout } = await execAsync('docker ps --format "{{.Names}}"');
      const containers = stdout.trim().split('\n').filter(name => name && name !== 'homepage-service');
      
      for (const container of containers) {
        for (const port of ports) {
          await this.checkService(`http://${container}:${port}`, container, port);
        }
      }
    } catch (error) {
      console.warn('[ServiceDiscovery] Docker 네트워크 스캔 실패:', error.message);
    }
  }

  // 로컬 네트워크 스캔 
  async scanLocalNetwork(ports) {
    const localHosts = ['localhost', '127.0.0.1'];
    
    for (const host of localHosts) {
      for (const port of ports) {
        if (port === 3000) continue; // 자기 자신 제외
        await this.checkService(`http://${host}:${port}`, `local-${port}`, port);
      }
    }
  }

  // 서비스 체크 및 자동 등록
  async checkService(url, serviceName, port) {
    try {
      const response = await axios.get(`${url}/health`, {
        timeout: 5000,
        validateStatus: (status) => status === 200
      });

      // 서비스 정보 가져오기 시도
      let serviceInfo = null;
      try {
        const infoResponse = await axios.get(`${url}/service-info`, { timeout: 3000 });
        serviceInfo = infoResponse.data;
      } catch (infoError) {
        // service-info 엔드포인트가 없으면 기본 정보 사용
      }

      const serviceId = serviceInfo?.id || serviceName;
      
      // 이미 등록된 서비스인지 확인
      if (!this.externalServices.has(serviceId)) {
        const newService = {
          id: serviceId,
          name: serviceInfo?.name || `외부 서비스 (${serviceName})`,
          description: serviceInfo?.description || `포트 ${port}에서 발견된 서비스`,
          url: url,
          externalUrl: `/external/${serviceId}`,
          icon: serviceInfo?.icon || this.getDefaultIcon(serviceName),
          category: serviceInfo?.category || '외부서비스',
          status: 'active',
          requiredRoles: serviceInfo?.requiredRoles || ['user'],
          isInternal: false,
          isAutoDiscovered: true,
          discoveredAt: new Date().toISOString(),
          port: port,
          host: serviceName
        };

        this.externalServices.set(serviceId, newService);
        await this.saveDiscoveredService(newService);
        
        console.log(`[ServiceDiscovery] 새 서비스 자동 발견: ${serviceId} (${url})`);
      } else {
        // 기존 서비스 상태 업데이트
        const service = this.externalServices.get(serviceId);
        service.status = 'active';
        service.lastSeen = new Date().toISOString();
      }

    } catch (error) {
      // 서비스 응답 없음 (정상적인 상황)
    }
  }

  // 발견된 서비스를 설정 파일에 저장
  async saveDiscoveredService(service) {
    try {
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      
      if (!config.externalServices) {
        config.externalServices = [];
      }
      
      config.externalServices.push(service);
      this.saveConfig(config);
      
    } catch (error) {
      console.error('[ServiceDiscovery] 발견된 서비스 저장 중 오류:', error.message);
    }
  }

  // 모든 서비스 목록 반환 (내부 + 외부)
  getAllServices() {
    return [
      ...Array.from(this.internalServices.values()),
      ...Array.from(this.externalServices.values())
    ];
  }

  // 내부 서비스만 반환
  getInternalServices() {
    return Array.from(this.internalServices.values());
  }

  // 외부 서비스만 반환
  getExternalServices() {
    return Array.from(this.externalServices.values());
  }

  // 활성화된 서비스만 반환
  getActiveServices() {
    return this.getAllServices().filter(service => service.status === 'active');
  }

  // 사용자 권한에 따른 서비스 필터링
  getServicesForUser(userRoles = ['user']) {
    return this.getActiveServices().filter(service => {
      return service.requiredRoles.some(role => userRoles.includes(role));
    });
  }

  // 특정 서비스 정보 반환
  getService(serviceId) {
    return this.internalServices.get(serviceId) || this.externalServices.get(serviceId);
  }

  // 서비스 상태 업데이트
  updateServiceStatus(serviceId, status) {
    let service = this.internalServices.get(serviceId) || this.externalServices.get(serviceId);
    if (service) {
      service.status = status;
      service.lastChecked = new Date().toISOString();
      console.log(`[ServiceDiscovery] ${serviceId} 상태: ${status}`);
    }
  }

  // 헬스체크 시작
  startHealthCheck() {
    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000;
    
    setInterval(async () => {
      await this.performHealthCheck();
    }, interval);

    // 초기 헬스체크
    setTimeout(() => this.performHealthCheck(), 5000);
  }

  // 모든 서비스 헬스체크 수행
  async performHealthCheck() {
    const services = this.getAllServices();
    const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000;

    for (const service of services) {
      if (service.isInternal) continue; // 내부 서비스는 헬스체크 생략
      
      try {
        const healthUrl = service.url + (service.healthCheck || '/health');
        const response = await axios.get(healthUrl, {
          timeout,
          validateStatus: (status) => status === 200
        });

        this.updateServiceStatus(service.id, 'active');
      } catch (error) {
        this.updateServiceStatus(service.id, 'inactive');
        console.warn(`[ServiceDiscovery] ${service.id} 헬스체크 실패:`, error.message);
      }
    }
  }

  // 외부 서비스 수동 등록
  registerExternalService(serviceConfig) {
    const service = {
      ...serviceConfig,
      status: 'unknown',
      isInternal: false,
      isAutoDiscovered: false,
      lastUpdated: new Date().toISOString()
    };

    this.externalServices.set(service.id, service);
    
    // 설정 파일 업데이트
    const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    if (!config.externalServices) config.externalServices = [];
    config.externalServices.push(service);
    this.saveConfig(config);

    console.log(`[ServiceDiscovery] 외부 서비스 수동 등록됨: ${service.id}`);
    return service;
  }

  // 서비스 제거
  unregisterService(serviceId) {
    let removed = false;
    
    if (this.externalServices.delete(serviceId)) {
      // 설정 파일에서도 제거
      const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      if (config.externalServices) {
        config.externalServices = config.externalServices.filter(s => s.id !== serviceId);
        this.saveConfig(config);
      }
      removed = true;
    }
    
    if (removed) {
      console.log(`[ServiceDiscovery] 서비스 제거됨: ${serviceId}`);
    }
    
    return removed;
  }
}

// 싱글톤 인스턴스
const serviceDiscovery = new ServiceDiscovery();

// Express 미들웨어
const serviceDiscoveryMiddleware = (req, res, next) => {
  req.serviceDiscovery = serviceDiscovery;
  next();
};

module.exports = {
  ServiceDiscovery,
  serviceDiscovery,
  serviceDiscoveryMiddleware
};
