const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const ChatRoute = require('./routes/chat.routes');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: "50mb" }));


app.use('/api/chat', ChatRoute);



app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
