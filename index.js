const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const app = express();
dotenv.config();

// Connection Mongo Db
const urlConnect = `mongodb+srv://root:${process.env.PASS_MONGODB}@cluster0.ihfw2.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
mongoose.connect(urlConnect, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Conectado!');
})
.catch(error => {
    throw new Error(error.message);
});

// Setup Body Parser
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies(Form req)

// Setup for read HTML files with 'ejs'
app.engine('html', ejs.renderFile); // Render files extended .html
app.set('view engine', 'html');
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, '/pages'));

app.get('/', (req, res) => {
    const searchQuery = req.query.search;

    if(searchQuery === undefined){
        res.render('home', {});
    } else {
        res.render('search', {});
    }
});

app.get('/:slug', (req, res) => {
    res.render('post', {});
});

// Setup run local server
app.listen('5000', () => {
    console.log('Server is running :)');
});