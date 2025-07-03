import { readFile } from 'fs';
import { parse } from 'yaml'
// import * as sqlite from 'sqlite3';


function createSqlTable(specFile: string, endPoint: string, rowsFrom: string): void {
  readFile(specFile, function(err, data) {
    if (err) {
      throw err;
    }
    let openApiSpec;
    try {
      openApiSpec = parse(data.toString());
    } catch (parseErr) {
      console.error('Failed to parse YAML:', parseErr.message);
      return;
    }
    if (!openApiSpec.paths) {
      console.error('No "paths" property found in YAML.');
      return;
    }
    let schema = openApiSpec.paths[endPoint]?.get?.responses?.['200']?.content?.['application/json']?.schema;
    if (typeof schema['$ref'] === 'string') {
      const pathParts = schema['$ref'].substring(2).split('/');
      if (pathParts.length < 2 || pathParts[0] !== 'components' || pathParts[1] !== 'schemas') {
        console.error('Invalid schema reference:', schema['$ref']);
        return;
      }
      schema = openApiSpec.components?.schemas?.[schema['$ref'].split('/').pop()];
    }
    // console.log(schema);
    let whatWeWant = schema?.properties?.[rowsFrom].items;
    // console.log(whatWeWant);
    if (typeof whatWeWant['$ref'] === 'string') {
      const pathParts = whatWeWant['$ref'].substring(2).split('/');
      if (pathParts.length < 2 || pathParts[0] !== 'components' || pathParts[1] !== 'schemas') {
        console.error('Invalid schema reference:', whatWeWant['$ref']);
        return;
      }
      const schemaName = pathParts[2];
      whatWeWant = openApiSpec.components?.schemas?.[schemaName]?.properties;
    }
    // console.log(whatWeWant)
    const rowSpecs = (whatWeWant ? Object.entries(whatWeWant).map(([key, value]) => {
      const type = (value as { type: string }).type;
      if (type === 'string') {
        return `${key} TEXT,`;
      } else if (type === 'integer') {
        return `${key} INTEGER,`;
      } else if (type === 'boolean') {
        return `${key} BOOLEAN,`;
      } else return '';
    }) : []);
    const createTableQuery = `
CREATE TABLE data(
  ${rowSpecs.join('\n  ')}
) STRICT
    `;
    console.log(createTableQuery);
    // Execute SQL statements from strings.
    // const database = new sqlite.Database(':memory:');
    // database.serialize(() => {
    //   database.run(createTableQuery);
    // });
  });
}
// ...
createSqlTable('./google-calendar.yaml', '/users/me/calendarList', 'items');
