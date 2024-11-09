const express = require('express');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path'); // Import the path module

const app = express();
const port = 3000;


// middleware for JSON parsing
app.use(express.json());


// middleware for logging
app.use((req, res, next) =>
{
  console.log(`${req.method} request for ${req.url}`);
  next();
});

// store parsed data from csv
let destinationsArr = [];

// node js handling the front end 
// static module handles the front end while express module handles the backend
// set up static route for express using this syntax
// ie anything that comes into the root prefix, look for static files in the client directory
// so html css and front end js 
//app.use('../client/', express.static('client'));
// This won't work as expected because Express doesn't handle the relative path like that. Instead, you need to use path.join() to construct the absolute path to the client directory, which ensures Express can serve files from the correct directory.


// __dirname: This gives you the absolute path of the directory where the server.js file is located.
// ..: This moves up one directory from the current directory (server folder).
// client: This is the folder you're trying to serve, which is at the root of your project.
app.use(express.static(path.join(__dirname, '..', 'client')));

// listen on port 3000
app.listen(port, () =>
{
  console.log(`Listening on port ${port}`);
});


/**************************************************************************************************************
 * 
 * 
 *  CSV FILE PARSING
 * 
 * 
 * 
 * ************************************************************************************************************/

// parse CSV file on server startup
// this block of code uses Node.js and the csv-parser library to read a CSV file and store its data in an array called destinations.
// this function creates a readable stream to read the CSV file.
// fs: This is Node.js’s built-in File System module used for handling files.
// createReadStream(): This function reads the file in chunks rather than loading the whole file into memory at once, making it efficient for handling large files.
fs.createReadStream(path.join(__dirname, 'data', 'europe-destinations.csv'))// This constructs the file path to the CSV file located in the data subdirectory, The __dirname points to the current directory, and 'data' adds the subdirectory to the path.
  .pipe(csvParser()) // the data stream from the CSV file is piped into the csv-parser, which is another stream.
  // csv-parser(): This is the library that handles parsing the CSV format. It reads each row from the CSV file and converts it into a JavaScript object, with each column of the row becoming a key-value pair in that object.
  .on('data', (row) =>
  {
    // Trim whitespace from each key in the row
    const trimmedRow = {};
    Object.keys(row).forEach(key =>
    {
      trimmedRow[key.trim()] = row[key];
    });
    destinationsArr.push(trimmedRow);
  })
  .on('end', () =>
  {
    console.log('CSV file successfully processed');
    console.log(destinationsArr[0]); // Log to verify trimmed keys
  })
  .on('error', (err) =>
  {
    console.error('Error processing CSV:', err);
  })
  .on('end', () =>
  {
    console.log('CSV file successfully processed');
    console.log(destinationsArr[0]); // Log to see the structure of a parsed destination
  });



/**************************************************************************************************************
 * 
 *  GET request for all destinations
 * ************************************************************************************************************/
app.get('/api/destinations', (req, res) =>
{
  // Send the full list of destinations as a JSON response
  res.json(destinationsArr);
});

/**************************************************************************************************************
 * 
 *  GET request for geo coordinates using id
 * ************************************************************************************************************/
app.get('/api/coordinates/:id', (req, res) =>
{

  // get the ID from the URL parameter
  const id = parseInt(req.params.id);

  // check if the ID is valid
  if (isNaN(id) || id < 0 || id >= destinationsArr.length)
  {
    return res.status(400).json({ error: `Invalid ID. Must be a numerical value between 0 and ${destinationsArr.length}.` });
  }
  else
  {


    // Get the destination by ID
    const destination = destinationsArr[id];

    // Extract latitude and longitude
    const lat = destination.Latitude;
    const lon = destination.Longitude;

    // Send the coordinates as a JSON response
    res.json({ latitude: lat, longitude: lon });
  }

});



/**************************************************************************************************************
 * 
 *  GET request for all properties of destination using id
 * ************************************************************************************************************/
app.get('/api/destination/:id', (req, res) =>
{
  // get the ID from the URL parameter
  const id = parseInt(req.params.id);

  // check if the ID is valid
  if (isNaN(id) || id < 0 || id >= destinationsArr.length)
  {
    return res.status(400).json({ error: `Invalid ID. Must be a numerical value between 0 and ${destinationsArr.length}.` });
  }
  else
  {

    // get the destination by ID
    const destination = destinationsArr[id];

    // send as a JSON response
    res.json(destination);
  }

});



/**************************************************************************************************************
 * 
 *  GET request for list of all available country names
 * ************************************************************************************************************/

app.get('/api/countries', (req, res) =>
{
  // the Set object stores only unique values, automatically filtering out duplicates.
  const countrySet = new Set();
  // iterates over each destination and adds the Country to the set.
  destinationsArr.forEach(destination =>
  {
    countrySet.add(destination.Country);
  });

  // converts the set back to an array using Array.from().
  const uniqueCountries = Array.from(countrySet);

  // send the unique countries as a JSON response
  res.json(uniqueCountries);
});






//5:48 @ howto-rest-p2



/**************************************************************************************************************
 * 
 *  CUSTOMIZABLE LISTS 
 * ************************************************************************************************************/

// array to store the destination lists created by user
let userLists = [];

// GET request to retrieve all destination lists
app.get('/api/userLists', (req, res) =>
{
  // Check if there are any lists
  if (userLists.length === 0)
  {
    return res.status(404).json({ message: 'No destination lists were created.' });
  }

  // Send the full list of destination lists as a JSON response
  res.json(userLists);
});




// POST request to create a new destination list



/**************************************************************************************************************
 *  GET request to retrieve a specific list (by name, case-insensitive) + its content
 ************************************************************************************************************/
app.get('/api/userLists/allProperties/:listName', async (req, res) =>
{
  // Get the list name from the URL parameter (convert to lowercase for case-insensitive comparison)
  const listName = req.params.listName.toLowerCase();

  // Find the list by name, case-insensitive
  const list = userLists.find(list => list.name.toLowerCase() === listName);

  // If the list doesn't exist, return a 404 error
  if (!list)
  {
    return res.status(404).json({ error: 'List not found' });
  }

  // Retrieve all destinations for the given list
  const destinationDetails = list.destinations.map(id =>
  {
    // Check if the ID is valid
    if (id >= 0 && id < destinationsArr.length)
    {
      // Get the destination by ID
      return destinationsArr[id];
    }
    return null; // In case of an invalid ID, return null
  }).filter(dest => dest !== null); // Filter out any null entries

  // Send the destination list with its content
  res.json({
    listName: list.name,
    destinations: destinationDetails
  });
});





/**************************************************************************************************************
 *  GET request to retrieve a specific list (by name, case-insensitive) and return only destination IDs
 ************************************************************************************************************/
app.get('/api/userLists/ids/:listName', (req, res) =>
{
  // get the list name from the URL parameter (convert to lowercase for case-insensitive comparison)
  const listName = req.params.listName.toLowerCase();

  // find the list by name, case-insensitive
  const list = userLists.find(list => list.name.toLowerCase() === listName);

  // if the list doesn't exist, return a 404 error
  if (!list)
  {
    return res.status(404).json({ error: 'List not found' });
  }

  // send the list with only destination IDs
  res.json({
    listName: list.name,
    destinationIds: list.destinations // only return the IDs array
  });
});





/**************************************************************************************************************
 *  GET request to retrieve only names, regions, countries, coordinates, currency and language of all destinations in a list (by name, case-insensitive) (number 9)
 ************************************************************************************************************/
app.get('/api/userLists/someProperties/:listName', (req, res) =>
{
  // Get the list name from the URL parameter (convert to lowercase for case-insensitive comparison)
  const listName = req.params.listName.toLowerCase();

  // Find the list by name, case-insensitive
  const list = userLists.find(list => list.name.toLowerCase() === listName);

  // If the list doesn't exist, return a 404 error
  if (!list)
  {
    return res.status(404).json({ error: 'List not found' });
  }

  // Retrieve specific details for each destination in the list
  const destinationDetails = list.destinations.map(id =>
  {
    // Check if the ID is valid
    if (id >= 0 && id < destinationsArr.length)
    {
      const destination = destinationsArr[id];
      return {
        name: destination.Destination,
        region: destination.Region,
        country: destination.Country,
        coordinates: {
          latitude: destination.Latitude,
          longitude: destination.Longitude
        },
        currency: destination.Currency,
        language: destination.Language
      };
    }
    return null; // In case of an invalid ID, return null
  }).filter(detail => detail !== null); // Filter out any null entries

  // Send the list with detailed information
  res.json({
    listName: list.name,
    destinations: destinationDetails
  });
});




// DELETE request to delete a specific destination list

/**************************************************************************************************************
 *  DELETE request to delete a specific list (by name, case-insensitive)
 ************************************************************************************************************/
app.delete('/api/userLists/:listName', (req, res) =>
{
  // Get the list name from the URL parameter (convert to lowercase for case-insensitive comparison)
  const listName = req.params.listName.toLowerCase();

  // Find the index of the list by name, case-insensitive
  const listIndex = userLists.findIndex(list => list.name.toLowerCase() === listName);

  // If the list is not found, return a 404 error
  if (listIndex === -1)
  {
    return res.status(404).json({ error: 'List not found' });
  }

  // Remove the list from the array using splice
  userLists.splice(listIndex, 1);

  // Send a success response
  res.json({ message: `List '${req.params.listName}' deleted successfully` });
});





/**************************************************************************************************************
 *  PUT request to add destinations to a specific existing list (by name, case-insensitive)
 ************************************************************************************************************/
app.put('/api/userLists/:listName', (req, res) =>
{
  // get the list name from the URL parameter (case-insensitive)
  const listName = req.params.listName.toLowerCase();

  // check if the destination IDs array is provided in the request body
  const { destinations } = req.body;
  if (!Array.isArray(destinations))
  {
    return res.status(400).json({ error: 'Invalid data format. Provide an array of destination IDs.' });
  }

  // find the list by name, case-insensitive
  const list = userLists.find(list => list.name.toLowerCase() === listName);

  // if the list doesn't exist, return a 404 error
  if (!list)
  {
    return res.status(404).json({ error: 'List not found' });
  }

  // validate each destination ID provided
  const validDestinations = destinations.filter(id => Number.isInteger(id) && id >= 0 && id < destinationsArr.length);

  // update the destinations array with valid IDs, replacing any previous data
  list.destinations = validDestinations;

  // respond with a success message and the updated list
  res.json({ message: `Destinations successfully updated for list '${list.name}'`, updatedList: list });
});




/**************************************************************************************************************
 *  PUT request to create a new list with a unique name in userLists
 ************************************************************************************************************/
app.put('/api/userLists/newList/:listName', (req, res) =>
{
  // Get the list name from the URL parameter (case-insensitive)
  const listName = req.params.listName.toLowerCase();

  // Check if the list already exists
  const existingList = userLists.find(list => list.name.toLowerCase() === listName);
  if (existingList)
  {
    return res.status(400).json({ error: 'List name already exists. Choose a different name.' });
  }

  // Check if the destinations array is provided in the request body, or set to an empty array if not provided
  const { destinations = [] } = req.body;

  // Validate each destination ID provided, if any
  const validDestinations = Array.isArray(destinations)
    ? destinations.filter(id => Number.isInteger(id) && id >= 0 && id < destinationsArr.length)
    : [];

  // Create a new list with the specified name and destinations (empty array if no valid destinations)
  const newList = { name: req.params.listName, destinations: validDestinations };
  userLists.push(newList);

  // Respond with a success message and the new list
  res.json({ message: `New list '${req.params.listName}' created successfully`, newList });
});



/**************************************************************************************************************
 *  GET request for searching by field and pattern the first n number of matching IDs. If n is not given or the number of matches is less than n, then return all matches. (number 4)
 ************************************************************************************************************/
app.get('/api/search/:field/:pattern/:n?', (req, res) =>
{
  const { field, pattern } = req.params;
  const limit = parseInt(req.params.n);

  // convert field names to lowercase for a case-insensitive match
  const normalizedField = field.toLowerCase();
  const sampleObject = destinationsArr[0];
  const actualField = Object.keys(sampleObject).find(
    key => key.toLowerCase() === normalizedField
  );

  // check if the specified field exists in the data
  if (!actualField)
  {
    return res.status(400).json({ error: `Invalid field name: ${field}` });
  }

  // create a case-insensitive regular expression from the pattern
  const regex = new RegExp(pattern, 'i');

  // filter destinations based on the field and pattern
  const matchedDestinations = destinationsArr
    .filter(destination => regex.test(destination[actualField])); // Filter objects that match the regex on specified field

  // limit the number of results if `n` is provided
  const limitedResults = isNaN(limit) ? matchedDestinations : matchedDestinations.slice(0, limit);

  // respond with the list of matching destination objects
  res.json(limitedResults);
});
