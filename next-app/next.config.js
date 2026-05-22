/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [{
			protocol: 'https',
			hostname: 'iitddptbeyobgvyvwvgo.supabase.co',
			pathname: '/storage/v1/object/public/**',
		},],
	},
};

module.exports = nextConfig;
