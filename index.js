const { Client, GatewayIntentBits, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { token, clientId } = require('./config.json'); // Store your token and clientId in config.json
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const slimId = '<@201870376127430666>';

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

// Ensure the subpoenas directory exists
const subpoenasDir = path.join(__dirname, 'subpoenas');
if (!fs.existsSync(subpoenasDir)) {
    fs.mkdirSync(subpoenasDir);
    console.log('Created subpoenas directory.');
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    if (interaction.isButton()) {
        let courtType;
        if (interaction.customId === 'criminalCourtMotion') {
            courtType = 'Criminal Court';
        } else if (interaction.customId === 'civilCourtMotion') {
            courtType = 'Civil Court';
        } else if (interaction.customId === 'subpoena') {
            courtType = 'Subpoena';
        } else {
            return;
        }

        console.log(`Button clicked for ${courtType}, opening modal...`);
        try {
            if (courtType === 'Subpoena') {
                const modal = new ModalBuilder()
                    .setCustomId('subpoenaForm')
                    .setTitle('Subpoena Form')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('caseName')
                                .setLabel('Case Name')
                                .setStyle(TextInputStyle.Short)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('personSubpoenaed')
                                .setLabel('Person Subpoenaed')
                                .setStyle(TextInputStyle.Short)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('command')
                                .setLabel('Command (Use only TESTIFY or EVIDENCE)')
                                .setStyle(TextInputStyle.Short)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('request')
                                .setLabel('Specific Evidence Requested (CCTV, Testimony)')
                                .setStyle(TextInputStyle.Short)
                        ),
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('yourName')
                                .setLabel('Your Name')
                                .setStyle(TextInputStyle.Short)
                        )
                    );

                await interaction.showModal(modal);
                console.log('Subpoena modal shown successfully.');
            } else {
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
            }
        } catch (error) {
            console.error('Error showing modal:', error);
        }
    }

    if (interaction.isModalSubmit()) {
        // Acknowledge the interaction immediately
        await interaction.deferReply({ ephemeral: true });

        if (interaction.customId.startsWith('motionForm')) {
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

                doc.fontSize(14).text(`The Courts of San Andreas`, { align: 'center' });
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
                doc.fontSize(18).text('Reason')
                doc.moveDown();
                doc.fontSize(12).text(`     ${reasonForMotion}`);
                doc.moveDown();
                doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
                doc.moveDown();
                doc.text(`Signed: ${yourAttorneyName},`, { align: 'right' });
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
                        await interaction.editReply({ content: 'Motion generated and sent to your DM!' });
                    } catch (error) {
                        console.error('Error sending DM:', error);
                        await interaction.editReply({ content: 'There was an error sending the motion to your DM. Please check the console for details.' });
                    }
                });

                stream.on('error', async (error) => {
                    console.error('Error writing PDF file:', error);
                    await interaction.editReply({ content: 'There was an error generating the motion PDF. Please check the console for details.' });
                });

            } catch (error) {
                console.error('Error generating motion:', error);
                await interaction.editReply({ content: 'There was an error generating the motion. Please check the console for details.' });
            }
        } else if (interaction.customId === 'subpoenaForm') {
            console.log('Subpoena modal submitted, generating PDF...');

            try {
                const caseName = interaction.fields.getTextInputValue('caseName');
                const personSubpoenaed = interaction.fields.getTextInputValue('personSubpoenaed');
                const command = interaction.fields.getTextInputValue('command');
                const request = interaction.fields.getTextInputValue('request');
                const yourName = interaction.fields.getTextInputValue('yourName');
                

                console.log('Form Data:', {
                    caseName,
                    personSubpoenaed,
                    command,
                    request,
                    yourName
                });

                const doc = new PDFDocument();
                const filePath = path.join(subpoenasDir, `${personSubpoenaed.replace(/ /g, '_')}_Subpoena.pdf`);
                
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);
                  // Load the cursive font
                  const cursiveFontPath = path.join(__dirname, 'fonts', 'GreatVibes-Regular.ttf');
                  doc.font('Times-Roman'); // Default font for the rest of the document

                doc.fontSize(14).text('The Courts of San Andreas', { align: 'center' });
                doc.moveDown();
                doc.text(caseName, { align: 'left' });
                doc.moveDown();
                doc.fontSize(18).text('SUBPOENA', { align: 'center', underline: true });
                doc.moveDown();
                doc.fontSize(12).text(`To: ${personSubpoenaed}`, { align: 'left' });
                doc.moveDown();
                doc.text(`YOU ARE HEREBY COMMANDED TO:`, { align: 'left', underline: true });
                doc.moveDown();
                if (command.toLowerCase() === 'testify') {
                    doc.text(`Appear and or Testify at in the above-referenced case.`, { align: 'left' });
                } else if (command.toLowerCase() === 'evidence') {
                    doc.text(`to Produce ${request}`, { align: 'left' });
                    doc.moveDown();
                    doc.text(`Evidence is to be produced within 7 days or 24 hours prior to trial commencement, which ever comes first.`, { align: 'left' });
                }  else {
                    doc.fontSize(35).text('USER MUST SELECT TESTIFY or EVIDENCE WHEN USING LEGALDOCBOT!!!');
                }
                doc.moveDown();
                doc.text(`Failure to comply with this subpoena may result in contempt of court and subject you to penalties under the law.`, { align: 'left' });
                doc.moveDown();
                doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
                doc.moveDown();
                doc.text(`drafted by:`, { align: 'left' });
                doc.text(yourName, { align: 'left' });
                doc.moveDown();
                doc.text(`Signature: `)
                doc.fontSize(24).font(cursiveFontPath).text(`${yourName}` , { align: 'left' });
                doc.moveDown();
                doc.fontSize(12).font('Times-Roman').text(`Printed Name: ${yourName}`, { align: 'left' });
                doc.text(`Title/Role: Attorney`, { align: 'left' });

                doc.end();

                stream.on('finish', async () => {
                    try {
                        console.log('PDF generated successfully:', filePath);
                        const user = await client.users.fetch(interaction.user.id);
                        await user.send({
                            content: 'Your subpoena has been generated!',
                            files: [filePath]
                        });

                        console.log('PDF sent to user:', interaction.user.id);
                        await interaction.editReply({ content: 'Subpoena generated and sent to your DM!' });
                    } catch (error) {
                        console.error('Error sending DM:', error);
                        await interaction.editReply({ content: 'There was an error sending the subpoena to your DM. Please check the console for details.' });
                    }
                });

                stream.on('error', async (error) => {
                    console.error('Error writing PDF file:', error);
                    await interaction.editReply({ content: 'There was an error generating the subpoena PDF. Please check the console for details.' });
                });

            } catch (error) {
                console.error('Error generating subpoena:', error);
                await interaction.editReply({ content: 'There was an error generating the subpoena. Please check the console for details.' });
            }
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
    },
    {
        name: 'subpoena',
        description: 'Generate a subpoena form',
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

// Command to Trigger Buttons
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
    } else if (message.content === '!subpoena') {
        try {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('subpoena')
                        .setLabel('Create Subpoena')
                        .setStyle(ButtonStyle.Primary)
                );

            await message.channel.send({
                content: 'Click the button below to fill out a subpoena form:',
                components: [row]
            });

            console.log('Subpoena button sent successfully.');
        } catch (error) {
            console.error('Error sending subpoena button message:', error);
        }
    }   else if (message.content === '!honey'){
        let yellGif = ['https://tenor.com/view/spongebob-spongebob-yelling-squidward-spongebob-meme-spongebob-gif-gif-25989400','https://tenor.com/view/kramer-yelling-arguing-in-my-face-kramer-yelling-gif-14813520', 'https://tenor.com/view/muppets-loud-yell-yelling-screaming-gif-21845107' ];
        let yellGifLength = Math.floor(Math.random() *  yellGif.length);
        let displayGif = yellGif[yellGifLength];
        
        await message.channel.send(`Honey Said its time for bed ${slimId}! ${displayGif}`);
        

    }   else if (message.content === '!index'){
        await message.channel.send(' # Commands \n **!motion** --- *To create a motion* \n **!subpoena** --- *To create subpoenas*\n **!honey** --- *The bot to yell at Slim!*');
    }   else if (message.content === '!clearCashe' && message.member.permissions.has('ADMINISTRATOR')) {
        const directory = 'E:/MotionBot/motions';
        fs.readdir(directory, (err, files) => {
            if (err) {
                message.channel.send('Error reading the directory.');
                console.error(err);
                return;
            }

            for (const file of files) {
                const filePath = path.join(directory, file);
                fs.stat(filePath, (err, stat) => {
                    if (err) {
                        message.channel.send('Error stating the file.');
                        console.error(err);
                        return;
                    }

                    if (stat.isDirectory()) {
                        fs.rmdir(filePath, { recursive: true }, (err) => {
                            if (err) {
                                message.channel.send('Error deleting directory.');
                                console.error(err);
                                return;
                            }
                            console.log(`${filePath} directory deleted`);
                        });
                    } else {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                message.channel.send('Error deleting file.');
                                console.error(err);
                                return;
                            }
                            console.log(`${filePath} file deleted`);
                        });
                    }
                });
            }
            message.channel.send('Folder cleared successfully.');
        });
    } else if (message.content === '!goon'){
        let tothId = '<@263808514051276800>';
       await message.channel.send(`Why ${tothId} so horny?`);
        await message.channel.send('https://tenor.com/view/jarvis-iron-man-goon-gif-5902471035652079804');

    } else if (message.content === '!degenerates'){
        let lawrenceId = '<@110849322282663936>';
        await message.channel.send(`When ${lawrenceId} is mad at you!`);
        await message.channel.send('https://tenor.com/view/fallout-new-vegas-degenerates-degenerates-like-you-belong-on-a-cross-degenerate-gif-21451302');
    }



});
