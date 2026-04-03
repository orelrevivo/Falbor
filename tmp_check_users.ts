import { db } from './config/db';
import { userCredits } from './config/schema';

async function listUsers() {
  try {
    const users = await db.select().from(userCredits);
    console.log(JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listUsers();
