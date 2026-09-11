const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require(require.resolve('typescript', { paths: [process.cwd(), path.join(root, 'client'), path.join(root, 'server-nestjs')] }));
const failures = [];
let checked = 0;
function files(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const name = path.join(dir, entry.name);
        return entry.isDirectory() ? files(name) : name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [name] : [];
    });
}
function zone(name) {
    const relative = path.relative(root, name).split(path.sep).join('/');
    if (relative.startsWith('common/domain/') || /server-nestjs\/app\/[^/]+\/domain\//.test(relative)) return 'domain';
    if (relative.startsWith('client/src/app/application/') || /server-nestjs\/app\/[^/]+\/application\//.test(relative)) return 'application';
    return 'outer';
}
function resolveImport(owner, name) {
    if (name.startsWith('@common/')) return path.join(root, 'common', name.slice(8)) + '.ts';
    if (name.startsWith('@app/')) {
        const base = owner.includes('/server-nestjs/') ? 'server-nestjs/app' : 'client/src/app';
        return path.join(root, base, name.slice(5)) + '.ts';
    }
    if (name.startsWith('.')) return path.resolve(path.dirname(owner), name) + '.ts';
}
for (const dir of ['common', 'server-nestjs/app', 'client/src/app']) {
    for (const file of files(path.join(root, dir))) {
        const layer = zone(file);
        if (layer === 'outer') continue;
        checked++;
        const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        const report = message => failures.push(`${path.relative(root, file)}: ${message}`);
        function visit(node) {
            if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
                const name = node.moduleSpecifier.text;
                const target = resolveImport(file, name);
                if (!target) report(`core must not import external dependency ${name}`);
                else if (!fs.existsSync(target)) report(`unresolved core dependency ${name}`);
                else if (layer === 'domain' && zone(target) !== 'domain' && !name.endsWith('/invariant'))
                    report(`domain must not depend on ${name}`);
                else if (layer === 'application' && zone(target) === 'outer' && !target.includes('/common/'))
                    report(`application must not depend on ${name}`);
                const context = /server-nestjs\/app\/([^/]+)\//.exec(file)?.[1];
                const targetContext = target && /server-nestjs\/app\/([^/]+)\//.exec(target)?.[1];
                if (context && targetContext && context !== targetContext && targetContext !== 'shared' && !target.endsWith('/ports.ts'))
                    report(`cross-context access must use a published port: ${name}`);
            }
            if (ts.isIdentifier(node) && ['fetch', 'window', 'document', 'sessionStorage', 'localStorage', 'setTimeout', 'setInterval'].includes(node.text))
                report(`side effect ${node.text} belongs behind a port`);
            if (ts.isPropertyAccessExpression(node) && ['Date.now', 'Math.random'].includes(node.getText(source)))
                report(`${node.getText(source)} must use the runtime port`);
            ts.forEachChild(node, visit);
        }
        visit(source);
    }
}
if (failures.length) {
    process.stderr.write(failures.join('\n') + '\n');
    process.exitCode = 1;
} else process.stdout.write(`Architecture boundaries passed for ${checked} domain/application files.\n`);
