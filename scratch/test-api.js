async function run() {
    try {
        console.log('Sending request to https://www.gigniconnect.space/api/health...');
        const res = await fetch('https://www.gigniconnect.space/api/health');
        console.log('Status:', res.status);
        console.log('Headers:');
        for (const [key, value] of res.headers.entries()) {
            console.log(`  ${key}: ${value}`);
        }
        const data = await res.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();
