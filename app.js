//Get reuired modules
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

//Initiate an instance of express
const app = express();
app.use(bodyParser.json());

//Initiate connection to DB
const db = mysql.createPool({
    host: 'mysql',
    user: 'root',
    password: 'password',
    database: 'mydb',
    waitForConnection: true,
    connectionLimit: 10,
    queueLimit: 0
});

//Global Variables
const expiredTokens = [];
const secretKey = 'Cibus';

//This function get the token from request header and check if it valid
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    //If a user logged out, the token will be stored in expiredToken
    if (expiredTokens.includes(token)) {
        return res.status(403).json({ message: 'Token expired' });
      }
  
    jwt.verify(token, secretKey, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
}

//This function make a query request to the DB
function executeQuery(sql, values, callback) {
    db.query(sql, values, (err, results) => {
      if (err) {
        console.error(err);
        return callback(err, null);
      }
      return callback(null, results);
    });
}



app.post('/register', (req, res) => {

    const { username, password } = req.body;
    
    //Encrypt password before adding it to the DB
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          return res.status(500).json({ message: 'Error registering user' });
        }

        //Insert user into the 'users' table
        const sqlQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
        executeQuery(sqlQuery, [username, hashedPassword], (err, result) =>{
            if(err) {
                return res.status(500).json({message: 'Error registering user'});
            }
            res.status(201).json({ message: 'User registered successfully'});
        });
    });
});


app.post('/login', (req, res) => {

    const { username, password } = req.body;
 
    //Get user information from 'users' table
    const sqlQuery = 'SELECT * FROM users WHERE username = ?;';
    executeQuery(sqlQuery, [username], (err, sqlResult) => {
        if(err){
            return res.status(500).json({message: 'User not found'});
        }

        //Compare password entered with the hashed password stored in DB
        bcrypt.compare(password, sqlResult[0].password, (error, result) => {
            if(error) {
                return res.status(500).json({ message: 'Error logging in' });
            }

            if(!result) {
                return res.status(401).json({ message: 'Authentication failed' });
            }

             // Generate a JWT token
            const user = sqlResult[0];
            const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '15m' });

            res.json({ message: 'Logged in successfully', token: token });
        });
    });
});


//Add token to expiredTokens array to emulate expiration
app.post('/logout', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
    expiredTokens.push(token);
    } else {
        return res.json({ message: 'No token'});
    }
    res.json({ message: 'Logout Successful'});
});


//It's not written in the task, but I assumed that this request should be valid to logged in users
app.get('/messages', authenticateToken, (req, res) =>{
    //Get all messages from 'messages' table
    const sqlQuery = 'SELECT * FROM messages';
    executeQuery(sqlQuery, [], (err, result) => {
        if(err){
            return res.status(500).json({message: 'Error fetching messages'});
        }
        res.json(result);
    });
});


app.post('/messages', authenticateToken, (req, res) => {
    const { text } = req.body;
    const author = req.user.username;
  
    // Insert message into the 'messages' table
    const sqlQuery = 'INSERT INTO messages (text, author) VALUES (?, ?)';
    executeQuery(sqlQuery, [text, author], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Error posting message' });
          }
          res.json({ message: 'Message posted successfully' });
        });
});



app.post('/message/:message_id/vote', authenticateToken,(req, res) => {

    const messageId = req.params.message_id;
    const voteType = req.body.voteType;
    const userId = req.user.id;

    // Check if the message exists before updating votes
    const checkMessageExistsQuery = 'SELECT COUNT(*) AS messageCount FROM messages WHERE id = ?';

    executeQuery(checkMessageExistsQuery, [messageId], (checkErr, checkResult) => {
        if (checkErr) {
            return res.status(500).json({ message: 'Error checking message existence' });
        }

        const messageCount = checkResult[0].messageCount;

        if (messageCount === 0) {
            return res.status(404).json({ message: 'Message not found' });
        }

    var sqlQuery = ""
    if (voteType === "up"){
        sqlQuery = "UPDATE messages SET votes = votes + 1 WHERE id = ?;"
    } else if (voteType === "down"){
        sqlQuery = "UPDATE messages SET votes = votes - 1 WHERE id = ?;"
    } else {
        res.status(400).json({message: 'Invalid vote type'});
    }
    executeQuery(sqlQuery, [messageId], (err, result) => {
        if(err){
            return res.status(500).json({message: 'Error voting for message'});
        }
        res.json({message: 'Vote submitted successfully', result: result, messageId: messageId, voteType: voteType});
    });
    });
});


app.delete('/message/:message_id', authenticateToken, (req, res) => {

    const messageId = req.params.message_id;
    const author = req.user.username;
    const sqlQuery = 'DELETE FROM messages WHERE id = ? AND author = ?';

    executeQuery(sqlQuery, [messageId, author], (err, result) => {
        if(err) {
            return res.status(500).json({message: 'Error deleting message'});
        }
        if(result.affectedRows === 0){
            return res.status(403).json({message: 'Not authorized to delete this message'});
        }
        res.json({message: 'Message deleted successfuly'});
    });
});


app.get('/user/messages', authenticateToken, (req, res) => {
    const author = req.user.username;

    const sqlQuery = 'SELECT * FROM messages where author = ?;';
    executeQuery(sqlQuery, [author], (err, result) => {
        if(err){
            return res.status(500).json({message: 'Error fetching user messages'})
        }
        res.json(result);
    });
});


const port = 3000;
app.listen(port, () => {
    console.log('Server running on http://localhost:'+port);
});