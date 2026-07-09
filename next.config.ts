import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimizaciones para producción
  compress: true,

  // Permite cargar imágenes desde Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "wjzdqcttuiixrybxoaqi.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Logging mínimo en producción
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
