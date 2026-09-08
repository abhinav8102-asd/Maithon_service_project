require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'maithon_local_service_hub_access_secret_key_2026',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'maithon_local_service_hub_refresh_secret_key_2026',
  jwtExpiration: parseInt(process.env.JWT_EXPIRATION) || 900, // 15 minutes in seconds
  jwtRefreshExpiration: parseInt(process.env.JWT_REFRESH_EXPIRATION) || 86400 // 24 hours in seconds
};
