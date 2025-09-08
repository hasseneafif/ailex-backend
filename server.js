const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
// const mongoose = require('mongoose');

const RepoRoute = require('./routes/repo.routes');
const CodeRoute = require('./routes/code.routes');


require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
// .then(() => console.log('MongoDB Atlas connected'))
// .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: "50mb" }));



app.use('/api/repo', RepoRoute);
app.use('/api/code', CodeRoute);





app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
