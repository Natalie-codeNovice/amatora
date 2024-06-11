const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// Create a connection to the MySQL database
const db = mysql.createConnection({
    host: 'bxkfyq6ddqop9whqnv9u-mysql.services.clever-cloud.com',
    user: 'uow0oserm41zait8',
    password: 'PCE0qrJcAdV2KTaOi6dE', 
    database: 'bxkfyq6ddqop9whqnv9u'
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

// In-memory storage for votes (for simplicity)
let votes = {
    "Natalie MUKASHEMA . ": 0,
    "Louise IRADUKUNDA . ": 0,
    "Lenon SHAMI . ": 0,
    "Miguel RUGERO . ": 0,
    "Fenty CYUZUZO . ": 0
};

// In-memory storage for user data (for simplicity)
let userNames = {};
let voters = new Set(); // Set to track phone numbers that have already voted
let userLanguages = {}; // Object to store the language preference of each user

app.post('/ussd', (req, res) => {
    let response = '';

    // Extract USSD input
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    // Parse user input
    const userInput = text.split('*').map(option => option.trim());

    // Determine next action based on user input
    if (userInput.length === 1 && userInput[0] === '') {
        // First level menu: Language selection
        response = `vote your best candidates\n`;
        response += `1. English\n`;
        response += `2. Kinyarwanda`;
    } else if (userInput.length === 1 && userInput[0] !== '') {
        // Save user's language choice and move to the name input menu
        userLanguages[phoneNumber] = userInput[0] === '1' ? 'en' : 'rw';
        response = userLanguages[phoneNumber] === 'en' ? 
            `CON Please enter your name:` : 
            `CON Injiza amazina yawe:`;
    } else if (userInput.length === 2) {
        // Save user's name
        userNames[phoneNumber] = userInput[1];

        // Third level menu: Main menu
        response = userLanguages[phoneNumber] === 'en' ? 
            `CON Hi ${userNames[phoneNumber]}, choose an option:\n1. Vote Candidate\n2. View Votes` : 
            `CON Muraho ${userNames[phoneNumber]}, Hitamo Icyo Ushaka:\n1. Gutora\n2. Kureba abatowe`;
    } else if (userInput.length === 3) {
        if (userInput[2] === '1') {
            // Check if the phone number has already voted
            if (voters.has(phoneNumber)) {
                response = userLanguages[phoneNumber] === 'en' ? 
                    `END You have already voted. Thank you!` : 
                    `END Wamaze Gutoza. Murakoze!`;
            } else {
                // Voting option selected
                response = userLanguages[phoneNumber] === 'en' ? 
                    `CON Select a candidate:\n1. Natalie MUKASHEMA\n2. Louise IRADUKUNDA\n3. Lenon SHAMI\n4. Miguel RUGERO\n5. Fenty CYUZUZO` : 
                    `CON Hitamo Umukandida:\n1. Natalie MUKASHEMA\n2. Louise IRADUKUNDA\n3. Lenon SHAMI\n4.Miguel RUGERO\n5. Fenty CYUZUZO`;
            }
        } else if (userInput[2] === '2') {
            // View votes option selected
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Votes:\n` : 
                `END Gutora:\n`;
            for (let candidate in votes) {
                response += `${candidate}: ${votes[candidate]} votes\n`;
            }
        }
    } else if (userInput.length === 4) {
        // Fourth level menu: Voting confirmation
        let candidateIndex = parseInt(userInput[3]) - 1;
        let candidateNames = Object.keys(votes);
        if (candidateIndex >= 0 && candidateIndex < candidateNames.length) {
            votes[candidateNames[candidateIndex]] += 1;
            voters.add(phoneNumber); // Mark this phone number as having voted
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Thank you for voting for ${candidateNames[candidateIndex]}!` : 
                `END Murakoze, Mutoye : ${candidateNames[candidateIndex]}!`;

            // Insert voting record into the database
            const voteData = {
                session_id: sessionId,
                phone_number: phoneNumber,
                user_name: userNames[phoneNumber],
                language_used: userLanguages[phoneNumber],
                voted_candidate: candidateNames[candidateIndex]
            };

            const insertVoteQuery = 'INSERT INTO votes SET ?';
            db.query(insertVoteQuery, voteData, (err, result) => {
                if (err) {
                    console.error('Error inserting data into database:', err.stack);
                } else {
                    console.log('Vote record inserted successfully.');
                }
            });
        } else {
            response = userLanguages[phoneNumber] === 'en' ? 
                `END Invalid selection. Please try again.` : 
                `END Ibyo musabye Ntibikunze. Ongera ugerageze`;
        }
    }

    res.send(response);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
