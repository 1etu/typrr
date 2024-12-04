const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

function log(message, type = 'info') {
    const date = new Date().toISOString().replace('T', ' ').split('.')[0];
    switch (type) {
        case 'error':
            console.error(`${chalk.red('●')} ${chalk.white(`${date}: ${message}`)}`);
            break;
        case 'success':
            console.log(`${chalk.green('●')} ${chalk.white(`${date}: ${message}`)}`);
            break;
        default:
            console.log(`${chalk.blue('●')} ${chalk.white(`${date}: ${message}`)}`);
    }
}

function executeCommand(command, errorMessage) {
    try {
        execSync(command, { stdio: 'inherit' });
        return true;
    } catch (error) {
        log(errorMessage, 'error');
        log(error.message, 'error');
        return false;
    }
}

async function setup() {
    const nodeVersion = process.version;
    const requiredVersion = 'v16.0.0';
    
    if (nodeVersion.localeCompare(requiredVersion, undefined, { numeric: true, sensitivity: 'base' }) < 0) {
        log(`Node.js ${requiredVersion} or higher is required. Current version: ${nodeVersion}`, 'error');
        process.exit(1);
    }
    
    log('Node.js version check passed');

    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        const envTemplate = 'DISCORD_TOKEN=your_discord_bot_token_here\nCLIENT_ID=your_client_id_here\nCLIENT_SECRET=your_client_secret_here\n';
        fs.writeFileSync(envPath, envTemplate);
        log('Created .env file - please add your Discord bot token');
    }

    log('Installing dependencies...');
    if (!executeCommand('npm install', 'Failed to install dependencies')) {
        process.exit(1);
    }
    log('Dependencies installed successfully', 'success');

    log('Initializing database...');
    if (!executeCommand('npx prisma generate', 'Failed to generate Prisma client')) {
        process.exit(1);
    }

    if (!executeCommand('npx prisma migrate deploy', 'Failed to apply database migrations')) {
        process.exit(1);
    }
    log('Database initialized successfully', 'success');

    require('dotenv').config();
    if (!process.env.DISCORD_TOKEN) {
        log('Please add your Discord bot token to the .env file', 'error');
        process.exit(1);
    }
    if (!process.env.CLIENT_ID) {
        log('Please add your Discord client ID and secret to the .env file', 'error');
        process.exit(1);
    }

    log('Setup completed successfully! Starting the application...', 'success');
    
    executeCommand('npm run watch', 'Failed to start the application');
}

setup().catch(error => {
    log('Setup failed:', 'error');
    log(error.message, 'error');
    process.exit(1);
}); 