const LocalStrategy= require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, getUserByEmail, getUserById){
    const authenticateUser = async (email, password, done) =>{
        let user;
        await getUserByEmail(email).then(
            result => {user = result[0]}
        );

        if (user == null) {
            return done(null, false, {message: "Invalid User credentials"});
        }
        try {
            if ( await bcrypt.compare(password, user.password)){ //user.password
                return done(null, user);
            } else {
                return done(null, false, {message:'Invalid User credentials'});
            }
        } catch (e){
            return done(e);
        }
    }

    passport.use(new LocalStrategy({usernameField: 'email'},authenticateUser));
    passport.serializeUser((user, done) => done(null, user._id));
    passport.deserializeUser((id, done) => {
        return done(null, getUserById(id))
    });
}

module.exports = initialize;