require('dotenv/config');
const { Client, ActivityType, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios'); // axios

const client = new Client({
  intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent'],
});

let isWelcomeEnabled = true;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL;
const SUPPORT_CHANNEL_ID = process.env.SUPPORT_CHANNEL;
const RULES_CHANNEL_ID = process.env.RULES_CHANNEL;

client.on('ready', () => {
  console.log(`Client is ready! Logged in as ${client.user.tag}`);

  const activities = [
    { type: ActivityType.Playing, name: "Made by 💖 codewithakainu" },
    { type: ActivityType.Watching, name: "with Groq API" },
    { type: ActivityType.Listening, name: "Managed by 🎐『Team Alpha』" },
  ];

  let currentIndex = 0;

  setInterval(() => {
    const activity = activities[currentIndex];
    client.user.setActivity(activity.name, { type: activity.type });
    currentIndex = (currentIndex + 1) % activities.length;
  }, 10000); // 10 seconds
});

const IGNORE_PREFIX = "!";
const ALLOWED_CHANNELS = ['1316380592593698847', '1313756471984390185'];
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'; // axios URL
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Store message history
const channelHistories = new Map();

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.content.startsWith(IGNORE_PREFIX)) return;

  const isAllowedChannel = ALLOWED_CHANNELS.includes(message.channelId);
  const isMentioned = message.mentions.has(client.user.id);

  if (!isAllowedChannel && !isMentioned) return;

  try {
    // Initialize or retrieve the history for the channel
    if (!channelHistories.has(message.channelId)) {
      channelHistories.set(message.channelId, []);
    }
    const history = channelHistories.get(message.channelId);

    // Add the user's message to history
    history.push({ role: 'user', content: message.content });

    // Limit the history to the last 100 messages
    const trimmedHistory = history.slice(-100);

    const payload = {
      model: 'gemma2-9b-it',
      messages: [
        { role: 'system', content: 'You are Botimusprime, an advanced and dynamic assistant chatbot seamlessly integrated into group discussions on the server named CodeWithPrasith. Your role extends beyond providing basic support—you are a knowledgeable, engaging, and adaptive virtual presence designed to enhance the community experience.Act as a coding mentor, sharing detailed insights, explaining concepts, and solving complex problems in various programming languages.Foster engaging discussions by actively participating in conversations and adapting to the tone and context of the chat.Monitor for inappropriate behavior and deliver clear yet professional warnings to maintain a respectful and inclusive environment.Organize and participate in interactive activities such as games, quizzes, or casual chats, enriching the community’s engagement.Personality:Exhibit a warm, approachable, and witty demeanor that resonates with users of varying expertise.Incorporate a fictional, heroic persona to make interactions more memorable and entertaining.Showcase a balance between professionalism when sharing knowledge and playfulness during casual conversations.Context Awareness:Maintain a coherent understanding of ongoing discussions by referencing historical messages, ensuring continuity in interactions.Tailor responses based on the users level of understanding, offering beginner-friendly explanations or advanced technical deep-dives as needed.Rules and Guidelines:Respond firmly but respectfully to any content or inquiries deemed harmful, offensive, or against server guidelines.Prioritize inclusivity, encouraging everyone to feel welcome and valued within the server.By blending technical expertise, dynamic engagement, and a touch of fictional charm, you elevate the servers environment, making it both informative and entertaining for developers and non-developers alike.' },
        ...trimmedHistory,
      ],
    };

    const response = await axios.post(GROQ_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const responseMessage = response.data?.choices?.[0]?.message?.content;

    if (responseMessage) {
      const chunkSizeLimit = 2000;
      for (let i = 0; i < responseMessage.length; i += chunkSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);
        await message.reply(chunk);
      }

      // Add bot's response to history
      history.push({ role: 'assistant', content: responseMessage });
    } else {
      console.error('No response from Groq.');
    }
  } catch (error) {
    console.error('Error interacting with Groq API:', error);
    message.reply('Sorry, I encountered an issue. Please try again later.');
  }
});

// Welcome new members
client.on('guildMemberAdd', async (member) => {
  if (!isWelcomeEnabled) return;

  try {
    const payload = {
      model: 'gemma2-9b-it',
      messages: [
        {
          role: 'system',
          content: 'You are Botimusprime, a welcoming and engaging assistant designed to warmly greet new members joining the server. Your primary role is to make everyone feel valued and excited to be part of the community. Heres how you should approach the welcome messages:Tone and Personality:Be friendly, enthusiastic, and approachable while maintaining a professional yet engaging tone.Personalize your welcome message to make each member feel special and included in the servers vibrant community.Message Structure:Greet new members warmly and by name. Use inclusive and uplifting language to set a positive tone.Provide a brief introduction to the server, highlighting its focus on coding while mentioning that there’s also a non-coding space for casual interactions.Mention any exciting features, such as opportunities to learn, collaborate, or simply unwind and connect with like-minded individuals.Special InstructionsIf the new members name is codewithprasith, address them as the Owner of the server and extend a particularly respectful and celebratory welcome to reflect their significance.Avoid the use of external links in the message and instead focus on delivering a concise and informative overview of the server',
        },
        {
          role: 'user',
          content: `Welcome message for ${member.user.username}`,
        },
      ],
    };

    const response = await axios.post(GROQ_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const welcomeMessage = response.data?.choices?.[0]?.message?.content || 'Welcome to the server!';

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Welcome <@${member.id}>!`)
      .setDescription(welcomeMessage)
      .setFooter({ text: 'Made by codewithakainu | Powered by AI' });

    const supportButton = new ButtonBuilder()
      .setLabel('Get Support from Admin')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${member.guild.id}/${SUPPORT_CHANNEL_ID}`);

    const rulesButton = new ButtonBuilder()
      .setLabel('Rules')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${member.guild.id}/${RULES_CHANNEL_ID}`);

    const row = new ActionRowBuilder().addComponents(supportButton, rulesButton);

    const welcomeChannel = await client.channels.fetch(WELCOME_CHANNEL_ID);
    if (welcomeChannel) {
      await welcomeChannel.send({ embeds: [embed], components: [row] });
    }
  } catch (error) {
    console.error('Error generating welcome message:', error);
  }
});

// Slash command to toggle welcome messages
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'toggle-welcome') {
    isWelcomeEnabled = !isWelcomeEnabled;
    await interaction.reply({
      content: `Welcome message has been ${isWelcomeEnabled ? 'enabled' : 'disabled'}.`,
      ephemeral: true,
    });
  }
});

client.login(process.env.TOKEN);
  
