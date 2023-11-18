const fs = require('fs');
const csvParser = require('csv-parser');
const Datastore = require('nedb');

const nedbFilePath = 'database.db';
const db = new Datastore({ filename: nedbFilePath, autoload: true });

function convertCSV(csvFilePath, transformer) {
  fs.createReadStream(csvFilePath)
  .pipe(csvParser())
  .on('data', (row) => {
    const transformedData = transformer(row);

    db.insert(transformedData, (err, newDoc) => {
      if (err) {
        console.error('Error inserting data:', err);
      } else {
        console.log('Inserted:', newDoc);
      }
    });
  })
  .on('end', () => {
    console.log('CSV file successfully processed.');
  });
}

const buildingsCsvFilePath = 'buildings.csv';
function buildingsTransformer(row) {
  return {
    type: row.type,
    name: row.name.toLowerCase(),
    building_type: row.building_type,
    school_type: row.school_type,
    latlon: row.latlon,
    reviews: []
  };
}

convertCSV(buildingsCsvFilePath, buildingsTransformer);
