async function testJava(compilerName, index) {
    const payload = {
        compiler: compilerName,
        code: `class Main {
    public static void main(String[] args) {
        System.out.println("Hello from run " + ${index});
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
        if (data.compiler_error || data.program_error) {
            console.log(`Run ${index}: FAILED with error:`, data.compiler_error || data.program_error);
        } else {
            console.log(`Run ${index}: SUCCESS:`, data.program_output.trim());
        }
    } catch (e) {
        console.error(`Run ${index} Exception:`, e.message);
    }
}

async function run() {
    console.log('Testing openjdk-jdk-21+35 five times...');
    for (let i = 1; i <= 5; i++) {
        await testJava('openjdk-jdk-21+35', i);
    }
}

run();
