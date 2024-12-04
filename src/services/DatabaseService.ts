import { PrismaClient } from '@prisma/client';
import { Logger } from '../utils/Logger';

export class DatabaseService {
    private static instance: DatabaseService;
    private prisma: PrismaClient;

    private constructor() {
        this.prisma = new PrismaClient();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public async createOrUpdateUser(discordId: string, username: string) {
        try {
            return await this.prisma.user.upsert({
                where: { discordId },
                create: {
                    id: discordId,
                    discordId,
                    username,
                },
                update: { username }
            });
        } catch (error) {
            Logger.error('Error creating/updating user:', error as Error);
            throw error;
        }
    }

    public async recordTypeStats(userId: string, wpm: number, accuracy: number, wordCount: number) {
        try {
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            const [typeStat, updatedUser] = await this.prisma.$transaction([
                this.prisma.typeStat.create({
                    data: { userId, wpm, accuracy, wordCount }
                }),
                this.prisma.user.update({
                    where: { id: userId },
                    data: {
                        totalRaces: { increment: 1 },
                        bestWPM: Math.max(user?.bestWPM ?? 0, wpm),
                        averageWPM: user ? ((user.averageWPM * user.totalRaces + wpm) / (user.totalRaces + 1)) : wpm,
                        totalChars: { increment: wordCount * 5 }
                    }
                })
            ]);

            return { typeStat, user: updatedUser };
        } catch (error) {
            Logger.error('Error recording type stats:', error as Error);
            throw error;
        }
    }

    public async getUserProfile(userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: {
                    username: true,
                    totalRaces: true,
                    bestWPM: true,
                    averageWPM: true,
                    totalChars: true,
                    typeStats: {
                        orderBy: {
                            timestamp: 'desc'
                        },
                        take: 1,
                        select: {
                            wpm: true,
                            accuracy: true,
                            timestamp: true
                        }
                    }
                }
            });

            return user;
        } catch (error) {
            Logger.error('Error fetching user profile:', error as Error);
            throw error;
        }
    }

    public async getLeaderboard(sortBy: 'avg' | 'wpm' | 'time' = 'wpm') {
        try {
            return await this.prisma.user.findMany({
                where: {
                    totalRaces: { gt: 0 }
                },
                select: {
                    username: true,
                    bestWPM: true,
                    averageWPM: true,
                    totalRaces: true
                },
                orderBy: { 
                    [sortBy === 'avg' ? 'averageWPM' : 'bestWPM']: 'desc'
                },
                take: 10
            });
        } catch (error) {
            Logger.error('Error fetching leaderboard:', error as Error);
            throw error;
        }
    }

    public async getUserRecentRaces(userId: string) {
        try {
            return await this.prisma.typeStat.findMany({
                where: { userId },
                orderBy: { timestamp: 'desc' },
                take: 10,
                select: {
                    wpm: true,
                    accuracy: true,
                    wordCount: true,
                    timestamp: true
                }
            });
        } catch (error) {
            Logger.error('Error fetching user recent races:', error as Error);
            throw error;
        }
    }
} 