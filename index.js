const mongoose = require('mongoose');
const usersSet = new Set();
const venom = require('venom-bot');
const axios = require('axios');
const { Wit } = require('node-wit');
const cron = require('node-cron');
const express = require('express');
const basicAuth = require('express-basic-auth');
const { Client } = require('@notionhq/client');
const { DateTime } = require('luxon'); 

const uri = 'mongodb+srv://tobitheodorio845:Theodorio15@cluster0.ilzomyi.mongodb.net/airdrop?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected to Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const UserModel = require('./models/User');
const TaskModel = require('./models/Task');

async function getAllTasks() {
  try {
    const tasks = await TaskModel.find().sort({ createdAt: -1 });
    if (tasks.length === 0) {
      return '⚠ No tasks found.';
    }
    const message = tasks.map(task =>
      `🔹 *${task.title}*\n📝 ${task.description}\n📅 Frequency: ${task.frequency}\n📌 Status: ${task.status}\n📅 Type: ${task.airdropType}\n💰 Funding Amount: $${task.fundingAmount}`
    ).join('\n\n');
    return message;
  } catch (error) {
    console.error('MongoDB Task Fetch Error:', error);
    return '⚠ Could not retrieve tasks at the moment.';
  }
}

const app = express();
const port = 3000;

let clientGlobal;
let witClient;
let qrCodeBase64 = '';

// Hardcoded WhatsApp chat IDs (replace with actual chat IDs)
const hardcodedUsers = [
  '2349162360928@c.us',
  '2349087010364@c.us',
  '2347083843536@c.us',
  '2349112057568@c.us',
  '2349060236156@c.us',
  '2347045788945@c.us',
  '2348081138377@c.us',
  '2349048118660@c.us',
  '2348141657446@c.us',
  '2348148645785@c.us'
];

// Basic Auth Middleware
app.use(basicAuth({
  users: { 'admin': 'password123' },
  challenge: true
}));

// QR Code Endpoint
app.get('/qr', (req, res) => {
  if (qrCodeBase64) {
    res.send(`<img src="${qrCodeBase64}" alt="QR Code" />`);
  } else {
    res.send('QR code not generated yet. Please wait.');
  }
});

app.listen(port, () => {
  console.log(`QR code web server running at http://localhost:${port}`);
});

// Wit.ai client
witClient = new Wit({ accessToken: 'ZXP4YOZMZUO2OMRXV4ZEEB4JVZLVA26V' });

venom
  .create({
    session: 'sessioname',
    headless: true,
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    catchQR: (base64Qrimg) => {
      qrCodeBase64 = base64Qrimg;
    }
  })
  .then((client) => start(client))
  .catch((erro) => {
    console.error('Error creating venom client: ', erro);
  });

async function start(client) {
  clientGlobal = client;

  client.onMessage(async (message) => {
    if (!hardcodedUsers.includes(message.from)) {
      await client.sendText(message.from, "Sorry, you are not authorized to use this bot. Text support for more information");
      return;  // Ignore message, do nothing
    }

    const messageBody = message.body.toLowerCase();

    try {
      const witData = await witClient.message(message.body, {});
      const intent = witData.intents[0]?.name;
      const witEntities = witData.entities || {};
      const cryptoEntity = witEntities['crypto_name:crypto_name']?.[0]?.value;
      const greetingEntity = witEntities['greeting:greeting']?.[0]?.value;
      const airdropEntity = witEntities['airdrop:airdrop']?.[0]?.value;

      console.log('Wit Response:', witData); // Log the full Wit.ai response
      console.log('Extracted Crypto Entity:', cryptoEntity); // Log the extracted entity

      // Check intent confidence
      const intentConfidence = witData.intents[0]?.confidence || 0;
      console.log('Intent Confidence:', intentConfidence);

      // Fallback for low confidence
      if (intentConfidence < 0.7) {
        await client.sendText(message.from, "🤖 I'm not sure about that. Can you specify the cryptocurrency name or symbol?");
        return;
      }

      // Greetings
      if (intent === 'greetings' || greetingEntity) {
        const greetings = [
          "Hey there! 👋 My name is Zephyr I can be your crypto sidekick. Just ask me about prices, airdrops, or tasks.",
          "Hi there! Do you need the latest on BTC, ETH, or airdrop alpha? Just ask! 🚀",
          "Hello hello! 😊 Zephr here! I can help with crypto prices, airdrop info, and more.",
          "What’s up? 👀 Are you curious about a coin’s price or upcoming airdrop tasks? I’ve got you.",
          "Yo! I track airdrop influencers, fetch coin prices, and keep you updated. Let's go! 🔍"
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        await client.sendText(message.from, randomGreeting);
        return;
      }

      // Airdrop info
      if (intent === 'airdrop_tasks' || airdropEntity) {
        const taskMessage = await getAllTasks();
        await client.sendText(message.from, `📋 *Airdrop Tasks:*\n\n${taskMessage}`);
        return;
      }

      // Crypto Knowledge Intent
      if (intent === 'crypto_knowledge') {
        const answer = await queryOpenRouter(message.body);
        await client.sendText(message.from, answer);
        return;
      }

      // Menu
      if (messageBody === 'menu' && !message.isGroupMsg) {
        const menu = `*Here's what I can do 👇:*
🐦 I track airdrop influencers on Twitter/X so you never miss alpha.
🎁 Airdrop tasks
💰 Check current crypto prices (e.g., BTC, SOL)
📜 Motivational quotes
🤝 Sponsors and creators
❓ FAQ

Please support our founders:
- genraltobi: https://x.com/genraltobi
- Mark Onchain: https://x.com/Mark_Onchain`;
        await client.sendText(message.from, menu);
        return;
      }

      // Sponsors
      if (messageBody === 'sponsors and creators' && !message.isGroupMsg) {
        const sponsors = `*Sponsors and Creators:*
- Creator: Genraltobi – https://x.com/genraltobi
- Sponsor: Mark Onchain – https://x.com/Mark_Onchain`;
        await client.sendText(message.from, sponsors);
        return;
      }

      // Crypto prices via intent/entity
      if (intent === 'crypto_prices') {
        let symbol = cryptoEntity?.toLowerCase();
        console.log('Requested Crypto Symbol:', symbol); // Log the symbol for debugging

        if (symbol) {
          // Fetch the price if the symbol is recognized
          await getCryptoPriceBySymbol(client, message.from, symbol);
        } else {
          // Only send the clarification message if the symbol is not recognized
          await client.sendText(message.from, 'Which crypto are you asking about? (e.g., BTC, ETH)');
        }

        return;
      }

      // Fallback
      await client.sendText(message.from, "🤖 Sorry, I didn't quite get that. Try asking about crypto prices, greetings, or airdrops.");
    } catch (error) {
      console.error('handleMessage error:', error);
      await client.sendText(message.from, 'Oops! Something went wrong processing your message.');
    }
  });

  // 🔥 OpenRouter query for crypto knowledge
  async function queryOpenRouter(question) {
    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'mistralai/mistral-7b-instruct:free',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful and accurate expert in cryptocurrency. When users ask about crypto-related questions, please provide a short and clear answer.',
            },
            {
              role: 'user',
              content: question,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer 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`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (err) {
      console.error('OpenRouter error:', err?.response?.data || err.message);
      return '⚠ Sorry, I had trouble answering that question. Try again later.';
    }
  }

async function getCryptoPriceBySymbol(client, chatId, symbol) {
  try {
    // Step 1: Fetch the full list of coins from Coinlore
    const coinListResponse = await axios.get('https://api.coinlore.net/api/tickers/');
    const coins = coinListResponse.data.data;

    // Step 2: Try to find a coin that matches the symbol or name
    const coin = coins.find(
      (c) =>
        c.symbol.toLowerCase() === symbol.toLowerCase() ||
        c.name.toLowerCase() === symbol.toLowerCase()
    );

    if (!coin) {
      await client.sendText(chatId, `❌ I couldn't find "${symbol}" on Coinlore.`);
      return;
    }

    const coinId = coin.id;

    // Step 3: Fetch the price using the numeric ID
    const response = await axios.get(`https://api.coinlore.net/api/ticker/?id=${coinId}`);
    const priceData = response.data;

    if (priceData.length === 0) {
      throw new Error('Invalid response data');
    }

    const price = priceData[0].price_usd;
    const change = priceData[0].percent_change_24h;

    // Ensure change is a number
    const changePercentage = parseFloat(change);

    if (price === undefined || isNaN(changePercentage)) {
      throw new Error('Invalid response data');
    }

    let responseMessage = `💰 The current price of *${coin.name}* (${coin.symbol.toUpperCase()}) is $${parseFloat(price).toFixed(2)}`;

    if (changePercentage < -0.2) {
      await client.sendText(chatId, `${responseMessage}\n📉 24h change: ${changePercentage.toFixed(2)}%`);
    } else if (changePercentage > 0.2) {
      await client.sendText(chatId, `${responseMessage}\n📈 24h change: +${changePercentage.toFixed(2)}%`);
    } else {
      await client.sendText(chatId, responseMessage);
    }
  } catch (error) {
    console.error('Price fetch error:', error);
    await client.sendText(chatId, '⚠ Could not fetch the price. Please try again later.');
  }
}

// Function to send reminders for airdrops
async function sendAirdropReminders() {
  try {
    if (!clientGlobal) {
      console.log('Venom client not initialized yet.');
      return;
    }

    // Get current time in Nigeria timezone (WAT, UTC+1)
    const nowInNigeria = DateTime.now().setZone('Africa/Lagos');
    const currentHour = nowInNigeria.hour;
    const currentMinute = nowInNigeria.minute;

    // Find tasks matching current hour and minute
    const dueTasks = await TaskModel.find({
      reminderHour: currentHour,
      reminderMinute: currentMinute
    });

    if (dueTasks.length === 0) {
      console.log('No due reminders at', nowInNigeria.toISO());
      return;
    }

    console.log(`Sending ${dueTasks.length} reminders at ${nowInNigeria.toISO()}`);

    for (const task of dueTasks) {
      const message = `🚨 Reminder: *${task.title}*\n${task.description}\nFrequency: ${task.frequency}\nStatus: ${task.status}\nAirdrop Type: ${task.airdropType}\nFunding Amount: $${task.fundingAmount}`;

      // Send reminder to all hardcoded users
      for (const chatId of hardcodedUsers) {
        await clientGlobal.sendText(chatId, message);
      }

      // Clear reminderTime to avoid repeated reminders
      // If you want to keep the task, you can comment this out
      task.reminderHour = null; // or set to a new future time if needed
      task.reminderMinute = null; // or set to a new future time if needed
      await task.save();
    }

    console.log('Airdrop reminders sent to hardcoded users.');
  } catch (error) {
    console.error('Error sending airdrop reminders:', error);
  }
}

// Schedule the reminder function to run every minute
cron.schedule('* * * * *', () => {
  console.log('⏰ Cron job running - checking for due reminders at', new Date().toISOString());
  sendAirdropReminders();
})};
