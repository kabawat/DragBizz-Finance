const winston = require('winston');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logLevel = process.env.LOG_LEVEL || 'info';
const isProduction = (process.env.ENVIRONMENT || 'development') === 'production';

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    defaultMeta: { service: 'dragbizz-finance' },
    transports: [
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

if (!isProduction) {
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));
}

module.exports = logger;

