const Discord = require("discord.js")
require("dotenv").config()
const { Client, Intents, MessageEmbed } = require("discord.js")
const client = new Client({ intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS] })
const { readdirSync } = require("fs")
client.slash = new Discord.Collection()
const { REST } = require("@discordjs/rest")
const { Routes } = require("discord-api-types/v9")
const path = require("path")
const { keepalive } = require("./keepalive")
const commands = []
readdirSync("./commands/").map(async dir => {
    readdirSync(`./commands/${dir}/`).map(async (cmd) => {
        commands.push(require(path.join(__dirname, `./commands/${dir}/${cmd}`)))
    })
})
const rest = new REST({ version: "9" }).setToken(process.env.token);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.botID),
            { body: commands }
        )
        console.log("\x1b[34m%s\x1b[0m", "Successfully reloaded application (/) commands.")
    } catch (error) {
        console.error(error)
    }
})();

["slash", "anticrash"].forEach(handler => {
    require(`./handlers/${handler}`)(client)
})
client.on("ready", () => {
    console.log("\x1b[34m%s\x1b[0m", `Logged in as ${client.user.tag}!`)
    const statuses = [ // status bot
        "Hentaiz",
        `with ${client.guilds.cache.size} servers`,
        `with ${client.channels.cache.size} channels`,
        `with ${client.users.cache.size} users`
    ]
    let index = 0
    setInterval(() => {
        if (index === statuses.length) index = 0
        const status = statuses[index]
        client.user.setActivity(`${status}`, {
            type: "STREAMING",
            url: process.env.twitch_url
        })
        index++
    }, 60000)
})
client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand() || interaction.isContextMenu()) {
        if (!client.slash.has(interaction.commandName)) return
        if (!interaction.guild) return
        const command = client.slash.get(interaction.commandName)
        try {
            if (command.permissions) {
                if (!interaction.member.permissions.has(command.permissions)) {
                    return interaction.reply({ content: `:x: You need \`${command.permissions}\` to use this command`, ephemeral: true })
                }
            }
            command.run(interaction, client)
        } catch (error) {
            console.error(error)
            await interaction.reply({ content: ":x: There was an error while executing this command!", ephemeral: true })
        }
    }
})
client.on("guildCreate", guild => {
    const embed = new MessageEmbed()
        .setTitle("I'm added to a new server")
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(`I'm added to ${guild.name},with ${guild.memberCount}\nTotal server: ${client.guilds.cache.size}\nTotal users: ${client.users.cache.size}`)
        .setTimestamp()
    const logchannel = client.channels.cache.get(process.env.Channel_log)
    logchannel.send({ embeds: [embed] })
})
client.on("guildDelete", guild => {
    const embed = new MessageEmbed()
        .setTitle("I'm left a new server")
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(`I'm left to ${guild.name},that had ${guild.memberCount}\nTotal server: ${client.guilds.cache.size}\nTotal users: ${client.users.cache.size}`)
        .setTimestamp()
    const logchannel = client.channels.cache.get(process.env.Channel_log)
    logchannel.send({ embeds: [embed] })
})
// Distube
const Distube = require("distube")
const { SoundCloudPlugin } = require("@distube/soundcloud")
const { SpotifyPlugin } = require("@distube/spotify")
/* eslint new-cap: ["error", { "properties": false }] */
client.distube = new Distube.default(client, {
    leaveOnEmpty: true,
    emptyCooldown: 30,
    leaveOnFinish: true,
    emitNewSongOnly: true,
    updateYouTubeDL: true,
    nsfw: true,
    youtubeCookie: process.env.ytcookie,
    plugins: [new SoundCloudPlugin(), new SpotifyPlugin()]
})
const status = (queue) => `Volume: \`${queue.volume}%\` | Loop: \`${queue.repeatMode ? queue.repeatMode === 2 ? "All Queue" : "This Song" : "Off"}\` | Autoplay: \`${queue.autoplay ? "On" : "Off"}\` | Filter: \`${queue.filters.join(", ") || "Off"}\``
// DisTube event listeners
client.distube
    .on("playSong", (queue, song) => {
        const embed = new MessageEmbed()
            .setTitle("<:headphones:879518595602841630> Started Playing")
            .setDescription(`[${song.name}](${song.url})`)
            .addField("**Views:**", song.views.toString())
            .addField("**Duration:**", song.formattedDuration.toString())
            .addField("**Status**", status(queue).toString())
            .setThumbnail(song.thumbnail)
            .setColor("RANDOM")
        queue.textChannel.send({ embeds: [embed] })
    })
    .on("addSong", (queue, song) => {
        const embed = new MessageEmbed()
            .setTitle("<:addsong:879518595665780746> Added song to queue")
            .setDescription(`\`${song.name}\` - \`${song.formattedDuration}\` - Requested by ${song.user}`)
            .setColor("RANDOM")
        queue.textChannel.send({ embeds: [embed] })
    })
    .on("addList", (queue, playlist) => {
        const embed = new MessageEmbed()
            .setTitle("<:addsong:879518595665780746> Add list")
            .setDescription(`Added \`${playlist.name}\` playlist (${playlist.songs.length} songs) to queue\n${status(queue)}`)
            .setColor("RANDOM")
        queue.textChannel.send({ embeds: [embed] })
    })
    .on("error", (textChannel, e) => {
        console.error(e)
        textChannel.send(`An error encountered: ${e}`)
    })
    .on("finish", queue => queue.textChannel.send("***No more song in queue. Leaving the channel***"))
    .on("disconnect", queue => queue.textChannel.send("***Disconnected!***"))
    .on("empty", queue => queue.textChannel.send("***Channel is empty. Leaving the channel!***"))
    .on("initQueue", (queue) => {
        queue.autoplay = false
        queue.volume = 50
    })
keepalive()
client.login(process.env.token)
