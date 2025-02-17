// Before initialization - TypeScript knows these are possibly undefined
console.log('Before initialization:');
console.log('name:', imports.package.name);
console.log('version:', imports.package.version);
console.log('datadir:', imports.package.datadir);

// Initialize the package
imports.package.init({
    name: 'org.example.App',
    version: '1.0.0',
    prefix: '/usr/local',
    libdir: '/usr/local/lib'
});

// After initialization - TypeScript knows these are definitely defined
console.log('\nAfter initialization:');
console.log('name:', imports.package.name);
console.log('version:', imports.package.version);
console.log('datadir:', imports.package.datadir);

// TypeScript type check demonstration
function requiresInitializedPackage(pkgName: string) {
    return pkgName === imports.package.name;
}

const isMatchingPackage = requiresInitializedPackage('org.example.App');
console.log('\nPackage name matches:', isMatchingPackage); 