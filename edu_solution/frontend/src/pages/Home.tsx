import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      {/* 히어로 섹션 */}
      <div className="text-center py-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          파이썬을 쉽고 재미있게 배워보세요
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          실습 중심의 인터랙티브한 학습 환경에서 파이썬 기초부터 실전까지 단계별로 마스터하세요.
          브라우저에서 바로 코드를 실행하고 즉시 결과를 확인할 수 있습니다.
        </p>
        <div className="space-x-4">
          <Link
            to="/learn"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            학습 시작하기
          </Link>
          <Link
            to="/practice"
            className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            바로 실습하기
          </Link>
        </div>
      </div>

      {/* 특징 섹션 */}
      <div className="grid md:grid-cols-3 gap-8 py-16">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💻</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">브라우저에서 바로 실행</h3>
          <p className="text-gray-600">
            별도 설치 없이 웹 브라우저에서 파이썬 코드를 작성하고 실행할 수 있습니다.
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📚</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">단계별 학습</h3>
          <p className="text-gray-600">
            기초 문법부터 고급 개념까지 체계적으로 구성된 커리큘럼을 따라 학습하세요.
          </p>
        </div>

        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h3 className="text-xl font-semibold mb-3">실습 중심</h3>
          <p className="text-gray-600">
            이론과 함께 다양한 실습 문제를 통해 실제 코딩 능력을 기를 수 있습니다.
          </p>
        </div>
      </div>

      {/* 학습 경로 미리보기 */}
      <div className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12">학습 경로</h2>
        <div className="space-y-4">
          {[
            { title: '1. 파이썬 기초', desc: '변수, 데이터 타입, 기본 연산' },
            { title: '2. 제어 구조', desc: '조건문, 반복문, 예외 처리' },
            { title: '3. 함수와 모듈', desc: '함수 정의, 모듈 사용, 패키지' },
            { title: '4. 객체 지향', desc: '클래스, 객체, 상속, 다형성' },
            { title: '5. 실전 프로젝트', desc: '실제 프로그램 만들기' }
          ].map((step, index) => (
            <div key={index} className="flex items-center p-4 bg-white rounded-lg shadow-sm">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mr-4">
                {index + 1}
              </div>
              <div>
                <h4 className="font-semibold text-lg">{step.title}</h4>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
