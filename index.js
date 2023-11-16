const express = require('express');
const Datastore = require('nedb');
// require("dotenv").config();
// const cookieParser = require("cookie-parser");

// const indexRouter = require("./routes/index");
// const authRouter = require("./routes/auth");

//old working stuff
const app = express();
app.listen(8000, () => console.log('listening at 8000'));
app.use(express.static('routes'));
app.use(express.json()); // can insert limits here to prtect against flooding

const database = new Datastore('database.db');

database.loadDatabase();

app.post('/api', (request, response) => {
    const data = request.body;
    const timestamp = Date.now();
    data.timestamp = timestamp;
    database.insert(data);
    response.json(data);
});

// app.get('/prof/:prof', (request, response) => {
//     const prof = request.params.prof;
//     database.find({prof}, (err, data) => {
//         if (err){
//             response.end();
//             return;
//         }
//         response.json(data);
//     });
// });


// Prof:
// {type: prof, name, dep, title, [{reviews}]}
// review format: {user, title, date, description, rating}

// User:
// {type: user, name, [reviews_made]}