const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, 'public', 'compiler.html');

const LANGUAGES = {
  python: {
    filename: 'python-compiler.html',
    title: 'Gigni Free Online Python Compiler — Run Python 3 Online | No Login',
    description: 'Run Python 3 instantly in your browser with Gigni Online Python Compiler. Powered by WebAssembly (Pyodide) for low-latency client-side execution. Monaco VS Code Editor, stdin support, and professional themes. No login required.',
    keywords: 'online python compiler, run python online, python online, execute python online, python compiler free, python 3 online, python wasm compiler, pyodide python, run python code online, python code runner, online python ide, python interpreter online, free python compiler, gigni python compiler, python compiler no login, python stdin',
    canonical: 'https://www.gigniconnect.space/python-compiler',
    appName: 'Gigni Online Python Compiler',
    appCategory: 'Online Python Compiler, Python Interpreter',
    schemaDesc: 'A free, browser-based online Python compiler and interpreter powered by WebAssembly (Pyodide). Run Python 3 code instantly with standard input (stdin) support, Monaco Editor, and no login required.',
    schemaAlt: ['Gigni Python Compiler', 'Online Python Compiler', 'Run Python Online', 'Python IDE Online'],
    features: [
      'Run Python 3 online without installation using WebAssembly',
      'Instant client-side execution via Pyodide',
      'Monaco VS Code Editor with syntax highlighting',
      'Standard input (stdin) support for input()',
      'Download and copy Python code snippets (.py)',
      'Professional dark Developer Mode and light Boost Mode themes',
      'No signup, no login, completely free'
    ],
    faqQuestion: 'How do I run Python online for free?',
    faqAnswer: 'Use the Gigni Online Python Compiler at gigniconnect.space/python-compiler. Type or paste your Python 3 code, enter inputs in the Stdin tab if needed, and click Run Code. Python executes instantly in your browser via WebAssembly — no login or installation required.'
  },
  javascript: {
    filename: 'javascript-compiler.html',
    title: 'Gigni Free Online JavaScript Compiler — Run JS Code Online',
    description: 'Write, execute, and compile modern ES6+ JavaScript code in your browser with Gigni Online JavaScript Compiler. Natively sandboxed, instant console output, Monaco Editor, and premium themes. 100% free with no login needed.',
    keywords: 'online javascript compiler, run javascript online, js compiler online, javascript code runner, execute javascript online, es6 compiler online, node js online, online js ide, javascript interpreter browser, free javascript compiler, run js in browser, javascript console, gigni js compiler, javascript compiler no signup',
    canonical: 'https://www.gigniconnect.space/javascript-compiler',
    appName: 'Gigni Online JavaScript Compiler',
    appCategory: 'Online JavaScript Compiler, JS Interpreter',
    schemaDesc: 'A free browser-based online JavaScript compiler and playground. Execute modern ES6+ JS code natively with instant console logging, Monaco Editor, and zero login required.',
    schemaAlt: ['Gigni JavaScript Compiler', 'Online JS Compiler', 'Run JS Online', 'JavaScript Playground'],
    features: [
      'Run JavaScript (ES6+) code online natively in browser',
      'Instant console.log output capture and error rendering',
      'Monaco VS Code Editor with JS syntax autocompletion',
      'Download and copy JS code files (.js)',
      'Premium Developer and Boost themes',
      'Keyboard shortcut Ctrl+Enter to run code',
      'No signup or account registration required'
    ],
    faqQuestion: 'Can I run JavaScript in the browser compiler?',
    faqAnswer: 'Yes. The Gigni Online JavaScript Compiler runs JS natively in your browser sandbox. It supports modern ES6+ features, console.log rendering, and fast execution without any Node.js setup or login.'
  },
  c: {
    filename: 'c-compiler.html',
    title: 'Gigni Free Online C Compiler — Compile & Run C Code Online',
    description: 'Compile and run C programming language online with Gigni Online C Compiler. Powered by a high-speed GCC cloud sandbox with standard input (stdin) support. Monaco Editor, syntax highlighting, and no signup required.',
    keywords: 'online c compiler, c compiler online free, run c online, gcc online compiler, c language online, compile c online, c code runner, online c ide, c program online, c code online, write c online, free c compiler, compile c in browser, gigni c compiler, c compiler no login, c compiler stdin',
    canonical: 'https://www.gigniconnect.space/c-compiler',
    appName: 'Gigni Online C Compiler',
    appCategory: 'Online C Compiler, GCC C Compiler',
    schemaDesc: 'A free online C compiler and runner powered by a sandboxed GCC compiler in the cloud. Run C programs instantly with full standard input (stdin), compilation warning logs, and Monaco Editor.',
    schemaAlt: ['Gigni C Compiler', 'Online C Compiler', 'GCC Online C Compiler', 'C Programming Online'],
    features: [
      'Compile C online with GCC compiler',
      'Full standard input (stdin) support via scanf()',
      'Monaco VS Code Editor with syntax highlighting',
      'Download C source code (.c)',
      'Detailed compiler outputs and debug warning messages',
      'Matrix dark and purple light themes',
      'No account registration needed, 100% free'
    ],
    faqQuestion: 'Can I compile C online without installing GCC?',
    faqAnswer: 'Yes. The Gigni Online C Compiler compiles and runs your C code securely in a cloud sandbox using GCC. It fully supports standard headers, math libraries, and standard input (stdin) for interactive programs.'
  },
  cpp: {
    filename: 'cpp-compiler.html',
    title: 'Gigni Free Online C++ Compiler — Compile C++ (GCC) Online',
    description: 'Compile and execute C++ programs in your browser with Gigni Online C++ Compiler. Sandboxed GCC cloud compiler with full Standard Template Library (STL) support. Monaco Editor, stdin, and premium themes. No login needed.',
    keywords: 'online c++ compiler, c++ compiler online, run c++ online, compile c++ online, c++ code online, gcc c++ online, c plus plus compiler, online cpp compiler, c++ code runner, c++ ide online, stl online compiler, free c++ compiler, compile cpp online free, gigni cpp compiler, c++ compiler no login, c++ stdin',
    canonical: 'https://www.gigniconnect.space/cpp-compiler',
    appName: 'Gigni Online C++ Compiler',
    appCategory: 'Online C++ Compiler, GCC CPP Compiler',
    schemaDesc: 'A free online C++ compiler and IDE powered by GCC in a secure cloud container. Supports modern C++, vectors, algorithms, the C++ Standard Template Library (STL), and standard input (stdin).',
    schemaAlt: ['Gigni C++ Compiler', 'Online C++ Compiler', 'GCC Online C++ Compiler', 'Compile C++ Online'],
    features: [
      'Compile C++ online using GCC compiler',
      'Full Standard Template Library (STL) support (vector, map, algorithm)',
      'Standard input (stdin) piping for std::cin',
      'Monaco VS Code Editor with C++ theme highlighting',
      'Download and share C++ snippets (.cpp)',
      'Premium Developer Mode (Dark) and Boost Mode (Light) themes',
      'No signup or subscription required'
    ],
    faqQuestion: 'Does Gigni online C++ compiler support STL?',
    faqAnswer: 'Yes, Gigni C++ compiler supports the complete C++ Standard Template Library (STL), including vectors, sorting, maps, lists, and standard input/output streams via a secure cloud GCC container.'
  },
  java: {
    filename: 'java-compiler.html',
    title: 'Gigni Free Online Java Compiler — Compile & Run Java Online',
    description: 'Run and compile Java programs online with Gigni Online Java Compiler. Powered by a sandboxed OpenJDK cloud container. Supports standard input (stdin) via Scanner, Monaco Editor, and premium themes. 100% free.',
    keywords: 'online java compiler, java compiler online, run java online, compile java online, java code online, openjdk online, java ide online, java program runner, java online ide, free java compiler, java code runner browser, gigni java compiler, java compiler no login, java compiler stdin, scanner java online',
    canonical: 'https://www.gigniconnect.space/java-compiler',
    appName: 'Gigni Online Java Compiler',
    appCategory: 'Online Java Compiler, OpenJDK Compiler',
    schemaDesc: 'A free online Java compiler powered by OpenJDK in a sandboxed cloud environment. Compile and run Java main classes, parse standard input with Scanner, and debug warning outputs instantly.',
    schemaAlt: ['Gigni Java Compiler', 'Online Java Compiler', 'OpenJDK Online Java', 'Compile Java Online'],
    features: [
      'Compile and run Java online using OpenJDK',
      'Read standard input (stdin) using Scanner and BufferedReader',
      'Supports public main class Main and file generation (.java)',
      'Monaco VS Code Editor with advanced syntax highlighting',
      'Matrix-terminal style Developer Mode theme',
      'Completely free with zero account login requirements'
    ],
    faqQuestion: 'How do I run Java online without installing JDK?',
    faqAnswer: 'Visit gigniconnect.space/java-compiler. Select Java, write your Java class named Main, click Stdin if you need to pass user values, and click Run Code. Your program will compile and execute on our cloud OpenJDK container instantly.'
  }
};

function generatePage(lang, config) {
  let content = fs.readFileSync(SOURCE_FILE, 'utf8');

  // 1. Replace Title Tag
  content = content.replace(/<title>.*?<\/title>/s, `<title>${config.title}</title>`);

  // 2. Replace Meta Description
  content = content.replace(/<meta name="description" content=".*?">/s, `<meta name="description" content="${config.description}">`);

  // 3. Replace Meta Keywords
  content = content.replace(/<meta name="keywords" content=".*?">/s, `<meta name="keywords" content="\n    ${config.keywords}\n  ">`);

  // 4. Replace Canonical URLs (several places)
  content = content.replace(/<link rel="canonical" href=".*?">/g, `<link rel="canonical" href="${config.canonical}">`);
  content = content.replace(/<link rel="alternate" hreflang="en" href=".*?">/g, `<link rel="alternate" hreflang="en" href="${config.canonical}">`);
  content = content.replace(/<meta property="og:url" content=".*?">/g, `<meta property="og:url" content="${config.canonical}">`);
  content = content.replace(/<meta property="twitter:url" content=".*?">/g, `<meta property="twitter:url" content="${config.canonical}">`);

  // 5. Replace Application Name & OG Title/Desc
  content = content.replace(/<meta name="application-name" content=".*?">/s, `<meta name="application-name" content="${config.appName}">`);
  content = content.replace(/<meta property="og:title" content=".*?">/s, `<meta property="og:title" content="${config.title}">`);
  content = content.replace(/<meta property="og:description" content=".*?">/s, `<meta property="og:description" content="${config.description}">`);
  content = content.replace(/<meta property="twitter:title" content=".*?">/s, `<meta property="twitter:title" content="${config.title}">`);
  content = content.replace(/<meta property="twitter:description" content=".*?">/s, `<meta property="twitter:description" content="${config.description}">`);

  // 6. Tailor JSON-LD Schema
  const schemaMarkup = `
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.gigniconnect.space/#website",
        "name": "Gigni",
        "alternateName": ["GigniConnect", "Gigni Online Compiler", "gigniconnect.space"],
        "url": "https://www.gigniconnect.space"
      },
      {
        "@type": "WebPage",
        "@id": "${config.canonical}#webpage",
        "url": "${config.canonical}",
        "name": "${config.title}",
        "description": "${config.description}",
        "isPartOf": { "@id": "https://www.gigniconnect.space/#website" },
        "inLanguage": "en-US",
        "dateModified": "2026-05-28",
        "keywords": "${config.keywords}",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.gigniconnect.space/" },
            { "@type": "ListItem", "position": 2, "name": "Online Compiler", "item": "https://www.gigniconnect.space/compiler" },
            { "@type": "ListItem", "position": 3, "name": "${config.appName}", "item": "${config.canonical}" }
          ]
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": "${config.canonical}#app",
        "name": "${config.appName}",
        "alternateName": ${JSON.stringify(config.schemaAlt)},
        "url": "${config.canonical}",
        "applicationCategory": "DeveloperApplication",
        "applicationSubCategory": "${config.appCategory}",
        "description": "${config.schemaDesc}",
        "operatingSystem": "Any Web Browser",
        "softwareRequirements": "Web Browser with JavaScript enabled",
        "isAccessibleForFree": true,
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "description": "Free forever — no account or login required"
        },
        "featureList": ${JSON.stringify(config.features, null, 2)},
        "author": {
          "@type": "Organization",
          "name": "Gigni",
          "alternateName": "GigniConnect",
          "url": "https://www.gigniconnect.space"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "${config.faqQuestion}",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "${config.faqAnswer}"
            }
          }
        ]
      }
    ]
  }
  `;

  content = content.replace(/<script type="application\/ld\+json">.*?<\/script>/s, `<script type="application/ld+json">\n  ${schemaMarkup.trim()}\n  </script>`);

  // 7. Custom H1 text and title
  content = content.replace(/<h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect\(0,0,0,0\);white-space:nowrap;">.*?<\/h1>/s, 
    `<h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;">${config.title}</h1>`);

  // 8. Set Active Navigation State and Language Logic
  content = content.replace(
    /const initialLang = validLanguages\.includes\(queryLang\) \? queryLang : 'python';/,
    `const initialLang = validLanguages.includes(queryLang) ? queryLang : '${lang}';`
  );

  // Ensure the correct button has the 'active-lang' class statically for SEO pages
  const activeNavId = `nav-${lang}`;
  content = content.replace(`id="${activeNavId}" class="btn"`, `id="${activeNavId}" class="btn active-lang"`);

  // Write new file to public directory
  const destPath = path.join(__dirname, 'public', config.filename);
  fs.writeFileSync(destPath, content, 'utf8');
  console.log(`Generated: public/${config.filename}`);
}

console.log('Generating language-specific SEO compiler pages...');
for (const [lang, config] of Object.entries(LANGUAGES)) {
  generatePage(lang, config);
}
console.log('All pages generated successfully!');
