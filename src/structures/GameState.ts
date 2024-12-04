import { TextChannel, User } from 'discord.js';
import { anticheat } from '../static/anticheat';
import { Logger } from '../utils/Logger';
import { DatabaseService } from '../services/DatabaseService';

export interface GameStatus {
    isActive: boolean;
    channel?: TextChannel;
    startTime?: Date;
    raceStartTime?: Date;
    endTime?: Date;
    words?: string;
    duration: number;
    winners: Map<User, { 
        time: number,
        wpm: number,
        raw: number,
        accuracy: number
    }>;
}

export class GameStateManager {
    private static instance: GameStateManager;
    private gameStatus: GameStatus;
    private dbService: DatabaseService;

    private constructor() {
        this.gameStatus = {
            isActive: false,
            duration: 60,
            winners: new Map()
        };
        this.dbService = DatabaseService.getInstance();
    }

    public static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }

    public startGame(channel: TextChannel, words: string, duration: number): boolean {
        if (this.gameStatus.isActive) {
            return false;
        }

        this.gameStatus = {
            isActive: true,
            channel: channel,
            startTime: new Date(),
            words: words,
            duration: duration,
            winners: new Map()
        };

        return true;
    }

    public setRaceStartTime(): void {
        this.gameStatus.raceStartTime = new Date();
        setTimeout(() => this.endGame(), this.gameStatus.duration * 1000);
    }

    private calculateStats(userInput: string, timeSpentSeconds: number): {
        wpm: number;
        raw: number;
        accuracy: number;
    } {
        if (!this.gameStatus.words) return { wpm: 0, raw: 0, accuracy: 0 };

        const targetWords = this.gameStatus.words.trim();
        const userWords = userInput.trim();

        const targetChars = targetWords.split('');
        const userChars = userWords.split('');
        let correctChars = 0;

        for (let i = 0; i < targetChars.length; i++) {
            if (targetChars[i] === userChars[i]) {
                correctChars++;
            }
        }

        const accuracy = (correctChars / targetChars.length) * 100;

        const standardWordLength = 5;
        const totalChars = targetWords.length;
        const grossWPM = (totalChars / standardWordLength) / (timeSpentSeconds / 60);
        
        const netWPM = Math.round(grossWPM * (accuracy / 100));

        return {
            wpm: netWPM,
            raw: Math.round(grossWPM),
            accuracy: Math.round(accuracy)
        };
    }

    public async submitAnswer(user: User, answer: string): Promise<boolean> {
        if (!this.gameStatus.isActive || !this.gameStatus.raceStartTime || !this.gameStatus.words) {
            return false;
        }

        if (this.gameStatus.winners.has(user)) {
            return false;
        }

        const timeSpent = (new Date().getTime() - this.gameStatus.raceStartTime.getTime()) / 1000;

        if (timeSpent < anticheat.getMinTimeSeconds(this.gameStatus.words.split(' ').length)) {
            Logger.debug(`Anti-cheat: ${user.tag} submitted too quickly (${timeSpent}s)`);
            return false;
        }

        if (answer.trim() === this.gameStatus.words.trim()) {
            const stats = this.calculateStats(answer, timeSpent);

            if (stats.wpm > anticheat.MAX_WPM) {
                Logger.debug(`Anti-cheat: ${user.tag} exceeded max WPM (${stats.wpm})`);
                return false;
            }

            try {
                await this.dbService.createOrUpdateUser(user.id, user.tag);
                await this.dbService.recordTypeStats(
                    user.id,
                    stats.wpm,
                    stats.accuracy,
                    this.gameStatus.words.split(' ').length
                );

                this.gameStatus.winners.set(user, {
                    time: timeSpent,
                    ...stats
                });

                return true;
            } catch (error) {
                Logger.error('Error recording user stats:', error as Error);
                return false;
            }
        }

        return false;
    }

    public endGame(): void {
        this.gameStatus.endTime = new Date();
        this.gameStatus.isActive = false;
    }

    public getActiveGame(): GameStatus {
        return this.gameStatus;
    }

    public isGameActive(): boolean {
        return this.gameStatus.isActive;
    }

    public getActiveChannel(): TextChannel | undefined {
        return this.gameStatus.channel;
    }

    public getGameWords(): string | undefined {
        return this.gameStatus.words;
    }

    public getWinners(): Map<User, { time: number, wpm: number }> {
        return this.gameStatus.winners;
    }

    public getDuration(): number {
        return this.gameStatus.duration;
    }
} 