const mongoose = require('mongoose');
let isDatabaseConnected = false;

mongoose.connect('mongodb://localhost:27017/FootStat')
  .then(async () => {
    console.log('Connected to Database');

    
    const db = mongoose.connection.getClient();

    try {
      
      await db.db('FootStat').collection('users').dropIndex({ 'likedMovies.movieId': 1 });
    } catch (error) {
      
      console.error('(IGNORE)Error dropping index:', error.message);
    }

   
    await db.db('FootStat').collection('users').createIndex({ name: 1, 'likedMovies.movieId': 1 }, { unique: true });

    

  })
  .catch((error) => {
    console.error('Error connecting to Database:', error.message);
  });

const loginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  otp: String,
  profilePicture:
  {
    type:String,
    required:false,
  },
  likedMovies: [{
    movieId: {
      type: String,
      required: true,
    },
    likedAt: {
      type: Date,
      default: Date.now,
    },
  }],
});


loginSchema.index({ name: 1, 'likedMovies.movieId': 1 }, { unique: true });

const collection = mongoose.model("users", loginSchema);

module.exports = collection;
