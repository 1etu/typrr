import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    PermissionFlagsBits,
    TextChannel,
    Message,
    MessageCollector,
    ChannelType,
    PermissionsBitField,
    Guild
} from 'discord.js';

import { BaseCommand } from '../structures/BaseCommand';
import { Logger } from '../utils/Logger';
import { GameStateManager } from '../structures/GameState';
import { getRandomWords } from '../static/words';
import { DatabaseService } from '../services/DatabaseService';
import { PracticeStateManager } from '../structures/PracticeState';
import { practiceWords } from '../static/practiceWords';

export default class TypeRaceCommand extends BaseCommand {
    private gameStateManager: GameStateManager;
    private dbService: DatabaseService;

    constructor() {
        super();
        this.gameStateManager = GameStateManager.getInstance();
        this.dbService = DatabaseService.getInstance();
    }

    public data = new SlashCommandBuilder()
        .setName('typerace')
        .setDescription('Type race game commands')
        .setDefaultMemberPermissions(null)
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start a type race event (Admin only)')
                .addIntegerOption(option =>
                    option
                        .setName('delay')
                        .setDescription('Delay in seconds before the race starts')
                        .setMinValue(5)
                        .setMaxValue(60)
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('words')
                        .setDescription('Number of words in the race')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration of the race in seconds')
                        .setMinValue(1)
                        .setMaxValue(300)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Show the type race leaderboard')
                .addStringOption(option =>
                    option
                        .setName('sort')
                        .setDescription('Sort leaderboard by')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Average WPM', value: 'avg' },
                            { name: 'Best WPM', value: 'wpm' },
                            { name: 'Fastest Time', value: 'time' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('profile')
                .setDescription('View your typing statistics')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to view profile of (defaults to you)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('practice')
                .setDescription('Start a practice session in a private channel')
        ) as SlashCommandBuilder;

    private async countdown(message: any, seconds: number): Promise<void> {
        try {
            while (seconds > 0) {
                await message.edit(`@everyone Type race event starts in ${seconds} seconds!`);
                
                if (seconds > 5) {
                    const waitTime = seconds % 5 === 0 ? 5000 : (seconds % 5) * 1000;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    seconds = seconds % 5 === 0 ? seconds - 5 : Math.floor(seconds / 5) * 5;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    seconds--;
                }
            }

            const gameStatus = this.gameStateManager.getActiveGame();
            await message.edit(`The race has begun! Type the following words:\n\`\`\`${gameStatus.words}\`\`\``);
            this.gameStateManager.setRaceStartTime();
            await this.setupGameCollector(gameStatus.channel!);
        } catch (error) {
            this.gameStateManager.endGame();
            throw error;
        }
    }

    private async setupGameCollector(channel: TextChannel): Promise<void> {
        const collector = new MessageCollector(channel, {
            filter: (m: Message) => !m.author.bot,
            time: this.gameStateManager.getDuration() * 1000
        });

        let leaderboardMessage = await channel.send('🏁 Race in progress... Waiting for results!');

        collector.on('collect', async (message: Message) => {
            try {
                await message.delete();
            } catch (error) {
                Logger.error('Failed to delete message:', error as Error);
            }

            if (message.content.trim() === this.gameStateManager.getGameWords()?.trim()) {
                const success = await this.gameStateManager.submitAnswer(message.author, message.content);
                if (success) {
                    const winners = this.gameStateManager.getWinners();
                    const winnersList = Array.from(winners.entries())
                        .sort((a, b) => a[1].time - b[1].time)
                        .map(([user, stats], index) => 
                            `${index + 1}. ${user}: ${stats.time.toFixed(1)}s | WPM: ${stats.wpm}`
                        )
                        .join('\n');

                    await leaderboardMessage.edit(`🏁 Current Results:\n${winnersList}`);
                }
            }
        });

        collector.on('end', () => {
            this.gameStateManager.endGame();
            const winners = this.gameStateManager.getWinners();
            
            if (winners.size === 0) {
                leaderboardMessage.edit("⏱️ Time's up! Nobody completed the race.");
            } else {
                const winnersList = Array.from(winners.entries())
                    .sort((a, b) => a[1].time - b[1].time)
                    .map(([user, stats], index) => 
                        `${index + 1}. ${user}: ${stats.time.toFixed(1)}s | WPM: ${stats.wpm}`
                    )
                    .join('\n');
                
                leaderboardMessage.edit(`🏁 Race finished! Final results:\n${winnersList}`);
            }
        });
    }

    private async setupPracticeCollector(channel: TextChannel): Promise<void> {
        const practiceManager = PracticeStateManager.getInstance(channel.id, channel);
        
        const collector = channel.createMessageCollector({
            filter: (m: Message) => !m.author.bot
        });

        collector.on('collect', async (message: Message) => {
            const args = message.content.toLowerCase().split(' ');
            
            if (args[0] === 'start') {
                if (practiceManager.isPracticeActive()) {
                    const reply = await message.reply('A practice session is already active! Wait for it to finish.');
                    practiceManager.addRaceMessage(reply);
                    practiceManager.addRaceMessage(message);
                    return;
                }

                const duration = Math.min(Number(args[1]) || 60, 300);
                const wordCount = Math.min(Number(args[2]) || 5, 100);
                const endTime = Number(args[3]);

                if (endTime) {
                    setTimeout(() => {
                        channel.delete().catch(error => 
                            Logger.error('Failed to delete practice channel:', error as Error)
                        );
                    }, endTime * 60 * 1000);
                }

                const randomWords = (() => {
                    const lang = practiceManager.getLanguage();
                    if (lang === 'TR') {
                        const trWords = practiceWords.LANG_TR;
                        const selectedWords: string[] = [];
                        while (selectedWords.length < wordCount) {
                            const randomIndex = Math.floor(Math.random() * trWords.length);
                            const word = trWords[randomIndex];
                            if (!selectedWords.includes(word)) {
                                selectedWords.push(word);
                            }
                        }
                        return selectedWords.join(' ');
                    } else if (lang === 'RU') {
                        const ruWords = practiceWords.LANG_RU;
                        const selectedWords: string[] = [];
                        while (selectedWords.length < wordCount) {
                            const randomIndex = Math.floor(Math.random() * ruWords.length);
                            const word = ruWords[randomIndex];
                            if (!selectedWords.includes(word)) {
                                selectedWords.push(word);
                            }
                        }
                        return selectedWords.join(' '); 
                    }
                    return getRandomWords(wordCount, ['common', 'tech']);
                })();

                practiceManager.startPractice(randomWords, duration);

                practiceManager.addRaceMessage(message);
                const startMessage = await channel.send(`Race starts in 3 seconds!\nGet ready to type:`);
                practiceManager.addRaceMessage(startMessage);
                
                for (let i = 3; i > 0; i--) {
                    await startMessage.edit(`Race starts in ${i} seconds!\nGet ready to type:`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                await startMessage.edit(`GO! Type the following words:\n\`\`\`${randomWords}\`\`\``);
                practiceManager.setRaceStartTime();

                const raceCollector = channel.createMessageCollector({
                    filter: (m: Message) => !m.author.bot,
                    time: duration * 1000
                });

                raceCollector.on('collect', async (raceMessage: Message) => {
                    practiceManager.addRaceMessage(raceMessage);

                    if (raceMessage.content.trim() === randomWords.trim()) {
                        const timeSpent = (new Date().getTime() - practiceManager.getStatus().raceStartTime!.getTime()) / 1000;
                        const result = practiceManager.calculateResult(raceMessage.content, timeSpent);

                        await practiceManager.cleanupRaceMessages();

                        const summaryContent = 
                            `Practice Summary for ${raceMessage.author.username}\n` +
                            `Date: ${new Date().toLocaleString()}\n` +
                            `------------------------------------------\n\n` +
                            `Words Typed: ${wordCount}\n` +
                            `Time Taken: ${timeSpent.toFixed(1)} seconds\n` +
                            `WPM (Words Per Minute): ${result.wpm}\n` +
                            `Raw WPM: ${result.raw}\n` +
                            `Accuracy: ${result.accuracy}%\n\n` +
                            `Text Prompt: "${randomWords}"\n`;

                        const date = new Date().toISOString().replace(/[:.]/g, '-');
                        const fileName = `practice_${raceMessage.author.username}_${date}.txt`;
                        
                        const buffer = Buffer.from(summaryContent, 'utf-8');

                        await channel.send({
                            content: '📊 **Practice Complete!** Here\'s your summary:',
                            files: [{
                                attachment: buffer,
                                name: fileName,
                                description: 'Type Race Practice Summary'
                            }]
                        });

                        practiceManager.endPractice();
                        practiceManager.setCompletedSuccessfully();
                        raceCollector.stop();
                    }
                });

                raceCollector.on('end', async () => {
                    if (practiceManager.isPracticeActive() && !practiceManager.wasCompletedSuccessfully()) {
                        await practiceManager.cleanupRaceMessages();
                        
                        const date = new Date().toISOString().replace(/[:.]/g, '-');
                        const fileName = `practice_incomplete_${message.author.username}_${date}.txt`;
                        
                        const summaryContent = 
                            `Incomplete Practice Session\n` +
                            `Date: ${new Date().toLocaleDateString()}\n` +
                            `------------------------------------------\n\n` +
                            `Session timed out after ${duration} seconds\n` +
                            `Words to type: "${randomWords}"\n`;

                        const buffer = Buffer.from(summaryContent, 'utf-8');

                        await channel.send({
                            content: '⏱️ **Time\'s up!** Practice session summary:',
                            files: [{
                                attachment: buffer,
                                name: fileName,
                                description: 'Type Race Practice Summary (Incomplete)'
                            }]
                        });

                        practiceManager.endPractice();
                    }
                });
            } else if (args[0] === 'language' || args[0] === 'lang') {
                const lang = args[1]?.toUpperCase();
                if (!lang || !['EN', 'TR', 'RU'].includes(lang)) {
                    const reply = await message.reply('Available languages: EN (English), TR (Turkish), RU (Russian)');
                    setTimeout(() => {
                        reply.delete().catch(() => {});
                        message.delete().catch(() => {});
                    }, 2000);
                    return;
                }

                practiceManager.setLanguage(lang);
                const reply = await message.reply(`Your language preference has been set to: ${lang}`);
                setTimeout(() => {
                    reply.delete().catch(() => {});
                    message.delete().catch(() => {});
                }, 2000);
                return;
            }
            
            practiceManager.addRaceMessage(message);
        });
    }

    public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'start': {
                if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                    await interaction.reply({ 
                        content: 'You need administrator permissions to use this command.',
                        ephemeral: true 
                    });
                    return;
                }

                if (this.gameStateManager.isGameActive()) {
                    const activeChannel = this.gameStateManager.getActiveChannel();
                    await interaction.reply({
                        content: `There's already an active type race in ${activeChannel}! Please wait for it to finish.`,
                        ephemeral: true
                    });
                    return;
                }

                const delay = interaction.options.getInteger('delay', true);
                
                await interaction.deferReply();
                
                if (!(interaction.channel instanceof TextChannel)) {
                    await interaction.editReply('This command can only be used in text channels!');
                    return;
                }

                const announcement = await interaction.editReply(`@everyone Type race event starts in ${delay} seconds!`);
                
                try {
                    const wordCount = interaction.options.getInteger('words') ?? 5;
                    const duration = interaction.options.getInteger('duration') ?? 60;
                    const randomWords = getRandomWords(wordCount, ['common', 'tech', 'advanced']);
                    
                    this.gameStateManager.startGame(interaction.channel as TextChannel, randomWords, duration);
                    
                    await this.countdown(announcement, delay);
                } catch (error) {
                    Logger.error('Error during type race countdown:', error as Error);
                    this.gameStateManager.endGame();
                    await interaction.followUp({
                        content: 'An error occurred during the type race countdown.',
                        ephemeral: true
                    });
                }
                break;
            }
            
            case 'leaderboard': {
                try {
                    await interaction.deferReply();
                    const sortBy = (interaction.options.getString('sort') ?? 'wpm') as 'avg' | 'wpm' | 'time';
                    const leaderboard = await this.dbService.getLeaderboard(sortBy);
                    
                    if (leaderboard.length === 0) {
                        await interaction.editReply('No type races have been completed yet!');
                        return;
                    }

                    const sortNames = {
                        avg: 'Average WPM',
                        wpm: 'Best WPM',
                        time: 'Fastest Time'
                    };

                    const embed = {
                        color: 0x0099ff,
                        title: `🏆 Typrr Leaderboard - ${sortNames[sortBy]}`,
                        description: leaderboard
                            .map((user, index) => {
                                const value = sortBy === 'avg' 
                                    ? `${user.averageWPM.toFixed(2)} WPM`
                                    : `${user.bestWPM} WPM`;
                                
                                return `${index + 1}. **${user.username}** - ${value} (${user.totalRaces} races)`;
                            })
                            .join('\n'),
                        footer: {
                            text: 'Use /typerace profile to see your detailed stats'
                        },
                        timestamp: new Date().toISOString()
                    };

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    Logger.error('Error displaying leaderboard:', error as Error);
                    if (interaction.deferred) {
                        await interaction.editReply('Failed to fetch leaderboard. Please try again later.');
                    } else {
                        await interaction.reply({
                            content: 'Failed to fetch leaderboard. Please try again later.',
                            ephemeral: true
                        });
                    }
                }
                break;
            }
            
            case 'profile': {
                await interaction.deferReply();
                const targetUser = interaction.options.getUser('user') ?? interaction.user;

                try {
                    const userProfile = await this.dbService.getUserProfile(targetUser.id);
                    
                    if (!userProfile) {
                        await interaction.editReply(`${targetUser.username} hasn't participated in any type races yet!`);
                        return;
                    }

                    const embed = {
                        color: 0x0099ff,
                        title: `${targetUser.username}'s Typing Profile`,
                        thumbnail: {
                            url: targetUser.displayAvatarURL()
                        },
                        fields: [
                            {
                                name: '🏁 Races Completed',
                                value: userProfile.totalRaces.toString(),
                                inline: true
                            },
                            {
                                name: '⚡ Best WPM',
                                value: userProfile.bestWPM.toString(),
                                inline: true
                            },
                            {
                                name: '📊 Average WPM',
                                value: userProfile.averageWPM.toFixed(2),
                                inline: true
                            },
                            {
                                name: '⌨️ Total Characters Typed',
                                value: userProfile.totalChars.toLocaleString(),
                                inline: true
                            }
                        ],
                        footer: {
                            text: 'Keep practicing to improve your typing speed!'
                        },
                        timestamp: new Date().toISOString()
                    };

                    await interaction.editReply({ embeds: [embed] });
                } catch (error) {
                    Logger.error('Error fetching user profile:', error as Error);
                    await interaction.editReply('Failed to fetch user profile. Please try again later.');
                }
                break;
            }
            
            case 'practice': {
                if (!(interaction.guild)) {
                    await interaction.reply({
                        content: 'This command can only be used in a server!',
                        ephemeral: true
                    });
                    return;
                }

                const existingChannel = interaction.guild.channels.cache.find(
                    channel => channel.name === `practice-${interaction.user.username.toLowerCase()}`
                );

                if (existingChannel) {
                    await interaction.reply({
                        content: `You already have a practice channel: ${existingChannel}`,
                        ephemeral: true
                    });
                    return;
                }

                try {
                    let category = interaction.guild.channels.cache.get('1313608662274670652');
                    if (!category) {
                        await interaction.reply({
                            content: 'Practice category not found!',
                            ephemeral: true
                        });
                        return;
                    }

                    const practiceChannel = await interaction.guild.channels.create({
                        name: `practice-${interaction.user.username.toLowerCase()}`,
                        type: ChannelType.GuildText,
                        parent: category.id,
                        permissionOverwrites: [
                            {
                                id: interaction.guild.id,
                                deny: [PermissionsBitField.Flags.ViewChannel],
                            },
                            {
                                id: interaction.user.id,
                                allow: [
                                    PermissionsBitField.Flags.ViewChannel,
                                    PermissionsBitField.Flags.SendMessages,
                                    PermissionsBitField.Flags.ReadMessageHistory
                                ],
                            }
                        ]
                    });

                    await practiceChannel.send({
                        content: `Welcome to your personal practice channel, ${interaction.user}! 🎯\n\n` +
                            `**How to use this channel:**\n` +
                            `1. Set your preferred language (optional):\n` +
                            `   \`language [EN|TR|RU]\`\n` +
                            `2. Type \`start\` followed by your preferences:\n` +
                            `   \`start {words}\`\n\n` +
                            `**Parameters:**\n` +
                            `• words: Number of words (1-100, default: 5)\n` +
                            `**Examples:**\n` +
                            `• \`language TR\` - Switch to Turkish words\n` +
                            `• \`start 5\` - Start game with 5 words\n` +
                            `• \`start 15\` - Start game with 15 words\n\n` +
                            `Your practice results won't be saved to the global leaderboard. Happy practicing! 🚀`
                    });

                    PracticeStateManager.getInstance(practiceChannel.id, practiceChannel);

                    await this.setupPracticeCollector(practiceChannel);

                    await interaction.reply({
                        content: `Created practice channel: ${practiceChannel}`,
                        ephemeral: true
                    });
                } catch (error) {
                    Logger.error('Error creating practice channel:', error as Error);
                    await interaction.reply({
                        content: 'Failed to create practice channel. Please try again later.',
                        ephemeral: true
                    });
                }
                break;
            }
        }
    }

    public async initializeExistingPracticeChannels(guild: Guild): Promise<void> {
        try {
            const practiceCategory = guild.channels.cache.get('1313608662274670652');
            Logger.debug(`Found practice category: ${practiceCategory?.name || 'Not found'}`);
            if (!practiceCategory) return;

            const practiceChannels = guild.channels.cache.filter(
                channel => 
                    channel.parentId === practiceCategory.id && 
                    channel.name.startsWith('practice-')
            );

            Logger.debug(`Found ${practiceChannels.size} practice channels`);
            for (const [_, channel] of practiceChannels) {
                if (channel instanceof TextChannel) {
                    PracticeStateManager.getInstance(channel.id, channel);
                    await this.setupPracticeCollector(channel);
                    Logger.info(`Initialized practice collector for channel: ${channel.name}`);
                }
            }
        } catch (error) {
            Logger.error('Error initializing practice channels:', error as Error);
        }
    }
} 