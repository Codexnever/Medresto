const express = require('express');
const exphbs = require('express-handlebars');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();
const port = 3000;
app.use(express.json());


app.use(cors());
app.use(express.static(__dirname + '/public'));

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Medresto',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Set up Handlebars as the view engine
app.engine('hbs', exphbs({
  extname: 'hbs',
  helpers: {
    fetchSecondData: async function (kotId) {

      const secondData = await fetchDataFromSecondTable(kotId);
      return secondData;
    }
  }
}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

// Routes
app.get('/kod', async (req, res) => {
  try {
    const kodData = await pool.query('SELECT * FROM kod WHERE status = 1');

    const recordsWithSecondData = await Promise.all(
      kodData[0].map(async (record) => {
        record.secondData = await fetchDataFromSecondTable(record.kotId);
        return record;
      })
    );

    res.render('index', { pageTitle: 'KOD Page', records: recordsWithSecondData });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
//cancel order route
app.route('/api/update-item-status')
  .put(async (req, res) => {
    const { kotId, itemId } = req.query;

    try {
      await pool.query('UPDATE SECOND SET status = 0, comment = "The order is Cancel!" WHERE kotId = ? AND kotItemId = ?', [kotId, itemId]);
      res.status(200).send('Item status updated successfully.');
    } catch (error) {
      console.error('Error updating item status:', error);
      res.status(500).send('Internal Server Error');
    }
  });


//here kotId dismiss
app.route('/api/cancel-order/:kotId').put(async (req, res) => {
  const { kotId } = req.params;

  try {
    await pool.query('UPDATE kod SET status = 0, cancelStatus = "The order is canceled!" WHERE kotId = ?', [kotId]);
    res.status(200).send('Order canceled successfully.');
  } catch (error) {
    console.error('Error canceling order:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Assuming you have this route in your server-side code
app.route('/api/update-comment/:kotId').put(async (req, res) => {
  const { kotId } = req.params;
  const { comment } = req.body;

  try {
    // Update the comment in your database for the specified kotId
    await pool.query('UPDATE kod SET comment = ? WHERE kotId = ?', [comment, kotId]);
    res.status(200).send('Comment updated successfully.');
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).send('Internal Server Error');
  }
});



//temep
app.route('/api/cancel-order/:kotId/:kotItemId').put(async (req, res) => {
  const { kotId, kotItemId } = req.params;
  const { status } = req.body;

  try {
    let updateQuery = '';

    switch (status) {
      case 'java':
        // Update status and comment for 'java' case
        updateQuery = 'UPDATE SECOND SET status = 0, comment = "The order is Cancel!" WHERE kotId = ? AND kotItemId = ?';
        break;
      case 'python':
        // Update status and comment for 'python' case
        updateQuery = 'UPDATE SECOND SET status = 1, comment = "Processing Python order" WHERE kotId = ? AND kotItemId = ?';
        break;
      // Add cases for other status values as needed
      default:
        // Handle other cases or set a default query
        break;
    }

    if (updateQuery) {
      await pool.query(updateQuery, [kotId, kotItemId]);
      res.status(200).send('Item status and comment updated successfully.');
    } else {
      res.status(400).send('Invalid status provided.');
    }
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Temp route for date
app.get('/getServerTime', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.json({ time: result[0][0].time });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


async function fetchDataFromSecondTable(kotId) {
  try {
    const [rows] = await pool.query('SELECT * FROM SECOND WHERE kotId = ? AND status = 1', [kotId]);
    return rows;
  } catch (error) {
    console.error('Error fetching data from SECOND table:', error);
    throw error;
  }
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
