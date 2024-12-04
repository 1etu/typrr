import { Bot } from './Bot';
import { Logger } from './utils/Logger';

async function main() {
    try {
        const bot = Bot.getInstance();
        await bot.start();
    } catch (error) {
        Logger.error('Failed to initialize the application', error as Error);
        process.exit(1);
    }
}

main();
