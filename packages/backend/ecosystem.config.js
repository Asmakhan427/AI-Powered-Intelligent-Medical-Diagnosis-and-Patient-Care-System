// PM2 process configuration — run via `pm2-runtime start ecosystem.config.js`
// (see the backend Dockerfile's runtime stage) or `pm2 start ecosystem.config.js`
// on a bare-metal / VM deploy.
module.exports = {
  apps: [
    {
      name: 'medassist-backend',
      script: './dist/server.js',
      cwd: __dirname,

      // Single instance, not cluster mode: notification.socket.ts attaches
      // Socket.io directly to one HTTP server with no Redis adapter wired
      // up, so multiple workers would each hold a disjoint set of socket
      // connections and silently drop cross-worker notification delivery.
      // Scale horizontally (more containers behind the nginx upstream in
      // nginx/nginx.conf) instead of with PM2 cluster instances until a
      // Socket.io Redis adapter is added.
      instances: 1,
      exec_mode: 'fork',

      autorestart: true,
      max_restarts: 10,
      min_uptime: '15s',
      restart_delay: 2000,
      max_memory_restart: '400M',

      env: {
        NODE_ENV: 'production',
      },

      // stdout/stderr from PM2 itself — separate from the app's own Winston
      // file transport (LOG_DIR, default ./logs/error-*.log + combined-*.log)
      // so the two never collide on the same filename.
      output: './logs/pm2-out.log',
      error: './logs/pm2-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // The app already exits non-zero on unhandled boot failures (see
      // server.ts) — let PM2 restart it rather than keeping a broken worker.
      kill_timeout: 10000,
    },
  ],
};
