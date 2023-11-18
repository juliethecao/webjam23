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
app.use(express.static("views"));

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

// database.insert({ type:"prof", name:"rover", reviews:[{"name":"winton","title":"He was coming over, over, over","date":"Nov 2","desc":"Mr. Rover was one of the best rovers ive ever seen. The way he was coming over was so rover of him.","rating":"5"}, {"name":"Babe","title":"FAKE ROVER","date":"Nov 3","desc":"This guy is a fake. I came to the hallway and saw some indian dude dancing, pretending to be rover. I still get nightmares","rating":"1"}] });
// database.insert({"reviews": [], "type":"building","name":"Art Culture & Technology (ACT)","building_type":"Academic Units & Schools","school_type":"Arts","latlon":"33.65071192475636, -117.84493567558403"});
// database.insert({"reviews": [], "type":"building","name":"rover building","building_type":"Academic Units & Schools","school_type":"Arts","latlon":"33.65071192475636, -117.84493567558403"});

// main page
app.get('/', checkAuthenticated, async (request, response) => {
    const user = await request.user;
    response.render('index.ejs', { name: user[0].name });
});

// create review
app.post('/createRev', checkAuthenticated, async (request, response) => {
    const info = await request.body;
    const user = await request.user;
    const date = getDateFormat();
    const newReview = {name: user[0].name, title:info.title, date:date, desc:info.desc, rating:info.rating};
    database.update({_id: info.id}, { $push: { reviews: newReview } }, {}, function () {
    });
    const res = await getReviews(info.id);
    response.render('reviews.ejs', { id: info.id, reviews: res });
});

// get reviews
app.get('/reviews', checkAuthenticated, async(request, response) =>{
    const id = request.query.id;
    const res = await getReviews(id);
    response.render('reviews.ejs', { id: id, reviews: res });
});

// search results
app.get('/results', checkAuthenticated, async (request, response) => {
    const search = await request.query.search;
    const filter = await request.query.filter;
    const res = await createDivs(search, filter);
    response.render('results.ejs', {results: res});
})
app.post('/results', checkAuthenticated, async (request, response) => {
    const search = request.body.search;
    const filter = request.body.filter;
    response.redirect(`/results?search=${encodeURIComponent(search)}&filter=${encodeURIComponent(filter)}`);
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

//should change to get doc by id instead of name
async function findDocuments(id) {
    return new Promise((resolve, reject) => {
        database.find({ _id: id}, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                resolve(docs);
            }
        });
    });
} 

async function findAllDocuments(name, filter) {
    return new Promise((resolve, reject) => {
        let query = { name: {$regex: new RegExp(name.toLowerCase())}};
        if (filter !== "all" && filter !== undefined){
            query.type = filter;
        }
        database.find(query, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                resolve(docs);
            }
        });
    });
}

async function createDivs(name, filter) {
    const docs = await findAllDocuments(name, filter);
    let divs = '';
    if (docs.length === 0){
        divs += `<div>No results found</div>`;
    }
    else{
        for (let doc of docs) {
            divs += `
            <div name="${doc._id}"class="result-box" id="${doc._id}" style="cursor: pointer;" onclick="handleClick('${doc._id}')">
                <p>Name: ${doc.name}</p>
                <p>Type: ${doc.type}</p>
            </div>`;}
        return divs;
    }
}

async function getReviews(id) {
    let doc = await findDocuments(id);
    doc = doc[0];
    let divs = '';
    if (doc.type === "building"){
        divs += `<div>
            <h1>Location: ${doc.name}</h1>
            <p>School: ${doc.school_type}</p>
            <p>Building Type: ${doc.building_type}</p>
        </div>`;
        // divs +=  ``
        if (doc.reviews.length === 0){
            divs += `<div>No Reviews yet </div>`
        } else {
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
    }
    else{
        divs += `<div>
            <h1>Professor: ${doc.name}</h1>
            <p>Title: ${doc.title}</p>
            <p>Department: ${doc.dep}</p>
        </div>`;
        if (doc.reviews.length === 0){
            divs += `<div>No Reviews yet </div>`
        } else {
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

const fetch = require('node-fetch');
const url = 'https://api.peterportal.org/rest/v0/instructors/all';  // Replace with the correct endpoint
fetch(url)
.then(response => response.json())
.then(data =>{
    data.map(professor => {
        const doc = {
            type: "prof",
            name: professor.name.toLowerCase(),
            dep: professor.department,
            title: professor.title,
            reviews: []
        };
        database.insert(doc, function(err, doc){});
        });
    });

