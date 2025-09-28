import React, { useState } from 'react';

const Practice: React.FC = () => {
  const [code, setCode] = useState('# 여기에 파이썬 코드를 작성하세요\nprint("Hello, Python!")');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setOutput('코드 실행 중...');
    
    try {
      // 실제로는 백엔드 API를 호출해야 합니다
      // 현재는 데모용 응답
      setTimeout(() => {
        setOutput('Hello, Python!\n\n(실제 코드 실행 기능은 백엔드 연동 후 작동합니다)');
        setIsRunning(false);
      }, 1000);
    } catch (error) {
      setOutput('오류가 발생했습니다: ' + error);
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">파이썬 실습하기</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-blue-800">
          💡 브라우저에서 바로 파이썬 코드를 작성하고 실행해보세요! 
          (코드 실행 기능은 백엔드 서버 연동 후 활성화됩니다)
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 코드 에디터 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="bg-gray-100 px-4 py-2 rounded-t-lg border-b">
            <h3 className="font-semibold text-gray-700">코드 에디터</h3>
          </div>
          <div className="p-4">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 p-3 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="여기에 파이썬 코드를 작성하세요..."
            />
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={runCode}
                disabled={isRunning}
                className={`px-6 py-2 rounded-md font-semibold ${
                  isRunning
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isRunning ? '실행 중...' : '▶ 코드 실행'}
              </button>
              <button
                onClick={() => setCode('')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                🗑 초기화
              </button>
            </div>
          </div>
        </div>

        {/* 출력 결과 */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="bg-gray-100 px-4 py-2 rounded-t-lg border-b">
            <h3 className="font-semibold text-gray-700">실행 결과</h3>
          </div>
          <div className="p-4">
            <pre className="w-full h-64 p-3 bg-black text-green-400 font-mono text-sm rounded-md overflow-auto">
              {output || '코드를 실행하면 결과가 여기에 표시됩니다.'}
            </pre>
          </div>
        </div>
      </div>

      {/* 예제 코드들 */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">예제 코드</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Hello World',
              code: 'print("Hello, World!")'
            },
            {
              title: '변수 사용',
              code: 'name = "Python"\nprint(f"Hello, {name}!")'
            },
            {
              title: '반복문',
              code: 'for i in range(5):\n    print(f"숫자: {i}")'
            },
            {
              title: '함수 정의',
              code: 'def greet(name):\n    return f"안녕하세요, {name}님!"\n\nprint(greet("파이썬"))'
            },
            {
              title: '리스트 다루기',
              code: 'fruits = ["사과", "바나나", "오렌지"]\nfor fruit in fruits:\n    print(fruit)'
            },
            {
              title: '조건문',
              code: 'age = 20\nif age >= 18:\n    print("성인입니다")\nelse:\n    print("미성년자입니다")'
            }
          ].map((example, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">{example.title}</h4>
              <pre className="text-sm bg-white p-2 rounded border overflow-x-auto">
                {example.code}
              </pre>
              <button
                onClick={() => setCode(example.code)}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                에디터에 복사
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Practice;
