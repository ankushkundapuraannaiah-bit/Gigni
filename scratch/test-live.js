async function test() {
    const base = 'https://www.gigniconnect.space';

    // Test 1: Health
    console.log('--- Health Check ---');
    const h = await fetch(`${base}/api/health`);
    console.log('Status:', h.status, await h.json());

    // Test 2: Python compiler
    console.log('\n--- Python Compiler ---');
    const py = await fetch(`${base}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'python', source_code: 'print("Hello from Gigni!")', stdin: '' })
    });
    const pyData = await py.json();
    console.log('Status:', py.status);
    console.log('Output:', pyData.stdout || pyData.error || JSON.stringify(pyData));

    // Test 3: JavaScript compiler
    console.log('\n--- JavaScript Compiler ---');
    const js = await fetch(`${base}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'javascript', source_code: 'console.log("Hello from JS!")', stdin: '' })
    });
    const jsData = await js.json();
    console.log('Status:', js.status);
    console.log('Output:', jsData.stdout || jsData.error || JSON.stringify(jsData));

    // Test 4: C compiler
    console.log('\n--- C Compiler ---');
    const c = await fetch(`${base}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'c', source_code: '#include<stdio.h>\nint main(){printf("Hello C!\\n");return 0;}', stdin: '' })
    });
    const cData = await c.json();
    console.log('Status:', c.status);
    console.log('Output:', cData.stdout || cData.error || JSON.stringify(cData));
}

test().catch(console.error);
