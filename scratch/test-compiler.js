async function searchCompilers() {
  const listRes = await fetch('https://wandbox.org/api/list.json');
  const compilers = await listRes.json();
  const cCompilers = compilers.filter(c => c.language === 'C');
  const cppCompilers = compilers.filter(c => c.language === 'C++');
  const javaCompilers = compilers.filter(c => c.language === 'Java');
  
  console.log('C Compilers:', cCompilers.map(c => c.name).slice(0, 10));
  console.log('C++ Compilers:', cppCompilers.map(c => c.name).slice(0, 10));
  console.log('Java Compilers:', javaCompilers.map(c => c.name).slice(0, 10));
}

searchCompilers();
