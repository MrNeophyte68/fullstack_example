const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../out');
for (const filename of fs.readdirSync(output, { recursive: true }).filter(name => name.endsWith('.js'))) {
    const file = path.join(output, filename);
    const source = fs.readFileSync(file, 'utf8').replace(/require\(["'](@app|@common)\/([^"']+)["']\)/g, (_, alias, suffix) => {
        const target = path.join(output, alias === '@app' ? 'server-nestjs/app' : 'common', suffix);
        let relative = path.relative(path.dirname(file), target).split(path.sep).join('/');
        if (!relative.startsWith('.')) relative = `./${relative}`;
        return `require(${JSON.stringify(relative)})`;
    });
    fs.writeFileSync(file, source);
}
