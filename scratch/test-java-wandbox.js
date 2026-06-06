async function testJava(compilerName) {
    const payload = {
        compiler: compilerName,
        code: `class Main {
    public static void main(String[] args) {
        System.out.println("Hello from " + System.getProperty("java.version"));
    }
}`,
        options: ''
    };

    try {
        const res = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log(`--- Result for ${compilerName} ---`);
        console.log('Status:', res.status);
        console.log('Program Output:', data.program_output);
        console.log('Compiler Error:', data.compiler_error || data.program_error);
    } catch (e) {
        console.error(`Error for ${compilerName}:`, e.message);
    }
}

async function run() {
    await testJava('openjdk-jdk-21+35');
    await testJava('openjdk-jdk-22+36');
}

run();
