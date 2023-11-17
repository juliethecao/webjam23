if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const express = require('express');
const app = express();
const Datastore = require('nedb');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const util = require('util');
const methodOverride = require('method-override');

// database
const database = new Datastore('database.db');
database.loadDatabase();

const findAsync = util.promisify(database.find.bind(database));
const initializePassport = require('./passport-config');
initializePassport(passport, 
    async email => {
        try {
            const docs = await findAsync({ email: email });
            return docs;
        } catch (err) {
            throw err;
        }
    },
    async id => {
        try {
            const docs = await findAsync({ _id: id });
            return docs;
        } catch (err) {
            throw err;
        }
    }
);
app.set('view-engine', 'ejs');
app.use(express.urlencoded({extended: false}));
app.use(flash());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));


// database.insert({ type:"prof", name:"rover", dep:"ICS", title:"rizzler", reviews:[{"name":"winton","title":"He was coming over, over, over","date":"Nov 2","desc":"Mr. Rover was one of the best rovers ive ever seen. The way he was coming over was so rover of him.","rating":"5"}, {"name":"Babe","title":"FAKE ROVER","date":"Nov 3","desc":"This guy is a fake and hes not even Asian. I came to the hallway and saw some indian dude dancing, pretending to be rover. I still get nightmares","rating":"1"}] });
// database.insert({ type:"prof", name:"over", dep:"BIO", title:"Doctor", reviews: [] });
// database.insert({ type:"prof", name:"kai", dep:"ART", title:"failure", reviews: [] });



// main page
app.get('/', checkAuthenticated, async (request, response) => {
    const user = await request.user;
    // console.log(user[0]);
    response.render('index.ejs', { name: user[0].name });
});

// create review
app.post('/createRev', checkAuthenticated, async (request, response) => {
    const info = await request.body;
    const user = await request.user;
    const date = getDateFormat();
    console.log(info.name, info.title, info.desc, info.rating);
    console.log(user);
    console.log(date);
    const newReview = {name: user[0].name, title:info.title, date:date, desc:info.desc, rating:info.rating};
    database.update({name: info.name, type: "prof"}, { $push: { reviews: newReview } }, {}, function () {

    });

    response.redirect(`/results?search=${encodeURIComponent(info.name)}`);
})

// get reviews
app.get('/reviews', checkAuthenticated, async(request, response) =>{
    const name = request.query.name;
    const res = await getReviews(name);
    response.render('reviews.ejs', { name: name, reviews: res });
});

// search results
app.get('/results', checkAuthenticated, async (request, response) => {
    const search = await request.query.search;
    const res = await createDivs(search);
    response.render('results.ejs', {results: res});
})
app.post('/results', checkAuthenticated, async (request, response) => {
    response.redirect(`/results?search=${encodeURIComponent(request.body.search)}`);
});

//login
app.get('/login', checkNotAuthenticated, (request, response) => {
    response.render('login.ejs');
});
app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

//register
app.get('/register', checkNotAuthenticated, (request, response) => {
    response.render('register.ejs');
});

app.post('/register', checkNotAuthenticated, async (request, response) => {
    try {
        const hashedPassword = await bcrypt.hash(request.body.password, 10);
        database.insert({type: 'user', name: request.body.name, email: request.body.email, password: hashedPassword, reviewsMade: []})
        response.redirect('/login');
    } catch {
        response.redirect('/register');
    }
});

// logout
app.delete('/logout', (req, res) => {
    req.logOut(() => {
        res.redirect('/login');
    });
});

// helper functions
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next){
    if (req.isAuthenticated()){
        return res.redirect('/');
    }
    next();
}

async function findDocuments(name) {
    return new Promise((resolve, reject) => {
        database.find({ name: name, type: "prof" }, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                resolve(docs);
            }
        });
    });
} 

async function findAllDocuments(name) {
    return new Promise((resolve, reject) => {
        // name = "/" + name + "/";
        console.log(name);
        database.find({ name: {$regex: new RegExp(name)}, type: "prof" }, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                resolve(docs);
            }
        });
    });
}

async function createDivs(name) {
    const docs = await findAllDocuments(name);
    let divs = '';
    if (docs.length === 0){
        divs += `<div>No results found</div>`;
    }
    else{
        for (let doc of docs) {
            divs += `
            <div name="${doc.name}"class="result-box" id="${doc.name}" style="cursor: pointer;" onclick="handleClick('${doc.name}')">
                Name: ${doc.name}
            </div>`;}
        return divs;
    }
}

async function getReviews(name) {
    let doc = await findDocuments(name);
    doc = doc[0];
    let divs = '';
    if (doc.reviews.length === 0){
        divs += `<div>No Reviews yet for this professor</div>`
    }
    else{
        divs += `<div>
            <h1>Professor: ${doc.name}</h1>
            <p>Title: ${doc.title}</p>
            <p>Department: ${doc.dep}</p>
        </div>`;
        for (let i = doc.reviews.length - 1; i >= 0; i--) {
            let review = doc.reviews[i];
            divs += `
            <div>
                <h3>${review.title}</h3>
                <p>Review by: ${review.name}</p>
                <p>Date: ${review.date}</p>
                <p>Description: ${review.desc}</p>
                <p>Rating: ${review.rating}</p>
            </div>`;
        }
    }
    return divs;
}

function getDateFormat(){
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const dateString = month + "/" + day + "/" + year;

    return dateString;
}
app.listen(8000);

// Prof:
// {type: prof, name, dep, title, [{reviews}]}
// review format: {username, title, date, description, rating}

// User:
// {type: user, name, password, uciemail, [reviews_made]}}