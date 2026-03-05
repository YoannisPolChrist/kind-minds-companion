// Temporary script to execute firebase shell
const { execSync } = require('child_process');
const fs = require('fs');

const shell = require('child_process').spawn('npx.cmd', ['firebase', 'functions:shell', '--project', 'therapieprozessunterstuetzung']);
shell.stdout.on('data', (data) => console.log(data.toString()));
shell.stderr.on('data', (data) => console.error(data.toString()));

setTimeout(() => {
    shell.stdin.write("admin.auth().deleteUser('w2l3gsGY0wNnkPJb0z8lB4nUNOQ2').then(()=>console.log('DEL1 DONE')).catch(console.error);\n");
    shell.stdin.write("admin.auth().deleteUser('zXdSXTGSTIToh7h1wrvkfqBBW5k2').then(()=>console.log('DEL2 DONE')).catch(console.error);\n");
    setTimeout(() => {
        shell.stdin.write(".exit\n");
        process.exit(0);
    }, 5000);
}, 10000);
