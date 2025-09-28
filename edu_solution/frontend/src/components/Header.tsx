import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">🐍</span>
            </div>
            <span className="text-xl font-bold">Python Learning</span>
          </Link>

          {/* 네비게이션 */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-500 hover:text-white'
              }`}
            >
              홈
            </Link>
            <Link
              to="/learn"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/learn') 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-500 hover:text-white'
              }`}
            >
              학습하기
            </Link>
            <Link
              to="/practice"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/practice') 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-500 hover:text-white'
              }`}
            >
              실습하기
            </Link>
            <Link
              to="/profile"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/profile') 
                  ? 'bg-blue-700 text-white' 
                  : 'text-blue-100 hover:bg-blue-500 hover:text-white'
              }`}
            >
              내 프로필
            </Link>
          </nav>

          {/* 모바일 메뉴 버튼 (나중에 구현) */}
          <div className="md:hidden">
            <button className="text-blue-100 hover:text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
