const logger = {
  info: (msg) => {
    console.log(`\x1b[36m[INFO]\x1b[0m ${new Date().toISOString()}: ${msg}`);
  },
  error: (msg) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()}: ${msg}`);
  },
  warn: (msg) => {
    console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()}: ${msg}`);
  }
};

module.exports = logger;
