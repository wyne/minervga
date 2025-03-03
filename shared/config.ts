export const config = {
  development: {
    port: 5000,
    host: '0.0.0.0',
    serveStatic: false
  },
  production: {
    port: 5000,
    host: '0.0.0.0',
    serveStatic: true,
    publicPath: '/public'
  }
};

export type Environment = keyof typeof config;
export const getConfig = (env: Environment = 'development') => config[env];
