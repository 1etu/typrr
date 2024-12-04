import { Partials } from "discord.js";

/**
 * @see {@link https://discordjs.dev/docs/packages/discord.js/main/Partials:enum}
 */
export const partials = [
    Partials.Message,
    Partials.Channel,
] as const;
