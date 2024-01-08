let usname,_genre,_year;
const express = require("express");
const path = require("path");
const axios = require("axios");
const bcrypt = require("bcrypt");
const sgMail= require("@sendgrid/mail");
const collection = require("./config");
const multer = require('multer');
const app = express();
app.listen(3000, () => {
  console.log("Port connected");
});

app.use(express.static("views"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");


const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};


const sendEmailOTP = async (email, otp) => {
  sgMail.setApiKey("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"); 

  const msg = {
    to: email,
    from: "vasu7788@hotmail.com", 
    subject: "Verification Code",
    text: `Your verification code is: ${otp}`,
    html: `<p>Your verification code is: ${otp}</p>`,
  };

  await sgMail.send(msg);
};

const fetchData = async (year,titleType,page) => {
  const results = [];

  const options = {
    method: "GET",
    url: "https://moviesdatabase.p.rapidapi.com/titles",
    params: {
      year,
      titleType,
      page,
    },
    headers: {
      "X-RapidAPI-Key": "c9816d6786mshe8507f15542013bp1e0712jsn68ce5d771de1",
      "X-RapidAPI-Host": "moviesdatabase.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    const responseData = response.data;

    if (Array.isArray(responseData.results)) {
      results.push(...responseData.results);
    }

    return results;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const fetchDataForMovie = async (id) => {
  const options = {
    method: 'GET',
    url: `https://moviesdatabase.p.rapidapi.com/titles/${id}`,
    headers: {
      'X-RapidAPI-Key': 'c9816d6786mshe8507f15542013bp1e0712jsn68ce5d771de1',
      'X-RapidAPI-Host': 'moviesdatabase.p.rapidapi.com',
    },
  };

  try {
    const response = await axios.request(options);
    return response.data.results; 
  } catch (error) {
    console.error(error);
    throw error;
  }
};
const fetchDataForMovieratings = async (id) => {
  const options = {
    method: 'GET',
    url: `https://moviesdatabase.p.rapidapi.com/titles/${id}/ratings`,
    headers: {
      'X-RapidAPI-Key': 'c9816d6786mshe8507f15542013bp1e0712jsn68ce5d771de1',
      'X-RapidAPI-Host': 'moviesdatabase.p.rapidapi.com',
    },
  };

  try {
    const response = await axios.request(options);
    return response.data.results; 
  } catch (error) {
    console.error(error);
    throw error;
  }
};


app.get("/", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'views/uploads'); 
  },
  filename: function (req, file, cb) {
    // Generate a unique filename for the uploaded file based on the username
    const username = req.body.username;
    const filename = username ? username : 'default'; 
    cb(null, filename);
  }
});
const upload = multer({ storage: storage });

app.post("/signup", upload.single('profilePicture'), async (req, res) => {
  try {
    const existingUser = await collection.findOne({ name: req.body.username });

    if (existingUser) {
      console.log("Username already exists");
      return res.status(200).send("Username already exists");
    }

    if (!req.body.email) {
      console.log("Please provide your email");
      return res.status(400).send("Please provide your email");
    }

    if (req.body.email) {
      const existingEmail = await collection.findOne({ email: req.body.email });
      if (existingEmail) {
        console.log("Email already exists");
        return res.status(200).send("Email already exists");
      }
    }

    const otp = generateOTP();

    if (req.body.email) {
      await sendEmailOTP(req.body.email, otp);
      console.log(`OTP sent to email: ${req.body.email}`);
    }

    

    
    const profilePicture = req.file;
    if (req.body.password.length < 5) {
      return res.status(400).send("Password should be at least 5 characters long. Go back and enter a new password.");
    }
    if (!/^[a-zA-Z0-9]{5,}$/.test(req.body.username)) {
      return res.status(400).send("Username should be at least 5 characters long and cannot contain special characters. Go back and enter a new username.");
    }
    const data = {
      name: req.body.username,
      password: req.body.password,
      email: req.body.email || undefined,
      profilePicture: profilePicture ? profilePicture.filename : undefined,
    };

    const tempOtp = otp;
    

    res.render("verify-otp", { username: req.body.username, profilePicture:profilePicture ? profilePicture.filename : undefined, email: req.body.email, tempOtp: tempOtp, password: req.body.password });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { username, profilePicture, email, tempOtp, enteredOTP } = req.body;
    
    
    if (tempOtp === enteredOTP) {
      
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      
      const data = {
        name: username,
        password: hashedPassword,
        email: email || undefined,
        profilePicture: profilePicture ? profilePicture : undefined,
      };

      
      const userdata = await collection.insertMany(data);
      console.log("User registered successfully:", userdata);
      
      
      return res.redirect("/");
    } else {
      return res.status(401).send("Invalid OTP. Go back and re-enter OTP.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
  
});
app.post("/login", async (req, res) => {
  try {
    const user = await collection.findOne({ name: req.body.username });
    usname=req.body.username;
   
    if (!user) {
      //User not found
      return res.status(200).send("Incorrect Username or Password");
    }
    const PasswordMatch = await bcrypt.compare(req.body.password, user.password);
    if (!PasswordMatch) {
      //Incorrect password
      return res.status(200).send("Incorrect Username or Password");
    }

    
    res.render("home");
    
  } catch (error) {
  
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get('/genres', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const page = req.query.page || 1;
    const titleType = 'movie';
    const username = req.query; 

    const data = await fetchData(year, titleType, page);

    if (Array.isArray(data)) {
      res.render('genres', { year, titleType, page, results: data, username });
    } else {
      res.status(500).send('Internal Server Error: Unable to fetch data');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.get("/moviepage/:id", async (req, res) => {
  const id = req.params.id;

  try {
   
    const user = await collection.findOne({ name: usname });
   if (!user) {
      return res.status(404).send("User not found");
    }

    const movieData = await fetchDataForMovie(id);
    const ratingsData = await fetchDataForMovieratings(id);

    
    const isLiked = user.likedMovies.some((likedMovie) => likedMovie.movieId === id);


    res.render("moviepage", {
      results: { movieData, ratingsData, isLiked },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
app.get('/api/genres', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const page = req.query.page || 1;
    const titleType='movie';
    const data = await fetchData(year, titleType, page);

    if (Array.isArray(data)) {
      res.json(data); // Send JSON data
    } else {
      res.status(500).json({ error: 'Internal Server Error: Unable to fetch data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await collection.findOne({ email });

    if (!user) {
      
      return res.status(200).send("Email not found");
    }

    
    const resetOTP = generateOTP();
    await collection.updateOne({ email }, { $set: { otp: resetOTP } });

    
    await sendEmailOTP(email, resetOTP);

    console.log(`Password reset OTP sent to email: ${email}`);

    res.render("verify-reset-otp", { email });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/verify-reset-otp", (req, res) => {
  
  res.render("verify-reset-otp");
});
app.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, enteredOTP } = req.body;

    // Check if the entered OTP matches the stored OTP
    const user = await collection.findOne({ email });
    if (!user || user.otp !== enteredOTP) {
      // Invalid OTP
      return res.status(401).send("Invalid OTP. Go back and re-enter OTP");
    }

    res.render("reset-password", { email });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password");
});
app.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (newPassword.length < 5) {
      return res.status(400).send("Password should be at least 5 characters long. Go back and enter a new password.");
    }
    
    const user = await collection.findOne({ email });

    if (!user) {
      
      return res.status(401).send("User not found");
    }

    
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    
    await collection.updateOne({ email }, { $set: { password: hashedPassword, otp: null } });

    res.render("password-reset-success");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
const fetchDataForMoviesearch = async (query, titleType, page = 1) => {
  const options = {
    method: 'GET',
    url: `https://moviesdatabase.p.rapidapi.com/titles/search/akas/${encodeURIComponent(query)}`,
    headers: {
      'X-RapidAPI-Key': 'c9816d6786mshe8507f15542013bp1e0712jsn68ce5d771de1',
      'X-RapidAPI-Host': 'moviesdatabase.p.rapidapi.com'
    },
    params: {
      page: page,
      titleType: 'movie',
    }
  };

  try {
    const response = await axios.request(options);
    return response.data.results;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Route handler for /search
app.get('/search', async (req, res) => {
  try {
    const query = req.query.query; 
    const titleType='movie';
    
    let page = 1;
    let allResults = [];

    while (true) {
      const results = await fetchDataForMoviesearch(query,titleType, page);
      
      if (results.length === 0) {
        
        break;
      }

     
      allResults = allResults.concat(results);

      
      page++;
    }

    
    const filteredMovies = allResults.filter(movie => movie.titleText.text.toLowerCase().includes(query.toLowerCase()));
    res.render('search', { results: filteredMovies });
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.post("/like-movie", async (req, res) => {
  try {
    const { movieId } = req.body;
    const username = usname;

    if (!username) {
      return res.status(400).send("Username not provided. Go back to login page.");
    }

    const user = await collection.findOne({ name: username });

    if (!user) {
      return res.status(404).send("User not found");
    }

    
    const existingLikedMovieIndex = user.likedMovies.findIndex(
      (likedMovie) => likedMovie.movieId === movieId
    );

    if (existingLikedMovieIndex !== -1) {
     
      user.likedMovies.splice(existingLikedMovieIndex, 1);
      await user.save();

      return res.status(200).send("Movie removed from liked list. Go back and refresh the page to see the changed status.");
    } else {
      
      user.likedMovies.push({ movieId });
      await user.save();

      return res.status(200).send("Movie added to liked list. Go back and refresh the page to see the changed status.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
app.get('/profile', async (req, res) => {
  try {
    const username = usname;

    if (!username) {
      return res.status(400).send('Username not provided.Go back to login page.');
    }

    const user = await collection.findOne({ name: username });

    if (!user) {
      return res.status(404).send('User not found');
    }

    const movieDataArray = [];

    for (const likedMovie of user.likedMovies) {
      const movieData = await fetchDataForMovie(likedMovie.movieId);
      movieDataArray.push(movieData);
    }

    res.render('profile', { results: movieDataArray, user, username: username });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.get("/filters", async (req, res) => {
  try {
    const {genre,year,page} = req.query;
    _genre=genre;
    _year=year;
    const titleType='movie';
    
    const data = await fetchDataForFilters(genre, year, titleType , page);

    
    res.render("filters", { results: data, genre, year, titleType, page });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});


const fetchDataForFilters = async (genre, year, titleType ,page) => {
  
  const options = {
    method: "GET",
    url: "https://moviesdatabase.p.rapidapi.com/titles",
    params: {
      year: year || undefined,
      titleType: titleType,
      genre: genre !== 'undefined' ? genre : undefined,
      page:page||1,
    },
    headers: {
      "X-RapidAPI-Key": "c9816d6786mshe8507f15542013bp1e0712jsn68ce5d771de1",
      "X-RapidAPI-Host": "moviesdatabase.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    return response.data.results;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
app.get('/api/filters', async (req, res) => {
  try {
    const genre=_genre;
    const year=_year;
    const page = req.query.page || 1;
    const titleType='movie';
    const data = await fetchDataForFilters(genre, year, titleType, page);

    if (Array.isArray(data)) {
      res.json(data); // Send JSON data
    } else {
      res.status(500).json({ error: 'Internal Server Error: Unable to fetch data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});