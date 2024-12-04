import { GatewayIntentBits } from "discord.js";

/**
 * @see {@link https://discordjs.dev/docs/packages/discord.js/main/GatewayIntentBits:enum}
 */
export const gatewayIntentBits = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
] as const;
