import React from 'react';

const Profile: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">내 프로필</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
        <p className="text-yellow-800">
          👤 사용자 인증 시스템이 구현되면 개인 학습 진도와 통계를 확인할 수 있습니다.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 사용자 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">사용자 정보</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="w-20 text-gray-600">이름:</span>
              <span className="font-medium">데모 사용자</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-gray-600">레벨:</span>
              <span className="font-medium">초보자</span>
            </div>
            <div className="flex items-center">
              <span className="w-20 text-gray-600">가입일:</span>
              <span className="font-medium">2024-01-01</span>
            </div>
          </div>
        </div>

        {/* 학습 통계 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">학습 통계</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">완료한 레슨:</span>
              <span className="font-medium">0 / 20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">해결한 문제:</span>
              <span className="font-medium">0 / 50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">학습 시간:</span>
              <span className="font-medium">0시간</span>
            </div>
          </div>
        </div>
      </div>

      {/* 학습 진도 */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">학습 진도</h2>
        <div className="space-y-4">
          {[
            { title: '파이썬 기초', progress: 0 },
            { title: '제어 구조', progress: 0 },
            { title: '함수와 모듈', progress: 0 },
            { title: '객체 지향', progress: 0 }
          ].map((course, index) => (
            <div key={index}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{course.title}</span>
                <span className="text-sm text-gray-500">{course.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">최근 활동</h2>
        <div className="text-gray-500 text-center py-8">
          아직 활동 기록이 없습니다.
          <br />
          학습을 시작해보세요!
        </div>
      </div>
    </div>
  );
};

export default Profile;
