import { readFile } from 'fs';
import { parse } from 'yaml'
function fetchGoogleCalendar(): void {
  readFile('./google-calendar.yaml', function(err, data) {
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
    console.log(openApiSpec.paths['/users/me/calendarList']?.get?.responses?.['200']?.content?.['application/json']?.schema);
    console.log(Object.keys(openApiSpec.components?.schemas?.['CalendarList']?.properties));
    console.log(Object.keys(openApiSpec.components?.schemas?.['CalendarListEntry']?.properties));
  });
}
// ...
fetchGoogleCalendar();
