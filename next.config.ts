import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Módulo checklist es una app aparte (carpeta hermana)
  pageExtensions: ["tsx", "ts", "jsx", "js"],

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

  // Redirecciones de rutas obsoletas
  async redirects() {
    return [
      {
        source: '/inspectors',
        destination: '/workers',
        permanent: true,
      },
      {
        source: '/inspectors/:path*',
        destination: '/workers',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
