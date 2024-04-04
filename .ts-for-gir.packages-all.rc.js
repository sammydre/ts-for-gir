export default {
    outdir: './types',
    modules: ['*'],
    girDirectories: [

        // General gir files in this repository
        './vala-girs/gir-1.0',
        './girs',

        // General gir files installed on the system
        "/usr/local/share/gir-1.0",
        "/usr/share/gir-1.0",

        // GNOME Shell gir file (package: gnome-shell-common / gnome-shell)
        '/usr/share/gnome-shell',
        '/usr/share/gnome-shell/gir-1.0',

        // GNOME Shell gir file dependencies on Fedora Workstation 36 (package: mutter)
        '/usr/lib64/mutter-10',

        // GNOME Shell gir file dependencies on Fedora Workstation 37 (package: mutter)
        '/usr/lib64/mutter-11',

        // GNOME Shell gir file dependencies on Fedora Workstation 38 (package: mutter)
        '/usr/lib64/mutter-12',

        // GNOME Shell gir file dependencies on Fedora Workstation 39 (package: mutter)
        '/usr/lib64/mutter-13',

        // Wait for release...
        '/usr/lib64/mutter-14',

        // GNOME Shell gir file dependencies on Ubuntu 22.04 (package: libmutter-10-dev)
        '/usr/lib/x86_64-linux-gnu/mutter-10',

        // GNOME Shell gir file dependencies on Ubuntu 22.10 (package: libmutter-11-dev)
        '/usr/lib/x86_64-linux-gnu/mutter-11',

        // GNOME Shell gir file dependencies on Ubuntu 23.04 (package: libmutter-12-dev)
        '/usr/lib/x86_64-linux-gnu/mutter-12',

        // GNOME Shell gir file dependencies on Ubuntu 23.10 (package: libmutter-13-dev)
        '/usr/lib/x86_64-linux-gnu/mutter-13',

        // GNOME Shell gir file dependencies on Ubuntu package: libmutter-14-dev) and GNOME OS
        '/usr/lib/x86_64-linux-gnu/mutter-14', 
    ],
    ignore: [
        'Colorhug-1.0', // Duplicate of ColorHug-1.0
        'GUPnP-DLNA-1.0', // Same namespace as GUPnP-1.0.gir, is this a bug or should we merge the type definitions?
        'GstBase-1.0', // Unable to resolve type: BaseSink from GstBase in ClutterGst 1.0
        'ClutterGst-1.0', // Depends on GstBase-1.0
        'GstAudio-0.10', // Depends on GstBase-1.0
    ],
    ignoreVersionConflicts: true,
    promisify: true,
    packageYarn: true,
}
