const expected = process.argv[2];
if (!/^[a-f0-9]{40}$/.test(expected || '')) throw Error('Expected a full game commit SHA');
const deadline = Date.now() + 8 * 60 * 1000;
while (Date.now() < deadline) {
  try {
    const response = await fetch(`https://www.whatifhk.com/umbrella-licence/release.json?check=${Date.now()}`, {
      cache: 'no-store', signal: AbortSignal.timeout(15000)
    });
    if (response.ok && (await response.json()).sourceCommit === expected) {
      console.log(`Live on whatifhk.com: ${expected}`);
      process.exit(0);
    }
  } catch { /* The previous release remains live while Vercel builds. */ }
  await new Promise(resolve => setTimeout(resolve, 20000));
}
throw Error('The expected game commit was not published within 8 minutes. Check the Vercel build logs.');
