const payload = {
    compiler: 'gcc-13.2.0-c',
    code: `#include <stdio.h>
#include <math.h>
int main() {
    printf("%f\\n", sqrt(16.0));
    return 0;
}`,
    options: 'warning',
    'compiler-option-raw': '-lm'
};

fetch('https://wandbox.org/api/compile.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => {
    console.log('Result:', JSON.stringify(data, null, 2));
})
.catch(console.error);
