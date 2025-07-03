import { readFile } from 'fs';

function fetchGoogleCalendar(): void {
  readFile('./slack_web_openapi_v2.json', function(err, data) {
    if (err) {
      throw err;
    }
    let openApiSpec;
    try {
      openApiSpec = JSON.parse(data.toString());
    } catch (parseErr) {
      console.error('Failed to parse JSON:', parseErr.message);
      return;
    }
    if (!openApiSpec.paths) {
      console.error('No "paths" property found in JSON.');
      return;
    }
    console.log(Object.keys(openApiSpec.paths));
  });
}
// ...
fetchGoogleCalendar();
