const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { filterXSS } = require('xss');

const app = express();
const Posts = require('./Posts.js');

dotenv.config();

// Connection Mongo Db
const urlConnect = `mongodb+srv://root:${process.env.PASS_MONGODB}@cluster0.ihfw2.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
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
    const searchQuery = filterXSS(req.query.search);

    if(searchQuery === undefined){
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

// Setup run local server
app.listen('5000', () => {
    console.log('Server is running :)');
});