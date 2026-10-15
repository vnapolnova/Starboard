import { setGlobalOptions } from 'firebase-functions/v2';

// Keeps a runaway function from scaling up costs. The calendar sync (plan §3)
// is the first function; it lands with its own issue.
setGlobalOptions({ region: 'us-central1', maxInstances: 2 });
