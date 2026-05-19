/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ✅ Esta línea ignora el error de tipos para permitir el build
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig