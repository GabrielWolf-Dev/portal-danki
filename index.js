const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');

const app = express();

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
        res.send('Você buscou por ' + searchQuery);
    }
});

app.get('/:slug', (req, res) => {
    res.send(req.params.slug);
});

// Setup run local server
app.listen('5000', () => {
    console.log('Server is running :)');
});