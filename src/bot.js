require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');
const Client = require('coinbase').Client;
let fetch;
import('node-fetch').then(module => {
    fetch = module.default;
});
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});
const cbAPIKeyName = process.env.CB_API_KEY_NAME;
const cbAPISecret = process.env.CB_API_SECRET;

// Initialize Coinbase client
const coinbaseClient = new Client({
    'apiKey': cbAPIKeyName,
    'apiSecret': cbAPISecret,
    'strictSSL': false
  });
  
console.log('Bot is starting...');

bot.onText(/\/marketdata/, (msg) => {
    const chatId = msg.chat.id;
    
    // List of prominent crypto assets
    const assets = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH'];
    
    let marketDataMessage = 'Current Market Data:\n\n';
    
    // Fetch market data for each asset
    Promise.all(assets.map(asset => {
        return new Promise((resolve, reject) => {
            coinbaseClient.getSpotPrice({'currency': asset}, (err, price) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(`${asset}: $${price.data.amount}`);
                }
            });
        });
    }))
    .then(prices => {
        marketDataMessage += prices.join('\n');
        bot.sendMessage(chatId, marketDataMessage);
    })
    .catch(error => {
        console.error('Error fetching market data:', error);
        bot.sendMessage(chatId, 'Sorry, there was an error fetching market data.');
    });
});

// Add this new command handler after your existing /marketdata handler

bot.onText(/\/exchangerate(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[1].trim();

    if (!input) {
        const helpMessage = "To use the /exchangerate command, please provide two currencies in this format:\n" +
                            "/exchangerate FROM_CURRENCY TO_CURRENCY\n\n" +
                            "Example: /exchangerate BTC USD";
        bot.sendMessage(chatId, helpMessage);
        return;
    }

    const [fromCurrency, toCurrency] = input.split(' ');
    if (!fromCurrency || !toCurrency) {
        bot.sendMessage(chatId, "Invalid input. Please use the format: /exchangerate FROM_CURRENCY TO_CURRENCY");
        return;
    }

    coinbaseClient.getExchangeRates({'currency': fromCurrency}, (err, rates) => {
        if (err) {
            console.error('Error fetching exchange rate:', err);
            bot.sendMessage(chatId, 'Sorry, there was an error fetching the exchange rate.');
            return;
        }
        
        const rate = rates.data.rates[toCurrency];
        if (rate) {
            bot.sendMessage(chatId, `1 ${fromCurrency} = ${rate} ${toCurrency}`);
        } else {
            bot.sendMessage(chatId, `Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
        }
    });
});

bot.onText(/\/marketstats(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const input = match[0].trim();

    if (input === '/marketstats') {
        const helpMessage = "To use the /marketstats command, please provide a cryptocurrency symbol.\n" +
                            "Example: /marketstats BTC\n\n" +
                            "This will show you the 30-day market statistics for Bitcoin.";
        bot.sendMessage(chatId, helpMessage);
        return;
    }

    const currency = match[1].trim().toUpperCase();
    const PRODUCT_ID = `${currency}-USD`;

    try {
        const response = await fetch(`https://api.exchange.coinbase.com/products/${PRODUCT_ID}/stats`, {
            headers: {
                'Authorization': `Bearer ${encodeURIComponent(cbAPISecret)}`
            }
        });
        const stats = await response.json();
        console.log(stats)
        if (stats.message === 'NotFound') {
            bot.sendMessage(chatId, `Sorry, no data found for ${currency}. Please check if the cryptocurrency symbol is correct.`);
            return;
        }
        const message = `30-Day Market Stats for ${PRODUCT_ID}:
        
        Open: ${parseFloat(stats.open).toFixed(2)}
        High: ${parseFloat(stats.high).toFixed(2)}
        Low: ${parseFloat(stats.low).toFixed(2)}
        Last: ${parseFloat(stats.last).toFixed(2)}
        Volume: ${parseFloat(stats.volume).toFixed(2)} ${currency}
        30-Day Volume: ${parseFloat(stats.volume_30day).toFixed(2)} ${currency}`;

        bot.sendMessage(chatId, message);
    } catch (error) {
        console.error('Error fetching market stats:', error);
        bot.sendMessage(chatId, 'Sorry, there was an error fetching market stats.');
    }
});


console.log('Bot setup completed');
module.exports = bot;
