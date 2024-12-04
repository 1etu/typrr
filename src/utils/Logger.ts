import chalk from 'chalk';

export class Logger {
    private static formatDate(): string {
        return new Date().toISOString().replace('T', ' ').split('.')[0];
    }

    private static formatStack(stack: string): string {
        return stack
            .split('\n')
            .slice(1)
            .map(line => '  ' + line.trim())
            .join('\n');
    }

    static info(message: string): void {
        console.log(`${chalk.green('●')} ${chalk.white(`${this.formatDate()}: ${message}`)}`);
    }

    static error(message: string, error?: Error): void {
        console.error(`${chalk.red('●')} ${chalk.white(`${this.formatDate()}: ${message}`)}`);
        if (error?.stack) {
            console.error(chalk.white(this.formatStack(error.stack)));
        }
    }

    static debug(message: string): void {
        console.debug(`${chalk.blue('●')} ${chalk.white(`${this.formatDate()}: ${message}`)}`);
    }
} 