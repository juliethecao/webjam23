const fs = require('fs');
const csvParser = require('csv-parser');
const Datastore = require('nedb');

const nedbFilePath = 'master.db';
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
    name: row.name,
    building_type: row.building_type,
    school_type: row.school_type,
    latlon: row.latlon,
  };
}

const professorsCsvFilePath = 'professors.csv';
function professorsTranformer(row) {
  const reviews = typeof row.reviews === 'string' ? [] : row.reviews;
  return {
    type: row.type,
    name: row.name,
    department: row.department,
    title: row.title,
    reviews: reviews,
  };
}

convertCSV(buildingsCsvFilePath, buildingsTransformer);
convertCSV(professorsCsvFilePath, professorsTranformer);