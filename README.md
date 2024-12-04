Typrr is an experimental Discord bot that brings type-racing to your server.

To install and run the bot, you have two options:

Quick Setup (Recommended):
1. Make sure you have Node.js version 16 or higher installed
2. Run 'npm run setup' in your terminal
3. Open the .env file that was created and add your Discord bot token
4. The bot will start automatically after setup

Manual Setup:
1. Install Node.js version 16 or higher
2. Clone this repository
3. Create a .env file in the root directory
4. Add your Discord bot token to the .env file like this: DISCORD_TOKEN=your_token_here
5. Run 'npm install' to install dependencies
6. Run 'npx prisma generate' to set up the database
7. Run 'npx prisma migrate deploy' to apply database migrations
8. Start the bot with 'npm run watch'

The bot uses SQLite for data storage, which requires no additional setup. All race results and user statistics are stored locally.

Bot Commands:
/typerace start - Start a typing race (Admin only)
/typerace practice - Create a private practice channel
/typerace profile - View your typing statistics
/typerace leaderboard - View the global leaderboard

In practice mode, you can use these commands:
'language [EN|TR|RU]' - Change the word language
'start [wordCount]' - Start a practice session

If you encounter any issues during setup or while running the bot, check that:
- Your Discord bot token is correct in the .env file
- You have proper Node.js version installed (v16+)
- Your bot has required Discord permissions
- The database file is writable

The source code is in the src directory, and the database schema is in prisma/schema.prisma.
