const { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { token, clientId } = require('./config.json'); // Store your token and clientId in config.json
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.once('ready', () => {
    console.log('Ready!');
});

// Ensure the motions directory exists
const motionsDir = path.join(__dirname, 'motions');
if (!fs.existsSync(motionsDir)) {
    fs.mkdirSync(motionsDir);
    console.log('Created motions directory.');
}

// Handling Button Interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'openModal') {
        console.log('Button clicked, opening modal...');
        try {
            const modal = new ModalBuilder()
                .setCustomId('motionForm')
                .setTitle('Motion Form')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('caseName')
                            .setLabel('Case Name')
                            .setStyle(TextInputStyle.Short)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('prosecutionAttorney')
                            .setLabel('Prosecution Attorney or Plaintiff Attorney')
                            .setStyle(TextInputStyle.Short)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('defenseAttorney')
                            .setLabel('Defense Attorney')
                            .setStyle(TextInputStyle.Short)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('motionType')
                            .setLabel('Type of Motion')
                            .setStyle(TextInputStyle.Short)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('reasonForMotion')
                            .setLabel('Reason for Motion')
                            .setStyle(TextInputStyle.Paragraph)
                    )
                );

            await interaction.showModal(modal);
            console.log('Modal shown successfully.');
        } catch (error) {
            console.error('Error showing modal:', error);
        }
    }
});

// Handling Modal Submissions
client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'motionForm') {
        console.log('Modal submitted, generating PDF...');
        try {
            const caseName = interaction.fields.getTextInputValue('caseName');
            const prosecutionAttorney = interaction.fields.getTextInputValue('prosecutionAttorney');
            const defenseAttorney = interaction.fields.getTextInputValue('defenseAttorney');
            const motionType = interaction.fields.getTextInputValue('motionType');
            const reasonForMotion = interaction.fields.getTextInputValue('reasonForMotion');

            console.log('Form Data:', {
                caseName,
                prosecutionAttorney,
                defenseAttorney,
                motionType,
                reasonForMotion
            });

            const doc = new PDFDocument();
            const filePath = path.join(motionsDir, `${caseName.replace(/ /g, '_')}.pdf`);

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            doc.fontSize(14).text('Commonwealth of San Andreas', { align: 'center' });
            doc.fontSize(12).text('The Criminal Court', { align: 'center' });
            doc.moveDown();
            doc.text('MOTION FOR', { align: 'center' });
            doc.text(motionType, { align: 'center', underline: true });
            doc.moveDown();
            doc.text(`State VS. ${caseName}`, { align: 'center' });
            doc.moveDown();
            doc.text(`DEFENDANT: ${defenseAttorney}`, { align: 'center' });
            doc.moveDown();
            doc.text(`Now comes ${prosecutionAttorney} [Defendant],`);
            doc.moveDown();
            doc.text(`In this action who requests:\nThat the ${motionType.toLowerCase()} should be inadmissible in the court of law.`);
            doc.moveDown();
            doc.text(`I. ${reasonForMotion}`);
            doc.moveDown();
            doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
            doc.text(`${interaction.user.username}`, { align: 'right' }); // Signed by the user who submitted
            doc.end();

            stream.on('finish', async () => {
                try {
                    console.log('PDF generated successfully:', filePath);
                    const user = await client.users.fetch(interaction.user.id);
                    await user.send({
                        content: 'Your motion has been generated!',
                        files: [filePath]
                    });

                    console.log('PDF sent to user:', interaction.user.id);
                    await interaction.reply({ content: 'Motion generated and sent to your DM!', ephemeral: true });
                } catch (error) {
                    console.error('Error sending DM:', error);
                    await interaction.reply({ content: 'There was an error sending the motion to your DM. Please check the console for details.', ephemeral: true });
                }
            });

            stream.on('error', (error) => {
                console.error('Error writing PDF file:', error);
                interaction.reply({ content: 'There was an error generating the motion PDF. Please check the console for details.', ephemeral: true });
            });

        } catch (error) {
            console.error('Error generating motion:', error);
            await interaction.reply({ content: 'There was an error generating the motion. Please check the console for details.', ephemeral: true });
        }
    }
});

client.login(token);

// Registering Commands
const commands = [
    {
        name: 'motion',
        description: 'Generate a motion form',
        options: []
    }
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(clientId), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error refreshing commands:', error);
    }
})();

// Command to Trigger Button
client.on('messageCreate', async message => {
    if (message.content === '!motion') {
        try {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('openModal')
                        .setLabel('Open Motion Form')
                        .setStyle(ButtonStyle.Primary)
                );

            await message.channel.send({
                content: 'Click the button below to fill out a motion form:',
                components: [row]
            });

            console.log('Motion button sent successfully.');
        } catch (error) {
            console.error('Error sending motion button message:', error);
        }
    }
});
