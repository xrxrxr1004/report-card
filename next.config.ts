import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 배포 최적화
  output: 'standalone',

  // 이미지 최적화
  images: {
    unoptimized: true,
  },

  // 외부 패키지 설정 (서버 컴포넌트용)
  serverExternalPackages: ['googleapis'],

  // TypeScript 빌드 에러 무시 (Vercel 배포용)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
