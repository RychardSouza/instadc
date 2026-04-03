const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, Collection } = require('discord.js');
const { QuickDB } = require("quick.db");

const db = new QuickDB();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const TOKEN = "MTQ4OTcyMzI2NDc0NDgxNjcyMQ.G_iN0a.LKiQKEg4ByRSO6AgznLbr1EapoIyb0avSazRQw";

client.commands = new Collection();

const commands = [
  new SlashCommandBuilder()
    .setName("post")
    .setDescription("Criar um post")
    .addStringOption(opt => opt.setName("legenda").setRequired(true))
    .addStringOption(opt => opt.setName("imagem").setRequired(false))
    .addStringOption(opt => opt.setName("instagram").setRequired(false)),

  new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Ver seu perfil"),

  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("Top usuários")
];

client.once("ready", () => {
  console.log(`🔥 Bot online: ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {

  // SLASH COMMANDS
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "post") {
      const legenda = interaction.options.getString("legenda");
      let imagem = interaction.options.getString("imagem");
      const insta = interaction.options.getString("instagram") || "https://instagram.com/";

      if (!imagem && interaction.attachments.first()) {
        imagem = interaction.attachments.first().url;
      }

      if (!imagem) {
        return interaction.reply({ content: "Coloca uma imagem!", ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(`**${legenda}**`)
        .setImage(imagem)
        .setColor("Pink");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("like")
          .setLabel("❤️ 0")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("coment")
          .setLabel("💬 Comentários")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setLabel("Instagram")
          .setStyle(ButtonStyle.Link)
          .setURL(insta)
      );

      const msg = await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });

      await msg.startThread({
        name: `💬 ${interaction.user.username}`,
        autoArchiveDuration: 1440
      });

      await db.set(`post_${msg.id}`, {
        likes: 0,
        users: [],
        owner: interaction.user.id
      });

      await interaction.reply({ content: "✅ Post criado!", ephemeral: true });
    }

    if (interaction.commandName === "perfil") {
      const data = await db.all();
      let totalLikes = 0;
      let posts = 0;

      data.forEach(p => {
        if (p.value.owner === interaction.user.id) {
          totalLikes += p.value.likes;
          posts++;
        }
      });

      interaction.reply(`👤 ${interaction.user.username}\n📸 Posts: ${posts}\n❤️ Likes: ${totalLikes}`);
    }

    if (interaction.commandName === "ranking") {
      const data = await db.all();
      let ranking = {};

      data.forEach(p => {
        const owner = p.value.owner;
        if (!ranking[owner]) ranking[owner] = 0;
        ranking[owner] += p.value.likes;
      });

      const sorted = Object.entries(ranking).sort((a,b) => b[1] - a[1]).slice(0,5);

      let text = "🏆 Top 5:\n";
      for (let i = 0; i < sorted.length; i++) {
        const user = await client.users.fetch(sorted[i][0]);
        text += `${i+1}. ${user.username} - ❤️ ${sorted[i][1]}\n`;
      }

      interaction.reply(text);
    }
  }

  // BOTÕES
  if (interaction.isButton()) {
    const data = await db.get(`post_${interaction.message.id}`);
    if (!data) return;

    if (interaction.customId === "like") {
      if (data.users.includes(interaction.user.id)) {
        return interaction.reply({ content: "Você já curtiu!", ephemeral: true });
      }

      data.likes++;
      data.users.push(interaction.user.id);

      await db.set(`post_${interaction.message.id}`, data);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("like")
          .setLabel(`❤️ ${data.likes}`)
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId("coment")
          .setLabel("💬 Comentários")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setLabel("Instagram")
          .setStyle(ButtonStyle.Link)
          .setURL("https://instagram.com/")
      );

      await interaction.update({ components: [row] });
    }
  }
});

client.login(TOKEN);
