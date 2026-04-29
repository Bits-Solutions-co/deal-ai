/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30, // force page caching for 30s
    },
    serverComponentsExternalPackages: ["@node-rs/argon2"],
    serverActions: {
      bodySizeLimit: "200mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "takamolspace.lon1.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "lon1.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "cognerax-learn.sfo3.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "sfo3.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "cognerax-learn.sfo3.cdn.digitaloceanspaces.com",
      },
      {
        protocol: "https",
        hostname: "ideogram.ai",
      },
      { protocol: "https", hostname: "images.unsplash.com" },
      {
        protocol: "https",
        hostname: "source.boringavatars.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "oaidalleapiprodscus.blob.core.windows.net",
      },
    ],
  },
};

export default nextConfig;
