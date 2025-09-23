import express from 'express';
import router from './routes/index';

const app = express();
const port = process.env.PORT || 5000;

// Tell Express to automatically parse JSON request bodies
// and put them in req.body
app.use(express.json());
app.use(router);

app.listen(port, () => {
  console.log(`Router listening on port ${port}`);
});
