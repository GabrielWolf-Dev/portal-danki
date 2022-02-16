const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema({
    title: String,
    img: String,
    category: String,
    content: String,
    slug: String,
    author: String,
    authorImg: String,
    views: Number
}, { collection: 'posts' });

const Posts = mongoose.model('Posts', postSchema);

module.exports = Posts;