import { 
    Client, 
    Collection 
} from 'discord.js';

import { BaseCommand } from '../structures/BaseCommand';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Logger } from '../utils/Logger';

export class CommandHandler {
    private commands: Collection<string, BaseCommand>;
    private client: Client;

    constructor(client: Client) {
        this.client = client;
        this.commands = new Collection();
    }

    async loadCommands() {
        const commandsPath = join(__dirname, '..', 'commands');
        const commandFiles = readdirSync(commandsPath).filter(file => 
            file.endsWith('.ts') || file.endsWith('.js')
        );

        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const command = require(filePath);
            const commandInstance: BaseCommand = new command.default();

            this.commands.set(commandInstance.data.name, commandInstance);
        }

        try {
            const commandsData = Array.from(this.commands.values()).map(cmd => cmd.data.toJSON());
            await this.client.application?.commands.set(commandsData);
            Logger.info('Successfully registered application commands.');
        } catch (error) {
            Logger.error('Error registering application commands:', error as Error);
        }
    }

    getCommands(): Collection<string, BaseCommand> {
        return this.commands;
    }
} 