# CrowdFlow

CrowdFlow is a queue-first crowd operations dashboard for live events. It includes realistic demo queues across entry, ticketing, food, attractions, special access, service, and exits.

## Run locally

Requires Node.js 20 LTS and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Create a production build with `npm run build`, then serve it with `npm start`.

## Dashboard workflows

- Review live site population, active queue count, average wait, and throughput.
- Search and filter the queue table; click a queue status to pause or resume it.
- Create queues with a name, location, and queue type.
- Export current queue data as CSV.
- Open venue map, activity history, support, account, and notification controls.

Queue state is in-memory demo data and resets when the page reloads. Authentication, persisted event data, and role-specific permissions are not wired to a backend in this demo.
