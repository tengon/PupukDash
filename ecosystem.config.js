module.exports = {
  apps: [
    {
      name: 'sipupuk-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/sipupuk-web-error.log',
      out_file: './logs/sipupuk-web-out.log',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'sipupuk-scraper',
      script: 'scraper/cron-runner.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/sipupuk-scraper-error.log',
      out_file: './logs/sipupuk-scraper-out.log',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
