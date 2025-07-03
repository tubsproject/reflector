import { readFile } from 'fs/promises';


async function fetchGoogleCalendar(): Promise<void> {
  const openApiJsonStr = await readFile('./google-calendar.json');
  console.log(openApiJsonStr.toString());
  const openApiSpec = JSON.parse(openApiJsonStr.toString());
  console.log(Object.keys(openApiSpec.paths));
}
// ...
fetchGoogleCalendar();
