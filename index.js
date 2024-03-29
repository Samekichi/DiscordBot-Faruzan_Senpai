/*
    Dependencies & Credentials
*/



// /* Host a server that listens to port 8080
// to receive constant wake-up HTTPS requests from UptimeRobot */
// const keep_bot_alive = require("./keep_bot_alive.js");


// /* Maintain a Replit database to store permanent data */
// const db = require("./database.js");
// console.log(process.env['REPLIT_DB_URL']);
// db.list().then(keys => { console.log(keys) });


/* Create bot client using Discord.js */
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});


/* Load Discord Bot Token from config */
// const config = require('./config.json');
const token = process.env.DISCORD_TOKEN


/* Dynamically load commands */
const fs = require('node:fs');
const path = require('node:path');
client.commands = new Collection();
// Read in all command categories (folders)
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
// Read in all commmand files
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandsFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    // Load all valid commands into bot client
    for (const file of commandsFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name
        // & the value as the exported module.
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

/* Initialize a collection to store command cooldowns per user */
client.cooldowns = new Collection();




/*
    Bot Logics
*/



// On bot startup
client.once(Events.ClientReady, c => {
    console.log("Faruzan senpai is awake!");
    console.log(`\tID: ${c.user.username}`);
});


// For each interaction event
client.on(Events.InteractionCreate, async interaction => {

    // Exclude non-slash commands (e.g., MessageComponent interactions)
    if (!interaction.isChatInputCommand()) return;

    // Start handle
    console.log(interaction);
    const command = client.commands.get(interaction.commandName);

    // Exclude undefined commands
    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return
    }

    // Exclude commands still cooling down
    const { cooldowns } = client;  // Collection `cooldowns`: { <Key> = command name : <Value> = Collections associating user's id (key) -> last time this user used that command (value) }

    if (!cooldowns.has(command.data.name)) {  // command never used before
        cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const defaultCooldownDuration = 1;
    const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;  // in ms

    if (timestamps.has(interaction.user.id)) {  // if the user has called this command before, check if cooldown is over
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        if (now < expirationTime) {  // still in cooldown
            const expiredTimestamp = Math.round(expirationTime / 1000);
            return interaction.reply({
                content: `Command \`${command.data.name}\` still cooling down. Try again <t:${expiredTimestamp}:R>.`,
                ephemeral: true
            })
        }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount)


    // Execute response to command
    try {

        // execution
        await command.execute(interaction);
        // database log
        const globalName = interaction.user.globalName;
        // const key = `${globalName}.slashCommandCount`
        // let count = await db.get(key) || 0;
        // console.log(await db.get(key));
        // count += 1;
        // await db.set(key, count);

    } catch (error) {

        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }

})


// For each new message in the server
// client.on("messageCreate", (msg) => {
//     if (msg.author.id != client.user.id) {
//         console.log(`\n==== Message Detected ====
//                     \n\t${msg.author.username} : <${msg.author.id}>
//                     \n\t"${msg.content}"`)
//         // msg.channel.send(msg.content.split("").reverse().join(""));
//         if (msg.author.id === process.env["MY_USR_ID"]) {
//             // msg.channel.send(`先叫声前辈听听吧~`);
//         }
//     }
// });


// Log in bot to Discord
client.login(token);