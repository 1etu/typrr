import { 
    Client, 
    Events, 
    Interaction 
} from 'discord.js';

import dotenv from 'dotenv';
import { gatewayIntentBits } from './static/gatewayIntentBits';
import { partials } from './static/partials';
import { CommandHandler } from './handlers/CommandHandler';
import { Logger } from './utils/Logger';
import TypeRaceCommand from './commands/TypeRaceCommand';

dotenv.config();

/**
 * Represents the main bot application.
 */
export class Bot {
    private static instance: Bot;
    public client: Client;
    private commandHandler: CommandHandler;

    /**
     * Initializes a new instance of the Bot class.
     * This constructor is private to enforce the singleton pattern.
     */
    private constructor() {
        this.client = new Client({
            intents: gatewayIntentBits,
            partials: partials
        });

        this.commandHandler = new CommandHandler(this.client);
        this.setupEventHandlers();
    }

    /**
     * Gets the singleton instance of the Bot class.
     * @returns {Bot} The singleton instance of the Bot.
     */
    public static getInstance(): Bot {
        if (!Bot.instance) {
            Bot.instance = new Bot();
        }
        return Bot.instance;
    }

    /**
     * Sets up event handlers for the Discord client.
     * Handles client ready and interaction create events.
     * @private
     */
    private setupEventHandlers(): void {
        this.client.once(Events.ClientReady, async (client) => {
            Logger.info(`Typrr is up and running!`);
            await this.commandHandler.loadCommands();
            
            Logger.debug('Starting to initialize practice channels...');
            for (const [_, guild] of this.client.guilds.cache) {
                Logger.debug(`Checking guild: ${guild.name}`);
                const typeRaceCommand = new TypeRaceCommand();
                await typeRaceCommand.initializeExistingPracticeChannels(guild);
            }
            Logger.debug('Finished initializing practice channels');
        });

        this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.commandHandler.getCommands().get(interaction.commandName);
            if (!command) {
                Logger.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                Logger.error('Error executing command', error as Error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
                }
            }
        });
    }

    /**
     * Starts the bot by logging into Discord with the provided token.
     * Exits the process if login fails.
     * @returns {Promise<void>}
     */
    public async start(): Promise<void> {
        try {
            await this.client.login(process.env.DISCORD_TOKEN);
        } catch (error) {
            Logger.error('Failed to start the bot', error as Error);
            process.exit(1);
        }
    }
}
