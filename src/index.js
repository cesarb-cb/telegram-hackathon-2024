const bot = require('./bot');

const commands = require('./commands');

bot.setMyCommands(commands)
  .then(() => console.log('Bot commands have been set'))
  .catch((error) => console.error('Error setting bot commands:', error));


console.log('Bot is running...');
