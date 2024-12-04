import { TextChannel, Message } from 'discord.js';
import { Logger } from '../utils/Logger';

export interface PracticeStatus {
    isActive: boolean;
    channel: TextChannel;
    startTime?: Date;
    raceStartTime?: Date;
    words?: string;
    duration: number;
    endTime?: number;
    raceMessages: Message[];
    language: string;
    completedSuccessfully?: boolean;
    result?: {
        time: number;
        wpm: number;
        raw: number;
        accuracy: number;
    };
}

export class PracticeStateManager {
    private static instances: Map<string, PracticeStateManager> = new Map();
    private practiceStatus: PracticeStatus;

    private constructor(channel: TextChannel) {
        this.practiceStatus = {
            isActive: false,
            channel: channel,
            duration: 60,
            raceMessages: [],
            language: 'EN',
            completedSuccessfully: false
        };
    }

    public static getInstance(channelId: string, channel: TextChannel): PracticeStateManager {
        let instance = PracticeStateManager.instances.get(channelId);
        if (!instance) {
            instance = new PracticeStateManager(channel);
            PracticeStateManager.instances.set(channelId, instance);
            Logger.debug(`Created new PracticeStateManager for channel: ${channel.name}`);
        } else {
            Logger.debug(`Reusing existing PracticeStateManager for channel: ${channel.name}`);
        }
        return instance;
    }

    public startPractice(words: string, duration: number, endTime?: number): boolean {
        if (this.practiceStatus.isActive) {
            return false;
        }

        this.practiceStatus = {
            isActive: true,
            channel: this.practiceStatus.channel,
            startTime: new Date(),
            words: words,
            duration: duration,
            endTime: endTime,
            raceMessages: [],
            language: this.practiceStatus.language,
            completedSuccessfully: false
        };

        return true;
    }

    public setRaceStartTime(): void {
        this.practiceStatus.raceStartTime = new Date();
    }

    public endPractice(): void {
        this.practiceStatus.isActive = false;
        Logger.debug(`Practice ended in channel: ${this.practiceStatus.channel.name}`);
    }

    public isPracticeActive(): boolean {
        return this.practiceStatus.isActive;
    }

    public getStatus(): PracticeStatus {
        return this.practiceStatus;
    }

    public getWords(): string | undefined {
        return this.practiceStatus.words;
    }

    public getDuration(): number {
        return this.practiceStatus.duration;
    }

    public calculateResult(userInput: string, timeSpentSeconds: number): {
        wpm: number;
        raw: number;
        accuracy: number;
    } {
        if (!this.practiceStatus.words) return { wpm: 0, raw: 0, accuracy: 0 };

        const targetWords = this.practiceStatus.words.trim();
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

    public addRaceMessage(message: Message): void {
        this.practiceStatus.raceMessages.push(message);
    }

    public async cleanupRaceMessages(): Promise<void> {
        try {
            for (const msg of this.practiceStatus.raceMessages) {
                try {
                    await msg.delete();
                } catch (err) {
                    continue;
                }
            }
            this.practiceStatus.raceMessages = [];
        } catch (error) {
            if (error instanceof Error && !error.message.includes('Unknown Message')) {
                Logger.error('Error cleaning up race messages:', error);
            }
        }
    }

    public setLanguage(lang: string): void {
        this.practiceStatus.language = lang.toUpperCase();
    }

    public getLanguage(): string {
        return this.practiceStatus.language;
    }

    public setCompletedSuccessfully(): void {
        this.practiceStatus.completedSuccessfully = true;
        Logger.debug(`Practice completed successfully in channel: ${this.practiceStatus.channel.name}`);
    }

    public wasCompletedSuccessfully(): boolean {
        return this.practiceStatus.completedSuccessfully || false;
    }
} 