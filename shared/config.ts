export const config = {
  development: {
    port: 5000,
    host: '0.0.0.0',
    serveStatic: false,
    isDevMode: true
  },
  production: {
    port: 5000,
    host: '0.0.0.0',
    serveStatic: true,
    publicPath: '/public',
    isDevMode: false
  }
};

export type Environment = keyof typeof config;

export const getConfig = (env: Environment = 'development') => {
  // Force development mode when running locally
  if (process.env.REPL_OWNER && !process.env.REPL_SLUG) {
    return config.development;
  }
  return config[env];
};