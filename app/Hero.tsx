export function Hero() {
  return (
    <>
      {/* Hero Image */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
          {/* Placeholder for motorcycle image */}
          <div className="relative w-full h-full flex items-center justify-center">
            <div className="w-80 h-80 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute text-gray-700 text-9xl font-bold">🏍️</div>
          </div>
        </div>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between p-8">
        {/* Main Text */}
        <div className="flex-1 flex items-center">
          <div className="space-y-2">
            <h1 className="text-6xl font-bold leading-tight">
              EXPLORE<br />
              YOUR<br />
              DREAM
            </h1>
          </div>
        </div>
      </div>
    </>
  );
}