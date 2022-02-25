const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fileupload = require('express-fileupload');
const fs = require('fs');
const { filterXSS } = require('xss');
const session = require('express-session');

const app = express();
const Posts = require('./Posts.js');
const req = require('express/lib/request');

dotenv.config();

// Connection Mongo Db
const urlConnect = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASS_MONGODB}@cluster0.ihfw2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
mongoose.connect(urlConnect, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('Conectado!');
})
.catch(error => {
    console.error(error.message);
});

// Setup Body Parser
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // to support URL-encoded bodies(Form req)

app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'keyboard cat', // Como é um gerador de keys, para o usuário não acessar os dados da sessão e ser seguro
    cookie: { maxAge: 60000 } // Definiu a sessão como cookie
}));

// Upload de arquivos:
app.use(fileupload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, 'temp')
}));

// Setup for read HTML files with 'ejs'
app.engine('html', ejs.renderFile); // Render files extended .html
app.set('view engine', 'html');
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, '/pages'));

app.get('/', (req, res) => {
    const searchQuery = filterXSS(req.query.search);

    if(searchQuery === '' || searchQuery === undefined){
        Posts.find({ })
        .sort({ '_id': -1 })
        .exec((error, posts) => {
            if(error){
                throw new Error(error.message);
            }
            
            const postsRefactored = posts.map(post => {
                return {
                    title: post.title,
                    img: post.img,
                    contentResume: post.content.substr(0, 150) + "...",
                    author: post.author,
                    authorImg: post.authorImg,
                    slug: post.slug,
                    category: post.category
                }
            });

            Posts.find({})
            .sort({'views': -1})
            .limit(3)
            .exec((error, mostPosts) => {
                if(error){
                    throw new Error(error.message);
                }
            
                const mostNews = mostPosts.map(mostPost => {
                    return {
                        title: mostPost.title,
                        contentResume: mostPost.content.substr(0, 100) + "...",
                        img: mostPost.img,
                        slug: mostPost.slug,
                        category: mostPost.category,
                        views: mostPost.views
                    }
                });

                res.render('home', {
                    postsRefactored,
                    mostNews
                });
            });
        });
    } else {
        Posts.find({
            title: {
                $regex: searchQuery,
                $options: 'i'
            }
        },
        (error, postsSearched) => {
            if(error) {
                throw new Error(error.message);
            }

            const dataPostsFilter = postsSearched.map(dataFilter => {
                return {
                    contentResume: dataFilter.content.substr(0, 200) + '...',
                    slug: dataFilter.slug,
                    category: dataFilter.category,
                    views: dataFilter.views
                };
            });

            res.render('search', {
                dataPostsFilter,
                postsAmount: postsSearched.length
            });
        });
    }
});

app.get('/:slug', (req, res) => {
    const { slug } = req.params;

    Posts.findOneAndUpdate({ slug }, {
        $inc: { views: 1 }
    }, { new: true },
    (error, response) => {
        if(error){
            throw new Error(error.message);
        }

        if(response !== null){
            Posts.find({})
            .sort({'views': -1})
            .limit(3)
            .exec((error, mostPosts) => {
                if(error){
                    throw new Error(error.message);
                }
            
                const mostNews = mostPosts.map(mostPost => {
                    return {
                        title: mostPost.title,
                        contentResume: mostPost.content.substr(0, 100) + "...",
                        img: mostPost.img,
                        slug: mostPost.slug,
                        category: mostPost.category,
                        views: mostPost.views
                    }
                });
    
                res.render('post', {
                    newSelected: response,
                    mostNews
                });
            });
        } else {
            res.redirect('/');
        }
    });
});

const loginUsers = [ // Ou puxar no banco de dados
    {
        name: 'Joao',
        pass: '123'
    }
];

app.get('/admin/login', (req, res) => {
    if(req.session.login == null) {
        res.render('admin-login');
    } else {
        Posts.find({ })
        .sort({ '_id': -1 })
        .exec((error, posts) => {
            if(error){
                throw new Error(error.message);
            }
            
            const postsRefactored = posts.map(post => {
                return {
                    title: post.title,
                    id: post.id,
                }
            });

            res.render('admin-panel', {
                login: req.session.login,
                posts: postsRefactored
            });
        });
    }
});

app.post('/admin/login', (req, res) => {
    const name = filterXSS(req.body.name);
    const pass = filterXSS(req.body.pass);
    const sessionData = req.session;

    loginUsers.forEach(user => {
        if(user.name == name && user.pass == pass) {
            sessionData.login = {
                name,
                pass
            };

            res.redirect('/admin/login');
        }
    });
});

app.get('/admin/delete/:id', (req, res) => {
    Posts.deleteOne({ _id: req.params.id })
    .then(() => {
        console.log('Notícia deletada com sucesso!');
        res.redirect('/admin/login');
    });
});

app.post('/admin/register', (req, res) => {
    const {
        title,
        newContent,
        categoryNew,
        authorName,
        authorURLImg
    } = req.body;
    const slugFormated = filterXSS(title.replaceAll(' ', '-').replaceAll(/[!?.#$%|]/g, '').toLowerCase());
    const { file } = req.files;
    const [name, format] = file.name.split('.');
    const currentDate = new Date().getTime();
    const image = `${name}-${currentDate}.jpg`;
    const imgURL = `http://localhost:5000/public/assets/files/${image}`;

    if(format == 'jpg'){
        file.mv(`${__dirname}/public/assets/files/${image}`);
    } else { // Deletar o arquivo, tirando na memória(Otimização)
        fs.unlinkSync(file.tempFilePath);
    }

    Posts.create({
        title: filterXSS(title),
        img: imgURL,
        category: filterXSS(categoryNew),
        content: filterXSS(newContent),
        slug: slugFormated,
        author: filterXSS(authorName),
        authorImg: filterXSS(authorURLImg),
        views: 0
    });
    
    console.log('Notícia cadastrada com sucesso!');
    res.redirect('/admin/login');
});

// Setup run local server
app.listen('5000', () => {
    console.log('Server is running :)');
});