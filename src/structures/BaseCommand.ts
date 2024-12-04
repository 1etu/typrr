import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder 
} from 'discord.js';

export abstract class BaseCommand {
    public abstract data: SlashCommandBuilder;
    abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;
} 