/**
 * Order Scraper Entrypoint
 */
const { run } = require('./order_combined');

if (require.main === module) {
  run();
}

module.exports = { run };
