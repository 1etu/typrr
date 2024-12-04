export const anticheat = {
    MAX_WPM: 200,
    getMinTimeSeconds: (wordCount: number): number => {
        const secondsPerWord = 60 / 216;
        const reactionTime = 0.2;
        return (wordCount * secondsPerWord) + reactionTime;
    }
} as const; 