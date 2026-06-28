import { runFootballSync } from './src/lib/football-data/sync';

async function main() {
  try {
    const result = await runFootballSync();
    console.log("Success:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}
main();
