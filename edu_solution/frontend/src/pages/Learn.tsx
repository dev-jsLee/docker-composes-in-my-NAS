import React from 'react';

const Learn: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">파이썬 학습하기</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <p className="text-yellow-800">
          🚧 이 페이지는 현재 개발 중입니다. 곧 다양한 학습 콘텐츠가 추가될 예정입니다!
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 학습 모듈들 */}
        {[
          {
            title: '1. 변수와 데이터 타입',
            description: '파이썬의 기본 데이터 타입을 배워보세요',
            status: '준비중',
            color: 'bg-blue-50 border-blue-200'
          },
          {
            title: '2. 조건문과 반복문',
            description: 'if문, for문, while문 사용법',
            status: '준비중',
            color: 'bg-green-50 border-green-200'
          },
          {
            title: '3. 함수 만들기',
            description: '함수 정의와 활용 방법',
            status: '준비중',
            color: 'bg-purple-50 border-purple-200'
          },
          {
            title: '4. 리스트와 딕셔너리',
            description: '데이터 구조 다루기',
            status: '준비중',
            color: 'bg-orange-50 border-orange-200'
          }
        ].map((module, index) => (
          <div key={index} className={`p-6 rounded-lg border-2 ${module.color}`}>
            <h3 className="text-xl font-semibold mb-2">{module.title}</h3>
            <p className="text-gray-600 mb-4">{module.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{module.status}</span>
              <button 
                className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
                disabled
              >
                시작하기
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Learn;
