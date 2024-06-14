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

    let courtType;
    if (interaction.customId === 'criminalCourtMotion') {
        courtType = 'Criminal Court';
    } else if (interaction.customId === 'civilCourtMotion') {
        courtType = 'Civil Court';
    } else {
        return;
    }

    console.log(`Button clicked for ${courtType}, opening modal...`);
    try {
        const modal = new ModalBuilder()
            .setCustomId(`motionForm_${courtType.replace(' ', '_')}`)
            .setTitle(`${courtType} Motion Form`)
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('caseName')
                        .setLabel('Case Name')
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('yourAttorneyName')
                        .setLabel('Your Attorney Name')
                        .setStyle(TextInputStyle.Short)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('opposingCounsel')
                        .setLabel('Opposing Counsel')
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
});

// Handling Modal Submissions
client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;

    const courtType = interaction.customId.includes('Criminal_Court') ? 'Criminal Court' : 'Civil Court';
    console.log(`Modal submitted for ${courtType}, generating PDF...`);

    try {
        const caseName = interaction.fields.getTextInputValue('caseName');
        const yourAttorneyName = interaction.fields.getTextInputValue('yourAttorneyName');
        const opposingCounsel = interaction.fields.getTextInputValue('opposingCounsel');
        const motionType = interaction.fields.getTextInputValue('motionType');
        const reasonForMotion = interaction.fields.getTextInputValue('reasonForMotion');

        console.log('Form Data:', {
            caseName,
            yourAttorneyName,
            opposingCounsel,
            motionType,
            reasonForMotion,
            courtType
        });

        const doc = new PDFDocument();
        const filePath = path.join(motionsDir, `${caseName.replace(/ /g, '_')}.pdf`);

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Load the cursive font
        const cursiveFontPath = path.join(__dirname, 'fonts', 'GreatVibes-Regular.ttf');
        doc.font('Times-Roman'); // Default font for the rest of the document

        doc.fontSize(14).text(`Commonwealth of San Andreas`, { align: 'center' });
        doc.fontSize(12).text(`The ${courtType}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(18).text('MOTION FOR', { align: 'center' });
        doc.text(motionType, { align: 'center', underline: true });
        doc.moveDown();
        doc.text(` ${caseName}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Now comes ${yourAttorneyName},`);
        doc.moveDown();
        doc.text(`I, ${yourAttorneyName}, respectfully requests that this Court grant the Motion for ${motionType.toLowerCase()} and provide such other and further relief as the Court deems just and proper.`);
        doc.moveDown();
        doc.text(`I. ${reasonForMotion}`);
        doc.moveDown();
        doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();
        doc.text(`Signed: ${yourAttorneyName},`,{ align: 'right' });
        doc.moveDown();
        doc.fontSize(24).font(cursiveFontPath).text(yourAttorneyName, { align: 'right' }); // Signed by the user who submitted
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
                        .setCustomId('criminalCourtMotion')
                        .setLabel('Criminal Court Motion')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('civilCourtMotion')
                        .setLabel('Civil Court Motion')
                        .setStyle(ButtonStyle.Primary)
                );

            await message.channel.send({
                content: 'Click the button below to fill out a motion form:',
                components: [row]
            });

            console.log('Motion buttons sent successfully.');
        } catch (error) {
            console.error('Error sending motion button message:', error);
        }
    }
});
