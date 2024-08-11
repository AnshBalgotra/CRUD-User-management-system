const app = require('./app'); 
const mongoose = require('mongoose'); 
require('dotenv').config();

DATABASE= process.env.DATABASE;
mongoose
  .connect(DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then((connection) => {
    console.log(`Connected to MongoDB: ${connection.connections[0].name}`);
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
  }); 
  


const port = 5000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});